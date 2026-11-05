import { and, desc, eq, gt, ilike, isNull, or, sql } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { campusAlerts } from '@/db/schema';
import { ReportButton } from '@/components/v2/report-button';
import { Link } from '@/i18n/navigation';

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ q?: string; campus?: string; category?: string }> }) {
  const params = await searchParams;
  const [t, locale] = await Promise.all([getTranslations('Alerts'), getLocale()]);
  const now = new Date();
  const conditions = [eq(campusAlerts.status, 'published'), or(isNull(campusAlerts.expiresAt), gt(campusAlerts.expiresAt, now))!, sql`${campusAlerts.publishedAt} IS NOT NULL`];
  const search = (params.q ?? '').trim().slice(0, 100);
  const campus = (params.campus ?? '').trim().slice(0, 160);
  if (search) conditions.push(or(ilike(campusAlerts.title, `%${search}%`), ilike(campusAlerts.description, `%${search}%`))!);
  if (campus) conditions.push(or(isNull(campusAlerts.campus), eq(campusAlerts.campus, campus))!);
  const categories = ['academic_deadline', 'registration', 'examinations', 'scholarships', 'events', 'announcements', 'lost_found'] as const;
  const category = categories.find((value) => value === params.category);
  if (category) conditions.push(eq(campusAlerts.category, category));
  const alerts = await db.query.campusAlerts.findMany({
    where: and(...conditions),
    orderBy: [desc(sql`CASE WHEN ${campusAlerts.trustLabel} = 'official' THEN 2 WHEN ${campusAlerts.trustLabel} = 'community' THEN 1 ELSE 0 END`), desc(campusAlerts.publishedAt)],
    limit: 80,
    with: { publisher: { columns: { username: true } } },
  });
  const categoryLabels: Record<(typeof categories)[number], string> = {
    academic_deadline: t('academicDeadline'), registration: t('registration'), examinations: t('examinations'),
    scholarships: t('scholarships'), events: t('events'), announcements: t('announcements'), lost_found: t('lostFound'),
  };
  const trustLabels = { official: t('official'), community: t('community'), unverified: t('unverified') };
  return (
    <main className="space-y-6 px-4 sm:px-6">
      <section className="rounded-3xl bg-navy-950 p-6 text-white shadow-cinematic sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-electric">{t('eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('title')}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{t('intro')}</p><Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-electric px-4 py-3 text-sm font-bold text-navy-950" href="/alerts/new">{t('create')}</Link></section>
      <section className="rounded-2xl border border-divider bg-white p-4 shadow-card"><form action="/alerts" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('filter')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={search} name="q" placeholder={t('titleField')} /></label><label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('category')}</span><select className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={category ?? ''} name="category"><option value="">{t('filter')}</option>{categories.map((value) => <option key={value} value={value}>{categoryLabels[value]}</option>)}</select></label><label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('campus')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={campus} name="campus" /></label><button className="min-h-10 self-end rounded-xl bg-royal px-4 text-sm font-bold text-white" type="submit">{t('filter')}</button></form></section>
      <section className="space-y-3">
        {alerts.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-ink-muted">{t('empty')}</p> : alerts.map((alert) => (
          <article className={`space-y-3 rounded-2xl border bg-white p-4 shadow-card sm:p-5 ${alert.trustLabel === 'official' ? 'border-royal/30' : 'border-divider'}`} key={alert.id}>
            <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[11px] font-bold uppercase tracking-wider text-royal">{categoryLabels[alert.category]}</span><h2 className="mt-1 text-lg font-extrabold text-ink">{alert.title}</h2></div><span className={`rounded-full px-3 py-1 text-xs font-bold ${alert.trustLabel === 'official' ? 'bg-royal text-white' : alert.trustLabel === 'community' ? 'bg-electric-light text-navy-950' : 'bg-amber-100 text-amber-900'}`}>{trustLabels[alert.trustLabel]}</span></div>
            <p className="whitespace-pre-line text-sm leading-7 text-ink-secondary">{alert.description}</p>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-ink-muted"><span>{alert.university ?? t('allCampuses')}</span>{alert.campus && <span>{alert.campus}</span>}<span>{t('postedBy', { name: alert.publisher.username })}</span></div>
            {(alert.sourceName || alert.sourceUrl) && <p className="text-xs text-ink-muted">{t('source')}: {alert.sourceUrl ? <a className="font-semibold text-royal underline" href={alert.sourceUrl} rel="noreferrer noopener" target="_blank">{alert.sourceName ?? alert.sourceUrl}</a> : alert.sourceName}</p>}
            {alert.expiresAt && <p className="text-xs text-ink-muted">{t('expires', { date: alert.expiresAt.toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-TZ') })}</p>}
            <div className="border-t border-divider pt-2"><ReportButton targetId={alert.id} targetType="campus_alert" /></div>
          </article>
        ))}
      </section>
      <p className="rounded-2xl bg-canvas p-4 text-xs leading-6 text-ink-muted">{t('safety')}</p>
    </main>
  );
}
