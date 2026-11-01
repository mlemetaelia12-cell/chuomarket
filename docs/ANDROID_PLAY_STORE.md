# Android & Google Play preparation — Chuo Market

Audit basis: official Google Play policy/help material checked on 1 November 2026. Policy can change; re-check the linked official pages before submitting.

## Current code status

- PWA manifest: present at `public/manifest.webmanifest`.
- App icons: standard 192px/512px and maskable 192px/512px assets included.
- Next metadata: manifest, icons, Apple web-app capable metadata and theme colour configured.
- Service worker/offline cache: intentionally not added. The app contains private account, seller, and payment views; caching these indiscriminately would create privacy and stale-data risks. No offline mode is claimed.
- Android project, TWA wrapper, signing key, AAB/APK, Digital Asset Links: not generated.

## Owner inputs required before TWA build

1. Final production HTTPS domain, owned and controlled by the business.
2. Confirmed Android application ID (for example, a reverse-domain package name chosen by the owner; no ID has been invented here).
3. Final app name, app icon approval, support contact, privacy policy URL and account deletion URL.
4. Android signing-key custody plan. The private signing key must be generated and kept by the owner, backed up securely, and never uploaded to chat or committed to Git.
5. A final deployed origin and signing certificate SHA-256 fingerprint for `/.well-known/assetlinks.json`.

Once those inputs exist, Bubblewrap/TWA can be evaluated and tested against Chrome on real Android devices. The website domain must serve the Digital Asset Links file with the exact package ID and SHA-256 certificate fingerprint that matches the app signing identity. Until then, generating a TWA would create misleading/unusable configuration.

## Payments: separate website and Play purchase channels

Website Pesapal checkout is retained. Do not embed or simply reuse the Pesapal website checkout for digital subscriptions or digital marketplace features in a Play-distributed Android app. Google Play's Payments policy generally requires Google Play Billing for digital goods, app functionality, and subscriptions consumed in the app, subject to specified exceptions/programs. Physical goods or physical services are treated differently. Chuo Market seller subscriptions, Featured placement and Boost appear to be digital marketplace features and need a product/policy classification before Android payment implementation.

A compliant Android purchase design, if required, should:

- Keep Google Play purchases distinct from website Pesapal orders.
- Verify purchase tokens on the server with Google Play Developer APIs before granting entitlements.
- Validate the package name, product ID, purchase token, purchase state and order identity.
- Acknowledge eligible purchases within the required window.
- Process subscription lifecycle and Real-time Developer Notifications idempotently.
- Persist provider, token/order references and entitlement source securely. This may require schema additions; none were introduced because the owner explicitly prohibited schema changes without approval.
- Never accept a client-only “purchase successful” signal as proof of payment.

Official references:

- Google Play Payments policy: https://support.google.com/googleplay/android-developer/answer/9858738
- Google Play Billing integration overview: https://developer.android.com/google/play/billing/integrate
- Google Play Billing security: https://developer.android.com/google/play/billing/security
- Real-time Developer Notifications: https://developer.android.com/google/play/billing/rtdn-reference
- Trusted Web Activity overview: https://developer.chrome.com/docs/android/trusted-web-activity/
- Digital Asset Links: https://developers.google.com/digital-asset-links/v1/getting-started

## Personal Play Console account checklist

For a new personal developer account, Google currently requires identity and developer-account verification. For accounts subject to the new personal-account testing rule, an app must complete a closed test with at least 12 opted-in testers continuously for at least 14 days before applying for production access. Confirm the exact current requirement inside Play Console when registering.

- Register the account using the owner's own legal name and details.
- Complete developer identity and contact verification. For a Tanzanian account, have the requested government-issued identity document and address proof ready if prompted.
- Complete store listing: title, short description, full description, icon, feature graphic and phone/tablet screenshots.
- Complete target audience, content rating, app access and Data Safety disclosures truthfully.
- Publish working Terms, Privacy Policy, prohibited-content/reporting policy and support details.
- Provide both in-app account deletion and a public web account-deletion request resource where required.
- Complete internal/closed testing, gather genuine feedback, fix issues, and only then request production access.
- Upload a signed Android App Bundle, review pre-launch reports, and submit for policy review.

Official references:

- Create a Play Console developer account: https://support.google.com/googleplay/android-developer/answer/6112435
- Personal account testing requirements: https://support.google.com/googleplay/android-developer/answer/14151465
- App account deletion requirements: https://support.google.com/googleplay/android-developer/answer/13327111
- Data Safety: https://support.google.com/googleplay/android-developer/answer/10787469

## Status

No Android bundle, TWA, Play Console app, signed artifact, or Play submission was produced or tested in this audit. These are blocked by owner-controlled identity, domain, package ID, signing key, legal URL/contact, and billing architecture decisions.
