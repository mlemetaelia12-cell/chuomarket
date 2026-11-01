
import { and, desc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { db } from '@/db';
import { authUsers, favorites, listings, users } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { ListingCard } from '@/components/browse/listing-card';
import { Link } from '@/i18n/navigation';

type Props = {
  params: Promise<{ username: string }>;
};

export default async function SellerProfilePage({ params }: Props) {
  const { username } = await params;

  const [viewer, locale, t] = await Promise.all([
    requireMarketplaceUser(),
    getLocale(),
    getTranslations('Browse'),
  ]);

  const seller = await db.query.users.findFirst({
    where: eq(users.username, username.toLowerCase()),
  });

  if (!seller || seller.banned) {
    notFound();
  }

  const rows = await db.query.listings.findMany({
    where: and(
      eq(listings.ownerId, seller.id),
      eq(listings.status, 'published'),
    ),
    orderBy: [desc(listings.createdAt)],
    with: {
      images: true,
    },
  });

  const favoriteRows = viewer
    ? await db
        .select({
          listingId: favorites.listingId,
        })
        .from(favorites)
        .where(eq(favorites.userId, viewer.id))
    : [];

  const favoriteIds = favoriteRows.map((row) => row.listingId);

  const [authProfile] = await db
    .select({
      createdAt: authUsers.createdAt,
    })
    .from(authUsers)
    .where(eq(authUsers.id, seller.authUserId ?? ''))
    .limit(1);

  const joined = (authProfile?.createdAt ?? seller.createdAt).toLocaleDateString(
    locale,
    {
      year: 'numeric',
      month: 'long',
    },
  );

  const initial = seller.username.charAt(0).toUpperCase();

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-6 text-ink sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl space-y-7">
        {/* Back navigation */}
        <Link
          className="inline-flex items-center gap-2 rounded-full border border-divider bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-violet hover:text-violet"
          href="/"
        >
          <span aria-hidden="true">←</span>
          {t('backToBrowse')}
        </Link>

        {/* Cinematic seller profile */}
        <header className="relative isolate overflow-hidden rounded-[30px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-9">
          {/* Ambient lighting */}
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-32 left-1/3 -z-10 size-72 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative flex flex-col gap-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4 sm:gap-6">
              <div className="flex size-20 shrink-0 items-center justify-center rounded-[26px] border border-white/20 bg-gradient-to-br from-violet to-brand-950 text-3xl font-black text-white shadow-violet-glow sm:size-24 sm:text-4xl">
                {initial}
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-lime">
                  {t('sellerProfile')}
                </p>

                <h1 className="mt-2 truncate text-2xl font-black tracking-tight sm:text-4xl">
                  @{seller.username}
                </h1>

                <p className="mt-2 text-sm text-white/65">
                  {t('memberSince', { date: joined })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:min-w-[250px]">
              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <p className="text-2xl font-black text-lime sm:text-3xl">
                  {rows.length}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-white/65">
                  {t('sellerListingCount', { count: rows.length })}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/10 p-4 backdrop-blur-md">
                <div className="flex items-center gap-2">
                  <span className="text-xl">✦</span>
                  <span className="text-sm font-bold text-white">
                    CHUO
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-white/65">
                  {locale === 'sw'
                    ? 'Jamii ya wanachuo'
                    : 'Campus community'}
                </p>
              </div>
            </div>
          </div>

          <div className="relative mt-7 h-px bg-white/10" />

          <div className="relative mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs leading-5 text-white/55">
              {locale === 'sw'
                ? 'Angalia bidhaa zinazouzwa na mwanachama huyu.'
                : 'Explore items listed by this community member.'}
            </p>

            <span className="inline-flex items-center gap-2 rounded-full border border-lime/20 bg-lime/10 px-3 py-2 text-xs font-bold text-lime">
              <span className="size-1.5 rounded-full bg-lime" />
              {locale === 'sw' ? 'Wasifu wa muuzaji' : 'Seller profile'}
            </span>
          </div>
        </header>

        {/* Seller listings */}
        <section className="space-y-5">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">
                {locale === 'sw' ? 'SOKO LA CHUO' : 'CAMPUS MARKETPLACE'}
              </p>

              <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
                {t('sellerListings')}
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {t('sellerListingCount', { count: rows.length })}
              </p>
            </div>
          </div>

          {rows.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-5 lg:grid-cols-4">
              {rows.map((item) => (
                <ListingCard
                  favoriteIds={favoriteIds}
                  key={item.id}
                  listing={item}
                  loggedIn={Boolean(viewer)}
                />
              ))}
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-divider bg-white px-6 py-14 text-center shadow-card">
              <div className="mx-auto flex size-16 items-center justify-center rounded-3xl bg-violet/10 text-3xl">
                ✦
              </div>

              <h3 className="mt-5 text-lg font-extrabold text-ink">
                {t('noSellerListings')}
              </h3>

              <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">
                {locale === 'sw'
                  ? 'Matangazo mapya ya muuzaji huyu yakichapishwa yataonekana hapa.'
                  : 'New published listings from this seller will appear here.'}
              </p>

              <Link
                className="mt-6 inline-flex items-center justify-center rounded-full bg-button-gradient px-6 py-3 text-sm font-extrabold text-brand-button transition hover:-translate-y-0.5"
                href="/"
              >
                {t('backToBrowse')}
              </Link>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
