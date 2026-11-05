import 'server-only';

import { S3Client } from '@aws-sdk/client-s3';

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

export const r2Bucket = process.env.R2_BUCKET_NAME;
export const r2PrivateBucket =
  process.env.R2_PRIVATE_BUCKET_NAME || process.env.R2_BUCKET_NAME;
export const r2PublicUrl = process.env.R2_PUBLIC_URL?.replace(/\/$/, '');

export function getR2Client() {
  if (!accountId || !accessKeyId || !secretAccessKey || !r2Bucket) {
    throw new Error('Cloudflare R2 environment variables are not configured.');
  }

  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}
