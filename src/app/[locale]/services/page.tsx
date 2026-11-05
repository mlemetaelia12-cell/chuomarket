import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { serviceListings } from '@/db/schema';
import { PublicImage } from '@/components/v2/public-image';
import { Link } from '@/i18n/navigation';
import { r2PublicUrl } from '@/lib/r2';

export default async function ServicesPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; campus?: string }> }) {
  const params = await searchParams;
  const [t, locale] = await Promise.all([getTranslations('Services'), getLocale()]);
  const conditions = [eq(serviceListings.status, 'published')];
  const search = (params.q ?? '').trim().slice(0, 100);
  if (search) conditions.push(or(ilike(serviceListings.title, `%${search}%`), ilike(serviceListings.description, `%${search}%`))!);
  if (params.campus) conditions.push(eq(serviceListings.campus, params.campus.slice(0, 160)));
  const categories = ['web_development', 'graphic_design', 'photography', 'tutoring', 'typing', 'technical_support', 'other'] as const;
  const category = categories.find((value) => value === params.category);
  if (category) conditions.push(eq(serviceListings.category, category));
  const categoryLabels: Record<(typeof categories)[number], string> = { web_development: t('webDevelopment'), graphic_design: t('graphicDesign'), photography: t('photography'), tutoring: t('tutoring'), typing: t('typing'), technical_support: t('technicalSupport'), other: t('other') };
  const listings = await db.query.serviceListings.findMany({ where: and(...conditions), orderBy: [desc(serviceListings.createdAt)], limit: 80, with: { provider: { columns: { username: true } }, images: true } });
  const price = (from: number | null, to: number | null) => from !== null && to !== null ? t('range', { from: from.toLocaleString(locale === 'sw' ? 'sw-TZ' : 'en-TZ'), to: to.toLocaleString(locale === 'sw' ? 'sw-TZ' : 'en-TZ') }) : from !== null ? t('startingAt', { price: from.toLocaleString(locale === 'sw' ? 'sw-TZ' : 'en-TZ') }) : t('priceOnRequest');
  return (
    <main className="space-y-6 px-4 sm:px-6">
      <section className="rounded-3xl bg-navy-950 p-6 text-white shadow-cinematic sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-electric">{t('eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('title')}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{t('intro')}</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-electric px-4 py-3 text-sm font-bold text-navy-950" href="/services/new">{t('newListing')}</Link></section>
      <section className="rounded-2xl border border-divider bg-white p-4 shadow-card"><form action="/services" className="grid gap-3 sm:grid-cols-3"><label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('search')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={search} name="q" /></label><label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('category')}</span><select className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={category ?? ''} name="category"><option value="">{t('allCategories')}</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('campus')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.campus} name="campus" /></label><button className="min-h-10 rounded-xl bg-royal px-4 text-sm font-bold text-white sm:col-span-3" type="submit">{t('search')}</button></form></section>
      {listings.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-ink-muted">{t('empty')}</p> : <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{listings.map((item) => (
        <Link className="group overflow-hidden rounded-2xl border border-divider bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover" href={`/services/${item.id}`} key={item.id}>
          {item.images[0] && <PublicImage alt={item.title} className="h-44 w-full object-cover" src={r2PublicUrl ? `${r2PublicUrl}/${item.images[0].objectKey}` : null} />}
          <div className="space-y-3 p-4"><span className="rounded-full bg-royal-soft px-2.5 py-1 text-[11px] font-bold text-royal-dark">{categoryLabels[item.category]}</span><div><h2 className="text-base font-extrabold text-ink">{item.title}</h2><p className="mt-1 line-clamp-3 text-sm leading-6 text-ink-muted">{item.description}</p></div><p className="text-sm font-extrabold text-ink">{price(item.priceFromTsh, item.priceToTsh)}</p><p className="text-xs text-ink-muted">{item.campus} · {t('provider', { name: item.provider.username })}</p><p className="text-xs font-bold text-royal">{t('contact')} →</p></div>
        </Link>
      ))}</section>}
      <p className="rounded-2xl bg-canvas p-4 text-xs leading-6 text-ink-muted">{t('disclaimer')}</p>
    </main>
  );
}
