import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { communityPosts, reports } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.object({ reason: z.enum(['spam', 'scam', 'inappropriate', 'other']), details: z.string().max(1000).optional() });
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await enforceRateLimit(request, 'report-community', 5, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const post = await db.query.communityPosts.findFirst({ where: eq(communityPosts.id, id) });
  if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_report' }, { status: 400 });
  await db.insert(reports).values({ reporterId: user.id, communityPostId: id, reason: parsed.data.reason, details: parsed.data.details });
  return NextResponse.json({ success: true }, { status: 201 });
}
