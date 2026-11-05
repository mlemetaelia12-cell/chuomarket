import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { HousingListingForm } from '@/features/housing/components/housing-forms';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { Link } from '@/i18n/navigation';

export default async function NewHousingPage() {
  const [user, locale, t] = await Promise.all([requireMarketplaceUser(), getLocale(), getTranslations('Housing')]);
  if (!user) redirect(`/${locale}/login`);
  return <main className="space-y-5 px-4 sm:px-6"><Link className="text-sm font-semibold text-royal" href="/rooms">← {t('back')}</Link><header><p className="text-xs font-bold uppercase tracking-wider text-royal">{t('eyebrow')}</p><h1 className="mt-1 text-2xl font-extrabold text-ink">{t('createTitle')}</h1></header><HousingListingForm /></main>;
}
