
import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getPrivateR2Bucket, getR2Client } from '@/lib/r2';

const schema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('pdf'),
    contentType: z.literal('application/pdf'),
    size: z.number().int().positive().max(5 * 1024 * 1024),
  }),
  z.object({
    kind: z.literal('photo'),
    contentType: z.literal('image/webp'),
    size: z.number().int().positive().max(200 * 1024),
  }),
]);

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'upload-community', 8, 60))) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429 },
    );
  }

  const user = await requireMarketplaceUser();

  if (!user) {
    return NextResponse.json(
      { error: 'unauthorized' },
      { status: 401 },
    );
  }

  const parsed = schema.safeParse(
    await request.json().catch(() => null),
  );

  if (!parsed.success) {
    return NextResponse.json(
      { error: 'invalid_upload' },
      { status: 400 },
    );
  }

  const privateBucket = getPrivateR2Bucket();
  if (!privateBucket) {
    console.error('[R2 CONFIG MISSING] Private bucket is not configured.');

    return NextResponse.json(
      { error: 'storage_not_configured' },
      { status: 503 },
    );
  }

  try {
    const extension = parsed.data.kind === 'pdf' ? 'pdf' : 'webp';

    const key = `community/${user.id}/${randomUUID()}.${extension}`;

    const command = new PutObjectCommand({
      Bucket: privateBucket,
      Key: key,
      ContentType: parsed.data.contentType,
      ContentLength: parsed.data.size,
    });

    const uploadUrl = await getSignedUrl(
      getR2Client(),
      command,
      { expiresIn: 300 },
    );

    return NextResponse.json({
      uploadUrl,
      fileUrl: `r2-private:${key}`,
    });
  } catch (error) {
    console.error('[R2 SIGNING ERROR]', error);

    return NextResponse.json(
      { error: 'storage_signing_failed' },
      { status: 500 },
    );
  }
}
