import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { roommateRequests, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  introduction: z.string().trim().min(20).max(600),
  university: z.string().trim().min(2).max(160),
  campus: z.string().trim().min(2).max(160),
  preferredArea: z.string().trim().min(2).max(180),
  minBudgetTsh: z.number().int().min(0).max(10000000),
  maxBudgetTsh: z.number().int().min(0).max(10000000),
  requirements: z.string().trim().min(2).max(800),
  moveInPeriod: z.string().trim().min(2).max(120),
}).refine((value) => value.maxBudgetTsh >= value.minBudgetTsh, { path: ['maxBudgetTsh'] });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const campus = (params.get('campus') ?? '').trim().slice(0, 160);
  const search = (params.get('q') ?? '').trim().slice(0, 100);
  const conditions = [eq(roommateRequests.status, 'active')];
  if (campus) conditions.push(ilike(roommateRequests.campus, `%${campus}%`));
  if (search) conditions.push(or(ilike(roommateRequests.preferredArea, `%${search}%`), ilike(roommateRequests.introduction, `%${search}%`))!);
  const rows = await db.select({
    id: roommateRequests.id, introduction: roommateRequests.introduction, university: roommateRequests.university,
    campus: roommateRequests.campus, preferredArea: roommateRequests.preferredArea, minBudgetTsh: roommateRequests.minBudgetTsh,
    maxBudgetTsh: roommateRequests.maxBudgetTsh, requirements: roommateRequests.requirements,
    moveInPeriod: roommateRequests.moveInPeriod, createdAt: roommateRequests.createdAt,
    ownerUsername: users.username,
  }).from(roommateRequests).innerJoin(users, eq(roommateRequests.ownerId, users.id))
    .where(and(...conditions)).orderBy(desc(roommateRequests.createdAt)).limit(60);
  return NextResponse.json({ requests: rows }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'roommate-request-create', 4, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request', issues: parsed.error.flatten() }, { status: 400 });
  const [created] = await db.insert(roommateRequests).values({ ownerId: user.id, ...parsed.data }).returning({ id: roommateRequests.id });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
