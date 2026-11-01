
import 'server-only';

import { and, eq, sql } from 'drizzle-orm';

import { db } from '@/db';
import { orders } from '@/db/schema';
import { getPesapalTransactionStatus } from '@/lib/payments/pesapal';

export type PesapalFulfilmentStatus =
  | 'completed'
  | 'pending'
  | 'failed'
  | 'reversed'
  | 'not_found';

export async function verifyAndFulfilPesapalOrder(
  trackingId: string,
  merchantReference: string,
): Promise<PesapalFulfilmentStatus> {
  if (!trackingId?.trim() || !merchantReference?.trim()) {
    return 'not_found';
  }

  const [order] = await db
    .select()
    .from(orders)
    .where(eq(orders.pesapalMerchantReference, merchantReference))
    .limit(1);

  if (!order) {
    return 'not_found';
  }

  // Reject a different tracking ID if this order already has one.
  if (
    order.pesapalTrackingId &&
    order.pesapalTrackingId !== trackingId
  ) {
    return 'not_found';
  }

  // Always verify directly with Pesapal. Never trust the browser or IPN status.
  const provider = await getPesapalTransactionStatus(trackingId);

  const providerReference = provider.merchant_reference?.trim();
  const providerCurrency = provider.currency?.trim().toUpperCase();
  const providerAmount = Number(provider.amount);
  const providerDescription = (
    provider.payment_status_description ?? ''
  )
    .trim()
    .toUpperCase();
  const providerCode = Number(provider.status_code);

  // Verify the transaction against the original database order.
  if (
    providerReference !== merchantReference ||
    !Number.isFinite(providerAmount) ||
    providerAmount !== order.amountTsh ||
    providerCurrency !== 'TZS'
  ) {
    console.error('Pesapal transaction verification mismatch.', {
      orderId: order.id,
      referenceMatched: providerReference === merchantReference,
      amountMatched: providerAmount === order.amountTsh,
      currencyMatched: providerCurrency === 'TZS',
    });

    return 'not_found';
  }

  // Handle reversed transactions separately.
  if (
    providerCode === 3 ||
    providerDescription === 'REVERSED'
  ) {
    const reversalUpdate =
      order.status === 'pending'
        ? {
            status: 'failed' as const,
            pesapalStatus: 'REVERSED',
            updatedAt: new Date(),
          }
        : {
            pesapalStatus: 'REVERSED',
            updatedAt: new Date(),
          };

    await db
      .update(orders)
      .set(reversalUpdate)
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.status, order.status),
        ),
      );

    return 'reversed';
  }

  // Already completed orders must never be fulfilled twice.
  if (order.status === 'completed') {
    return 'completed';
  }

  // Do not automatically fulfil failed or cancelled orders.
  if (order.status !== 'pending') {
    return 'failed';
  }

  // Only an explicit COMPLETED response with status code 1
  // can trigger the database fulfilment function.
  if (
    providerCode === 1 &&
    providerDescription === 'COMPLETED'
  ) {
    const receiptNumber = `CM-${order.id.toUpperCase()}`;

    // The SQL function updates the order and creates the entitlement
    // atomically. It only fulfils orders that are still pending.
    await db.execute(sql`
      SELECT public.complete_pesapal_order(
        ${order.id}::uuid,
        ${trackingId},
        ${provider.payment_method ?? null},
        ${provider.confirmation_code ?? null},
        ${receiptNumber},
        ${providerDescription}
      )
    `);

    // Read the actual database state. Another IPN or callback may
    // have completed the same order concurrently.
    const [latestOrder] = await db
      .select({
        status: orders.status,
        pesapalStatus: orders.pesapalStatus,
      })
      .from(orders)
      .where(eq(orders.id, order.id))
      .limit(1);

    if (latestOrder?.pesapalStatus === 'REVERSED') {
      return 'reversed';
    }

    if (latestOrder?.status === 'completed') {
      return 'completed';
    }

    if (latestOrder?.status === 'pending') {
      return 'pending';
    }

    return 'failed';
  }

  // Explicit failed or invalid provider status.
  if (
    providerCode === 0 ||
    providerCode === 2 ||
    providerDescription === 'INVALID' ||
    providerDescription === 'FAILED'
  ) {
    const storedStatus =
      providerDescription ||
      (providerCode === 0 ? 'INVALID' : 'FAILED');

    await db
      .update(orders)
      .set({
        status: 'failed',
        pesapalStatus: storedStatus,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(orders.id, order.id),
          eq(orders.status, 'pending'),
        ),
      );

    const [latestOrder] = await db
      .select({
        status: orders.status,
        pesapalStatus: orders.pesapalStatus,
      })
      .from(orders)
      .where(eq(orders.id, order.id))
      .limit(1);

    if (latestOrder?.status === 'completed') {
      return 'completed';
    }

    if (latestOrder?.pesapalStatus === 'REVERSED') {
      return 'reversed';
    }

    return 'failed';
  }

  // Pending, processing or unknown status must never fulfil an order.
  return 'pending';
}
