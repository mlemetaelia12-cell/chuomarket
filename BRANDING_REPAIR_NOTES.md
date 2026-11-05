# Chuo Market — branding and PWA repair

**Follow-up date:** 5 November 2026

## Repairs made

- Replaced `public/chuo-market-splash-screen.jpg` with the splash artwork supplied for this pass. The static spinner artwork was removed from the image so the loader in the component is genuinely animated.
- Updated `src/components/branding/app-splash-screen.tsx` to use the correct public path, fill mobile screens with the artwork, display a CSS loading ring, and close after 2.8 seconds. The session flag is written after the timer completes so React Strict Mode does not immediately hide the splash during development.
- Updated the locale layout header to use the existing CM app icon asset and corrected the metadata icon paths.
- Corrected `public/manifest.webmanifest` so every declared icon path exists and its size matches the file.
- Added the 192px maskable icon, Apple touch icon and multi-size favicon.
- Updated `src/app/icon.svg` and the PWA theme/background colors to match the purple/lime brand.

## Validation

- Manifest JSON parses successfully.
- App icon SVG parses successfully.
- All four manifest icon files exist and match their declared pixel dimensions.
- Favicon, Apple touch icon and splash artwork exist.
- No remaining application references to the old missing icon paths or `/splash-screen.jpg`.
- TypeScript: `tsc --noEmit` passed.
- ESLint: no errors. One pre-existing warning remains in `drizzle/schema.ts` (`sql` is imported but unused); that file was not changed.
- Database protection: `src/db/schema.ts` and every file under `drizzle/` were hash-compared with the uploaded archive; 22 files checked and zero changed. No database command was run.

## Build limitation

The uploaded `node_modules` contains the Windows Next.js SWC binary only. This audit ran in Linux, so a Linux production build could not be verified here. The archive intentionally omits `node_modules` and `.next`; run the build on the project's Windows machine after extracting the source and cleaning the local Next.js cache.

## Files deliberately excluded from the delivery archive

`.env`, `.git`, `node_modules` and `.next` are excluded. Keep your existing local `.env` privately; never replace it with this ZIP.
