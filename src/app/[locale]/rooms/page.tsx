import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { housingListings, roommateRequests } from '@/db/schema';
import { ContactButton } from '@/components/v2/contact-button';
import { PublicImage } from '@/components/v2/public-image';
import { ReportButton } from '@/components/v2/report-button';
import { Link } from '@/i18n/navigation';
import { r2PublicUrl } from '@/lib/r2';

export default async function HousingPage({ searchParams }: { searchParams: Promise<{ q?: string; campus?: string; type?: string }> }) {
  const params = await searchParams;
  const [t, v2, locale] = await Promise.all([getTranslations('Housing'), getTranslations('V2'), getLocale()]);
  const search = (params.q ?? '').trim().slice(0, 100);
  const campus = (params.campus ?? '').trim().slice(0, 160);
  const listingConditions = [eq(housingListings.status, 'published')];
  const requestConditions = [eq(roommateRequests.status, 'active')];
  if (search) {
    listingConditions.push(or(ilike(housingListings.title, `%${search}%`), ilike(housingListings.description, `%${search}%`), ilike(housingListings.area, `%${search}%`))!);
    requestConditions.push(or(ilike(roommateRequests.preferredArea, `%${search}%`), ilike(roommateRequests.introduction, `%${search}%`))!);
  }
  if (campus) {
    listingConditions.push(ilike(housingListings.campus, `%${campus}%`));
    requestConditions.push(ilike(roommateRequests.campus, `%${campus}%`));
  }
  if (params.type === 'room' || params.type === 'hostel' || params.type === 'bed_space') listingConditions.push(eq(housingListings.listingType, params.type));
  const [listings, requests] = await Promise.all([
  db.query.housingListings.findMany({
    where: and(...listingConditions),
    orderBy: [desc(housingListings.createdAt)],
    limit: 50,

   with: {
    owner: {
      columns: { username: true },
    },
    images: true,
  },
}),
  db.query.roommateRequests.findMany({
  where: and(...requestConditions),
  orderBy: [desc(roommateRequests.createdAt)],
  limit: 50,
  with: {
    owner: {
      columns: { username: true },
    },
  },
}),
]);
  const currency = (amount: number) => `TSh ${amount.toLocaleString(locale === 'sw' ? 'sw-TZ' : 'en-TZ')}`;
  return (
    <main className="space-y-6 px-4 sm:px-6">
      <section className="overflow-hidden rounded-3xl bg-navy-950 p-6 text-white shadow-cinematic sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric">{t('eyebrow')}</p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight sm:text-4xl">{t('title')}</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{t('intro')}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link className="rounded-xl bg-electric px-4 py-3 text-sm font-bold text-navy-950" href="/rooms/new">{t('newListing')}</Link>
          <Link className="rounded-xl border border-white/20 px-4 py-3 text-sm font-bold text-white" href="/roommates/new">{t('newRequest')}</Link>
        </div>
      </section>

      <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
        <h2 className="text-sm font-extrabold text-amber-950">{v2('safetyTitle')}</h2>
        <p className="mt-1 text-sm leading-6 text-amber-900">{v2('safetyText')}</p>
      </section>

      <section className="rounded-2xl border border-divider bg-white p-4 shadow-card">
        <form action="/rooms" className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('search')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={search} name="q" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('campus')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={campus} name="campus" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('type')}</span><select className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.type ?? ''} name="type"><option value="">{t('allTypes')}</option><option value="room">{t('room')}</option><option value="hostel">{t('hostel')}</option><option value="bed_space">{t('bedSpace')}</option></select></label>
          <button className="min-h-10 rounded-xl bg-royal px-4 text-sm font-bold text-white sm:col-span-3" type="submit">{t('search')}</button>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-royal">{t('roomsTab')}</p><h2 className="mt-1 text-xl font-extrabold text-ink">{t('rooms')}</h2></div>
          <span className="rounded-full bg-royal-soft px-3 py-1 text-xs font-bold text-royal-dark">{listings.length}</span>
        </div>
        {listings.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-ink-muted">{t('emptyRooms')}</p> : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {listings.map((item) => (
              <article className="overflow-hidden rounded-2xl border border-divider bg-white shadow-card" key={item.id}>
                {item.images[0] && <PublicImage alt={item.title} className="h-44 w-full object-cover" src={r2PublicUrl ? `${r2PublicUrl}/${item.images[0].objectKey}` : null} />}
                <div className="space-y-3 p-4">
                  <div className="flex items-center justify-between gap-2"><span className="rounded-full bg-royal-soft px-2.5 py-1 text-[11px] font-bold capitalize text-royal-dark">{t(item.listingType === 'bed_space' ? 'bedSpace' : item.listingType)}</span><span className="text-sm font-extrabold text-ink">{currency(item.monthlyPriceTsh)} {t('perMonth')}</span></div>
                  <div><h3 className="text-base font-extrabold text-ink">{item.title}</h3><p className="mt-1 text-sm text-ink-muted">{item.area} · {item.campus}</p></div>
                  <p className="line-clamp-3 text-sm leading-6 text-ink-secondary">{item.description}</p>
                  <p className="text-xs text-ink-muted">{t('spacesAvailable', { count: item.availableSpaces })} · {t('postedBy', { name: item.owner.username })}</p>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3"><ContactButton endpoint={`/api/housing/listings/${item.id}/contact`} /><ReportButton targetId={item.id} targetType="housing_listing" /></div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-end justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-royal">{t('roommatesTab')}</p><h2 className="mt-1 text-xl font-extrabold text-ink">{t('roommateRequests')}</h2></div><span className="rounded-full bg-royal-soft px-3 py-1 text-xs font-bold text-royal-dark">{requests.length}</span></div>
        {requests.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-ink-muted">{t('emptyRequests')}</p> : (
          <div className="grid gap-3 lg:grid-cols-2">
            {requests.map((item) => (
              <article className="space-y-3 rounded-2xl border border-divider bg-white p-4 shadow-card" key={item.id}>
                <div className="flex items-start justify-between gap-3"><div><h3 className="font-extrabold text-ink">{item.preferredArea} · {item.campus}</h3><p className="mt-1 text-xs text-ink-muted">{item.university} · {t('postedBy', { name: item.owner.username })}</p></div><span className="rounded-full bg-electric-light px-2.5 py-1 text-xs font-bold text-navy-950">{currency(item.minBudgetTsh)} – {currency(item.maxBudgetTsh)}</span></div>
                <p className="text-sm leading-6 text-ink-secondary">{item.introduction}</p><p className="text-sm text-ink-muted">{t('moveInPeriod')}: {item.moveInPeriod}</p><p className="text-sm text-ink-muted">{item.requirements}</p>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3"><ContactButton endpoint={`/api/housing/roommate-requests/${item.id}/contact`} /><ReportButton targetId={item.id} targetType="roommate_request" /></div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
