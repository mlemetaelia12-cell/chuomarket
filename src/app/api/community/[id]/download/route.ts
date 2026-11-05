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
        fileUrl: true,
        authorId: true,
      },
    });

    if (
      !post ||
      post.type !== 'material' ||
      !post.fileUrl
    ) {
      return NextResponse.json(
        { error: 'not_found' },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    let bucket: string;
    let key: string;

    if (post.fileUrl.startsWith('r2-private:')) {
      const privateBucket = getPrivateR2Bucket();

      if (!privateBucket) {
        return NextResponse.json(
          { error: 'storage_not_configured' },
          {
            status: 503,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }

      bucket = privateBucket;

      key = post.fileUrl.slice('r2-private:'.length);

      if (
        !key.startsWith(`community/${post.authorId}/`) ||
        !key.endsWith('.pdf') ||
        key.includes('..') ||
        key.includes('\\')
      ) {
        return NextResponse.json(
          { error: 'file_unavailable' },
          {
            status: 404,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }
    } else {
      // Backwards compatibility for older public-bucket records.
      if (!r2Bucket || !r2PublicUrl) {
        return NextResponse.json(
          { error: 'storage_not_configured' },
          {
            status: 503,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }

      try {
        const base = new URL(r2PublicUrl);
        const objectUrl = new URL(post.fileUrl);

        const basePath = base.pathname.replace(/\/$/, '');

        const ownedPrefix =
          `${basePath}/community/${post.authorId}/`;

        if (
          base.protocol !== 'https:' ||
          objectUrl.protocol !== 'https:' ||
          objectUrl.origin !== base.origin ||
          !objectUrl.pathname.startsWith(ownedPrefix) ||
          !objectUrl.pathname.endsWith('.pdf') ||
          objectUrl.search ||
          objectUrl.hash
        ) {
          return NextResponse.json(
            { error: 'not_found' },
            {
              status: 404,
              headers: { 'Cache-Control': 'no-store' },
            },
          );
        }

        key = decodeURIComponent(
          objectUrl.pathname.slice(basePath.length + 1),
        );

        if (
          !key.startsWith(`community/${post.authorId}/`) ||
          key.includes('..') ||
          key.includes('\\')
        ) {
          return NextResponse.json(
            { error: 'not_found' },
            {
              status: 404,
              headers: { 'Cache-Control': 'no-store' },
            },
          );
        }

        bucket = r2Bucket;
      } catch {
        return NextResponse.json(
          { error: 'invalid_file_url' },
          {
            status: 404,
            headers: { 'Cache-Control': 'no-store' },
          },
        );
      }
    }

    const object = await getR2Client().send(
      new GetObjectCommand({
        Bucket: bucket,
        Key: key,
      }),
    );

    if (!object.Body) {
      return NextResponse.json(
        { error: 'file_unavailable' },
        {
          status: 404,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    if (
      typeof object.ContentLength === 'number' &&
      object.ContentLength > 5 * 1024 * 1024
    ) {
      return NextResponse.json(
        { error: 'file_too_large' },
        {
          status: 413,
          headers: { 'Cache-Control': 'no-store' },
        },
      );
    }

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition':
        `attachment; filename="chuo-market-material-${post.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });

    if (typeof object.ContentLength === 'number') {
      headers.set(
        'Content-Length',
        String(object.ContentLength),
      );
    }

    return new Response(
      object.Body.transformToWebStream(),
      {
        status: 200,
        headers,
      },
    );
  } catch (error) {
    console.error('Community material download failed.', {
      error,
    });

    return NextResponse.json(
      { error: 'file_unavailable' },
      {
        status: 503,
        headers: { 'Cache-Control': 'no-store' },
      },
    );
  }
}