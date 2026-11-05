
import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/db';

function requestIp(request: Request): string | null {
  const ip =
    request.headers.get('cf-connecting-ip') ??
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim();

  return ip?.trim() ? ip.trim().slice(0, 100) : null;
}

function requestIdentity(request: Request): string {
  return requestIp(request) ?? 'unknown';
}

async function checkLimit(
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const result = await db.execute<{ allowed: boolean }>(sql`
    INSERT INTO api_rate_limits (key, window_started_at, count, updated_at)
    VALUES (${key.slice(0, 200)}, now(), 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE
        WHEN api_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
        THEN 1
        ELSE api_rate_limits.count + 1
      END,
      window_started_at = CASE
        WHEN api_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second')
        THEN now()
        ELSE api_rate_limits.window_started_at
      END,
      updated_at = now()
    RETURNING (count <= ${limit}) AS allowed
  `);

  return result.rows[0]?.allowed ?? false;
}

// Existing IP-based rate limiting.
// Other API endpoints continue using this function unchanged.
export async function enforceRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds = 60,
): Promise<boolean> {
  const key = `${scope}:${requestIdentity(request)}`.slice(0, 200);

  return checkLimit(key, limit, windowSeconds);
}

// User-based limit plus an additional IP-based protection.
export async function enforceUserRateLimit(
  request: Request,
  scope: string,
  userId: string,
  userLimit: number,
  ipLimit: number,
  windowSeconds = 3600,
): Promise<boolean> {
  const userKey = `${scope}:user:${userId}`;

  const userAllowed = await checkLimit(
    userKey,
    userLimit,
    windowSeconds,
  );

  const ip = requestIp(request);

  // Do not put every request with a missing IP into one shared bucket.
  const ipAllowed = ip
    ? await checkLimit(
        `${scope}:ip:${ip}`,
        ipLimit,
        windowSeconds,
      )
    : true;

  return userAllowed && ipAllowed;
}
