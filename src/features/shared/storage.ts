import 'server-only';

import { GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, getPrivateR2Bucket, r2Bucket } from '@/lib/r2';

const MAX_IMAGE_BYTES = 200 * 1024;
const MAX_LIBRARY_BYTES = 10 * 1024 * 1024;

export type PublicImageFeature = 'housing' | 'services';

export async function verifyPublicImageKeys(
  ownerId: string,
  feature: PublicImageFeature,
  keys: string[],
): Promise<boolean> {
  if (keys.length === 0) return true;
  if (!r2Bucket || keys.length > 4 || new Set(keys).size !== keys.length) return false;
  const client = getR2Client();

  for (const key of keys) {
    if (
      key.length > 500 ||
      key.includes('..') ||
      key.includes('\\') ||
      !key.startsWith(`${feature}/${ownerId}/`) ||
      !key.endsWith('.webp')
    ) {
      return false;
    }

    try {
      const object = await client.send(new HeadObjectCommand({ Bucket: r2Bucket, Key: key }));
      if (
        object.ContentType !== 'image/webp' ||
        typeof object.ContentLength !== 'number' ||
        object.ContentLength < 1 ||
        object.ContentLength > MAX_IMAGE_BYTES
      ) {
        return false;
      }
      const sample = await client.send(new GetObjectCommand({ Bucket: r2Bucket, Key: key, Range: 'bytes=0-11' }));
      if (!sample.Body) return false;
      const signature = new TextDecoder().decode(await sample.Body.transformToByteArray());
      if (!signature.startsWith('RIFF') || signature.slice(8, 12) !== 'WEBP') return false;
    } catch {
      return false;
    }
  }

  return true;
}

export async function verifyPrivatePdf(
  ownerId: string,
  key: string,
  expectedSize: number,
): Promise<boolean> {
  const bucket = getPrivateR2Bucket();
  if (
    !bucket ||
    !Number.isInteger(expectedSize) ||
    expectedSize < 1 ||
    expectedSize > MAX_LIBRARY_BYTES ||
    key.length > 500 ||
    key.includes('..') ||
    key.includes('\\') ||
    !key.startsWith(`library/${ownerId}/`) ||
    !key.endsWith('.pdf')
  ) {
    return false;
  }

  try {
    const client = getR2Client();
    const object = await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    if (object.ContentType !== 'application/pdf' || object.ContentLength !== expectedSize || object.ContentLength > MAX_LIBRARY_BYTES) return false;
    const sample = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key, Range: 'bytes=0-1023' }));
    if (!sample.Body) return false;
    const signature = new TextDecoder().decode(await sample.Body.transformToByteArray());
    return signature.includes('%PDF-');
  } catch {
    return false;
  }
}
