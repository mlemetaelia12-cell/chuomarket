
import {
  GetObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
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
    photoUrl: z.string().min(1).max(512).optional(),
  }),
]);

function getPhotoKey(photoUrl: string, authorId: string): string | null {
  let key: string;

  if (photoUrl.startsWith('r2-private:')) {
    key = photoUrl.slice('r2-private:'.length);
  } else {
    if (!r2PublicUrl) return null;

    try {
      const baseUrl = new URL(r2PublicUrl);
      const imageUrl = new URL(photoUrl);
      const basePath = baseUrl.pathname.replace(/\/$/, '');

      if (
        imageUrl.protocol !== 'https:' ||
        imageUrl.origin !== baseUrl.origin ||
        imageUrl.search ||
        imageUrl.hash ||
        !imageUrl.pathname.startsWith(`${basePath}/community/${authorId}/`)
      ) {
        return null;
      }

      key = decodeURIComponent(
        imageUrl.pathname.slice(basePath.length + 1),
      );
    } catch {
      return null;
    }
  }

  if (
    !key.startsWith(`community/${authorId}/`) ||
    !key.endsWith('.webp') ||
    key.includes('..') ||
    key.includes('\\')
  ) {
    return null;
  }

  return key;
}

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

  let storage: ReturnType<typeof getR2Client> | null = null;

  if (r2PrivateBucket) {
    try {
      storage = getR2Client();
    } catch (error) {
      console.error('Community image storage initialization failed.', error);
    }
  }

  const posts = await Promise.all(
    rows.map(async (post) => {
      let photoUrl: string | null = null;

      if (
        post.type === 'lost_found' &&
        post.photoUrl &&
        storage &&
        r2PrivateBucket
      ) {
        const key = getPhotoKey(post.photoUrl, post.authorId);

        if (key) {
          try {
            photoUrl = await getSignedUrl(
              storage,
              new GetObjectCommand({
                Bucket: r2PrivateBucket,
                Key: key,
              }),
              { expiresIn: 300 },
            );
          } catch (error) {
            console.error('Community image signing failed.', {
              postId: post.id,
              error,
            });
          }
        }
      }

      return {
        id: post.id,
        type: post.type,
        title: post.title,
        description: post.description,
        course: post.course,
        year: post.year,
        meetingPlace: post.meetingPlace,
        photoUrl,
        postStatus: post.postStatus,
        lostFoundType: post.lostFoundType,
        createdAt: post.createdAt,
        author: {
          username: post.author.username,
          createdAt: post.author.createdAt,
        },
      };
    }),
  );

  return NextResponse.json(
    { posts },
    {
      headers: {
        'Cache-Control': 'private, no-store',
      },
    },
  );
}

export async function POST(request: Request) {
  const user = await requireMarketplaceUser();

  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  if (!(await enforceRateLimit(request, 'community-create', 8, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const parsed = schema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_post' }, { status: 400 });
  }

  const data = parsed.data;

  if (data.type === 'material') {
    if (
      !r2PrivateBucket ||
      !data.fileUrl.startsWith(`r2-private:community/${user.id}/`) ||
      !data.fileUrl.endsWith('.pdf') ||
      data.fileUrl.includes('..') ||
      data.fileUrl.includes('\\')
    ) {
      return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
    }

    const key = data.fileUrl.slice('r2-private:'.length);

    try {
      const storage = getR2Client();

      const metadata = await storage.send(
        new HeadObjectCommand({
          Bucket: r2PrivateBucket,
          Key: key,
        }),
      );

      if (
        !metadata.ContentLength ||
        metadata.ContentLength > 5 * 1024 * 1024 ||
        metadata.ContentLength < 5 ||
        metadata.ContentType?.split(';')[0].trim().toLowerCase() !==
          'application/pdf'
      ) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
      }

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

      const prefix = new TextDecoder().decode(
        await sample.Body.transformToByteArray(),
      );

      if (!prefix.includes('%PDF-')) {
        return NextResponse.json({ error: 'invalid_file' }, { status: 400 });
      }
    } catch (error) {
      console.error('Community PDF verification failed.', {
        userId: user.id,
        error,
      });

      return NextResponse.json(
        { error: 'file_verification_unavailable' },
        { status: 503 },
      );
    }
  }

  if (data.type === 'lost_found' && data.photoUrl) {
    const key = getPhotoKey(data.photoUrl, user.id);

    if (
      !r2PrivateBucket ||
      !key ||
      !data.photoUrl.startsWith(`r2-private:community/${user.id}/`)
    ) {
      return NextResponse.json({ error: 'invalid_photo' }, { status: 400 });
    }
  }

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

    if (reward) {
      await db
        .update(users)
        .set({
          points: sql`${users.points} + 10`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id));
    }
  }

  return NextResponse.json(
    {
      id: post.id,
      pointsAwarded: data.type === 'material' ? 10 : 0,
    },
    { status: 201 },
  );
}
