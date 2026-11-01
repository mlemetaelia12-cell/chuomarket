import 'server-only';

import { eq } from 'drizzle-orm';

import { db } from '@/db';
import { authUsers, users } from '@/db/schema';
import { getSession } from '@/lib/session';

export async function getAdminActor() {
  const session = await getSession();
  if (!session) return null;

  const authUser = await db.query.authUsers.findFirst({
    where: eq(authUsers.id, session.user.id),
  });
  if (!authUser) return null;

  const currentlyBanned = Boolean(
    authUser.banned && (!authUser.banExpires || authUser.banExpires > new Date()),
  );
  if (currentlyBanned || (authUser.role !== 'admin' && authUser.role !== 'superadmin')) {
    return null;
  }

  const profile = await db.query.users.findFirst({
    where: eq(users.authUserId, authUser.id),
  });
  if (profile?.banned) return null;

  return {
    id: authUser.id,
    role: authUser.role,
    username: authUser.username,
  } as const;
}
