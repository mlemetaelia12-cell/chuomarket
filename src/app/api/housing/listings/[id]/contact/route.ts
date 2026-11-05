import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { housingListings, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await enforceRateLimit(request, 'housing-contact', 20, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const viewer = await requireMarketplaceUser();
  if (!viewer) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const { id } = await context.params;
  const [row] = await db.select({ title: housingListings.title, ownerId: housingListings.ownerId, whatsapp: users.whatsapp })
    .from(housingListings).innerJoin(users, eq(housingListings.ownerId, users.id))
    .where(and(eq(housingListings.id, id), eq(housingListings.status, 'published'))).limit(1);
  if (!row || row.ownerId === viewer.id || !row.whatsapp) return NextResponse.json({ error: 'contact_unavailable' }, { status: 404 });
  const digits = row.whatsapp.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return NextResponse.json({ error: 'contact_unavailable' }, { status: 404 });
  return NextResponse.json({ url: `https://wa.me/${digits}?text=${encodeURIComponent(`Hello, I saw your accommodation "${row.title}" on Chuo Market. Is it still available?`)}` }, { headers: { 'Cache-Control': 'private, no-store' } });
}
