import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { authUsers, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { getSession } from '@/lib/session';

const schema = z.object({ whatsapp: z.string().trim().min(7).max(20) });

export async function PUT(request: Request) {
  const [marketplaceUser, session] = await Promise.all([requireMarketplaceUser(), getSession()]);
  if (!marketplaceUser || !session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  const normalized = parsed.data.whatsapp.replace(/[\s()-]/g, '');
  if (!/^\+?[0-9]{7,15}$/.test(normalized)) return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
  await db.update(authUsers).set({ whatsapp: normalized, updatedAt: new Date() }).where(eq(authUsers.id, session.user.id));
  await db.update(users).set({ whatsapp: normalized, updatedAt: new Date() }).where(eq(users.id, marketplaceUser.id));
  return NextResponse.json({ whatsapp: normalized });
}
