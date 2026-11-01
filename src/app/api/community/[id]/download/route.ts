import { GetObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { communityPosts } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { getR2Client, r2Bucket, r2PrivateBucket, r2PublicUrl } from '@/lib/r2';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireMarketplaceUser();
  if (!user) {
    return NextResponse.json(
      { error: 'login_required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  const { id } = await params;
  const post = await db.query.communityPosts.findFirst({
    where: eq(communityPosts.id, id),
    columns: { id: true, type: true, fileUrl: true, authorId: true },
  });

  if (!post || post.type !== 'material' || !post.fileUrl) {
    return NextResponse.json(
      { error: 'not_found' },
      { status: 404, headers: { 'Cache-Control': 'no-store' } },
    );
  }

  try {
    let bucket: string | undefined;
    let key: string;

    if (post.fileUrl.startsWith('r2-private:')) {
      bucket = r2PrivateBucket;
      key = post.fileUrl.slice('r2-private:'.length);
      if (
        !bucket ||
        bucket === process.env.R2_BUCKET_NAME ||
        !key.startsWith(`community/${post.authorId}/`) ||
        !key.endsWith('.pdf') ||
        key.includes('..')
      ) {
        return NextResponse.json(
          { error: 'file_unavailable' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } },
        );
      }
    } else {
      // Backwards compatibility for older records created before private
      // material storage was introduced. New uploads never use this path.
      if (!r2Bucket || !r2PublicUrl) {
        return NextResponse.json(
          { error: 'storage_not_configured' },
          { status: 503, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      const base = new URL(r2PublicUrl);
      const objectUrl = new URL(post.fileUrl);
      const basePath = base.pathname.replace(/\/$/, '');
      const ownedPrefix = `${basePath}/community/${post.authorId}/`;

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
          { status: 404, headers: { 'Cache-Control': 'no-store' } },
        );
      }

      key = objectUrl.pathname.slice(basePath.length + 1);
      if (!key.startsWith(`community/${post.authorId}/`) || key.includes('..')) {
        return NextResponse.json(
          { error: 'not_found' },
          { status: 404, headers: { 'Cache-Control': 'no-store' } },
        );
      }
      bucket = r2Bucket;
    }

    const object = await getR2Client().send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!object.Body) {
      return NextResponse.json(
        { error: 'file_unavailable' },
        { status: 404, headers: { 'Cache-Control': 'no-store' } },
      );
    }

    const headers = new Headers({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="chuo-market-material-${post.id.slice(0, 8)}.pdf"`,
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
      'Content-Security-Policy': "default-src 'none'; sandbox",
    });
    if (typeof object.ContentLength === 'number') {
      headers.set('Content-Length', String(object.ContentLength));
    }

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Community material download failed.', {
      postId: post.id,
      error,
    });
    return NextResponse.json(
      { error: 'file_unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
