import 'dotenv/config';
import { sql } from 'drizzle-orm';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { plans } from './schema';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required to seed plans.');

const db = drizzle(neon(databaseUrl));
const planSeed = [
  { code: 'monthly', name: '1 Month', priceTsh: 2_000, durationDays: 30, listingLimit: 10, businessBadge: false, priorityPlacement: false },
  { code: 'semester', name: 'Semester', priceTsh: 6_000, durationDays: 120, listingLimit: 10, businessBadge: false, priorityPlacement: false },
  { code: 'business', name: 'Business', priceTsh: 10_000, durationDays: 30, listingLimit: null, businessBadge: true, priorityPlacement: true },
];

async function seedPlans(): Promise<void> {
  await db.insert(plans).values(planSeed).onConflictDoUpdate({
  target: plans.code,
  set: { name: sql`excluded.name`, priceTsh: sql`excluded.price_tsh`, durationDays: sql`excluded.duration_days`, listingLimit: sql`excluded.listing_limit`, businessBadge: sql`excluded.business_badge`, priorityPlacement: sql`excluded.priority_placement`, updatedAt: new Date() },
  });
  console.info('Chuo Market plans seeded.');
}

seedPlans().catch((error: unknown) => {
  console.error('Failed to seed plans.', error);
  process.exitCode = 1;
});
