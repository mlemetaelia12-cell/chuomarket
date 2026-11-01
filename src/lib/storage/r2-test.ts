
import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

async function testR2Connection() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const bucketName = process.env.R2_BUCKET_NAME;

  if (!accountId || !accessKeyId || !secretAccessKey || !bucketName) {
    throw new Error("R2 environment variables are missing.");
  }

  const { S3Client, HeadBucketCommand } = await import(
    "@aws-sdk/client-s3"
  );

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  try {
    await client.send(
      new HeadBucketCommand({
        Bucket: bucketName,
      }),
    );

    console.log("Cloudflare R2 connected successfully!");
    console.log("Bucket:", bucketName);
  } catch (error) {
    console.error("R2 connection failed:", error);
    process.exitCode = 1;
  } finally {
    client.destroy();
  }
}

testR2Connection();
