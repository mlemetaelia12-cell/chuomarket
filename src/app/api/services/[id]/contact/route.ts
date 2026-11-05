import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { serviceListings, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!(await enforceRateLimit(request, 'service-contact', 20, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const viewer = await requireMarketplaceUser();
  if (!viewer) return NextResponse.json({ error: 'login_required' }, { status: 401 });
  const { id } = await context.params;
  const [row] = await db.select({ title: serviceListings.title, providerId: serviceListings.providerId, whatsapp: users.whatsapp })
    .from(serviceListings).innerJoin(users, eq(serviceListings.providerId, users.id))
    .where(and(eq(serviceListings.id, id), eq(serviceListings.status, 'published'))).limit(1);
  if (!row || row.providerId === viewer.id || !row.whatsapp) return NextResponse.json({ error: 'contact_unavailable' }, { status: 404 });
  const digits = row.whatsapp.replace(/\D/g, '');
  if (digits.length < 9 || digits.length > 15) return NextResponse.json({ error: 'contact_unavailable' }, { status: 404 });
  const message = encodeURIComponent(`Hello, I saw your service "${row.title}" on Chuo Market. Is it available?`);
  return NextResponse.json({ url: `https://wa.me/${digits}?text=${message}` }, { headers: { 'Cache-Control': 'private, no-store' } });
}
