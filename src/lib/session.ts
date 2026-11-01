import 'server-only';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { authUsers, users } from '@/db/schema';
import { auth } from '@/lib/auth';

export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

/**
 * Authorize using the current database role rather than the role copied into
 * a potentially older session payload. This makes demotions and bans take
 * effect on the next protected request without requiring a new login.
 */
export async function requireRole(allowedRoles: readonly ('user' | 'admin' | 'superadmin')[]) {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  if (!session) redirect(`/${locale}/login`);

  const [authUser, marketplaceUser] = await Promise.all([
    db.query.authUsers.findFirst({
      where: eq(authUsers.id, session.user.id),
      columns: { role: true, banned: true, banExpires: true },
    }),
    db.query.users.findFirst({
      where: eq(users.authUserId, session.user.id),
      columns: { banned: true },
    }),
  ]);

  const currentlyBanned = Boolean(
    authUser?.banned && (!authUser.banExpires || authUser.banExpires > new Date()),
  );

  if (
    !authUser ||
    currentlyBanned ||
    marketplaceUser?.banned ||
    !allowedRoles.includes(authUser.role)
  ) {
    redirect(`/${locale}`);
  }

  return {
    ...session,
    user: {
      ...session.user,
      role: authUser.role,
    },
  };
}
