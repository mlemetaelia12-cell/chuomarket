import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/db';

function requestIdentity(request: Request): string {
  const ip = request.headers.get('cf-connecting-ip') ?? request.headers.get('x-real-ip') ?? request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';
  return ip.slice(0, 100);
}

export async function enforceRateLimit(request: Request, scope: string, limit: number, windowSeconds = 60): Promise<boolean> {
  const key = `${scope}:${requestIdentity(request)}`.slice(0, 200);
  const result = await db.execute<{ allowed: boolean }>(sql`
    INSERT INTO api_rate_limits (key, window_started_at, count, updated_at)
    VALUES (${key}, now(), 1, now())
    ON CONFLICT (key) DO UPDATE SET
      count = CASE WHEN api_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second') THEN 1 ELSE api_rate_limits.count + 1 END,
      window_started_at = CASE WHEN api_rate_limits.window_started_at <= now() - (${windowSeconds} * interval '1 second') THEN now() ELSE api_rate_limits.window_started_at END,
      updated_at = now()
    RETURNING (count <= ${limit}) AS allowed
  `);
  return result.rows[0]?.allowed ?? false;
}
