
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { communityPosts } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import {
  getPrivateR2Bucket,
  getR2Client,
  r2Bucket,
  r2PublicUrl,
} from '@/lib/r2';

function getPhotoKey(
  photoUrl: string,
  authorId: string,
): { key: string; bucket: string } | null {
  let key: string;
  let bucket: string;

  if (photoUrl.startsWith('r2-private:')) {
    const privateBucket = getPrivateR2Bucket();

    if (!privateBucket) return null;

    bucket = privateBucket;
    key = photoUrl.slice('r2-private:'.length);
  } else {
    if (!r2PublicUrl || !r2Bucket) return null;

    try {
      const baseUrl = new URL(r2PublicUrl);
      const imageUrl = new URL(photoUrl);

      const basePath = baseUrl.pathname.replace(/\/$/, '');

      if (
        baseUrl.protocol !== 'https:' ||
        imageUrl.protocol !== 'https:' ||
        imageUrl.origin !== baseUrl.origin ||
        imageUrl.search ||
        imageUrl.hash ||
        !imageUrl.pathname.startsWith(
          `${basePath}/community/${authorId}/`,
        )
      ) {
        return null;
      }

      bucket = r2Bucket;

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

  return { key, bucket };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireMarketplaceUser();

    if (!user) {
      return NextResponse.json(
        { error: 'login_required' },
        {
          status: 401,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const { id } = await params;

    const post = await db.query.communityPosts.findFirst({
      where: eq(communityPosts.id, id),
      columns: {
        id: true,
        type: true,
        authorId: true,
        photoUrl: true,
      },
    });

    if (
      !post ||
      post.type !== 'lost_found' ||
      !post.photoUrl
    ) {
      return NextResponse.json(
        { error: 'not_found' },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const photo = getPhotoKey(
      post.photoUrl,
      post.authorId,
    );

    if (!photo) {
      return NextResponse.json(
        { error: 'invalid_photo' },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const object = await getR2Client().send(
      new GetObjectCommand({
        Bucket: photo.bucket,
        Key: photo.key,
      }),
    );

    if (
      !object.Body ||
      typeof object.ContentLength !== 'number' ||
      object.ContentLength > 200 * 1024 ||
      object.ContentLength <= 0 ||
      object.ContentType
        ?.split(';')[0]
        .trim()
        .toLowerCase() !== 'image/webp'
    ) {
      return NextResponse.json(
        { error: 'invalid_photo' },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const headers = new Headers({
      'Content-Type': 'image/webp',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });

    headers.set(
      'Content-Length',
      String(object.ContentLength),
    );

    return new Response(
      object.Body.transformToWebStream(),
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error('Community photo retrieval failed.', {
      error,
    });

    return NextResponse.json(
      { error: 'photo_unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}
