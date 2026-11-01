# Chuo Market — deployment and Android readiness

Audit status: source changes and static validation completed; external integration and production deployment checks remain owner-controlled and are **NOT TESTED**. Do not interpret this checklist as a statement that the application is already production-ready.

## 1. Before Vercel deployment

1. Rotate every credential that was present in the uploaded `.env` file. The delivered ZIP excludes `.env`; treat the old values as compromised.
2. Push the source to a private GitHub repository. Verify `.env`, `.env.*` (except `.env.example`), `node_modules`, `.next`, build outputs and signing keys are not committed.
3. On a machine with working npm network access, run `npm ci` from the lockfile. Use the same supported Node.js major version in local and Vercel environments.
4. Create separate Neon branches/databases and separate variables for Preview and Production.
5. Verify the deployed database's Drizzle migration state and the actual SQL function definitions. The repository's migration artifacts were preserved, not executed. Do not run `db:push`, `db:generate`, `db:migrate`, or `db:seed` on production as a deployment shortcut.
6. Configure only the values in `.env.example` through Vercel's private environment settings. Set canonical HTTPS `BETTER_AUTH_URL`, `APP_BASE_URL`, and HTTPS `R2_PUBLIC_URL`.
7. Keep `PESAPAL_ENV=sandbox` and use rotated sandbox credentials. Configure callback and IPN from the public origin.
8. Configure the public R2 bucket for listing images/Lost & Found photos and a separate private R2 bucket (`R2_PRIVATE_BUCKET_NAME`) for study-material PDFs. Disable public access on the private bucket; apply least-privilege access and CORS only for deployed origins and required `PUT` content types.
9. Run `npx tsc --noEmit`, `npm run lint`, `npm run build`, browser smoke tests, and two-account authorization tests in Preview.
10. Complete actual Pesapal sandbox tests: success, pending, failed, duplicate IPN, callback/IPN order, provider timeout, wrong amount/currency/reference, and reversed transaction behaviour.
11. Approve the live-payment switch explicitly; then configure Live credentials privately and repeat production smoke tests with owner-approved low-risk transactions.

## 2. Database safety

- Never reset, drop, truncate, or recreate the existing database during this audit/deployment preparation.
- The migration inventory has 20 original files/artifacts and is available in `migration-checksums.sha256`. Every listed file was hash-verified against both the original ZIP extraction and the final working tree.
- The zero-byte `0010_better_auth_admin_fields.sql`, `.sqlcode` sidecar, similar `0011` SQL and journal timestamp anomaly need manual review against the target database's actual migration records and functions.
- Have a database backup, reviewed SQL, and rollback plan before any owner-approved migration.

## 3. Security and configuration

- `BETTER_AUTH_SECRET` must be a unique random secret of at least 32 characters. Never reuse a value from the uploaded archive.
- Use HTTPS in staging/production. The application enforces HTTPS for non-local Pesapal callback origins and R2 public URLs.
- Security headers include CSP, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, and production HSTS.
- Production CSP still allows `unsafe-inline` scripts to accommodate the existing Next.js runtime. A nonce/hash-only CSP remains a hardening task that needs browser/build verification.
- Browser-originated unsafe API methods are checked against the request origin; Pesapal server-to-server IPN is exempt and verifies provider transaction state itself.
- Account suspension, current DB role checks, admin actions and per-IP rate limits were tightened in source. Runtime authorization testing with separate accounts remains NOT TESTED.

## 4. PWA

The package contains a web manifest, standard 192px/512px icons, opaque maskable 192px/512px icons, manifest metadata and Next.js theme/apple web-app metadata. This is a PWA preparation, not an installability certification. Validate the production HTTPS origin, manifest, icon loading and install prompt in Chrome DevTools and real Android devices. A service worker/offline cache is not enabled because sensitive authenticated and payment data should not be cached without a deliberate offline/data-retention design.

## 5. Trusted Web Activity / Play Store

Do not generate or sign the Android app until the owner confirms the production domain, package ID and signing-key custody plan. A TWA requires the website origin to prove association with the Android app through the correct `/.well-known/assetlinks.json`, including the package ID and SHA-256 signing certificate fingerprint.

Google Play generally requires Play Billing for digital subscriptions and in-app digital functionality unless a specific exception/program applies. Seller subscriptions, Featured and Boost appear to be digital marketplace functionality; classify the exact product and region/program eligibility before building the Android purchase flow. Website Pesapal is retained separately. No Android billing schema or migration was added because the owner prohibited schema changes without approval.

Personal Play Console accounts subject to the new-account testing rule may need at least 12 testers opted into a closed test continuously for 14 days before requesting production access. Verify the account-specific requirement in Play Console. The owner must create and verify the developer account personally, and complete Data Safety, app access, target audience, content rating, store listing, privacy and account deletion declarations.

Detailed checklist and official references: [`docs/ANDROID_PLAY_STORE.md`](./docs/ANDROID_PLAY_STORE.md).

## 6. Blocking owner actions

- Rotate exposed credentials.
- Confirm production domain, public support contact, package ID and legal URLs.
- Approve privacy/terms/prohibited-items policy content with actual operator and processing details.
- Decide account deletion/anonymisation/retention. `orders.user_id` currently restricts user deletion; deletion must not destroy payment records or violate retention obligations.
- Confirm Play Billing strategy for digital features.
- Complete sandbox and Preview QA with non-production accounts and real provider callbacks.

See [`docs/OWNER_ACTIONS.md`](./docs/OWNER_ACTIONS.md) for the detailed action list.
