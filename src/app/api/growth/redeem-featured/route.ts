import { NextResponse } from 'next/server';
import { and, eq, gte, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { listings, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const schema = z.object({ listingId: z.string().uuid() });
export async function POST(request: Request) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_listing' }, { status: 400 });
  const listing = await db.query.listings.findFirst({ where: and(eq(listings.id, parsed.data.listingId), eq(listings.ownerId, user.id), eq(listings.status, 'published')) });
  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  const [credit] = await db.update(users).set({ featuredDaysCredit: sql`${users.featuredDaysCredit} - 2`, updatedAt: new Date() }).where(and(eq(users.id, user.id), gte(users.featuredDaysCredit, 2))).returning({ featuredDaysCredit: users.featuredDaysCredit });
  if (!credit) return NextResponse.json({ error: 'insufficient_featured_credit' }, { status: 400 });
  const now = new Date();
  const base = listing.featuredUntil && listing.featuredUntil > now ? listing.featuredUntil : now;
  const featuredUntil = new Date(base.getTime() + 2 * 24 * 60 * 60 * 1000);
  await db.update(listings).set({ featuredUntil, updatedAt: now }).where(eq(listings.id, listing.id));
  return NextResponse.json({ success: true, featuredUntil: featuredUntil.toISOString(), featuredDaysCredit: credit.featuredDaysCredit });
}
