import { randomUUID } from 'node:crypto';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { getPrivateR2Bucket, getR2Client } from '@/lib/r2';

const schema = z.object({ contentType: z.literal('application/pdf'), size: z.number().int().positive().max(10 * 1024 * 1024) });

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'library-upload', 5, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_upload' }, { status: 400 });
  const bucket = getPrivateR2Bucket();
  if (!bucket) return NextResponse.json({ error: 'private_storage_not_configured' }, { status: 503 });
  try {
    const objectKey = `library/${user.id}/${randomUUID()}.pdf`;
    const command = new PutObjectCommand({ Bucket: bucket, Key: objectKey, ContentType: 'application/pdf', ContentLength: parsed.data.size });
    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 300 });
    return NextResponse.json({ uploadUrl, objectKey }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Library file signing failed.', error);
    return NextResponse.json({ error: 'upload_signing_failed' }, { status: 503 });
  }
}
