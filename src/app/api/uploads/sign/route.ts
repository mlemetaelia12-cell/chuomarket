import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getR2Client, r2Bucket, r2PublicUrl } from '@/lib/r2';

const requestSchema = z.object({
  contentType: z.literal('image/webp'),
  size: z.number().int().positive().max(200 * 1024),
});

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'upload-listing', 10, 60))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_upload' }, { status: 400 });
  if (!r2PublicUrl || !r2Bucket) return NextResponse.json({ error: 'storage_not_configured' }, { status: 503 });

  const key = `listings/${user.id}/${randomUUID()}.webp`;
  const command = new PutObjectCommand({
    Bucket: r2Bucket,
    Key: key,
    ContentType: parsed.data.contentType,
    ContentLength: parsed.data.size,
  });
  const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });
  return NextResponse.json({ uploadUrl, fileUrl: `${r2PublicUrl}/${key}`, key });
}
