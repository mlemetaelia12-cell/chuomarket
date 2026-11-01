import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAndFulfilPesapalOrder } from '@/lib/payments/fulfilment';

const notificationSchema = z.object({ OrderTrackingId: z.string().min(1).max(128), OrderMerchantReference: z.string().min(1).max(128), OrderNotificationType: z.string().max(40).optional() });

async function handleNotification(params: URLSearchParams) {
  const parsed = notificationSchema.safeParse({ OrderTrackingId: params.get('OrderTrackingId'), OrderMerchantReference: params.get('OrderMerchantReference'), OrderNotificationType: params.get('OrderNotificationType') ?? undefined });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_notification' }, { status: 400 });
  const trackingId = parsed.data.OrderTrackingId;
  const merchantReference = parsed.data.OrderMerchantReference;
  const result = await verifyAndFulfilPesapalOrder(trackingId, merchantReference);
  return NextResponse.json({
    orderNotificationType: params.get('OrderNotificationType') ?? 'IPNCHANGE',
    orderTrackingId: trackingId, orderMerchantReference: merchantReference, status: 200, result,
  });
}

export async function GET(request: Request) {
  return handleNotification(new URL(request.url).searchParams);
}

export async function POST(request: Request) {
  const bodySchema = notificationSchema.partial();
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_notification' }, { status: 400 });
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(parsed.data)) if (value) params.set(key, value);
  return handleNotification(params);
}
