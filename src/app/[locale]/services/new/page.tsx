import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { ServiceForm } from '@/features/services/components/service-form';
import { Link } from '@/i18n/navigation';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

export default async function NewServicePage() {
  const [user, locale, t] = await Promise.all([requireMarketplaceUser(), getLocale(), getTranslations('Services')]);
  if (!user) redirect(`/${locale}/login`);
  return <main className="space-y-5 px-4 sm:px-6"><Link className="text-sm font-semibold text-royal" href="/services">← {t('back')}</Link><header><p className="text-xs font-bold uppercase tracking-wider text-royal">{t('eyebrow')}</p><h1 className="mt-1 text-2xl font-extrabold text-ink">{t('newListing')}</h1></header><ServiceForm /></main>;
}
