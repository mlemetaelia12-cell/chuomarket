
import { asc, eq } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { Heart, ShoppingBag, ArrowRight } from 'lucide-react';

import { db } from '@/db';
import { favorites } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { ListingCard } from '@/components/browse/listing-card';
import { Link } from '@/i18n/navigation';

export default async function FavoritesPage() {
  const [user, locale, t] = await Promise.all([
    requireMarketplaceUser(),
    getLocale(),
    getTranslations('Browse'),
  ]);

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const saved = await db.query.favorites.findMany({
    where: eq(favorites.userId, user.id),
    orderBy: [asc(favorites.createdAt)],
    with: {
      listing: {
        with: {
          images: true,
        },
      },
    },
  });

  const listings = saved
    .map((entry) => entry.listing)
    .filter((listing) => listing.status === 'published');

  const favoriteIds = listings.map((listing) => listing.id);

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-6 text-ink sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* Cinematic header */}
        <header className="relative isolate overflow-hidden rounded-[28px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-violet/35 blur-3xl" />

          <div className="relative flex flex-wrap items-center justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime">
                <Heart className="size-3.5" />
                {t('savedEyebrow')}
              </div>

              <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
                {t('savedTitle')}
              </h1>

              <p className="mt-2 text-sm leading-6 text-white/65">
                {locale === 'sw'
                  ? 'Bidhaa ulizohifadhi ili uweze kuzipata kwa urahisi baadaye.'
                  : 'Items you saved so you can easily find them later.'}
              </p>
            </div>

            <div className="flex size-16 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-lime">
              <Heart className="size-8" />
            </div>
          </div>

          <div className="relative mt-6 border-t border-white/10 pt-5">
            <p className="text-xs font-semibold text-white/65">
              {listings.length}{' '}
              {locale === 'sw' ? 'bidhaa zilizohifadhiwa' : 'saved items'}
            </p>
          </div>
        </header>

        {/* Back navigation */}
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-divider bg-white px-4 py-2.5 text-sm font-bold text-slate-600 shadow-sm transition hover:border-violet hover:text-violet"
          href="/"
        >
          <ArrowRight className="size-4 rotate-180" />
          {t('backToBrowse')}
        </Link>

        {/* Saved products */}
        {listings.length > 0 ? (
          <section className="space-y-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold text-ink">
                {t('savedTitle')}
              </h2>

              <span className="rounded-full bg-violet/10 px-3 py-1.5 text-xs font-bold text-violet">
                {listings.length}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {listings.map((listing) => (
                <ListingCard
                  favoriteIds={favoriteIds}
                  key={listing.id}
                  listing={listing}
                  loggedIn
                />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-[28px] border border-divider bg-white px-6 py-14 text-center shadow-card">
            <span className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-violet/10 text-violet">
              <ShoppingBag className="size-8" />
            </span>

            <h2 className="mt-5 text-xl font-extrabold text-ink">
              {t('savedTitle')}
            </h2>

            <p className="mx-auto mt-3 max-w-md text-sm leading-7 text-slate-500">
              {t('savedEmpty')}
            </p>

            <Link
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-full bg-button-gradient px-6 py-3 text-sm font-extrabold text-brand-button transition hover:-translate-y-0.5"
              href="/"
            >
              {t('viewSaved')}
              <ArrowRight className="size-4" />
            </Link>
          </section>
        )}
      </div>
    </main>
  );
}
