import { and, count, desc, eq, gte, ilike, lte, or, sql } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';

import { db } from '@/db';
import { favorites, listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { BrowseFilters } from '@/components/browse/browse-filters';
import { ListingCard } from '@/components/browse/listing-card';
import { Link } from '@/i18n/navigation';

type SearchParams = Promise<{
  q?: string;
  category?: string;
  min?: string;
  max?: string;
  sort?: string;
  page?: string;
}>;

const validCategories = ['books', 'electronics', 'clothes', 'utensils', 'other'] as const;

export default async function HomePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const [t, auth, user, locale] = await Promise.all([
    getTranslations('Browse'),
    getTranslations('Auth'),
    requireMarketplaceUser(),
    getLocale(),
  ]);
  const isSwahili = locale === 'sw';

  const search = (params.q ?? '').trim().slice(0, 100);

  const category = validCategories.includes(params.category as (typeof validCategories)[number])
    ? params.category!
    : '';

  const minPrice = params.min && /^\d+$/.test(params.min) ? Number(params.min) : undefined;

  const maxPrice = params.max && /^\d+$/.test(params.max) ? Number(params.max) : undefined;

  const sort: 'newest' | 'price_asc' | 'price_desc' =
    params.sort === 'price_asc' || params.sort === 'price_desc' ? params.sort : 'newest';

  const page = Math.max(1, Math.min(10000, Number(params.page) || 1));

  const pageSize = 12;
  const conditions = [eq(listings.status, 'published')];

  if (search) {
    conditions.push(
      or(ilike(listings.title, `%${search}%`), ilike(listings.description, `%${search}%`))!,
    );
  }

  if (category) {
    conditions.push(eq(listings.category, category as (typeof validCategories)[number]));
  }

  if (minPrice !== undefined) {
    conditions.push(gte(listings.priceTsh, minPrice));
  }

  if (maxPrice !== undefined) {
    conditions.push(lte(listings.priceTsh, maxPrice));
  }

  const where = and(...conditions);

  const featuredPriority = desc(sql`(${listings.featuredUntil} > now())`);

  const boostedRecency = sql`
    coalesce(${listings.boostedAt}, ${listings.createdAt}) desc
  `;

  const orderBy =
    sort === 'price_asc'
      ? [featuredPriority, sql`${listings.priceTsh} asc`, boostedRecency]
      : sort === 'price_desc'
        ? [featuredPriority, sql`${listings.priceTsh} desc`, boostedRecency]
        : [featuredPriority, boostedRecency];

  const [featured, rows, totalRows, favoriteRows] = await Promise.all([
    db.query.listings.findMany({
      where: and(eq(listings.status, 'published'), sql`${listings.featuredUntil} > now()`),
      orderBy: [desc(listings.featuredUntil)],
      limit: 4,
      with: { images: true },
    }),

    db.query.listings.findMany({
      where,
      orderBy,
      limit: pageSize,
      offset: (page - 1) * pageSize,
      with: { images: true },
    }),

    db.select({ total: count() }).from(listings).where(where),

    user
      ? db
          .select({ listingId: favorites.listingId })
          .from(favorites)
          .where(eq(favorites.userId, user.id))
      : Promise.resolve([]),
  ]);

  const total = totalRows[0]?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const favoriteIds = favoriteRows.map((row) => row.listingId);

  const queryString = new URLSearchParams();

  if (search) queryString.set('q', search);
  if (category) queryString.set('category', category);
  if (params.min) queryString.set('min', params.min);
  if (params.max) queryString.set('max', params.max);
  if (sort !== 'newest') queryString.set('sort', sort);

  return (
    <main className="space-y-10 pb-8">
      {/* Clear, mobile-first marketplace introduction */}
      <section className="relative overflow-hidden rounded-3xl border border-divider bg-white shadow-sm">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full bg-brand-100/80 blur-3xl"
        />
        <div className="relative grid gap-8 px-5 py-8 sm:px-8 sm:py-10 lg:grid-cols-[1fr_auto] lg:items-center lg:px-10">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-800">
              <span className="size-2 rounded-full bg-lime" />
              {t('eyebrow')}
            </span>
            <h1 className="mt-5 max-w-2xl text-3xl font-extrabold leading-tight tracking-tight text-ink sm:text-4xl lg:text-[2.75rem]">
              {t('headline')}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-ink-muted sm:text-base">
              {t('intro')}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              {!user ? (
                <>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
                    href="/signup"
                  >
                    {auth('signupAction')}
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-divider bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-canvas"
                    href="/login"
                  >
                    {auth('loginAction')}
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-brand-800"
                    href="/sell"
                  >
                    {isSwahili ? 'Weka tangazo' : 'Create a listing'}
                  </Link>
                  <Link
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-divider bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-canvas"
                    href="/favorites"
                  >
                    {t('viewSaved')}
                  </Link>
                </>
              )}
            </div>
          </div>
          <div className="hidden min-w-52 flex-col items-start gap-3 rounded-2xl bg-canvas p-5 text-sm text-ink-muted sm:flex lg:min-w-60">
            <span className="flex size-11 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm">
              <span className="text-lg font-black">CM</span>
            </span>
            <p className="font-bold text-ink">
              {isSwahili ? 'Soko la wanafunzi' : 'The student marketplace'}
            </p>
            <p className="text-xs leading-5">
              {isSwahili
                ? 'Gundua bidhaa, huduma na fursa kutoka kwa wanafunzi.'
                : 'Discover products, services and opportunities shared by students.'}
            </p>
          </div>
        </div>
      </section>

      {/* ================================================== */}
      {/* SEARCH AND FILTERS                                  */}
      {/* ================================================== */}

      <section className="rounded-3xl border border-divider bg-surface p-4 shadow-card sm:p-5">
        <div className="mb-4">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-muted">
            {isSwahili ? 'Gundua' : 'Explore'}
          </p>
          <h2 className="mt-1 text-lg font-extrabold text-ink">
            {isSwahili ? 'Tafuta unachohitaji' : 'Find what you need'}
          </h2>
        </div>

        <BrowseFilters
          category={category}
          maxPrice={params.max ?? ''}
          minPrice={params.min ?? ''}
          search={search}
          sort={sort}
        />
      </section>

      {user && (
        <div className="flex justify-end">
          <Link
            className="text-sm font-semibold text-violet underline decoration-violet/30 underline-offset-4 transition hover:text-violet-dark"
            href="/favorites"
          >
            {t('viewSaved')}
          </Link>
        </div>
      )}

      {/* ================================================== */}
      {/* FEATURED LISTINGS                                   */}
      {/* ================================================== */}

      {featured.length > 0 && (
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
                {isSwahili ? 'Chaguo maalumu' : 'Special selection'}
              </p>

              <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                {t('featured')}
              </h2>

              <p className="mt-1 text-sm text-ink-muted">
                {isSwahili
                  ? 'Gundua matangazo yaliyoangaziwa kutoka vyuoni.'
                  : 'Discover promoted campus listings.'}
              </p>
            </div>

            <span className="rounded-full border border-violet/20 bg-violet-soft px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-violet-dark">
              {t('promoted')}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {featured.map((item) => (
              <ListingCard
                favoriteIds={favoriteIds}
                key={item.id}
                listing={item}
                loggedIn={Boolean(user)}
              />
            ))}
          </div>
        </section>
      )}

      {/* ================================================== */}
      {/* LATEST LISTINGS                                    */}
      {/* ================================================== */}

      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-violet">
              {isSwahili ? 'Yaliyoongezwa hivi karibuni' : 'Just added'}
            </p>

            <h2 className="mt-1 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
              {t('latest')}
            </h2>

            <p className="mt-1 text-sm text-ink-muted">{t('resultsCount', { count: total })}</p>
          </div>
        </div>

        {rows.length > 0 ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {rows.map((item) => (
              <ListingCard
                favoriteIds={favoriteIds}
                key={item.id}
                listing={item}
                loggedIn={Boolean(user)}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-divider bg-surface px-5 py-12 text-center shadow-card">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-soft text-2xl text-violet">
              ✦
            </div>

            <h3 className="mt-4 font-bold text-ink">{t('noResults')}</h3>

            <p className="mt-2 text-sm text-ink-muted">
              {isSwahili
                ? 'Jaribu kubadilisha utafutaji au vichujio vya kategoria.'
                : 'Try changing your search or category filters.'}
            </p>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <nav aria-label={t('pagination')} className="flex items-center justify-center gap-4 pt-4">
            {page > 1 ? (
              <Link
                className="rounded-full border border-divider bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-violet hover:text-violet"
                href={`/?${queryString.toString()}${queryString.toString() ? '&' : ''}page=${page - 1}`}
              >
                {t('previous')}
              </Link>
            ) : (
              <span className="rounded-full border border-divider px-4 py-2 text-sm text-ink-subtle">
                {t('previous')}
              </span>
            )}

            <span className="text-xs font-medium text-ink-muted">
              {t('pageOf', { page, total: totalPages })}
            </span>

            {page < totalPages ? (
              <Link
                className="rounded-full border border-divider bg-surface px-4 py-2 text-sm font-semibold text-ink transition hover:border-violet hover:text-violet"
                href={`/?${queryString.toString()}${queryString.toString() ? '&' : ''}page=${page + 1}`}
              >
                {t('next')}
              </Link>
            ) : (
              <span className="rounded-full border border-divider px-4 py-2 text-sm text-ink-subtle">
                {t('next')}
              </span>
            )}
          </nav>
        )}
      </section>

      {/* ================================================== */}
      {/* SAFETY INFORMATION                                 */}
      {/* ================================================== */}

      <aside className="relative isolate overflow-hidden rounded-3xl bg-cinematic-gradient p-6 shadow-card sm:p-8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-hero-glow" />

        <div className="relative">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-lime">
            Shop with confidence
          </p>

          <h2 className="mt-2 text-lg font-extrabold text-white">{t('safetyTitle')}</h2>

          <p className="mt-2 max-w-2xl text-sm leading-7 text-slate-300">{t('safetySummary')}</p>
        </div>
      </aside>
    </main>
  );
}
