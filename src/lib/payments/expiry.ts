
import 'server-only';

import { sql } from 'drizzle-orm';
import { db } from '@/db';

export async function hideExpiredListings(): Promise<void> {
  await db.execute(sql`
    UPDATE listings
    SET
      status = 'hidden',
      plan_hidden = true,
      updated_at = now()
    WHERE status = 'published'
      AND plan_hidden = false
      AND is_free_lifetime = false
      AND NOT EXISTS (
        SELECT 1
        FROM subscriptions s
        WHERE s.user_id = listings.owner_id
          AND s.starts_at <= now()
          AND s.subscription_until > now()
      )
  `);
}
