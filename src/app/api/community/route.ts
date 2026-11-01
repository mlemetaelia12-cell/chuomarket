import { HeadObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { NextResponse } from 'next/server';
import { desc, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { communityPosts, pointEvents, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { getR2Client, r2PrivateBucket, r2PublicUrl } from '@/lib/r2';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('material'),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(5).max(5000),
    course: z.string().trim().min(2).max(120),
    year: z.number().int().min(1950).max(2100),
    fileUrl: z.string().min(1).max(512),
  }),
  z.object({
    type: z.literal('room'),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(5).max(5000),
    meetingPlace: z.string().trim().min(2).max(180),
  }),
  z.object({
    type: z.literal('lost_found'),
    title: z.string().trim().min(3).max(160),
    description: z.string().trim().min(5).max(5000),
    meetingPlace: z.string().trim().min(2).max(180),
    lostFoundType: z.enum(['lost', 'found']),
    postStatus: z.enum(['open', 'resolved']).optional(),
    photoUrl: z.string().url().optional(),
  }),
]);

export async function GET(request: Request) {
  const type = new URL(request.url).searchParams.get('type');
  const rows = await db.query.communityPosts.findMany({
    where:
      type === 'material' || type === 'room' || type === 'lost_found'
        ? eq(communityPosts.type, type)
        : undefined,
    orderBy: [desc(communityPosts.createdAt)],
    limit: 60,
    with: { author: true },
  });
  return NextResponse.json({
    posts: rows.map((post) => ({
      id: post.id,
      type: post.type,
      title: post.title,
      description: post.description,
      course: post.course,
      year: post.year,
      meetingPlace: post.meetingPlace,
      photoUrl: post.photoUrl,
      postStatus: post.postStatus,
      lostFoundType: post.lostFoundType,
      createdAt: post.createdAt,
      author: { username: post.author.username, createdAt: post.author.createdAt },
    })),
  });
}

export async function POST(request: Request) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await enforceRateLimit(request, 'community-create', 8, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_post' }, { status: 400 });
  const data = parsed.data;
  if (data.type === 'material') {
    if (
      !r2PrivateBucket ||
      r2PrivateBucket === process.env.R2_BUCKET_NAME ||
      !data.fileUrl.startsWith(`r2-private:community/${user.id}/`) ||
      !data.fileUrl.endsWith('.pdf') ||
      data.fileUrl.includes('..')
    ) {
      return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
    }

    const key = data.fileUrl.slice('r2-private:'.length);
    try {
      const storage = getR2Client();
      const metadata = await storage.send(
        new HeadObjectCommand({ Bucket: r2PrivateBucket, Key: key }),
      );
      if (
        !metadata.ContentLength ||
        metadata.ContentLength > 5 * 1024 * 1024 ||
        metadata.ContentLength < 5 ||
        metadata.ContentType?.split(';')[0].trim().toLowerCase() !== 'application/pdf'
      ) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
      }

      // Verify the PDF header bytes before granting the one-time notes reward.
      const sample = await storage.send(
        new GetObjectCommand({
          Bucket: r2PrivateBucket,
          Key: key,
          Range: 'bytes=0-1023',
        }),
      );
      if (!sample.Body) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
      }
      const prefix = new TextDecoder().decode(await sample.Body.transformToByteArray());
      if (!prefix.includes('%PDF-')) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
      }
    } catch (error) {
      console.error('Community PDF verification failed.', { userId: user.id, error });
      return NextResponse.json({ error: 'file_verification_unavailable' }, { status: 503 });
    }
  }
  if (
    data.type === 'lost_found' &&
    data.photoUrl &&
    (!r2PublicUrl ||
      !data.photoUrl.startsWith(`${r2PublicUrl}/community/${user.id}/`) ||
      !data.photoUrl.endsWith('.webp'))
  )
    return NextResponse.json({ error: 'invalid_photo' }, { status: 400 });
  const [post] = await db
    .insert(communityPosts)
    .values({ authorId: user.id, ...data })
    .returning({ id: communityPosts.id });
  if (data.type === 'material') {
    const [reward] = await db
      .insert(pointEvents)
      .values({
        userId: user.id,
        type: 'notes_post',
        points: 10,
        description: 'Notes or past paper posted',
        referenceId: post.id,
      })
      .onConflictDoNothing()
      .returning({ id: pointEvents.id });
    if (reward)
      await db
        .update(users)
        .set({ points: sql`${users.points} + 10`, updatedAt: new Date() })
        .where(eq(users.id, user.id));
  }
  return NextResponse.json(
    { id: post.id, pointsAwarded: data.type === 'material' ? 10 : 0 },
    { status: 201 },
  );
}
