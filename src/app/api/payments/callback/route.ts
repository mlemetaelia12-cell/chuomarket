import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders, users } from '@/db/schema';
import { verifyAndFulfilPesapalOrder } from '@/lib/payments/fulfilment';
import { getPesapalBaseUrl } from '@/lib/payments/pesapal';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const trackingId = url.searchParams.get('OrderTrackingId') ?? '';
  const merchantReference = url.searchParams.get('OrderMerchantReference') ?? '';
  const [order] = await db.select({ id: orders.id, userId: orders.userId, trackingId: orders.pesapalTrackingId }).from(orders)
    .where(eq(orders.pesapalMerchantReference, merchantReference)).limit(1);
  if (!order || (order.trackingId && order.trackingId !== trackingId)) {
    return NextResponse.redirect(new URL('/en/payments/history?status=not_found', await getPesapalBaseUrl()));
  }
  const result = await verifyAndFulfilPesapalOrder(trackingId, merchantReference);
  const [owner] = await db.select({ language: users.language }).from(users).where(eq(users.id, order.userId)).limit(1);
  const locale = owner?.language ?? 'en';
  return NextResponse.redirect(new URL(`/${locale}/payments/history?status=${result}`, await getPesapalBaseUrl()));
}
