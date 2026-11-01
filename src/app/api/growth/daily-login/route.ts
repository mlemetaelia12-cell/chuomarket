import { NextResponse } from 'next/server';
import { sql, eq } from 'drizzle-orm';
import { db } from '@/db';
import { dailyPointClaims, pointEvents, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

export async function POST() {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const date = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Dar_es_Salaam' }).format(new Date());
  const [claim] = await db.insert(dailyPointClaims).values({ userId: user.id, claimDate: date }).onConflictDoNothing().returning({ userId: dailyPointClaims.userId });
  if (!claim) return NextResponse.json({ awarded: false, points: user.points });
  await db.insert(pointEvents).values({ userId: user.id, type: 'daily_login', points: 5, description: `Daily login ${date}` });
  const [updated] = await db.update(users).set({ points: sql`${users.points} + 5`, updatedAt: new Date() }).where(eq(users.id, user.id)).returning({ points: users.points });
  return NextResponse.json({ awarded: true, awardedPoints: 5, points: updated?.points ?? user.points + 5 });
}
