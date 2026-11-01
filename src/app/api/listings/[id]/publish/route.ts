
import { sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const publishSchema = z.object({
  mode: z.enum(['free', 'plan']),
});

type PublishResult =
  | 'published'
  | 'invalid_mode'
  | 'user_not_found'
  | 'draft_not_found'
  | 'free_listing_used'
  | 'subscription_required'
  | 'listing_limit_reached';

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const user = await requireMarketplaceUser();

  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 },
    );
  }

  const { id } = await context.params;

  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json(
      { error: 'draft_not_found' },
      { status: 404 },
    );
  }

  const parsed = publishSchema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_mode' },
      { status: 400 },
    );
  }

  try {
    const queryResult = await db.execute(sql`
      SELECT public.publish_marketplace_listing(
        ${user.id}::uuid,
        ${id}::uuid,
        ${parsed.data.mode}
      ) AS result
    `);

    const row = queryResult.rows[0] as
      | { result: PublishResult }
      | undefined;

    const outcome = row?.result;

    if (outcome === 'published') {
      return NextResponse.json({ ok: true });
    }

    switch (outcome) {
      case 'draft_not_found':
        return NextResponse.json(
          { error: outcome },
          { status: 404 },
        );

      case 'free_listing_used':
      case 'listing_limit_reached':
        return NextResponse.json(
          { error: outcome },
          { status: 409 },
        );

      case 'subscription_required':
        return NextResponse.json(
          {
            error: outcome,
            redirect: `/plans?listingId=${id}`,
          },
          { status: 402 },
        );

      case 'invalid_mode':
        return NextResponse.json(
          { error: outcome },
          { status: 400 },
        );

      case 'user_not_found':
        return NextResponse.json(
          { error: outcome },
          { status: 404 },
        );

      default:
        console.error('Unexpected publishing result:', outcome);

        return NextResponse.json(
          { error: 'publish_failed' },
          { status: 500 },
        );
    }
  } catch (error) {
    console.error('Listing publishing failed:', error);

    return NextResponse.json(
      { error: 'publish_failed' },
      { status: 500 },
    );
  }
}
