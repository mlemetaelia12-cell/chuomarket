import { NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { listings, pointEvents, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const schema = z.object({ listingId: z.string().uuid() });

export async function POST(request: Request) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_listing' }, { status: 400 });
  const listing = await db.query.listings.findFirst({ where: and(eq(listings.id, parsed.data.listingId), eq(listings.ownerId, user.id), eq(listings.status, 'published')) });
  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  const [charged] = await db.update(users).set({ points: sql`${users.points} - 100`, updatedAt: new Date() }).where(and(eq(users.id, user.id), gte(users.points, 100))).returning({ points: users.points });
  if (!charged) return NextResponse.json({ error: 'insufficient_points' }, { status: 400 });
  await db.update(listings).set({ boostedAt: new Date(), updatedAt: new Date() }).where(eq(listings.id, listing.id));
  await db.insert(pointEvents).values({ userId: user.id, type: 'redemption', points: -100, description: 'Redeemed 100 points for a free Boost', referenceId: listing.id });
  return NextResponse.json({ success: true, points: charged.points });
}
