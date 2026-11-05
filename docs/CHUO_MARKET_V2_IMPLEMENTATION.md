# Chuo Market V2 implementation handoff

This document describes the additive V2 modules included in this source package. Existing Marketplace, Community, authentication, billing and payment behavior is intentionally left in place.

## Modules

### Housing and roommate finder

- `housing_listings` stores rooms, hostels and bed spaces.
- `housing_images` stores public R2 object keys owned by a housing listing.
- `roommate_requests` stores structured accommodation/roommate requests.
- Public pages: `/{locale}/rooms`, `/{locale}/rooms/new`, `/{locale}/roommates/new`.
- APIs: `/api/housing/listings`, `/api/housing/listings/[id]`, `/api/housing/listings/[id]/contact`, `/api/housing/roommate-requests`, `/api/housing/roommate-requests/[id]/contact`.
- Contact details are not returned in search results. An authenticated user requests a rate-limited WhatsApp contact URL from the server.

### Chuo Library

- `study_materials` stores academic metadata and a private R2 object key.
- Uploads are limited to PDF files up to 10 MiB and are held in `pending` moderation until approved by an administrator.
- Public page: `/{locale}/library`; upload page: `/{locale}/library/upload`.
- APIs: `/api/library`, `/api/library/uploads/sign`, `/api/library/[id]/download`.
- The private bucket must be distinct from the public image bucket. The existing Marketplace image proxy continues to read listing photos from the public bucket, matching the existing signed listing-image upload route. The server validates the owner-scoped key, object metadata, file size and PDF signature. Downloads require an authenticated session and an approved material record, and the server streams the bytes with private/no-store headers. No private R2 URL is returned to the browser.
- Copyright/inappropriate-material reports enter the V2 administrator queue. Approval does not certify redistribution rights; uploader declarations and human moderation remain necessary.

### Smart Campus Alerts

- `campus_alerts` stores categorized notices, campus targets, source information, trust labels, publish time and optional expiry.
- Page: `/{locale}/alerts`; create page: `/{locale}/alerts/new`.
- API: `/api/alerts`.
- Only an administrator can submit or promote an alert to `official`. Public results exclude expired/unpublished/removed notices and prioritize Official notices. Source URLs must use HTTPS.

### Student Services Marketplace

- `service_listings` stores student services and price/availability metadata.
- `service_images` stores public R2 portfolio image keys.
- Pages: `/{locale}/services`, `/{locale}/services/new`, `/{locale}/services/[id]`, `/{locale}/providers/[username]`.
- APIs: `/api/services`, `/api/services/[id]/contact`.
- Provider contact details are server-revealed to authenticated users with rate limiting. No rating/review claims are shown. The platform disclaimer states that independent service quality is not guaranteed.

## Shared implementation details

- New feature logic lives under `src/features/{housing,library,alerts,services}`. Shared upload verification is in `src/features/shared`.
- Existing Better Auth and Marketplace user resolution are reused through `requireMarketplaceUser()`; admin actions use `getAdminActor()`.
- New content reports extend the existing `reports` table and appear in the existing admin area through the V2 moderation panel. Existing report handling is preserved.
- The new image upload endpoint signs owner-prefixed WebP objects; server-side verification checks ownership prefix, MIME type, size and RIFF/WEBP signature.
- `src/lib/r2.ts` fails closed when the private bucket is missing or aliases the public bucket. Existing private Community/Marketplace image routes were updated to use this guard.
- V2 translation namespaces are present in both `src/messages/en.json` and `src/messages/sw.json`. Key parity was checked: both contain 522 flattened message keys.
- New semantic palette tokens are added in `tailwind.config.ts`; existing Marketplace styling is not globally recolored.

## Environment configuration

Set these on the deployment environment (never commit real values):

- `DATABASE_URL`: runtime application database connection.
- `MIGRATION_DATABASE_URL`: explicitly selected migration connection. The Drizzle config now refuses to fall back to `DATABASE_URL`.
- `CLOUDFLARE_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`.
- `R2_BUCKET_NAME` and `R2_PUBLIC_URL` for public listing/service/housing images.
- `R2_PRIVATE_BUCKET_NAME`: a separate private bucket, not the public bucket. It must have no public access/custom domain. Configure CORS for the app's HTTPS origin and the required PUT content types.
- Existing `BETTER_AUTH_SECRET`, Pesapal and `CRON_SECRET` settings remain required by the pre-existing app where applicable.

Use least-privilege R2 credentials. The app uses signed PUT, HeadObject, GetObject and ListObjects/DeleteObjects for the existing cleanup workflow. Test the actual permissions and CORS on a non-production bucket first.

## Database migration and deployment caution

The new SQL migration is `drizzle/0015_chuo_market_v2.sql`, with its Drizzle snapshot metadata in `drizzle/meta/0015_snapshot.json` and its journal entry appended to `drizzle/meta/_journal.json`. It only creates new V2 types/tables/indexes and nullable report target references. It does not rewrite Marketplace or Community rows.

**Do not run this migration against production directly from this ZIP without reconciliation.** The supplied historical migration set already contains an empty `0010`, a duplicate-looking Better Auth migration, a non-monotonic timestamp at journal index 12, and a checksum entry for a missing `.sqlcode` sidecar. The exact deployed `drizzle.__drizzle_migrations` state is not available in this package. First compare the production migration table with the reviewed SQL history, and test against a cloned Neon branch. Back up the database, verify the migration is not already applied, then apply the reviewed additive migration using an explicitly configured `MIGRATION_DATABASE_URL`.

Deploy schema before application code that queries the V2 tables. Keep a rollback plan; because this migration adds tables and nullable report columns, rollback should generally be an application rollback plus a reviewed data-retention decision, not blind destructive `DROP` statements.

## Validation status

- TypeScript/TSX syntax parse: 125 files parsed with zero syntax diagnostics.
- English/Swahili flattened message-key parity: 522 keys in each; no missing or extra keys.
- `npm ci --ignore-scripts --no-audit --no-fund`: could not finish in the available environment (timed out).
- Offline dependency install: blocked because the npm cache does not contain the locked Zod tarball.
- Therefore a full dependency-backed `npm run lint`, `npx tsc --noEmit`, `npm run build`, Drizzle migration run, R2 integration test and Neon migration test have **not** passed or been completed in this environment. Run them on a connected development machine/database before release.

## Recommended release checklist

1. Remove all real credentials from local archives and rotate any credentials included in an archive shared outside your trusted environment.
2. Reconcile and back up the deployed Drizzle migration history; test `0015_chuo_market_v2.sql` on a Neon branch.
3. Create and configure the distinct private R2 bucket; test PDF upload/signature verification/download and cleanup.
4. Install from the committed lockfile with `npm ci`.
5. Run `npx tsc --noEmit`, `npm run lint`, `npm run build` and `npm run db:migrate` only against the selected non-production migration URL.
6. Test owner/non-owner/admin/guest access, expired alerts, repeated reports, private PDF URL privacy, invalid file signatures, and mobile layouts.
7. Deploy the reviewed schema first, then the application. Verify Marketplace, Community, Pesapal callbacks/IPN and cron behavior as regression checks.
