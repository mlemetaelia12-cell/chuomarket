import { redirect } from 'next/navigation';
import { getLocale } from 'next-intl/server';
import { getSession } from '@/lib/session';
import { ListingEditor } from '@/components/listings/listing-editor';

export default async function NewListingPage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);
  if (!session) redirect(`/${locale}/login`);
  return <ListingEditor />;
}
