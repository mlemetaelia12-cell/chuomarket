import { and, desc, eq, gt, isNull, ilike, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { campusAlerts } from '@/db/schema';
import { getAdminActor } from '@/lib/admin';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(3000),
  category: z.enum(['academic_deadline', 'registration', 'examinations', 'scholarships', 'events', 'announcements', 'lost_found']),
  university: z.string().trim().max(160).optional().nullable(),
  campus: z.string().trim().max(160).optional().nullable(),
  trustLabel: z.enum(['community', 'unverified', 'official']).optional(),
  sourceName: z.string().trim().max(180).optional().nullable(),
  sourceUrl: z.string().url().max(1000).refine((value) => new URL(value).protocol === 'https:', 'HTTPS is required').optional().nullable(),
  expiresAt: z.string().datetime().optional().nullable(),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = (params.get('q') ?? '').trim().slice(0, 100);
  const campus = (params.get('campus') ?? '').trim().slice(0, 160);
  const conditions = [eq(campusAlerts.status, 'published'), or(isNull(campusAlerts.expiresAt), gt(campusAlerts.expiresAt, new Date()))!, sql`${campusAlerts.publishedAt} IS NOT NULL`];
  if (campus) conditions.push(or(isNull(campusAlerts.campus), eq(campusAlerts.campus, campus))!);
  if (search) conditions.push(or(ilike(campusAlerts.title, `%${search}%`), ilike(campusAlerts.description, `%${search}%`))!);
  const rows = await db.query.campusAlerts.findMany({ where: and(...conditions), orderBy: [desc(sql`CASE WHEN ${campusAlerts.trustLabel} = 'official' THEN 2 WHEN ${campusAlerts.trustLabel} = 'community' THEN 1 ELSE 0 END`), desc(campusAlerts.publishedAt)], limit: 80, with: { publisher: { columns: { username: true } } } });
  return NextResponse.json({ alerts: rows }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'campus-alert-create', 5, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_alert', issues: parsed.error.flatten() }, { status: 400 });
  const admin = await getAdminActor();
  const requestedTrust = parsed.data.trustLabel ?? 'community';
  if (requestedTrust === 'official' && !admin) return NextResponse.json({ error: 'official_permission_required' }, { status: 403 });
  if (requestedTrust === 'official' && !parsed.data.sourceName && !parsed.data.sourceUrl) return NextResponse.json({ error: 'official_source_required' }, { status: 400 });
  const expiresAt = parsed.data.expiresAt ? new Date(parsed.data.expiresAt) : null;
  if (expiresAt && expiresAt <= new Date()) return NextResponse.json({ error: 'expiry_must_be_future' }, { status: 400 });
  const [created] = await db.insert(campusAlerts).values({
    publisherId: user.id, title: parsed.data.title, description: parsed.data.description,
    category: parsed.data.category, university: parsed.data.university || null, campus: parsed.data.campus || null,
    trustLabel: requestedTrust, sourceName: parsed.data.sourceName || null, sourceUrl: parsed.data.sourceUrl || null,
    publishedAt: new Date(), expiresAt, status: 'published',
  }).returning({ id: campusAlerts.id });
  return NextResponse.json({ id: created.id }, { status: 201 });
}
