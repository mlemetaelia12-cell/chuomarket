# Chuo Market

Chuo Market is a Tanzania-focused student marketplace and campus community built with Next.js 15, React 19, TypeScript, Drizzle ORM, Neon PostgreSQL, Better Auth, Cloudflare R2, and Pesapal API 3.0.

**This repository has an existing production database history. Do not reset, push, regenerate, or apply migrations simply to make local setup easier.** The Drizzle migration directory and journal are protected assets; compare the target database's applied migration state with the inventory before any approved database operation.

## Current project capabilities

- Username/password registration and login, Better Auth sessions, and role-based admin areas.
- Marketplace listings, image upload to Cloudflare R2, search/filtering, seller profiles, favorites, and seller dashboard.
- Free lifetime listing entitlement, paid subscription plans, queued subscription periods, featured listings, and boosts.
- Pesapal API 3.0 checkout with server-side transaction status verification and database fulfilment.
- Student community categories for study materials, rooms/roommates, and lost & found.
- Reports, moderation, admin tools, referrals, reward points, and Tanzania-time daily rewards.
- English/Swahili locale routing and TZS presentation.
- PWA manifest and standard/maskable icons. Offline data sync is not implemented.

## Runtime requirements

- Node.js 20 or later (use the same Node major version locally and in Vercel).
- npm 10 or compatible with the checked-in package lock.
- A PostgreSQL/Neon database provisioned for this application.
- Correctly configured Better Auth secret and URL.
- Optional integrations: Cloudflare R2 and Pesapal sandbox.

## Local setup (safe path)

1. Clone the private repository and open the project directory in PowerShell.
2. Install the exact lockfile dependencies:

   ```powershell
   npm ci
   ```

3. Create a local environment file from the safe template:

   ```powershell
   Copy-Item .env.example .env.local
   ```

4. Set the variables listed below. Use a dedicated development database/Neon branch, not production. Do not paste secrets into chat or commit `.env.local`.
5. Run the static checks:

   ```powershell
   npx tsc --noEmit
   npm run lint
   npm run build
   ```

6. Start the local app:

   ```powershell
   npm run dev
   ```

   Open `http://localhost:3000/en` or `http://localhost:3000/sw`.

### Database warning

The checked-in migration sequence currently contains files `0000`–`0014`, a migration journal, snapshots and sidecar SQL artifacts. The initial audit also identified an empty `0010_better_auth_admin_fields.sql`, a non-empty `.sqlcode` sidecar, a duplicate-like SQL body in `0011`, and a timestamp ordering anomaly in the journal. These were intentionally preserved. Before applying any database change:

- Back up the target database and use a separate development branch.
- Compare the deployed migration state and SQL function definitions with the preserved files.
- Have a DBA/developer review the exact SQL and rollback plan.
- Obtain explicit owner approval.

**Do not run `drizzle-kit push`, `drizzle-kit generate`, `db:migrate`, or `db:seed` against the production database as part of routine setup.** In particular, do not blindly run all migrations from scratch against an existing project database.

## Environment variables

Copy `.env.example` and set values only in local environment/Vercel project settings. All credentials must remain server-side.

| Variable                  | Purpose                                                        | Required              |
| ------------------------- | -------------------------------------------------------------- | --------------------- |
| `DATABASE_URL`            | Neon/PostgreSQL runtime connection                             | Yes                   |
| `MIGRATION_DATABASE_URL`  | Optional dedicated connection for a reviewed migration         | No                    |
| `BETTER_AUTH_SECRET`      | Better Auth signing/encryption secret (at least 32 characters) | Yes                   |
| `BETTER_AUTH_URL`         | Canonical app URL                                              | Yes                   |
| `CLOUDFLARE_ACCOUNT_ID`   | R2 account identifier                                          | For R2                |
| `R2_ACCESS_KEY_ID`        | R2 server access key                                           | For R2                |
| `R2_SECRET_ACCESS_KEY`    | R2 server secret                                               | For R2                |
| `R2_BUCKET_NAME`          | R2 bucket name                                                 | For R2                |
| `R2_PUBLIC_URL`           | HTTPS public image origin                                      | For R2                |
| `PESAPAL_ENV`             | `sandbox` or `live` (default should remain sandbox)            | For payments          |
| `PESAPAL_CONSUMER_KEY`    | Pesapal key                                                    | For payments          |
| `PESAPAL_CONSUMER_SECRET` | Pesapal secret                                                 | For payments          |
| `APP_BASE_URL`            | Public HTTPS origin used for Pesapal callback/IPN registration | For payments          |
| `CRON_SECRET`             | Bearer secret for scheduled hardening job                      | Yes for scheduled job |

Do not add a `NEXT_PUBLIC_` prefix to secrets. Do not set Pesapal to `live` until the sandbox workflow has been tested and the owner explicitly authorizes the change.

## Useful commands

```powershell
npm run dev
npm run lint
npx tsc --noEmit
npm run build
npm run start
```

The project does not currently declare a dedicated unit/integration test script. Static checks do not replace database, browser, payment-provider, or device tests.

## Deployment

Follow [`DEPLOYMENT_READINESS.md`](./DEPLOYMENT_READINESS.md) and the detailed owner checklist in [`docs/OWNER_ACTIONS.md`](./docs/OWNER_ACTIONS.md). Configure a separate Vercel Preview database/environment and Production database/environment. Do not deploy with credentials from the uploaded archive; rotate those credentials first.

## Android and Google Play

The website includes a PWA manifest and icon assets only. A signed Android App Bundle/TWA has not been generated. Read [`docs/ANDROID_PLAY_STORE.md`](./docs/ANDROID_PLAY_STORE.md) before packaging. A production domain, Android package ID, signing certificate fingerprint, privacy URL, account-deletion flow, support contact, and Play Billing purchase design are still owner decisions/blockers.

## Audit documents

- [`AUDIT_REPORT.md`](./AUDIT_REPORT.md) — final scope, changes, findings and test status.
- [`CHANGED_FILES.md`](./CHANGED_FILES.md) — modified/added source files.
- [`migration-checksums.sha256`](./migration-checksums.sha256) — preserved migration checksum inventory.
- [`docs/QA_MATRIX.md`](./docs/QA_MATRIX.md) — PASS/FAIL/NOT TESTED matrix.
- [`docs/OWNER_ACTIONS.md`](./docs/OWNER_ACTIONS.md) — actions that require the project owner.
- [`docs/ANDROID_PLAY_STORE.md`](./docs/ANDROID_PLAY_STORE.md) — Android and Play preparation.
