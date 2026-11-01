import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { and, eq, gt, inArray, lt, lte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { db } from '@/db';
import {
  communityPosts,
  listingImages,
  listings,
  subscriptions,
  userNotifications,
} from '@/db/schema';
import { getR2Client, r2Bucket, r2PrivateBucket, r2PublicUrl } from '@/lib/r2';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const reminderWindow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Synchronize seller listings with their current active plans.
  await db.execute(sql`
    SELECT public.sync_subscription_listings()
  `);

  // Delete drafts older than 30 days.
  const staleDrafts = await db
    .select({ id: listings.id })
    .from(listings)
    .where(and(eq(listings.status, 'draft'), lt(listings.createdAt, cutoff)));

  if (staleDrafts.length > 0) {
    await db.delete(listings).where(
      inArray(
        listings.id,
        staleDrafts.map((row) => row.id),
      ),
    );
  }

  // Remind only subscriptions that have started and
  // will expire within the next three days.
  const expiring = await db
    .select({
      id: subscriptions.id,
      userId: subscriptions.userId,
    })
    .from(subscriptions)
    .where(
      and(
        lte(subscriptions.startsAt, now),
        gt(subscriptions.subscriptionUntil, now),
        lte(subscriptions.subscriptionUntil, reminderWindow),
      ),
    );

  for (const subscription of expiring) {
    await db
      .insert(userNotifications)
      .values({
        userId: subscription.userId,
        subscriptionId: subscription.id,
        kind: 'plan_expiring_soon',
        message: 'Your Chuo Market plan expires within 3 days. Renew to keep your listings active.',
      })
      .onConflictDoNothing();
  }

  // Remove old, unreferenced Cloudflare R2 files. Listing images and
  // lost/found photos remain in the public bucket; newly uploaded study
  // material PDFs are stored in a separate private bucket.
  let deletedOrphans = 0;

  const [imageRows, postRows] = await Promise.all([
    db.select({ url: listingImages.fileUrl }).from(listingImages),
    db
      .select({
        fileUrl: communityPosts.fileUrl,
        photoUrl: communityPosts.photoUrl,
      })
      .from(communityPosts),
  ]);

  const publicReferences = new Set<string>([
    ...imageRows.map((row) => row.url),
    ...postRows.flatMap((row) =>
      [row.fileUrl, row.photoUrl].filter((value): value is string =>
        Boolean(value && !value.startsWith('r2-private:')),
      ),
    ),
  ]);
  const privateReferences = new Set<string>(
    postRows
      .map((row) => row.fileUrl)
      .filter((value): value is string => Boolean(value?.startsWith('r2-private:'))),
  );

  const hasConfiguredR2Bucket = Boolean((r2Bucket && r2PublicUrl) || r2PrivateBucket);
  const client = hasConfiguredR2Bucket ? getR2Client() : null;

  if (r2Bucket && r2PublicUrl && client) {
    for (const prefix of ['listings/', 'community/']) {
      let continuationToken: string | undefined;

      do {
        const page = await client.send(
          new ListObjectsV2Command({
            Bucket: r2Bucket,
            Prefix: prefix,
            ContinuationToken: continuationToken,
          }),
        );

        const staleKeys = (page.Contents ?? [])
          .filter((object) => object.Key && object.LastModified && object.LastModified < cutoff)
          .filter((object) => !publicReferences.has(`${r2PublicUrl}/${object.Key}`))
          .map((object) => ({ Key: object.Key! }));

        if (staleKeys.length > 0) {
          await client.send(
            new DeleteObjectsCommand({
              Bucket: r2Bucket,
              Delete: { Objects: staleKeys, Quiet: true },
            }),
          );
          deletedOrphans += staleKeys.length;
        }

        continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
      } while (continuationToken);
    }
  }

  if (r2PrivateBucket && client) {
    let continuationToken: string | undefined;
    do {
      const page = await client.send(
        new ListObjectsV2Command({
          Bucket: r2PrivateBucket,
          Prefix: 'community/',
          ContinuationToken: continuationToken,
        }),
      );
      const staleKeys = (page.Contents ?? [])
        .filter((object) => object.Key && object.LastModified && object.LastModified < cutoff)
        .filter((object) => !privateReferences.has(`r2-private:${object.Key}`))
        .map((object) => ({ Key: object.Key! }));

      if (staleKeys.length > 0) {
        await client.send(
          new DeleteObjectsCommand({
            Bucket: r2PrivateBucket,
            Delete: { Objects: staleKeys, Quiet: true },
          }),
        );
        deletedOrphans += staleKeys.length;
      }

      continuationToken = page.IsTruncated ? page.NextContinuationToken : undefined;
    } while (continuationToken);
  }

  return NextResponse.json({
    ok: true,
    synchronizedSubscriptions: true,
    deletedDrafts: staleDrafts.length,
    deletedOrphanedR2Files: deletedOrphans,
    planExpiryRemindersCreated: expiring.length,
  });
}
