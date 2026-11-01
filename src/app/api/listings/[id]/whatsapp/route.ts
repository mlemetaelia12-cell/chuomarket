import { and, eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { authUsers, listingStats, listings, users, whatsappRevealLimits, whatsappReveals } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(_request: Request, context: RouteContext) {
  const viewer = await requireMarketplaceUser();
  if (!viewer) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  }
  const [listing] = await db.select({ id: listings.id, ownerId: listings.ownerId })
    .from(listings).where(and(eq(listings.id, id), eq(listings.status, 'published'))).limit(1);
  if (!listing) return NextResponse.json({ error: 'listing_not_found' }, { status: 404 });
  if (listing.ownerId === viewer.id) return NextResponse.json({ error: 'own_listing' }, { status: 403 });

  const usageDate = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Dar_es_Salaam', year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(new Date());
  const [seller] = await db.select({ phone: users.whatsapp, authPhone: authUsers.whatsapp })
    .from(users).leftJoin(authUsers, eq(users.authUserId, authUsers.id))
    .where(eq(users.id, listing.ownerId)).limit(1);
  const phone = seller?.phone ?? seller?.authPhone;
  if (!phone) return NextResponse.json({ error: 'seller_phone_missing' }, { status: 409 });

  const [usage] = await db.insert(whatsappRevealLimits).values({
    userId: viewer.id, usageDate, revealCount: 1,
  }).onConflictDoUpdate({
    target: [whatsappRevealLimits.userId, whatsappRevealLimits.usageDate],
    set: { revealCount: sql`${whatsappRevealLimits.revealCount} + 1` },
    setWhere: sql`${whatsappRevealLimits.revealCount} < 30`,
  }).returning({ revealCount: whatsappRevealLimits.revealCount });
  if (!usage) return NextResponse.json({ error: 'daily_limit_reached' }, { status: 429 });

  await db.insert(whatsappReveals).values({ userId: viewer.id, listingId: listing.id });
  await db.insert(listingStats).values({ listingId: listing.id, whatsappClicks: 1 })
    .onConflictDoUpdate({ target: listingStats.listingId, set: {
      whatsappClicks: sql`${listingStats.whatsappClicks} + 1`, updatedAt: new Date(),
    } });

  return NextResponse.json({ phone: phone.replace(/[^\d]/g, ''), remaining: 30 - usage.revealCount });
}
