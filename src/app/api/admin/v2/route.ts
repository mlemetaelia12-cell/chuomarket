import { desc, eq, isNotNull, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { campusAlerts, housingListings, roommateRequests, reports, serviceListings, studyMaterials, users } from '@/db/schema';
import { getAdminActor } from '@/lib/admin';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('moderate_material'), materialId: z.string().uuid(), status: z.enum(['approved', 'rejected', 'removed']) }),
  z.object({ action: z.literal('official_alert'), alertId: z.string().uuid(), official: z.boolean() }),
  z.object({ action: z.literal('remove_housing'), listingId: z.string().uuid() }),
  z.object({ action: z.literal('remove_roommate_request'), requestId: z.string().uuid() }),
  z.object({ action: z.literal('remove_material'), materialId: z.string().uuid() }),
  z.object({ action: z.literal('remove_alert'), alertId: z.string().uuid() }),
  z.object({ action: z.literal('remove_service'), serviceId: z.string().uuid() }),
  z.object({ action: z.literal('resolve_report'), reportId: z.string().uuid(), status: z.enum(['reviewing', 'resolved', 'dismissed']) }),
]);

export async function GET() {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const [pendingMaterials, recentAlerts, reportRows] = await Promise.all([
    db.query.studyMaterials.findMany({ where: eq(studyMaterials.moderationStatus, 'pending'), orderBy: [desc(studyMaterials.createdAt)], limit: 50, with: { uploader: { columns: { username: true } } } }),
    db.query.campusAlerts.findMany({ where: eq(campusAlerts.status, 'published'), orderBy: [desc(campusAlerts.createdAt)], limit: 50, with: { publisher: { columns: { username: true } } } }),
    db.select({
      id: reports.id, reason: reports.reason, details: reports.details, status: reports.status, createdAt: reports.createdAt,
      housingListingId: reports.housingListingId, roommateRequestId: reports.roommateRequestId,
      studyMaterialId: reports.studyMaterialId, campusAlertId: reports.campusAlertId,
      serviceListingId: reports.serviceListingId, reporter: users.username,
    }).from(reports).innerJoin(users, eq(reports.reporterId, users.id))
      .where(or(isNotNull(reports.housingListingId), isNotNull(reports.roommateRequestId), isNotNull(reports.studyMaterialId), isNotNull(reports.campusAlertId), isNotNull(reports.serviceListingId)))
      .orderBy(desc(reports.createdAt)).limit(100),
  ]);
  const v2Reports = reportRows.map((row) => {
    if (row.housingListingId) return { ...row, targetType: 'housing_listing', targetId: row.housingListingId };
    if (row.roommateRequestId) return { ...row, targetType: 'roommate_request', targetId: row.roommateRequestId };
    if (row.studyMaterialId) return { ...row, targetType: 'study_material', targetId: row.studyMaterialId };
    if (row.campusAlertId) return { ...row, targetType: 'campus_alert', targetId: row.campusAlertId };
    return { ...row, targetType: 'service_listing', targetId: row.serviceListingId ?? '' };
  });
  return NextResponse.json({ pendingMaterials, recentAlerts, reports: v2Reports }, { headers: { 'Cache-Control': 'private, no-store, max-age=0' } });
}

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!(await enforceRateLimit(request, 'admin-v2-action', 60, 60))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const action = parsed.data;
  if (action.action === 'moderate_material') {
    const [row] = await db.update(studyMaterials).set({ moderationStatus: action.status, updatedAt: new Date() }).where(eq(studyMaterials.id, action.materialId)).returning({ id: studyMaterials.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (action.action === 'official_alert') {
    const [row] = await db.update(campusAlerts).set({ trustLabel: action.official ? 'official' : 'community', updatedAt: new Date() }).where(eq(campusAlerts.id, action.alertId)).returning({ id: campusAlerts.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (action.action === 'remove_housing') {
    const [row] = await db.update(housingListings).set({ status: 'hidden', updatedAt: new Date() }).where(eq(housingListings.id, action.listingId)).returning({ id: housingListings.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (action.action === 'remove_roommate_request') {
    const [row] = await db.update(roommateRequests).set({ status: 'closed', updatedAt: new Date() }).where(eq(roommateRequests.id, action.requestId)).returning({ id: roommateRequests.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (action.action === 'remove_material') {
    const [row] = await db.update(studyMaterials).set({ moderationStatus: 'removed', updatedAt: new Date() }).where(eq(studyMaterials.id, action.materialId)).returning({ id: studyMaterials.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (action.action === 'remove_alert') {
    const [row] = await db.update(campusAlerts).set({ status: 'removed', updatedAt: new Date() }).where(eq(campusAlerts.id, action.alertId)).returning({ id: campusAlerts.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (action.action === 'remove_service') {
    const [row] = await db.update(serviceListings).set({ status: 'removed', updatedAt: new Date() }).where(eq(serviceListings.id, action.serviceId)).returning({ id: serviceListings.id });
    return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  const [row] = await db.update(reports).set({ status: action.status, updatedAt: new Date() }).where(eq(reports.id, action.reportId)).returning({ id: reports.id });
  return row ? NextResponse.json({ ok: true }) : NextResponse.json({ error: 'not_found' }, { status: 404 });
}
