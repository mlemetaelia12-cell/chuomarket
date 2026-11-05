import { and, desc, eq, ilike, inArray, or } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { housingImages, housingListings, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { enforceRateLimit } from '@/lib/rate-limit';
import { verifyPublicImageKeys } from '@/features/shared/storage';

const createSchema = z.object({
  listingType: z.enum(['room', 'hostel', 'bed_space']),
  title: z.string().trim().min(5).max(140),
  description: z.string().trim().min(20).max(2500),
  university: z.string().trim().min(2).max(160),
  campus: z.string().trim().min(2).max(160),
  area: z.string().trim().min(2).max(180),
  monthlyPriceTsh: z.number().int().positive().max(10000000),
  roomType: z.enum(['single', 'shared', 'self_contained', 'hostel']),
  availableSpaces: z.number().int().min(1).max(30),
  imageKeys: z.array(z.string().min(1).max(500)).max(4).default([]),
});

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const search = (params.get('q') ?? '').trim().slice(0, 100);
  const campus = (params.get('campus') ?? '').trim().slice(0, 160);
  const type = params.get('type');
  const conditions = [eq(housingListings.status, 'published')];
  if (search) conditions.push(or(ilike(housingListings.title, `%${search}%`), ilike(housingListings.description, `%${search}%`), ilike(housingListings.area, `%${search}%`))!);
  if (campus) conditions.push(ilike(housingListings.campus, `%${campus}%`));
  if (type === 'room' || type === 'hostel' || type === 'bed_space') conditions.push(eq(housingListings.listingType, type));
  const rows = await db.select({
    id: housingListings.id, title: housingListings.title, description: housingListings.description,
    listingType: housingListings.listingType, university: housingListings.university, campus: housingListings.campus,
    area: housingListings.area, monthlyPriceTsh: housingListings.monthlyPriceTsh, roomType: housingListings.roomType,
    availableSpaces: housingListings.availableSpaces, createdAt: housingListings.createdAt,
    ownerUsername: users.username,
  }).from(housingListings).innerJoin(users, eq(housingListings.ownerId, users.id))
    .where(and(...conditions)).orderBy(desc(housingListings.createdAt)).limit(60);
  const ids = rows.map((row) => row.id);
  const images = ids.length ? await db.select().from(housingImages).where(inArray(housingImages.housingListingId, ids)) : [];
  return NextResponse.json({ listings: rows.map((row) => ({ ...row, images: images.filter((image) => image.housingListingId === row.id).sort((a, b) => a.sortOrder - b.sortOrder).map((image) => image.objectKey) })) }, { headers: { 'Cache-Control': 'public, s-maxage=30, stale-while-revalidate=60' } });
}

export async function POST(request: Request) {
  if (!(await enforceRateLimit(request, 'housing-create', 6, 3600))) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_listing', issues: parsed.error.flatten() }, { status: 400 });
  if (!(await verifyPublicImageKeys(user.id, 'housing', parsed.data.imageKeys))) return NextResponse.json({ error: 'invalid_images' }, { status: 400 });

  try {
    const [created] = await db.insert(housingListings).values({
      ownerId: user.id, listingType: parsed.data.listingType, title: parsed.data.title,
      description: parsed.data.description, university: parsed.data.university, campus: parsed.data.campus,
      area: parsed.data.area, monthlyPriceTsh: parsed.data.monthlyPriceTsh, roomType: parsed.data.roomType,
      availableSpaces: parsed.data.availableSpaces,
    }).returning({ id: housingListings.id });
    if (parsed.data.imageKeys.length) {
      try {
        await db.insert(housingImages).values(parsed.data.imageKeys.map((objectKey, sortOrder) => ({ housingListingId: created.id, objectKey, sortOrder })));
      } catch (error) {
        await db.delete(housingListings).where(eq(housingListings.id, created.id));
        throw error;
      }
    }
    return NextResponse.json({ id: created.id }, { status: 201 });
  } catch (error) {
    console.error('Housing listing creation failed.', error);
    return NextResponse.json({ error: 'create_failed' }, { status: 500 });
  }
}
