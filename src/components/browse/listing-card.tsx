
import Image from 'next/image';
import { ChevronRight, ImageIcon } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';

import { ListingInteractions } from '@/components/browse/listing-interactions';

type Props = {
  listing: {
    id: string;
    title: string;
    priceTsh: number;
    category: string;
    createdAt: Date;
    images: { id: string; fileUrl: string }[];
  };
  loggedIn: boolean;
  favoriteIds: string[];
};

export async function ListingCard({
  listing,
  loggedIn,
  favoriteIds,
}: Props) {
  const t = await getTranslations('Browse');

  const imageUrl = listing.images[0]?.id
  ? `/api/listings/images/${listing.images[0].id}`
  : null;

  return (
    <article className="group flex min-w-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-violet/30 hover:shadow-lg">
      {/* Product image and link */}
      <Link
        aria-label={listing.title}
        className="block min-w-0"
        href={`/listing/${listing.id}`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
          {imageUrl ? (
            <Image
              alt={listing.title}
              className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
              fill
              loading="lazy"
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              src={imageUrl}
              unoptimized
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-slate-400">
              <ImageIcon
                aria-hidden="true"
                className="size-9"
                strokeWidth={1.5}
              />
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {t('noResults')}
              </span>
            </div>
          )}

          {/* Image hover overlay */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-950/20 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          />

          {/* Category badge */}
          <span className="absolute left-2 top-2 max-w-[85%] truncate rounded-full border border-white/70 bg-white/95 px-2.5 py-1 text-[10px] font-bold text-slate-700 shadow-sm backdrop-blur">
            {t(`categories.${listing.category}`)}
          </span>
        </div>

        {/* Product information */}
        <div className="flex min-h-[122px] flex-col justify-between space-y-3 p-3 sm:p-4">
          <h3 className="line-clamp-2 min-h-10 break-words text-sm font-bold leading-5 text-slate-900 transition-colors group-hover:text-violet">
            {listing.title}
          </h3>

          <div className="flex items-center justify-between gap-2">
            <p className="min-w-0 truncate text-base font-black tracking-tight text-violet sm:text-lg">
              <span className="mr-1 text-[10px] font-bold text-slate-400 sm:text-xs">
                TSh
              </span>
              {listing.priceTsh.toLocaleString('en-TZ')}
            </p>

            <span
              aria-hidden="true"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-violet/10 text-violet transition duration-300 group-hover:bg-violet group-hover:text-white"
            >
              <ChevronRight className="size-4" />
            </span>
          </div>
        </div>
      </Link>

      {/* Light interaction footer */}
      <div className="mt-auto border-t border-slate-100 bg-slate-50 px-3 py-2.5">
        <ListingInteractions
          compact
          initialFavorite={favoriteIds.includes(listing.id)}
          listingId={listing.id}
          loggedIn={loggedIn}
          title={listing.title}
        />
      </div>
    </article>
  );
}
