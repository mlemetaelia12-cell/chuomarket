import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { housingListings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const schema = z.object({ status: z.enum(['filled', 'hidden', 'published']) });

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_status' }, { status: 400 });
  const [updated] = await db.update(housingListings).set({ status: parsed.data.status, updatedAt: new Date() })
    .where(and(eq(housingListings.id, id), eq(housingListings.ownerId, user.id))).returning({ id: housingListings.id });
  return updated ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
