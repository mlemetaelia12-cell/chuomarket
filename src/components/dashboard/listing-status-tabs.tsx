
'use client';

import Image from 'next/image';
import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ImageIcon,
  Eye,
  MessageCircle,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

import { ListingActions } from '@/components/listings/listing-actions';
import { ListingPromotionActions } from '@/components/dashboard/listing-promotion-actions';

type ListingItem = {
  id: string;
  title: string;
  priceTsh: number;
  status: 'draft' | 'published' | 'sold' | 'hidden';
  imageUrl: string | null;
  views: number;
  whatsappClicks: number;
  featured: boolean;
  featuredUntilLabel: string | null;
  boostedAtLabel: string | null;
};

type Tab = 'all' | 'published' | 'draft' | 'sold' | 'hidden';

const tabs: Tab[] = [
  'all',
  'published',
  'draft',
  'sold',
  'hidden',
];

const statusStyles: Record<ListingItem['status'], string> = {
  published: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  draft: 'border-amber-200 bg-amber-50 text-amber-700',
  sold: 'border-violet/20 bg-violet/10 text-violet',
  hidden: 'border-slate-200 bg-slate-100 text-slate-600',
};

function ListingThumbnail({
  src,
  title,
}: {
  src: string | null;
  title: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    <div className="relative aspect-square w-24 shrink-0 overflow-hidden rounded-2xl bg-slate-100 sm:w-32">
      {src && !failed ? (
        <Image
          key={src}
          src={src}
          alt={title}
          fill
          unoptimized
          sizes="(max-width: 640px) 96px, 128px"
          className="object-cover transition duration-300 hover:scale-105"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-400">
          <ImageIcon className="size-7" strokeWidth={1.5} />
          <span className="px-1 text-center text-[10px] font-medium">
            No image
          </span>
        </div>
      )}

      <div className="absolute bottom-2 left-2 rounded-lg border border-white/20 bg-brand-950/80 px-2 py-1 text-[9px] font-bold tracking-wider text-white backdrop-blur">
        CHUO
      </div>
    </div>
  );
}

export function ListingStatusTabs({
  items,
}: {
  items: ListingItem[];
}) {
  const t = useTranslations('Dashboard');
  const l = useTranslations('Listings');
  const [tab, setTab] = useState<Tab>('all');

  const visible = useMemo(
    () =>
      tab === 'all'
        ? items
        : items.filter((item) => item.status === tab),
    [items, tab],
  );

  function countFor(value: Tab) {
    return value === 'all'
      ? items.length
      : items.filter((item) => item.status === value).length;
  }

  return (
    <section className="space-y-5">
      {/* Filter tabs */}
      <div
        aria-label={t('statusTabs')}
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2 scrollbar-none"
        role="tablist"
      >
        {tabs.map((value) => {
          const active = tab === value;

          return (
            <button
              aria-controls="listing-tab-panel"
              aria-selected={active}
              className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-2.5 text-xs font-bold transition duration-200 ${
                active
                  ? 'border-brand-950 bg-brand-950 text-white shadow-lg shadow-brand-950/15'
                  : 'border-divider bg-white text-slate-500 hover:border-violet/40 hover:bg-violet/5 hover:text-violet'
              }`}
              id={`listing-tab-${value}`}
              key={value}
              onClick={() => setTab(value)}
              role="tab"
              type="button"
            >
              {t(`tabs.${value}`)}

              <span
                className={`flex min-w-6 items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] tabular-nums ${
                  active
                    ? 'bg-lime text-brand-950'
                    : 'bg-slate-100 text-slate-500'
                }`}
              >
                {countFor(value)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Listings */}
      <div
        aria-labelledby={`listing-tab-${tab}`}
        id="listing-tab-panel"
        role="tabpanel"
        tabIndex={0}
      >
        {visible.length === 0 ? (
          <div className="rounded-[26px] border border-divider bg-white px-6 py-12 text-center shadow-card">
            <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet/10 text-violet">
              <ImageIcon className="size-7" />
            </span>

            <p className="mt-4 text-sm font-semibold leading-6 text-slate-500">
              {t('emptyTab')}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {visible.map((item) => (
              <article
                className="group overflow-hidden rounded-[26px] border border-divider bg-white p-3 shadow-card transition duration-200 hover:-translate-y-0.5 hover:shadow-card-hover sm:p-4"
                key={item.id}
              >
                <div className="flex min-w-0 gap-3 sm:gap-5">
                  {/* Product image */}
                  <ListingThumbnail
                    src={item.imageUrl}
                    title={item.title}
                  />

                  {/* Product information */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <h3 className="min-w-0 flex-1 break-words text-sm font-extrabold leading-6 text-ink sm:text-base">
                        {item.title}
                      </h3>

                      <span
                        className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold ${statusStyles[item.status]}`}
                      >
                        {l(`status.${item.status}`)}
                      </span>
                    </div>

                    <p className="mt-1 text-base font-black tracking-tight text-violet sm:text-lg">
                      <span className="mr-1 text-xs font-bold text-slate-400">
                        TSh
                      </span>
                      {item.priceTsh.toLocaleString('en-TZ')}
                    </p>

                    {/* Performance metrics */}
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <Eye className="size-3.5 text-slate-400" />
                        {t('views')}:
                        <strong className="text-ink">
                          {item.views.toLocaleString('en-TZ')}
                        </strong>
                      </span>

                      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500">
                        <MessageCircle className="size-3.5 text-slate-400" />
                        {t('whatsappClicks')}:
                        <strong className="text-ink">
                          {item.whatsappClicks.toLocaleString('en-TZ')}
                        </strong>
                      </span>
                    </div>

                    {/* Promotion information */}
                    {(item.featuredUntilLabel || item.boostedAtLabel) && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {item.featuredUntilLabel && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-violet/5 px-2.5 py-1.5 text-[10px] font-bold text-violet">
                            <Sparkles className="size-3" />
                            {t(
                              item.featured
                                ? 'featuredUntil'
                                : 'featuredExpired',
                              { date: item.featuredUntilLabel },
                            )}
                          </span>
                        )}

                        {item.boostedAtLabel && (
                          <span className="inline-flex items-center gap-1.5 rounded-lg bg-lime/20 px-2.5 py-1.5 text-[10px] font-bold text-brand-950">
                            <TrendingUp className="size-3" />
                            {t('boostedOn', {
                              date: item.boostedAtLabel,
                            })}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Listing actions */}
                <div className="mt-4 border-t border-divider pt-3">
                  <ListingActions
                    id={item.id}
                    status={item.status}
                  />

                  {item.status === 'published' && (
                    <div className="mt-2">
                      <ListingPromotionActions
                        featured={item.featured}
                        listingId={item.id}
                      />
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
