
import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const r2Bucket = process.env.R2_BUCKET_NAME?.trim();

export const r2PrivateBucket =
  process.env.R2_PRIVATE_BUCKET_NAME?.trim() || undefined;

export const r2PublicUrl =
  process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

export function getPrivateR2Bucket(): string | null {
  if (
    !r2PrivateBucket ||
    !r2Bucket ||
    r2PrivateBucket === r2Bucket
  ) {
    return null;
  }

  return r2PrivateBucket;
}

export function getR2Client(): S3Client {
  if (
    !accountId ||
    !accessKeyId ||
    !secretAccessKey ||
    !r2Bucket
  ) {
    throw new Error(
      'Cloudflare R2 environment variables are not configured.',
    );
  }

  return new S3Client({
    region: 'auto',
    requestChecksumCalculation: 'WHEN_REQUIRED',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });
}
