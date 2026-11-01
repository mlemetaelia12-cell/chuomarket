import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
const isProduction = process.env.NODE_ENV === 'production';
const remotePatterns: NonNullable<NextConfig['images']>['remotePatterns'] = [];

const r2PublicUrl = process.env.R2_PUBLIC_URL?.trim();
if (r2PublicUrl) {
  const r2Url = new URL(r2PublicUrl);
  if (r2Url.protocol !== 'https:') {
    throw new Error('R2_PUBLIC_URL must use HTTPS.');
  }
  remotePatterns.push({
    protocol: 'https',
    hostname: r2Url.hostname,
    ...(r2Url.port ? { port: r2Url.port } : {}),
    pathname: `${r2Url.pathname.replace(/\/$/, '')}/**`,
  });
}

const scriptSources = isProduction
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  `script-src ${scriptSources}`,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data: https:",
  "connect-src 'self' https:",
  "media-src 'self' https:",
  "worker-src 'self' blob:",
  ...(isProduction ? ['upgrade-insecure-requests'] : []),
].join('; ');

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),
  images: { remotePatterns },
  async headers() {
    const headers = [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=()',
      },
      { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    ];

    if (isProduction) {
      headers.push({
        key: 'Strict-Transport-Security',
        value: 'max-age=31536000',
      });
    }

    return [{ source: '/:path*', headers }];
  },
};

export default withNextIntl(nextConfig);
