import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getR2Client, r2Bucket } from '@/lib/r2';

const schema = z.object({
  feature: z.enum(['housing', 'services']),
  contentType: z.literal('image/webp'),
  size: z.number().int().positive().max(200 * 1024),
});

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'v2-image-upload', 12, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_upload' }, { status: 400 });
  if (!r2Bucket) return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 });

  try {
    const objectKey = `${parsed.data.feature}/${user.id}/${randomUUID()}.webp`;
    const command = new PutObjectCommand({
      Bucket: r2Bucket,
      Key: objectKey,
      ContentType: 'image/webp',
      ContentLength: parsed.data.size,
    });
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });
    return NextResponse.json({ uploadUrl, objectKey }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('V2 image signing failed.', error);
    return NextResponse.json({ error: 'upload_signing_failed' }, { status: 503 });
  }
}
