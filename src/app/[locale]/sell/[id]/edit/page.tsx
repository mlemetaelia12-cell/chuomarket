import { and, eq } from 'drizzle-orm';
import { notFound, redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { db } from '@/db';
import { listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { ListingEditor } from '@/components/listings/listing-editor';

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const [user, locale] = await Promise.all([requireMarketplaceUser(), getLocale()]);
  if (!user) redirect(`/${locale}/login`);
  const { id } = await params;
  const item = await db.query.listings.findFirst({
    where: and(eq(listings.id, id), eq(listings.ownerId, user.id), eq(listings.status, 'draft')),
    with: { images: true },
  });
  if (!item) notFound();
  return <ListingEditor initial={{
    id: item.id, title: item.title, description: item.description, category: item.category,
    priceTsh: item.priceTsh, meetingPlace: item.meetingPlace, images: item.images.map((image) => image.fileUrl),
  }} />;
}
