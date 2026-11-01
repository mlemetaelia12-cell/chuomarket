import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { orders } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { verifyAndFulfilPesapalOrder } from '@/lib/payments/fulfilment';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const [order] = await db.select().from(orders).where(and(eq(orders.id, id), eq(orders.userId, user.id))).limit(1);
  if (!order) return NextResponse.json({ error: 'order_not_found' }, { status: 404 });
  if (order.status === 'pending' && order.pesapalTrackingId && order.pesapalMerchantReference) {
    const status = await verifyAndFulfilPesapalOrder(order.pesapalTrackingId, order.pesapalMerchantReference);
    return NextResponse.json({ status });
  }
  return NextResponse.json({ status: order.status });
}
