# Complete changed-file inventory

Compared with the uploaded source tree, this delivery contains **39 modified files, 12 added files, and 0 deleted source files**. Generated caches, dependency folders and the original `.env` are excluded from the final ZIP.

## Modified files

### Configuration and documentation

- `.env.example` — added `R2_PRIVATE_BUCKET_NAME` and migration connection placeholder; safe placeholders only.
- `README.md` — rewrote setup/deployment instructions to warn against blindly applying migrations and to document the private PDF bucket.
- `next.config.ts` — hardened CSP/security headers, removed production `unsafe-eval`, made form-action self-only and reduced HSTS scope to the application host.
- `tailwind.config.ts` — aligned brand tokens to blue/white/green/orange and retained legacy color aliases for compatibility.

### Pages and route behaviour

- `src/app/[locale]/[...rest]/page.tsx` — redirects legacy community paths to their live category pages; unknown paths remain not-found.
- `src/app/[locale]/admin/page.tsx` — refreshed admin entry page.
- `src/app/[locale]/community/page.tsx` — validates and applies category filtering from the query string.
- `src/app/[locale]/layout.tsx` — adds PWA manifest, icons, Apple web-app metadata and viewport theme color.
- `src/app/[locale]/me/page.tsx` — updates profile layout and surfaces.
- `src/app/[locale]/page.tsx` — clean responsive home hero/search introduction and bilingual labels; listing query/pagination logic retained.
- `src/app/[locale]/superadmin/page.tsx` — replaces placeholder with protected superadmin admin workspace.

### API and security

- `src/app/api/admin/route.ts` — no-store admin data responses, dynamic route, rate limit, synchronized Better Auth/marketplace ban state, normal-admin restriction on banning other admins.
- `src/app/api/community/[id]/download/route.ts` — authenticated private PDF streaming; supports older public URL records for backwards compatibility.
- `src/app/api/community/route.ts` — community post rate limit, private PDF key ownership, R2 object metadata and PDF header validation before reward award.
- `src/app/api/community/uploads/sign/route.ts` — PDF uploads go to separate private R2 bucket; photos remain in public assets bucket.
- `src/app/api/cron/hardening/route.ts` — tracks and cleans unreferenced objects in public and private R2 buckets.
- `src/app/api/listings/route.ts` — rate-limits listing creation.
- `src/app/api/payments/checkout/route.ts` — checkout rate limit, zero-price guard, preflight token/IPN registration, pending state on ambiguous provider submit failures.
- `src/middleware.ts` — same-origin check for browser-originated unsafe API requests; Pesapal server-to-server IPN exempted.

### Design and UI components

- `src/app/globals.css` — global design tokens, focus states, reduced-motion handling and removal of broad legacy override rules.
- `src/app/icon.svg` — recolors existing Chuo Market mark.
- `src/components/admin/admin-console.tsx` — refreshed responsive bilingual admin/superadmin console.
- `src/components/auth/auth-form.tsx` — 8-character password validation and light-surface authentication presentation.
- `src/components/auth/whatsapp-profile-form.tsx` — refreshed profile form states and styling.
- `src/components/browse/browse-filters.tsx` — cleaner responsive filter form.
- `src/components/community/community-board.tsx` — refreshes board styling and downloads PDFs through authenticated stream API.
- `src/components/community/community-post-form.tsx` — refreshes the posting form UI.
- `src/components/dashboard/listing-promotion-actions.tsx` — adds pending-payment ambiguity messaging.
- `src/components/growth/growth-panel.tsx` — localized referral URL and refreshed UI.
- `src/components/navigation/bottom-navigation.tsx` — rebuilt light, touch-friendly navigation and action menu.
- `src/components/payments/plan-checkout.tsx` — explains pending payment reconciliation and discourages duplicate checkout attempts.

### Application libraries and translations

- `src/lib/admin.ts` — validates the current database role and ban status for admin API access.
- `src/lib/auth.ts` — password bounds and admin plugin roles for admin/superadmin.
- `src/lib/marketplace-user.ts` — live profile/ban checks, role sync and race-safe profile creation.
- `src/lib/payments/pesapal.ts` — accepts the prepared Pesapal token for submission rather than obtaining a second token after preflight.
- `src/lib/r2.ts` — exports the separate private R2 bucket configuration.
- `src/lib/session.ts` — checks current database role/ban state and preserves the selected locale for redirects.
- `src/messages/en.json` — updates minimum password and pending payment text.
- `src/messages/sw.json` — updates minimum password and pending payment text in Swahili.

## Added files

- `AUDIT_REPORT.md` — consolidated audit and test results.
- `CHANGED_FILES.md` — this change inventory.
- `DEPLOYMENT_READINESS.md` — deployment and readiness checklist.
- `docs/ANDROID_PLAY_STORE.md` — TWA, payment policy and Play Store checklist.
- `docs/OWNER_ACTIONS.md` — credentials, R2, legal, database and external owner decisions.
- `docs/QA_MATRIX.md` — PASS/BLOCKED/NOT TESTED matrix.
- `migration-checksums.sha256` — baseline hash inventory for the preserved migrations and metadata.
- `public/manifest.webmanifest` — PWA manifest.
- `public/icons/chuo-market-192.png` and `public/icons/chuo-market-512.png` — standard PWA icons.
- `public/icons/chuo-market-192-maskable.png` and `public/icons/chuo-market-512-maskable.png` — opaque maskable PWA icons.

## Intentionally unchanged

- All files under `drizzle/`, including the migration journal and snapshot metadata.
- All existing SQL files under `migration-backups/`.
- `src/db/schema.ts`, existing database function/trigger definitions in migrations, enum definitions and seed/business rules.
- No project source file was deleted.
