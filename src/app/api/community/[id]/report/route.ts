
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

import { db } from '@/db';
import { communityPosts, reports } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceUserRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  reason: z.enum(['spam', 'scam', 'inappropriate', 'other']),
  details: z.string().max(1000).optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    // 1. Authenticate first.
    const user = await requireMarketplaceUser();

    if (!user) {
      return NextResponse.json(
        { error: 'unauthorized' },
        { status: 401 },
      );
    }

    // 2. Validate request body.
    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'invalid_report' },
        { status: 400 },
      );
    }

    // 3. Validate post existence.
    const { id } = await params;

    const post = await db.query.communityPosts.findFirst({
      where: eq(communityPosts.id, id),
      columns: {
        id: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        { error: 'not_found' },
        { status: 404 },
      );
    }

    // 4. Limit each user to 5 reports/hour.
    // Additional IP protection: 60 reports/hour.
    const allowed = await enforceUserRateLimit(
      request,
      'report-community',
      user.id,
      5,
      60,
      3600,
    );

    if (!allowed) {
      return NextResponse.json(
        { error: 'rate_limited' },
        { status: 429 },
      );
    }

    // 5. Save report.
    await db.insert(reports).values({
      reporterId: user.id,
      communityPostId: id,
      reason: parsed.data.reason,
      details: parsed.data.details,
    });

    return NextResponse.json(
      { success: true },
      { status: 201 },
    );
  } catch (error) {
    console.error('Community report failed:', error);

    return NextResponse.json(
      { error: 'internal_server_error' },
      { status: 500 },
    );
  }
}
