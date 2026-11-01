import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { listingImages, listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { areOwnedListingImages } from '@/lib/listing-validation';

type RouteContext = { params: Promise<{ id: string }> };
const schema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(5).max(5000),
  category: z.enum(['books', 'electronics', 'clothes', 'utensils', 'other']),
  priceTsh: z.number().int().positive().max(1000000000),
  meetingPlace: z.string().trim().min(2).max(180),
  images: z.array(z.string().url()).max(3),
});

export async function PATCH(request: Request, context: RouteContext) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_listing' }, { status: 400 });
  if (!areOwnedListingImages(parsed.data.images, user.id)) {
    return NextResponse.json({ error: 'invalid_images' }, { status: 400 });
  }

  const [updated] = await db.update(listings).set({
    title: parsed.data.title, description: parsed.data.description, category: parsed.data.category,
    priceTsh: parsed.data.priceTsh, meetingPlace: parsed.data.meetingPlace, updatedAt: new Date(),
  }).where(and(eq(listings.id, id), eq(listings.ownerId, user.id), eq(listings.status, 'draft'))).returning();

  if (!updated) return NextResponse.json({ error: 'draft_not_found' }, { status: 404 });
  await db.delete(listingImages).where(eq(listingImages.listingId, id));
  if (parsed.data.images.length > 0) {
    await db.insert(listingImages).values(parsed.data.images.map((fileUrl, sortOrder) => ({
      listingId: id, fileUrl, sortOrder,
    })));
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const { id } = await context.params;
  const [deleted] = await db.delete(listings).where(
    and(eq(listings.id, id), eq(listings.ownerId, user.id), eq(listings.status, 'draft')),
  ).returning({ id: listings.id });
  if (!deleted) return NextResponse.json({ error: 'draft_not_found' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
