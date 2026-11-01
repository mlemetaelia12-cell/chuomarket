import { NextResponse } from 'next/server';
import { and, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { authUsers, pointEvents, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const schema = z.object({ ref: z.string().trim().min(3).max(32).regex(/^[a-z0-9_]+$/) });

export async function POST(request: Request) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_referral' }, { status: 400 });
  const authUser = await db.query.authUsers.findFirst({ where: eq(authUsers.id, user.authUserId ?? '') });
  if (!authUser || Date.now() - authUser.createdAt.getTime() > 24 * 60 * 60 * 1000) return NextResponse.json({ claimed: false, reason: 'signup_window_expired' });
  const referrer = await db.query.users.findFirst({ where: eq(users.username, parsed.data.ref.toLowerCase()) });
  if (!referrer || referrer.id === user.id || user.referredBy) return NextResponse.json({ claimed: false });
  const [claimed] = await db.update(users).set({ referredBy: referrer.id, updatedAt: new Date() }).where(and(eq(users.id, user.id), sql`${users.referredBy} IS NULL`, ne(users.id, referrer.id))).returning({ id: users.id });
  if (!claimed) return NextResponse.json({ claimed: false });
  const [reward] = await db.insert(pointEvents).values({ userId: referrer.id, type: 'referral', points: 0, description: `Referral reward: 2 Featured days for @${user.username}`, referenceId: user.id, metadata: { featuredDays: 2 } }).onConflictDoNothing().returning({ id: pointEvents.id });
  if (reward) await db.update(users).set({ featuredDaysCredit: sql`${users.featuredDaysCredit} + 2`, updatedAt: new Date() }).where(eq(users.id, referrer.id));
  return NextResponse.json({ claimed: true });
}
