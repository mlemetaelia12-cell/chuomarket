import { NextResponse } from 'next/server';
import { eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { communityAnswers, communityPosts, pointEvents, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

const schema = z.object({ body: z.string().trim().min(2).max(2000) });

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await params;
  const post = await db.query.communityPosts.findFirst({ where: eq(communityPosts.id, id) });
  if (!post) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_answer' }, { status: 400 });
  const [answer] = await db.insert(communityAnswers).values({ postId: id, authorId: user.id, body: parsed.data.body }).onConflictDoNothing().returning({ id: communityAnswers.id });
  if (!answer) return NextResponse.json({ error: 'already_answered' }, { status: 409 });
  await db.insert(pointEvents).values({ userId: user.id, type: 'answer_post', points: 5, description: 'Answered a community post', referenceId: answer.id });
  await db.update(users).set({ points: sql`${users.points} + 5`, updatedAt: new Date() }).where(eq(users.id, user.id));
  return NextResponse.json({ id: answer.id, pointsAwarded: 5 }, { status: 201 });
}
