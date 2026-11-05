import { and, desc, eq, gte, isNotNull, isNull, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { authUsers, communityPosts, listings, orders, plans, reports, users } from '@/db/schema';
import { getAdminActor } from '@/lib/admin';
import { auth } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rate-limit';

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('resolve_report'),
    reportId: z.string().uuid(),
    status: z.enum(['reviewing', 'resolved', 'dismissed']),
  }),
  z.object({ action: z.literal('delete_listing'), listingId: z.string().uuid() }),
  z.object({ action: z.literal('delete_community_post'), postId: z.string().uuid() }),
  z.object({ action: z.literal('ban_user'), userId: z.string().uuid() }),
  z.object({ action: z.literal('unban_user'), userId: z.string().uuid() }),
  z.object({
    action: z.literal('update_plan'),
    planId: z.string().uuid(),
    priceTsh: z.number().int().min(0).max(100000000),
  }),
  z.object({
    action: z.literal('set_role'),
    userId: z.string().uuid(),
    role: z.enum(['user', 'admin']),
  }),
  z.object({
    action: z.literal('reset_password'),
    authUserId: z.string().min(1),
    newPassword: z.string().min(8).max(128),
  }),
]);

export const dynamic = 'force-dynamic';

export async function GET() {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const reportRows = await db
    .select({
      id: reports.id,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      listingId: reports.listingId,
      communityPostId: reports.communityPostId,
      reportedUserId: reports.reportedUserId,
      reporter: users.username,
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(or(
      isNotNull(reports.listingId),
      isNotNull(reports.communityPostId),
      and(isNotNull(reports.reportedUserId), isNull(reports.housingListingId), isNull(reports.roommateRequestId), isNull(reports.studyMaterialId), isNull(reports.campusAlertId), isNull(reports.serviceListingId)),
    ))
    .orderBy(desc(reports.createdAt))
    .limit(100);
  if (actor.role !== 'superadmin') {
    return NextResponse.json(
      { reports: reportRows },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }

  const [userCount] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
  const [newUsers] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(users)
    .where(gte(users.createdAt, sql`now() - interval '30 days'`));
  const [revenue] = await db
    .select({ total: sql<number>`coalesce(sum(${orders.amountTsh}), 0)::int` })
    .from(orders)
    .where(eq(orders.status, 'completed'));
  const orderRows = await db
    .select({
      id: orders.id,
      username: users.username,
      type: orders.type,
      amountTsh: orders.amountTsh,
      status: orders.status,
      paymentMethod: orders.paymentMethod,
      createdAt: orders.createdAt,
    })
    .from(orders)
    .innerJoin(users, eq(orders.userId, users.id))
    .orderBy(desc(orders.createdAt))
    .limit(100);
  const planRows = await db
    .select({
      id: plans.id,
      code: plans.code,
      name: plans.name,
      priceTsh: plans.priceTsh,
      durationDays: plans.durationDays,
      active: plans.active,
    })
    .from(plans)
    .orderBy(plans.priceTsh);
  const userRows = await db
    .select({
      id: users.id,
      authUserId: users.authUserId,
      username: users.username,
      role: users.role,
      banned: users.banned,
      createdAt: users.createdAt,
    })
    .from(users)
    .orderBy(desc(users.createdAt))
    .limit(100);
  return NextResponse.json(
    {
      reports: reportRows,
      stats: {
        users: userCount?.count ?? 0,
        newUsers30Days: newUsers?.count ?? 0,
        revenueTsh: revenue?.total ?? 0,
      },
      orders: orderRows,
      plans: planRows,
      users: userRows,
    },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  );
}

export async function POST(request: Request) {
  const actor = await getAdminActor();
  if (!actor) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  if (!(await enforceRateLimit(request, 'admin-action', 60, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
  const data = parsed.data;
  const superOnly = ['update_plan', 'set_role', 'reset_password'].includes(data.action);
  if (superOnly && actor.role !== 'superadmin')
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });

  if (data.action === 'resolve_report') {
    const [row] = await db
      .update(reports)
      .set({ status: data.status, updatedAt: new Date() })
      .where(eq(reports.id, data.reportId))
      .returning({ id: reports.id });
    return row
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (data.action === 'delete_listing') {
    const [row] = await db
      .delete(listings)
      .where(eq(listings.id, data.listingId))
      .returning({ id: listings.id });
    return row
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (data.action === 'delete_community_post') {
    const [row] = await db
      .delete(communityPosts)
      .where(eq(communityPosts.id, data.postId))
      .returning({ id: communityPosts.id });
    return row
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (data.action === 'ban_user' || data.action === 'unban_user') {
    const target = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (
      !target ||
      target.role === 'superadmin' ||
      target.authUserId === actor.id ||
      (actor.role !== 'superadmin' && target.role !== 'user')
    ) {
      return NextResponse.json({ error: 'not_allowed' }, { status: 403 });
    }

    const banned = data.action === 'ban_user';
    await db.update(users).set({ banned, updatedAt: new Date() }).where(eq(users.id, target.id));

    // Keep Better Auth's own ban state in sync so its built-in session and
    // admin-plugin checks agree with the marketplace authorization guards.
    if (target.authUserId) {
      await db
        .update(authUsers)
        .set({
          banned,
          banReason: banned ? 'Suspended by Chuo Market administration.' : null,
          banExpires: null,
          updatedAt: new Date(),
        })
        .where(eq(authUsers.id, target.authUserId));
    }

    return NextResponse.json({ ok: true });
  }
  if (data.action === 'update_plan') {
    const [row] = await db
      .update(plans)
      .set({ priceTsh: data.priceTsh, updatedAt: new Date() })
      .where(eq(plans.id, data.planId))
      .returning({ id: plans.id });
    return row
      ? NextResponse.json({ ok: true })
      : NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (data.action === 'set_role') {
    const target = await db.query.users.findFirst({ where: eq(users.id, data.userId) });
    if (
      !target ||
      target.role === 'superadmin' ||
      target.authUserId === actor.id ||
      !target.authUserId
    )
      return NextResponse.json({ error: 'not_allowed' }, { status: 403 });
    await db
      .update(users)
      .set({ role: data.role, updatedAt: new Date() })
      .where(eq(users.id, target.id));
    await db
      .update(authUsers)
      .set({ role: data.role, updatedAt: new Date() })
      .where(eq(authUsers.id, target.authUserId));
    return NextResponse.json({ ok: true });
  }
  if (data.action === 'reset_password') {
    const target = await db.query.authUsers.findFirst({ where: eq(authUsers.id, data.authUserId) });
    if (!target) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    await auth.api.setUserPassword({
      body: { userId: target.id, newPassword: data.newPassword },
      headers: request.headers,
    });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: 'invalid_request' }, { status: 400 });
}
