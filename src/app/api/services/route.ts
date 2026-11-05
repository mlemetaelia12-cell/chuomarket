import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { serviceImages, serviceListings, users } from '@/db/schema';
import { verifyPublicImageKeys } from '@/features/shared/storage';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';

const schema = z.object({
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(1600),
  category: z.enum(['web_development', 'graphic_design', 'photography', 'tutoring', 'typing', 'technical_support', 'other']),
  priceFromTsh: z.number().int().min(0).max(100000000).nullable().optional(),
  priceToTsh: z.number().int().min(0).max(100000000).nullable().optional(),
  university: z.string().trim().min(2).max(160),
  campus: z.string().trim().min(2).max(160),
  availability: z.string().trim().min(2).max(80),
  imageKeys: z.array(z.string().min(1).max(500)).max(4).default([]),
}).refine((value) => value.priceFromTsh == null || value.priceToTsh == null || value.priceToTsh >= value.priceFromTsh, { path: ['priceToTsh'] });

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = (params.get('q') ?? '').trim().slice(0, 100);
  const campus = (params.get('campus') ?? '').trim().slice(0, 160);
  const category = params.get('category');
  const conditions = [eq(serviceListings.status, 'published')];
  if (search) conditions.push(or(ilike(serviceListings.title, `%${search}%`), ilike(serviceListings.description, `%${search}%`))!);
  if (campus) conditions.push(eq(serviceListings.campus, campus));
  if (['web_development', 'graphic_design', 'photography', 'tutoring', 'typing', 'technical_support', 'other'].includes(category ?? '')) conditions.push(eq(serviceListings.category, category as 'web_development' | 'graphic_design' | 'photography' | 'tutoring' | 'typing' | 'technical_support' | 'other'));
  const rows = await db.query.serviceListings.findMany({ where: and(...conditions), orderBy: [desc(serviceListings.createdAt)], limit: 80, with: { provider: { columns: { id: true, username: true, createdAt: true } }, images: true } });
  return NextResponse.json({ services: rows.map((row) => ({ ...row, provider: row.provider, images: row.images.map((image) => image.objectKey) })) }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'service-create', 5, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_service', issues: parsed.error.flatten() }, { status: 400 });
  if (!(await verifyPublicImageKeys(user.id, 'services', parsed.data.imageKeys))) return NextResponse.json({ error: 'invalid_images' }, { status: 400 });
  const [created] = await db.insert(serviceListings).values({
    providerId: user.id, title: parsed.data.title, description: parsed.data.description, category: parsed.data.category,
    priceFromTsh: parsed.data.priceFromTsh ?? null, priceToTsh: parsed.data.priceToTsh ?? null,
    university: parsed.data.university, campus: parsed.data.campus, availability: parsed.data.availability,
    contactMethod: 'whatsapp', status: 'published',
  }).returning({ id: serviceListings.id });
  if (parsed.data.imageKeys.length) {
    try {
      await db.insert(serviceImages).values(parsed.data.imageKeys.map((objectKey, sortOrder) => ({ serviceListingId: created.id, objectKey, sortOrder })));
    } catch (error) {
      await db.delete(serviceListings).where(eq(serviceListings.id, created.id));
      console.error('Service portfolio image attach failed.', error);
      return NextResponse.json({ error: 'create_failed' }, { status: 500 });
    }
  }
  return NextResponse.json({ id: created.id }, { status: 201 });
}
