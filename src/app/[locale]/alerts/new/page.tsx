import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import { AlertCreateForm } from '@/features/alerts/components/alert-create-form';
import { Link } from '@/i18n/navigation';
import { getAdminActor } from '@/lib/admin';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

export default async function NewAlertPage() {
  const [user, locale, t, admin] = await Promise.all([requireMarketplaceUser(), getLocale(), getTranslations('Alerts'), getAdminActor()]);
  if (!user) redirect(`/${locale}/login`);
  return <main className="space-y-5 px-4 sm:px-6"><Link className="text-sm font-semibold text-royal" href="/alerts">← {t('title')}</Link><header><p className="text-xs font-bold uppercase tracking-wider text-royal">{t('eyebrow')}</p><h1 className="mt-1 text-2xl font-extrabold text-ink">{t('create')}</h1></header><AlertCreateForm canPublishOfficial={Boolean(admin)} /></main>;
}
