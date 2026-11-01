
import Image from 'next/image';
import { and, eq, sql } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';

import { db } from '@/db';
import { favorites, listingStats, listings } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { ListingInteractions } from '@/components/browse/listing-interactions';
import { Link } from '@/i18n/navigation';

type Props = {
  params: Promise<{ id: string }>;
};

export default async function ListingDetailPage({ params }: Props) {
  const { id } = await params;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  ) {
    notFound();
  }

  const [user, locale, t] = await Promise.all([
    requireMarketplaceUser(),
    getLocale(),
    getTranslations('Browse'),
  ]);

  const listing = await db.query.listings.findFirst({
    where: and(
      eq(listings.id, id),
      eq(listings.status, 'published'),
    ),
    with: {
      images: true,
      owner: true,
    },
  });

  if (!listing || !listing.owner || listing.owner.banned) {
    notFound();
  }

  await db
    .insert(listingStats)
    .values({
      listingId: listing.id,
      views: 1,
    })
    .onConflictDoUpdate({
      target: listingStats.listingId,
      set: {
        views: sql`${listingStats.views} + 1`,
        updatedAt: new Date(),
      },
    });

  const favorite = user
    ? await db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, user.id),
          eq(favorites.listingId, listing.id),
        ),
      })
    : null;

  const images = [...listing.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  );

  const price = new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(listing.priceTsh);

  const listedDate = listing.createdAt.toLocaleDateString(locale, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const joined = listing.owner.createdAt.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
  });

  let categoryLabel = t('categories.other');

  switch (listing.category) {
    case 'books':
      categoryLabel = t('categories.books');
      break;
    case 'electronics':
      categoryLabel = t('categories.electronics');
      break;
    case 'clothes':
      categoryLabel = t('categories.clothes');
      break;
    case 'utensils':
      categoryLabel = t('categories.utensils');
      break;
  }

  const isFeatured =
    listing.featuredUntil !== null &&
    listing.featuredUntil > new Date();

  return (
    <main className="min-h-screen bg-canvas px-4 pb-32 pt-6 text-ink sm:px-6 sm:pt-8">
      <div className="mx-auto max-w-6xl space-y-6">
        {/* Back navigation */}
        <div>
          <Link
            className="inline-flex items-center gap-2 rounded-full border border-divider bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-violet hover:text-violet"
            href="/"
          >
            <span aria-hidden="true">←</span>
            {t('backToBrowse')}
          </Link>
        </div>

        <article className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] lg:gap-8">
          {/* LEFT: Product images and description */}
          <div className="min-w-0 space-y-6">
            {/* Product gallery */}
            <section
              aria-label="Product images"
              className="overflow-hidden rounded-[28px] border border-divider bg-white p-2 shadow-card sm:p-3"
            >
              {images.length > 0 ? (
                <>
                  <div className="relative aspect-[4/3] overflow-hidden rounded-[22px] bg-slate-100">
                    <Image
                      alt={listing.title}
                      className="object-contain"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 65vw"
                      src={images[0].fileUrl}
                      unoptimized
                    />

                    {isFeatured && (
                      <div className="absolute left-4 top-4 rounded-full bg-brand-950/90 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-lg backdrop-blur">
                        ✦ {t('promoted')}
                      </div>
                    )}
                  </div>

                  {images.length > 1 && (
                    <div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-4">
                      {images.slice(1).map((image, index) => (
                        <div
                          className="relative aspect-square overflow-hidden rounded-2xl border border-divider bg-slate-100"
                          key={image.id}
                        >
                          <Image
                            alt={`${listing.title} ${index + 2}`}
                            className="object-contain"
                            fill
                            sizes="(max-width: 640px) 30vw, 160px"
                            src={image.fileUrl}
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-[22px] bg-gradient-to-br from-brand-950 via-brand-900 to-violet-700 px-6 text-center text-white">
                  <span className="text-5xl">✦</span>
                  <p className="mt-4 text-sm font-semibold tracking-[0.2em]">
                    CHUO MARKET
                  </p>
                  <p className="mt-2 text-xs text-white/60">
                    {t('eyebrow')}
                  </p>
                </div>
              )}
            </section>

            {/* Product description */}
            <section className="rounded-[28px] border border-divider bg-white p-5 shadow-card sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">
                    CHUO MARKET
                  </p>
                  <h2 className="mt-2 text-xl font-extrabold tracking-tight text-ink sm:text-2xl">
                    {listing.title}
                  </h2>
                </div>

                <span className="shrink-0 rounded-full bg-violet/10 px-3 py-2 text-xs font-bold text-violet">
                  {categoryLabel}
                </span>
              </div>

              <div className="h-px bg-divider" />

              <div className="mt-5">
                <h3 className="text-sm font-bold text-ink">
                  {locale === 'sw' ? 'Maelezo ya bidhaa' : 'Product description'}
                </h3>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-600 sm:text-base">
                  {listing.description}
                </p>
              </div>

              <div className="mt-7 rounded-2xl bg-slate-50 p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet/10 text-lg text-violet">
                    📍
                  </span>

                  <div className="min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {t('meetingPlace')}
                    </p>
                    <p className="mt-1 break-words text-sm font-semibold text-ink">
                      {listing.meetingPlace}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-5 text-xs text-slate-400">
                {locale === 'sw' ? 'Tangazo limewekwa:' : 'Listed on:'}{' '}
                {listedDate}
              </p>
            </section>

            {/* Safety information */}
            <section className="relative overflow-hidden rounded-[28px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-7">
              <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-violet/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 size-48 rounded-full bg-lime/10 blur-3xl" />

              <div className="relative">
                <div className="flex items-center gap-3">
                  <span className="flex size-11 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-xl">
                    🛡️
                  </span>

                  <h2 className="text-lg font-extrabold">
                    {t('safetyTitle')}
                  </h2>
                </div>

                <p className="mt-4 text-sm leading-7 text-white/75">
                  {t('safetySummary')}
                </p>

                <div className="mt-5 space-y-3">
                  {[
                    t('safetyMeet'),
                    t('safetyInspect'),
                    t('safetyPayment'),
                    t('safetyPrivacy'),
                  ].map((item) => (
                    <div className="flex gap-3 text-sm leading-6 text-white/85" key={item}>
                      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-xs font-black text-brand-950">
                        ✓
                      </span>
                      <p>{item}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>

          {/* RIGHT: Price, seller and actions */}
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24">
            {/* Price and primary information */}
            <section className="rounded-[28px] border border-divider bg-white p-5 shadow-card sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-violet/10 px-3 py-1.5 text-xs font-bold text-violet">
                  {categoryLabel}
                </span>

                {isFeatured && (
                  <span className="rounded-full bg-lime/30 px-3 py-1.5 text-xs font-bold text-brand-950">
                    ✦ {t('promoted')}
                  </span>
                )}
              </div>

              <h1 className="mt-5 text-2xl font-extrabold leading-tight tracking-tight text-ink sm:text-3xl">
                {listing.title}
              </h1>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4 sm:p-5">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-slate-400">
                  {locale === 'sw' ? 'Bei ya bidhaa' : 'Asking price'}
                </p>

                <p className="mt-2 text-3xl font-black tracking-tight text-violet sm:text-4xl">
                  <span className="mr-1 text-base font-bold text-slate-500">
                    TSh
                  </span>
                  {price}
                </p>
              </div>

              <div className="mt-5 flex items-center gap-2 text-sm text-slate-500">
                <span className="flex size-8 items-center justify-center rounded-full bg-slate-100">
                  📅
                </span>
                <span>
                  {locale === 'sw' ? 'Iliwekwa' : 'Posted'} {listedDate}
                </span>
              </div>

              <div className="mt-6 border-t border-divider pt-5">
                <h2 className="mb-3 text-sm font-bold text-ink">
                  {locale === 'sw' ? 'Unapendelea bidhaa hii?' : 'Interested in this item?'}
                </h2>

                <ListingInteractions
                  initialFavorite={Boolean(favorite)}
                  listingId={listing.id}
                  loggedIn={Boolean(user)}
                  title={listing.title}
                />

                <p className="mt-4 text-center text-xs leading-5 text-slate-400">
                  {locale === 'sw'
                    ? 'Wasiliana na muuzaji ili kuuliza maswali au kupanga kukutana.'
                    : 'Contact the seller to ask questions or arrange a meeting.'}
                </p>
              </div>
            </section>

            {/* Seller card */}
            <section className="rounded-[28px] border border-divider bg-white p-5 shadow-card sm:p-6">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet">
                {t('sellerProfile')}
              </p>

              <div className="mt-5 flex items-center gap-4">
                <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-950 to-violet text-xl font-black uppercase text-white shadow-violet-glow">
                  {listing.owner.username.charAt(0)}
                </div>

                <div className="min-w-0">
                  <p className="truncate text-base font-extrabold text-ink">
                    @{listing.owner.username}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('seller')}
                  </p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-400">
                  {t('memberSince', { date: joined })}
                </p>
              </div>

              <Link
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-full border border-divider bg-white px-5 py-3 text-sm font-bold text-ink transition hover:border-violet hover:bg-violet/5 hover:text-violet"
                href={`/seller/${listing.owner.username}`}
              >
                {t('sellerProfile')}
                <span aria-hidden="true">→</span>
              </Link>
            </section>

            {/* Marketplace reminder */}
            <div className="rounded-2xl border border-lime/40 bg-lime/10 p-4">
              <p className="text-sm font-bold text-brand-950">
                {locale === 'sw'
                  ? 'Nunua kwa umakini.'
                  : 'Shop with confidence.'}
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                {locale === 'sw'
                  ? 'Kagua bidhaa kabla ya kulipa na tumia maeneo salama ya kukutana.'
                  : 'Inspect items before paying and choose safe public meeting places.'}
              </p>
            </div>
          </aside>
        </article>
      </div>
    </main>
  );
}
