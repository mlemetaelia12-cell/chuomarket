import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { favorites, listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  }
  const [listing] = await db.select({ id: listings.id }).from(listings)
    .where(and(eq(listings.id, id), eq(listings.status, 'published'))).limit(1);
  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });

  const [existing] = await db.select({ id: favorites.id }).from(favorites)
    .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, id))).limit(1);
  if (existing) {
    await db.delete(favorites).where(eq(favorites.id, existing.id));
    return NextResponse.json({ favorited: false });
  }
  await db.insert(favorites).values({ userId: user.id, listingId: id }).onConflictDoNothing();
  return NextResponse.json({ favorited: true });
}
