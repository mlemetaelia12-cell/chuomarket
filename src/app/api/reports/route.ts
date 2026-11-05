import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { campusAlerts, housingListings, roommateRequests, reports, serviceListings, studyMaterials } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  targetType: z.enum(['housing_listing', 'roommate_request', 'study_material', 'campus_alert', 'service_listing']),
  targetId: z.string().uuid(),
  reason: z.enum(['scam', 'misleading', 'copyright', 'abuse', 'unsafe', 'prohibited', 'other']).default('other'),
  details: z.string().trim().max(1000).optional(),
});

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'v2-report', 6, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_report' }, { status: 400 });
  const { targetType, targetId, reason, details } = parsed.data;
  let createdId: string | undefined;

  if (targetType === 'housing_listing') {
    const target = await db.query.housingListings.findFirst({ where: eq(housingListings.id, targetId), columns: { id: true, ownerId: true, status: true } });
    if (!target || target.status !== 'published') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (target.ownerId === user.id) return NextResponse.json({ error: 'own_content' }, { status: 403 });
    const [row] = await db.insert(reports).values({ reporterId: user.id, housingListingId: target.id, reportedUserId: target.ownerId, reason, details: details ?? null }).onConflictDoNothing().returning({ id: reports.id });
    createdId = row?.id;
  } else if (targetType === 'roommate_request') {
    const target = await db.query.roommateRequests.findFirst({ where: eq(roommateRequests.id, targetId), columns: { id: true, ownerId: true, status: true } });
    if (!target || target.status !== 'active') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (target.ownerId === user.id) return NextResponse.json({ error: 'own_content' }, { status: 403 });
    const [row] = await db.insert(reports).values({ reporterId: user.id, roommateRequestId: target.id, reportedUserId: target.ownerId, reason, details: details ?? null }).onConflictDoNothing().returning({ id: reports.id });
    createdId = row?.id;
  } else if (targetType === 'study_material') {
    const target = await db.query.studyMaterials.findFirst({ where: eq(studyMaterials.id, targetId), columns: { id: true, uploaderId: true, moderationStatus: true } });
    if (!target || target.moderationStatus !== 'approved') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (target.uploaderId === user.id) return NextResponse.json({ error: 'own_content' }, { status: 403 });
    const [row] = await db.insert(reports).values({ reporterId: user.id, studyMaterialId: target.id, reportedUserId: target.uploaderId, reason, details: details ?? null }).onConflictDoNothing().returning({ id: reports.id });
    createdId = row?.id;
  } else if (targetType === 'campus_alert') {
    const target = await db.query.campusAlerts.findFirst({ where: eq(campusAlerts.id, targetId), columns: { id: true, publisherId: true, status: true, expiresAt: true } });
    if (!target || target.status !== 'published' || (target.expiresAt && target.expiresAt <= new Date())) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (target.publisherId === user.id) return NextResponse.json({ error: 'own_content' }, { status: 403 });
    const [row] = await db.insert(reports).values({ reporterId: user.id, campusAlertId: target.id, reportedUserId: target.publisherId, reason, details: details ?? null }).onConflictDoNothing().returning({ id: reports.id });
    createdId = row?.id;
  } else {
    const target = await db.query.serviceListings.findFirst({ where: eq(serviceListings.id, targetId), columns: { id: true, providerId: true, status: true } });
    if (!target || target.status !== 'published') return NextResponse.json({ error: 'not_found' }, { status: 404 });
    if (target.providerId === user.id) return NextResponse.json({ error: 'own_content' }, { status: 403 });
    const [row] = await db.insert(reports).values({ reporterId: user.id, serviceListingId: target.id, reportedUserId: target.providerId, reason, details: details ?? null }).onConflictDoNothing().returning({ id: reports.id });
    createdId = row?.id;
  }

  return createdId ? NextResponse.json({ ok: true }, { status: 201 }) : NextResponse.json({ error: 'already_reported' }, { status: 409 });
}
