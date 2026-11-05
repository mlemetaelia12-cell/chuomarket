import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { serviceListings } from '@/db/schema';
import { ContactButton } from '@/components/v2/contact-button';
import { PublicImage } from '@/components/v2/public-image';
import { ReportButton } from '@/components/v2/report-button';
import { Link } from '@/i18n/navigation';
import { r2PublicUrl } from '@/lib/r2';

export default async function ServiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [item, t, locale] = await Promise.all([
    db.query.serviceListings.findFirst({ where: eq(serviceListings.id, id), with: { provider: { columns: { username: true, createdAt: true } }, images: true } }),
    getTranslations('Services'), getLocale(),
  ]);
  if (!item || item.status !== 'published') notFound();
  const categoryLabels: Record<string, string> = { web_development: t('webDevelopment'), graphic_design: t('graphicDesign'), photography: t('photography'), tutoring: t('tutoring'), typing: t('typing'), technical_support: t('technicalSupport'), other: t('other') };
  const price = item.priceFromTsh !== null ? `TSh ${item.priceFromTsh.toLocaleString(locale === 'sw' ? 'sw-TZ' : 'en-TZ')}` : t('priceOnRequest');
  return <main className="space-y-5 px-4 sm:px-6"><Link className="text-sm font-semibold text-royal" href="/services">← {t('back')}</Link><article className="overflow-hidden rounded-3xl border border-divider bg-white shadow-card">{item.images[0] && <PublicImage alt={item.title} className="max-h-[420px] w-full object-cover" src={r2PublicUrl ? `${r2PublicUrl}/${item.images[0].objectKey}` : null} />}<div className="space-y-4 p-5 sm:p-8"><span className="rounded-full bg-royal-soft px-3 py-1 text-xs font-bold text-royal-dark">{categoryLabels[item.category]}</span><h1 className="text-2xl font-extrabold text-ink sm:text-3xl">{item.title}</h1><p className="text-sm leading-7 text-ink-secondary">{item.description}</p><div className="grid gap-3 rounded-2xl bg-canvas p-4 text-sm sm:grid-cols-2"><p><strong>{t('provider').split('@')[0]}</strong> <Link className="font-semibold text-royal underline" href={`/providers/${item.provider.username}`}>@{item.provider.username}</Link></p><p><strong>{t('campus')}:</strong> {item.campus}</p><p><strong>{t('availability')}:</strong> {item.availability}</p><p><strong>{t('category')}:</strong> {categoryLabels[item.category]}</p><p className="font-extrabold text-ink">{price}</p></div><div className="flex flex-wrap items-center gap-3"><ContactButton endpoint={`/api/services/${item.id}/contact`} /><ReportButton targetId={item.id} targetType="service_listing" /></div><p className="text-xs leading-6 text-ink-muted">{t('disclaimer')}</p></div></article></main>;
}
