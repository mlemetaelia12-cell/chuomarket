import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { db } from '@/db';
import { listings, reports } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

type RouteContext = {
  params: Promise<{ id: string }>;
};

const reportSchema = z.object({
  reason: z.enum([
    'scam',
    'prohibited',
    'misleading',
    'duplicate',
    'other',
  ]),
  details: z.string().trim().max(1000).optional(),
});

export async function POST(
  request: Request,
  context: RouteContext
) {
  const user = await requireMarketplaceUser();

  if (!user) {
    return NextResponse.json(
      { error: 'login_required' },
      { status: 401 }
    );
  }

  if (
    !(await enforceRateLimit(
      request,
      'report-listing',
      5,
      3600
    ))
  ) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429 }
    );
  }

  const { id } = await context.params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
  ) {
    return NextResponse.json(
      { error: 'listing_not_found' },
      { status: 404 }
    );
  }

  const parsed = reportSchema.safeParse(
    await request.json().catch(() => null)
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_report' },
      { status: 400 }
    );
  }

  const [listing] = await db
    .select({
      id: listings.id,
      ownerId: listings.ownerId,
    })
    .from(listings)
    .where(
      and(
        eq(listings.id, id),
        eq(listings.status, 'published')
      )
    )
    .limit(1);

  if (!listing) {
    return NextResponse.json(
      { error: 'listing_not_found' },
      { status: 404 }
    );
  }

  if (listing.ownerId === user.id) {
    return NextResponse.json(
      { error: 'own_listing' },
      { status: 403 }
    );
  }

  const [created] = await db
    .insert(reports)
    .values({
      reporterId: user.id,
      listingId: listing.id,
      reportedUserId: listing.ownerId,
      reason: parsed.data.reason,
      details: parsed.data.details ?? null,
    })
    .onConflictDoNothing({
      target: [reports.reporterId, reports.listingId],
    })
    .returning({ id: reports.id });

  if (!created) {
    return NextResponse.json(
      { error: 'already_reported' },
      { status: 409 }
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 201 }
  );
}