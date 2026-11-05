
import { GetObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import { listingImages, listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { getR2Client, r2Bucket, r2PublicUrl } from '@/lib/r2';

function getImageKey(fileUrl: string, ownerId: string): string | null {
  if (!r2PublicUrl) return null;

  try {
    const baseUrl = new URL(r2PublicUrl);
    const imageUrl = new URL(fileUrl);
    const basePath = baseUrl.pathname.replace(/\/$/, '');

    if (
      baseUrl.protocol !== 'https:' ||
      imageUrl.protocol !== 'https:' ||
      imageUrl.origin !== baseUrl.origin ||
      imageUrl.search ||
      imageUrl.hash ||
      !imageUrl.pathname.startsWith(
        `${basePath}/listings/${ownerId}/`,
      )
    ) {
      return null;
    }

    const key = decodeURIComponent(
      imageUrl.pathname.slice(basePath.length + 1),
    );

    if (
      !key.startsWith(`listings/${ownerId}/`) ||
      !key.endsWith('.webp') ||
      key.includes('..') ||
      key.includes('\\')
    ) {
      return null;
    }

    return key;
  } catch {
    return null;
  }
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      imageId,
    )
  ) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const image = await db
    .select({
      fileUrl: listingImages.fileUrl,
      ownerId: listings.ownerId,
      status: listings.status,
    })
    .from(listingImages)
    .innerJoin(listings, eq(listingImages.listingId, listings.id))
    .where(eq(listingImages.id, imageId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!image || !r2Bucket) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  if (image.status !== 'published') {
    const user = await requireMarketplaceUser();

    if (!user || user.id !== image.ownerId) {
      return NextResponse.json({ error: 'not_found' }, { status: 404 });
    }
  }

  const key = getImageKey(image.fileUrl, image.ownerId);

  if (!key) {
    return NextResponse.json({ error: 'invalid_image' }, { status: 404 });
  }

  try {
    const object = await getR2Client().send(
      new GetObjectCommand({
        Bucket: r2Bucket,
        Key: key,
      }),
    );

    if (
      !object.Body ||
      !object.ContentLength ||
      object.ContentLength > 200 * 1024 ||
      object.ContentType?.split(';')[0].trim().toLowerCase() !==
        'image/webp'
    ) {
      return NextResponse.json({ error: 'invalid_image' }, { status: 404 });
    }

    const headers = new Headers({
      'Content-Type': 'image/webp',
      'Content-Disposition': 'inline',
      'Cache-Control': 'private, no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff',
    });

    headers.set('Content-Length', String(object.ContentLength));

    return new Response(object.Body.transformToWebStream(), {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error('Listing image retrieval failed.', {
      imageId,
      error,
    });

    return NextResponse.json(
      { error: 'image_unavailable' },
      { status: 503 },
    );
  }
}
