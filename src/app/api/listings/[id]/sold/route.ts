import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const user = await requireMarketplaceUser();

  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 }
    );
  }

  const { id } = await context.params;

  const [updated] = await db
    .update(listings)
    .set({
      status: 'sold',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(listings.id, id),
        eq(listings.ownerId, user.id),
        eq(listings.status, 'published')
      )
    )
    .returning({ id: listings.id });

  if (!updated) {
    return NextResponse.json(
      { error: 'listing_not_found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}