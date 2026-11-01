import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { authUsers, users } from '@/db/schema';
import { getSession } from '@/lib/session';

/** Resolve the authenticated Better Auth identity to its marketplace profile. */
export async function requireMarketplaceUser() {
  const session = await getSession();
  if (!session) return null;

  const authProfile = await db.query.authUsers.findFirst({
    where: eq(authUsers.id, session.user.id),
  });
  if (!authProfile) return null;

  const currentlyBanned = Boolean(
    authProfile.banned && (!authProfile.banExpires || authProfile.banExpires > new Date()),
  );
  if (currentlyBanned) return null;

  const existing = await db.query.users.findFirst({
    where: eq(users.authUserId, authProfile.id),
  });

  if (existing) {
    if (existing.banned) return null;

    const changes: Partial<typeof users.$inferInsert> = {};
    if (existing.role !== authProfile.role) changes.role = authProfile.role;
    if (authProfile.whatsapp && existing.whatsapp !== authProfile.whatsapp) {
      changes.whatsapp = authProfile.whatsapp;
    }
    if (Object.keys(changes).length > 0) {
      const [updated] = await db
        .update(users)
        .set({ ...changes, updatedAt: new Date() })
        .where(eq(users.id, existing.id))
        .returning();
      return updated ?? existing;
    }
    return existing;
  }

  // A unique conflict can occur when two requests create a profile at once.
  // onConflictDoNothing plus a re-read makes profile provisioning race-safe.
  const [created] = await db
    .insert(users)
    .values({
      authUserId: authProfile.id,
      username: authProfile.username,
      whatsapp: authProfile.whatsapp ?? null,
      passwordHash: '',
      role: authProfile.role,
      language: authProfile.language === 'sw' ? 'sw' : 'en',
    })
    .onConflictDoNothing({ target: users.authUserId })
    .returning();

  if (created) return created;

  const raced = await db.query.users.findFirst({
    where: eq(users.authUserId, authProfile.id),
  });
  return raced && !raced.banned ? raced : null;
}
