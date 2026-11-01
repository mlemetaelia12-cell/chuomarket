import { NextResponse } from 'next/server';
import { desc, eq } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '@/db';
import { listingImages, listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { areOwnedListingImages } from '@/lib/listing-validation';
import { enforceRateLimit } from '@/lib/rate-limit';

const listingSchema = z.object({
  title: z.string().trim().min(3).max(140),
  description: z.string().trim().min(5).max(5000),
  category: z.enum(['books', 'electronics', 'clothes', 'utensils', 'other']),
  priceTsh: z.number().int().positive().max(1000000000),
  meetingPlace: z.string().trim().min(2).max(180),
  images: z.array(z.string().url()).max(3),
});

export async function GET() {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const rows = await db.query.listings.findMany({
    where: eq(listings.ownerId, user.id),
    orderBy: [desc(listings.createdAt)],
    with: { images: true },
  });
  return NextResponse.json({ listings: rows });
}

export async function POST(request: Request) {
  const user = await requireMarketplaceUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  if (!(await enforceRateLimit(request, 'listing-create', 8, 60))) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  const parsed = listingSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'invalid_listing' }, { status: 400 });
  if (!areOwnedListingImages(parsed.data.images, user.id)) {
    return NextResponse.json({ error: 'invalid_images' }, { status: 400 });
  }

  const [created] = await db
    .insert(listings)
    .values({
      ownerId: user.id,
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      priceTsh: parsed.data.priceTsh,
      meetingPlace: parsed.data.meetingPlace,
      status: 'draft',
    })
    .returning();

  if (created && parsed.data.images.length > 0) {
    await db.insert(listingImages).values(
      parsed.data.images.map((fileUrl, sortOrder) => ({
        listingId: created.id,
        fileUrl,
        sortOrder,
      })),
    );
  }
  return NextResponse.json({ id: created?.id }, { status: 201 });
}
