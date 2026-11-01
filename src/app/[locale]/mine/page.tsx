
import {
  and,
  desc,
  eq,
  gt,
  inArray,
  lte,
  sql,
} from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Eye,
  MessageCircle,
  Package,
  Plus,
  Sparkles,
} from 'lucide-react';

import { db } from '@/db';
import {
  listingStats,
  listings,
  orders,
  plans,
  reports,
  subscriptions,
} from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { Link } from '@/i18n/navigation';
import { ListingStatusTabs } from '@/components/dashboard/listing-status-tabs';

const DAY_MS = 86_400_000;

export default async function MyListingsPage() {
  const [user, locale] = await Promise.all([
    requireMarketplaceUser(),
    getLocale(),
  ]);

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [t, pt] = await Promise.all([
    getTranslations('Dashboard'),
    getTranslations('Payments'),
  ]);

  const now = new Date();

  const [rows, activePlans, openReports, recentPayments] =
    await Promise.all([
      // Seller listings and statistics.
      db
        .select({
          id: listings.id,
          title: listings.title,
          priceTsh: listings.priceTsh,
          status: listings.status,

          imageUrl: sql<string | null>`
            (
              SELECT li.file_url
              FROM listing_images li
              WHERE li.listing_id = ${listings.id}
              ORDER BY li.sort_order ASC
              LIMIT 1
            )
          `,

          views: sql<number>`
            coalesce(${listingStats.views}, 0)
          `,

          whatsappClicks: sql<number>`
            coalesce(${listingStats.whatsappClicks}, 0)
          `,

          featuredUntil: listings.featuredUntil,
          boostedAt: listings.boostedAt,
        })
        .from(listings)
        .leftJoin(
          listingStats,
          eq(listingStats.listingId, listings.id),
        )
        .where(eq(listings.ownerId, user.id))
        .orderBy(desc(listings.createdAt)),

      // Only a subscription that has started and has not expired.
      db
        .select({
          until: subscriptions.subscriptionUntil,
          planName: plans.name,
          durationDays: plans.durationDays,
        })
        .from(subscriptions)
        .innerJoin(
          plans,
          eq(subscriptions.planId, plans.id),
        )
        .where(
          and(
            eq(subscriptions.userId, user.id),
            lte(subscriptions.startsAt, now),
            gt(subscriptions.subscriptionUntil, now),
          ),
        )
        .orderBy(desc(subscriptions.startsAt))
        .limit(1),

      // Open listing reports.
      db
        .select({
          id: reports.id,
          title: listings.title,
        })
        .from(reports)
        .innerJoin(
          listings,
          eq(reports.listingId, listings.id),
        )
        .where(
          and(
            eq(listings.ownerId, user.id),
            inArray(reports.status, ['open', 'reviewing']),
          ),
        )
        .limit(5),

      // Recent payments.
      db
        .select({
          id: orders.id,
          type: orders.type,
          amountTsh: orders.amountTsh,
          status: orders.status,
          createdAt: orders.createdAt,
          receiptNumber: orders.receiptNumber,
          planName: plans.name,
        })
        .from(orders)
        .leftJoin(
          plans,
          eq(orders.planId, plans.id),
        )
        .where(eq(orders.userId, user.id))
        .orderBy(desc(orders.createdAt))
        .limit(3),
    ]);

  const currentPlan = activePlans[0];

  const daysRemaining = currentPlan
    ? Math.max(
        0,
        Math.ceil(
          (currentPlan.until.getTime() - now.getTime()) / DAY_MS,
        ),
      )
    : 0;

  const planDuration = currentPlan?.durationDays ?? 1;

  const progress = currentPlan
    ? Math.max(
        0,
        Math.min(
          100,
          Math.round((daysRemaining / planDuration) * 100),
        ),
      )
    : 0;

  const counts = {
    published: rows.filter(
      (item) => item.status === 'published',
    ).length,

    draft: rows.filter(
      (item) => item.status === 'draft',
    ).length,

    sold: rows.filter(
      (item) => item.status === 'sold',
    ).length,

    hidden: rows.filter(
      (item) => item.status === 'hidden',
    ).length,
  };

  const items = rows.map((item) => ({
    id: item.id,
    title: item.title,
    priceTsh: item.priceTsh,
    status: item.status,
    imageUrl: item.imageUrl,
    views: Number(item.views),
    whatsappClicks: Number(item.whatsappClicks),

    featured: Boolean(
      item.featuredUntil && item.featuredUntil > now,
    ),

    featuredUntilLabel: item.featuredUntil
      ? item.featuredUntil.toLocaleDateString(locale)
      : null,

    boostedAtLabel: item.boostedAt
      ? item.boostedAt.toLocaleString(locale)
      : null,
  }));

  const endingSoon = Boolean(
    currentPlan && daysRemaining <= 3,
  );

  const statCards = [
    {
      key: 'published',
      value: counts.published,
      icon: Package,
      iconClass: 'bg-emerald-50 text-emerald-700',
    },
    {
      key: 'draft',
      value: counts.draft,
      icon: Clock3,
      iconClass: 'bg-amber-50 text-amber-700',
    },
    {
      key: 'sold',
      value: counts.sold,
      icon: CheckCircle2,
      iconClass: 'bg-violet/10 text-violet',
    },
    {
      key: 'hidden',
      value: counts.hidden,
      icon: Eye,
      iconClass: 'bg-slate-100 text-slate-600',
    },
  ] as const;

  return (
    <main className="min-h-screen bg-canvas px-4 pb-32 pt-6 text-ink sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* Dashboard header */}
        <header className="relative isolate overflow-hidden rounded-[30px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 size-72 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime backdrop-blur">
                <Sparkles className="size-3.5" />
                {t('eyebrow')}
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {t('title')}
              </h1>

              <p className="mt-2 max-w-lg text-sm leading-6 text-white/65">
                {locale === 'sw'
                  ? 'Simamia matangazo yako, angalia maendeleo na fuatilia malipo yako sehemu moja.'
                  : 'Manage your listings, monitor performance and track your payments in one place.'}
              </p>
            </div>

            <Link
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-button-gradient px-6 py-3 text-sm font-extrabold text-brand-button shadow-lime-glow transition hover:-translate-y-0.5 hover:brightness-105"
              href="/sell"
            >
              <Plus className="size-5" />
              {t('createListing')}
            </Link>
          </div>

          <div className="relative mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5 text-xs font-semibold text-white/55">
            <span className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-lime shadow-[0_0_10px_#C7F36B]" />
              CHUO MARKET
            </span>
            <span>
              {locale === 'sw' ? 'Dashibodi ya muuzaji' : 'Seller workspace'}
            </span>
          </div>
        </header>

        {/* Current subscription */}
        <section className="relative overflow-hidden rounded-[28px] border border-divider bg-white p-5 shadow-card sm:p-7">
          <div className="pointer-events-none absolute -right-14 -top-20 size-56 rounded-full bg-violet/10 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-4">
              <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-violet/10 text-violet">
                <CreditCard className="size-6" />
              </div>

              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                  {t('currentPlan')}
                </p>

                <h2 className="mt-2 text-xl font-extrabold text-ink">
                  {currentPlan?.planName ?? t('noActivePlan')}
                </h2>

                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {currentPlan
                    ? t('daysRemaining', { days: daysRemaining })
                    : t('choosePlan')}
                </p>
              </div>
            </div>

            <Link
              className="inline-flex items-center gap-2 rounded-full border border-violet/30 bg-violet/5 px-4 py-2.5 text-sm font-bold text-violet transition hover:bg-violet/10"
              href="/plans"
            >
              {t('renew')}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <div className="relative mt-6">
            <div className="h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-button-gradient transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {currentPlan ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {locale === 'sw'
                    ? `${progress}% ya muda wa mpango imebaki`
                    : `${progress}% of plan duration remaining`}
                </span>

                <span className="flex items-center gap-1.5">
                  <CalendarDays className="size-3.5" />
                  {t('planExpires', {
                    date: currentPlan.until.toLocaleDateString(locale),
                  })}
                </span>
              </div>
            ) : (
              <p className="mt-3 text-xs leading-5 text-slate-400">
                {locale === 'sw'
                  ? 'Unaweza kuendelea kuandaa tangazo lako kabla ya kuchagua mpango wa kuchapisha.'
                  : 'You can prepare your listing before choosing a plan to publish it.'}
              </p>
            )}
          </div>
        </section>

        {/* Ending soon warning */}
        {endingSoon && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <AlertTriangle className="mt-0.5 size-5 shrink-0" />
            <p>{t('planEndingNotice', { days: daysRemaining })}</p>
          </div>
        )}

        {/* Open reports */}
        {openReports.length > 0 && (
          <section className="rounded-[24px] border border-rose-200 bg-rose-50 p-5">
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-rose-100 text-rose-700">
                <AlertTriangle className="size-5" />
              </span>

              <p className="text-sm font-extrabold text-rose-800">
                {t('reportedNotice')}
              </p>
            </div>

            <ul className="mt-4 space-y-2">
              {openReports.map((report) => (
                <li
                  className="rounded-xl border border-rose-200/70 bg-white/70 px-4 py-3 text-sm text-rose-800"
                  key={report.id}
                >
                  {report.title}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Listing statistics */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;

            return (
              <article
                className="rounded-[24px] border border-divider bg-white p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-card-hover sm:p-5"
                key={stat.key}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold leading-5 text-slate-500">
                    {t(`counts.${stat.key}`)}
                  </p>

                  <span className={`flex size-9 items-center justify-center rounded-xl ${stat.iconClass}`}>
                    <Icon className="size-4.5" />
                  </span>
                </div>

                <p className="mt-4 text-3xl font-black tracking-tight text-ink tabular-nums">
                  {stat.value}
                </p>
              </article>
            );
          })}
        </section>

        {/* Seller listings */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">
                {locale === 'sw' ? 'SOKO LA CHUO' : 'YOUR MARKETPLACE'}
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight text-ink sm:text-2xl">
                {t('yourListings')}
              </h2>
            </div>

            <Link
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet transition hover:gap-2.5"
              href="/payments/history"
            >
              {t('paymentHistory')}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <ListingStatusTabs items={items} />
        </section>

        {/* Recent payments */}
        <section className="space-y-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">
                {locale === 'sw' ? 'SHUGHULI ZA AKAUNTI' : 'ACCOUNT ACTIVITY'}
              </p>

              <h2 className="mt-2 text-xl font-black tracking-tight text-ink sm:text-2xl">
                {t('recentPayments')}
              </h2>
            </div>

            <Link
              className="inline-flex items-center gap-1.5 text-xs font-bold text-violet transition hover:gap-2.5"
              href="/payments/history"
            >
              {t('viewAllPayments')}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          {recentPayments.length > 0 ? (
            <div className="overflow-hidden rounded-[26px] border border-divider bg-white shadow-card">
              {recentPayments.map((payment, index) => (
                <article
                  className={`flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5 ${
                    index > 0 ? 'border-t border-divider' : ''
                  }`}
                  key={payment.id}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet/10 text-violet">
                      <CreditCard className="size-5" />
                    </span>

                    <div className="min-w-0">
                      <p className="truncate text-sm font-extrabold text-ink">
                        {payment.planName ??
                          pt(`orderTypes.${payment.type}`)}
                      </p>

                      <p className="mt-1 break-words text-xs text-slate-400">
                        {payment.createdAt.toLocaleDateString(locale)}
                        {' · '}
                        {payment.receiptNumber ??
                          payment.id.slice(0, 8).toUpperCase()}
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 text-right">
                    <p className="text-sm font-black text-ink">
                      TSh{' '}
                      {payment.amountTsh.toLocaleString('en-TZ')}
                    </p>

                    <p className="mt-1 text-xs font-semibold text-slate-500">
                      {pt(`status.${payment.status}`)}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[26px] border border-divider bg-white px-5 py-10 text-center shadow-card">
              <span className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <CreditCard className="size-6" />
              </span>

              <p className="mt-4 text-sm font-semibold text-slate-500">
                {t('noPayments')}
              </p>
            </div>
          )}
        </section>

        {/* Seller support footer */}
        <section className="overflow-hidden rounded-[26px] bg-cinematic-gradient p-5 text-white shadow-cinematic sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-lime">
                <MessageCircle className="size-5" />
              </span>

              <div>
                <p className="text-sm font-extrabold">
                  {locale === 'sw'
                    ? 'Endelea kukuza biashara yako.'
                    : 'Keep growing your marketplace.'}
                </p>

                <p className="mt-1 text-xs text-white/60">
                  {locale === 'sw'
                    ? 'Ongeza tangazo jipya sokoni.'
                    : 'Add another item to your marketplace.'}
                </p>
              </div>
            </div>

            <Link
              className="inline-flex items-center gap-2 rounded-full bg-lime px-5 py-2.5 text-xs font-extrabold text-brand-950 transition hover:brightness-105"
              href="/sell"
            >
              <Plus className="size-4" />
              {t('createListing')}
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
