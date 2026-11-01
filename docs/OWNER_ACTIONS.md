# Chuo Market — owner actions and production blockers

These items cannot safely be completed using source-code changes alone. They need owner decisions, credentials, external accounts, a production domain, or legal review.

## 1. Rotate credentials from the original uploaded archive

The original ZIP contained `.env` with live-looking database, Cloudflare R2, Pesapal and cron secrets. The delivered project excludes that file. Treat every credential in the upload as exposed and rotate it directly in the relevant provider console. Update only the private local/Vercel environment after rotation. Do not send replacement secrets in chat.

## 2. Verify the actual database migration state

The migration files and Drizzle metadata were preserved unchanged. The archive alone cannot prove which migrations have been applied to the owner's Neon database. Back up the target database; inspect the migration tracking table; compare each expected migration and deployed SQL function; reconcile the empty 0010 file, the 0010 `.sqlcode` sidecar, the 0011 file and journal timestamp anomaly. Do not run `db:push`, generate a migration, reset, or apply migrations until this is reviewed and approved.

## 3. Create and configure the private R2 bucket for study materials

Create a separate Cloudflare R2 bucket for Notes & Past Papers PDFs. It must not be the same as `R2_BUCKET_NAME`, and it must not have public bucket access or a public custom domain. Set its bucket name as `R2_PRIVATE_BUCKET_NAME` in Vercel. Configure the existing R2 credentials with the minimum required `PutObject`, `GetObject`, `HeadObject`, `ListBucket` and `DeleteObject` permissions on both the intended buckets. Configure CORS for the app's HTTPS origin and `PUT` with `Content-Type: application/pdf` only. Test upload, header verification, authenticated download and orphan cleanup on a non-production bucket.

Existing community PDF records currently point to public R2 URLs for backward compatibility. Migrate each required legacy object into the private bucket and update the existing text field safely before removing the old public object. No migration script or live data copy was run in this audit.

## 4. Account deletion and payment retention design

The app currently has no complete self-service account deletion flow or public deletion-request webpage. Do not add a blind cascading deletion. The current schema declares `orders.user_id` with `ON DELETE RESTRICT`, meaning users with order history cannot simply be deleted without a reviewed retention/anonymisation model. Payment records may have statutory/accounting retention obligations. A safe design needs owner/legal approval on:

- Which account/profile data is deleted, anonymised, or retained.
- Treatment of paid orders, receipts, subscriptions, listings, reports, community posts, uploaded R2 images/files, referrals and reward history.
- Whether content is removed, anonymised, or retained for moderation/safety reasons.
- The verified support email or contact channel and the public deletion URL.
- Identity/ownership checks, confirmation, processing time, audit evidence and appeals.

After those decisions, design an API/UI plan and a separate migration proposal if storage for deletion requests or retention status is required. Current policy expects an in-app deletion pathway and a public web resource for accounts created in the app; verify exact current requirements before Play submission.

## 5. Terms, privacy, prohibited goods and reporting policy

No legal document has been fabricated in this code package. Owner and qualified legal review are needed for the operator's legal identity, contact, data controller disclosures, processors (Neon, Vercel, Cloudflare, Pesapal), lawful basis/purposes, retention, user rights, cross-border processing, payment disputes/refunds, prohibited categories, listing/user reports, appeals, and moderation timelines. Publish only after facts and URLs are confirmed.

## 6. External integrations and deployment

- Create/verify owner-controlled Vercel, Neon, Cloudflare and Pesapal accounts.
- Rotate the exposed credentials first.
- Use distinct Preview and Production environment variables and databases.
- Set canonical HTTPS `BETTER_AUTH_URL` and `APP_BASE_URL`.
- Verify R2 CORS and object access using test images/files.
- Complete Pesapal sandbox checkout, callback, IPN, status query, duplicate IPN, provider timeout and reversal tests. Do not set `PESAPAL_ENV=live` until owner approval.
- Confirm cron schedule and the `CRON_SECRET` authorization path.

## 7. Google Play / Android

Confirm the production domain, Android package ID, support contact, legal URLs, app branding and signing-key custody. Determine the correct Play Billing treatment for seller subscriptions and promotion features; website Pesapal remains separate. Account deletion must be designed before Play submission. Read `ANDROID_PLAY_STORE.md`.

## 8. Final QA that needs owner-controlled environments

Use two or more separate test accounts with different roles, a non-production database, R2 sandbox/test bucket, Pesapal sandbox, current Chrome/Android devices and preview deployment. Verify authorization and object ownership across accounts, all marketplace/subscription/community flows, English/Swahili routes, accessibility, mobile breakpoints, payment reconciliation, deletion, and restore from backup. The QA matrix clearly labels items not run in this source-only environment.
