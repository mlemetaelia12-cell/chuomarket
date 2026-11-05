import { and, desc, eq, ilike, or } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { db } from '@/db';
import { studyMaterials } from '@/db/schema';
import { ReportButton } from '@/components/v2/report-button';
import { Link } from '@/i18n/navigation';
import { requireMarketplaceUser } from '@/lib/marketplace-user';

export default async function LibraryPage({ searchParams }: { searchParams: Promise<{ q?: string; university?: string; program?: string; year?: string; subject?: string; type?: string; sort?: string }> }) {
  const params = await searchParams;
  const [t, locale, user] = await Promise.all([getTranslations('Library'), getLocale(), requireMarketplaceUser()]);
  const query = (params.q ?? '').trim().slice(0, 100);
  const conditions = [eq(studyMaterials.moderationStatus, 'approved')];
  if (query) conditions.push(or(ilike(studyMaterials.title, `%${query}%`), ilike(studyMaterials.subject, `%${query}%`), ilike(studyMaterials.description, `%${query}%`))!);
  if (params.university) conditions.push(eq(studyMaterials.university, params.university.slice(0, 160)));
  if (params.program) conditions.push(eq(studyMaterials.program, params.program.slice(0, 160)));
  if (params.subject) conditions.push(ilike(studyMaterials.subject, `%${params.subject.slice(0, 160)}%`));
  const year = Number(params.year);
  if (Number.isInteger(year) && year >= 1 && year <= 8) conditions.push(eq(studyMaterials.studyYear, year));
  const validType = ['notes', 'past_paper', 'study_guide', 'assignment', 'revision'] as const;
  const type = validType.find((value) => value === params.type);
  if (type) conditions.push(eq(studyMaterials.materialType, type));
  const order = params.sort === 'popular' ? [desc(studyMaterials.downloadCount), desc(studyMaterials.createdAt)] : [desc(studyMaterials.createdAt)];
  const [materials, popular] = await Promise.all([
    db.query.studyMaterials.findMany({ where: and(...conditions), orderBy: order, limit: 60, with: { uploader: { columns: { username: true } } } }),
    db.query.studyMaterials.findMany({ where: eq(studyMaterials.moderationStatus, 'approved'), orderBy: [desc(studyMaterials.downloadCount)], limit: 5, columns: { id: true, title: true, downloadCount: true } }),
  ]);
  const currencyDate = (value: Date) => value.toLocaleDateString(locale === 'sw' ? 'sw-TZ' : 'en-TZ', { day: 'numeric', month: 'short', year: 'numeric' });
  const typeLabel: Record<(typeof validType)[number], string> = { notes: t('notes'), past_paper: t('pastPaper'), study_guide: t('studyGuide'), assignment: t('assignment'), revision: t('revision') };
  return (
    <main className="space-y-6 px-4 sm:px-6">
      <section className="rounded-3xl bg-navy-950 p-6 text-white shadow-cinematic sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-electric">{t('eyebrow')}</p><h1 className="mt-2 text-3xl font-extrabold sm:text-4xl">{t('title')}</h1><p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">{t('intro')}</p>
        <Link className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-electric px-4 py-3 text-sm font-bold text-navy-950" href="/library/upload">{t('upload')}</Link>
      </section>
      <section className="rounded-2xl border border-divider bg-white p-4 shadow-card">
        <h2 className="mb-3 text-sm font-extrabold text-ink">{t('filter')}</h2>
        <form action="/library" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('search')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={query} name="q" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('university')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.university} name="university" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('program')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.program} name="program" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('subject')}</span><input className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.subject} name="subject" /></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('year')}</span><select className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.year ?? ''} name="year"><option value="">—</option>{[1,2,3,4,5,6,7,8].map((year) => <option key={year} value={year}>{t('yearOption', { year })}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('type')}</span><select className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.type ?? ''} name="type"><option value="">{t('allTypes')}</option>{validType.map((value) => <option key={value} value={value}>{typeLabel[value]}</option>)}</select></label>
          <label className="grid gap-1 text-xs font-semibold text-ink-muted"><span>{t('popular')}</span><select className="min-h-10 rounded-xl border border-divider px-3 text-sm text-ink" defaultValue={params.sort ?? 'recent'} name="sort"><option value="recent">{t('recent')}</option><option value="popular">{t('popular')}</option></select></label>
          <button className="min-h-10 self-end rounded-xl bg-royal px-4 text-sm font-bold text-white" type="submit">{t('filter')}</button>
        </form>
      </section>
      <section className="grid gap-6 lg:grid-cols-[1fr_260px]">
        <div className="space-y-3"><div className="flex items-center justify-between"><h2 className="text-xl font-extrabold text-ink">{t('recent')}</h2><span className="text-xs text-ink-muted">{materials.length}</span></div>
          {materials.length === 0 ? <p className="rounded-2xl border border-divider bg-white p-5 text-sm text-ink-muted">{t('empty')}</p> : materials.map((material) => (
            <article className="space-y-3 rounded-2xl border border-divider bg-white p-4 shadow-card" key={material.id}>
              <div className="flex flex-wrap items-start justify-between gap-3"><div><span className="text-[11px] font-bold uppercase tracking-wider text-royal">{typeLabel[material.materialType]}</span><h3 className="mt-1 text-base font-extrabold text-ink">{material.title}</h3></div><span className="rounded-full bg-electric-light px-3 py-1 text-xs font-bold text-navy-950">{t('downloads', { count: material.downloadCount })}</span></div>
              <p className="text-sm leading-6 text-ink-secondary">{material.description}</p>
              <p className="text-xs text-ink-muted">{material.university} · {material.program} · {t('yearOption', { year: material.studyYear })} · {material.subject}</p>
              <p className="text-xs text-ink-muted">{t('uploadedBy', { name: material.uploader.username })} · {t('uploadedOn', { date: currencyDate(material.createdAt) })}</p>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-divider pt-3">{user ? <a className="inline-flex min-h-10 items-center rounded-xl bg-royal px-4 text-sm font-bold text-white" href={`/api/library/${material.id}/download`}>{t('download')}</a> : <span className="text-xs text-ink-muted">{t('downloadLogin')}</span>}<ReportButton targetId={material.id} targetType="study_material" /></div>
            </article>
          ))}
        </div>
        <aside className="h-fit rounded-2xl border border-divider bg-white p-4 shadow-card"><h2 className="text-sm font-extrabold text-ink">{t('popular')}</h2><div className="mt-3 space-y-3">{popular.map((item, index) => <div className="flex gap-3" key={item.id}><span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-royal-soft text-xs font-bold text-royal-dark">{index + 1}</span><div><p className="text-sm font-semibold text-ink">{item.title}</p><p className="text-xs text-ink-muted">{t('downloads', { count: item.downloadCount })}</p></div></div>)}</div><p className="mt-4 border-t border-divider pt-4 text-xs leading-5 text-ink-muted">{t('copyright')}</p></aside>
      </section>
    </main>
  );
}
