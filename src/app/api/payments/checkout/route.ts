import { randomUUID } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { listings, orders, plans } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { ensurePesapalIpn, getPesapalToken, submitPesapalOrder } from '@/lib/payments/pesapal';

const checkoutSchema = z
  .object({
    planCode: z.string().min(1).max(32).optional(),
    addOn: z.enum(['featured', 'boost']).optional(),
    listingId: z.string().uuid().optional(),
    locale: z.enum(['en', 'sw']).default('en'),
  })
  .refine(
    (value) =>
      Boolean(value.planCode) !== Boolean(value.addOn) &&
      (Boolean(value.planCode) || Boolean(value.listingId)),
    { message: 'Choose exactly one payment item.' },
  );

export async function POST(request: Request) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await enforceRateLimit(request, 'payment-checkout', 5, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  if (!user.whatsapp) return NextResponse.json({ error: 'whatsapp_required' }, { status: 400 });
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  let plan: typeof plans.$inferSelect | null = null;
  let orderType: 'subscription' | 'featured' | 'boost' = 'subscription';
  let amountTsh = 0;
  let description = '';
  if (parsed.data.planCode) {
    const [selectedPlan] = await db
      .select()
      .from(plans)
      .where(and(eq(plans.code, parsed.data.planCode), eq(plans.active, true)))
      .limit(1);
    if (!selectedPlan) return NextResponse.json({ error: 'plan_unavailable' }, { status: 404 });
    if (selectedPlan.priceTsh <= 0) {
      return NextResponse.json({ error: 'free_plan_does_not_require_checkout' }, { status: 400 });
    }
    plan = selectedPlan;
    amountTsh = selectedPlan.priceTsh;
    description = `Chuo Market ${selectedPlan.name} seller subscription`;
  } else if (parsed.data.addOn) {
    if (!parsed.data.listingId)
      return NextResponse.json({ error: 'listing_required' }, { status: 400 });
    const [listing] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          eq(listings.id, parsed.data.listingId),
          eq(listings.ownerId, user.id),
          eq(listings.status, 'published'),
        ),
      )
      .limit(1);
    if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
    orderType = parsed.data.addOn;
    amountTsh = parsed.data.addOn === 'featured' ? 1000 : 500;
    description =
      parsed.data.addOn === 'featured'
        ? 'Chuo Market listing featured for 7 days'
        : 'Chuo Market listing boost';
  }
  if (parsed.data.listingId && orderType === 'subscription') {
    const [draft] = await db
      .select({ id: listings.id })
      .from(listings)
      .where(
        and(
          eq(listings.id, parsed.data.listingId),
          eq(listings.ownerId, user.id),
          eq(listings.status, 'draft'),
        ),
      )
      .limit(1);
    if (!draft) return NextResponse.json({ error: 'draft_not_found' }, { status: 404 });
  }

  const [order] = await db
    .insert(orders)
    .values({
      userId: user.id,
      planId: plan?.id ?? null,
      listingId: parsed.data.listingId ?? null,
      type: orderType,
      amountTsh,
      pesapalMerchantReference: `CM-${randomUUID()}`,
    })
    .returning();
  if (!order?.pesapalMerchantReference)
    return NextResponse.json({ error: 'order_create_failed' }, { status: 500 });

  let notificationId: string;
  let accessToken: string;

  // Token/IPN setup happens before a payment order is submitted. If this
  // preparation fails, Pesapal has not received this order and it is safe
  // to mark the local order as failed.
  try {
    accessToken = await getPesapalToken();
    notificationId = await ensurePesapalIpn(accessToken);
  } catch (error) {
    await db
      .update(orders)
      .set({ status: 'failed', updatedAt: new Date() })
      .where(eq(orders.id, order.id));
    console.error('Pesapal checkout preparation failed.', error);
    return NextResponse.json({ error: 'payment_initialization_failed' }, { status: 502 });
  }

  // Once SubmitOrderRequest starts, a timeout or network error is ambiguous:
  // Pesapal may have accepted the order even if this server did not receive
  // its response. Keep the order pending so callback/IPN/status reconciliation
  // can safely determine the actual provider state.
  try {
    const checkout = await submitPesapalOrder({
      merchantReference: order.pesapalMerchantReference,
      amount: amountTsh,
      description,
      phoneNumber: user.whatsapp,
      username: user.username,
      locale: parsed.data.locale,
      notificationId,
      accessToken,
    });

    await db
      .update(orders)
      .set({ pesapalTrackingId: checkout.trackingId, updatedAt: new Date() })
      .where(eq(orders.id, order.id));

    return NextResponse.json({ redirectUrl: checkout.redirectUrl });
  } catch (error) {
    // Do not mark failed here: the provider may have accepted the request.
    console.error('Pesapal order submission needs reconciliation.', {
      orderId: order.id,
      error,
    });
    return NextResponse.json({ error: 'payment_status_pending' }, { status: 202 });
  }
}
