import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';

import { routing } from './i18n/routing';

const intlMiddleware = createMiddleware(routing);
const unsafeMethods = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Reject browser-originated unsafe API requests from a different origin.
 * Pesapal IPN is server-to-server and is intentionally excluded.
 */
export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  if (pathname.startsWith('/api/')) {
    if (unsafeMethods.has(request.method) && pathname !== '/api/payments/ipn') {
      const origin = request.headers.get('origin');
      if (origin) {
        let parsedOrigin: URL;
        try {
          parsedOrigin = new URL(origin);
        } catch {
          return NextResponse.json({ error: 'invalid_origin' }, { status: 403 });
        }

        const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim();
        const expectedHost = forwardedHost || request.headers.get('host') || request.nextUrl.host;
        const forwardedProtocol = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim();
        const expectedProtocol = forwardedProtocol
          ? `${forwardedProtocol}:`
          : request.nextUrl.protocol;

        if (
          parsedOrigin.host.toLowerCase() !== expectedHost.toLowerCase() ||
          parsedOrigin.protocol !== expectedProtocol
        ) {
          return NextResponse.json({ error: 'cross_origin_request' }, { status: 403 });
        }
      }
    }

    return NextResponse.next();
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!_next|_vercel|.*\\..*).*)'],
};
