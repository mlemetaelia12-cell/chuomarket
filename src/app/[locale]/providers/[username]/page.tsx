import { and, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { serviceListings, users } from '@/db/schema';
import { Link } from '@/i18n/navigation';
import { r2PublicUrl } from '@/lib/r2';
import { PublicImage } from '@/components/v2/public-image';

export default async function ProviderProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const [provider, t, locale] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.username, username), columns: { id: true, username: true, createdAt: true, banned: true } }),
    getTranslations('Services'), getLocale(),
  ]);
  if (!provider || provider.banned) notFound();
  const listings = await db.query.serviceListings.findMany({ where: and(eq(serviceListings.providerId, provider.id), eq(serviceListings.status, 'published')), orderBy: [desc(serviceListings.createdAt)], with: { images: true }, limit: 60 });
  const categoryLabels: Record<string, string> = { web_development: t('webDevelopment'), graphic_design: t('graphicDesign'), photography: t('photography'), tutoring: t('tutoring'), typing: t('typing'), technical_support: t('technicalSupport'), other: t('other') };
  return <main className="space-y-5 px-4 sm:px-6"><Link className="text-sm font-semibold text-royal" href="/services">← {t('back')}</Link><header className="rounded-3xl border border-divider bg-white p-6 shadow-card"><p className="text-xs font-bold uppercase tracking-wider text-royal">{t('providerProfile')}</p><h1 className="mt-2 text-2xl font-extrabold text-ink">@{provider.username}</h1><p className="mt-2 text-sm text-ink-muted">{t('memberSince', { date: provider.createdAt.toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-TZ') })}</p><p className="mt-1 text-sm text-ink-muted">{listings.length} · {t('newListing')}</p></header>{listings.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-ink-muted">{t('empty')}</p> : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((item) => <Link className="overflow-hidden rounded-2xl border border-divider bg-white shadow-card" href={`/services/${item.id}`} key={item.id}>{item.images[0] && <PublicImage alt={item.title} className="h-40 w-full object-cover" src={r2PublicUrl ? `${r2PublicUrl}/${item.images[0].objectKey}` : null} />}<div className="space-y-2 p-4"><span className="text-xs font-bold text-royal">{categoryLabels[item.category]}</span><h2 className="font-extrabold text-ink">{item.title}</h2><p className="line-clamp-2 text-sm text-ink-muted">{item.description}</p></div></Link>)}</section>}</main>;
}
