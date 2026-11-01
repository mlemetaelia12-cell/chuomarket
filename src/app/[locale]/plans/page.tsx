
import { and, desc, eq, gt, lte } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Crown,
  Infinity,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

import { db } from '@/db';
import { plans, subscriptions } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { PlanCheckout } from '@/components/payments/plan-checkout';
import { Link } from '@/i18n/navigation';

type SearchParams = Promise<{
  listingId?: string;
}>;

export default async function PlansPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [params, locale, user] = await Promise.all([
    searchParams,
    getLocale(),
    requireMarketplaceUser(),
  ]);

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations('Payments');
  const now = new Date();

  const [availablePlans, activeSubscriptions, queuedSubscriptions] =
    await Promise.all([
      db
        .select()
        .from(plans)
        .where(eq(plans.active, true))
        .orderBy(plans.priceTsh),

      // Subscriptions already started and still valid.
      db
        .select({
          until: subscriptions.subscriptionUntil,
          startsAt: subscriptions.startsAt,
          planName: plans.name,
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

      // Future subscriptions waiting for their start date.
      db
        .select({
          id: subscriptions.id,
          startsAt: subscriptions.startsAt,
          until: subscriptions.subscriptionUntil,
          planName: plans.name,
        })
        .from(subscriptions)
        .innerJoin(
          plans,
          eq(subscriptions.planId, plans.id),
        )
        .where(
          and(
            eq(subscriptions.userId, user.id),
            gt(subscriptions.startsAt, now),
            gt(subscriptions.subscriptionUntil, now),
          ),
        )
        .orderBy(subscriptions.startsAt)
        .limit(5),
    ]);

  const listingId =
    params.listingId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      params.listingId,
    )
      ? params.listingId
      : undefined;

  const currentSubscription = activeSubscriptions[0];

  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

  const isSwahili = locale === 'sw';

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-6 text-ink sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* Cinematic plans header */}
        <header className="relative isolate overflow-hidden rounded-[30px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 size-72 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime backdrop-blur">
                <Sparkles className="size-3.5" />
                {t('eyebrow')}
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {t('title')}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                {t('description')}
              </p>
            </div>

            <div className="flex size-16 items-center justify-center rounded-[22px] border border-white/15 bg-white/10 text-lime shadow-lg backdrop-blur sm:size-20">
              <Crown className="size-9" strokeWidth={1.5} />
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5 text-xs font-semibold text-white/55">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-lime" />
              CHUO MARKET
            </span>
            <span>
              {isSwahili
                ? 'Mipango ya wauzaji'
                : 'Seller membership plans'}
            </span>
          </div>
        </header>

        {/* Free lifetime listing information */}
        <section className="relative overflow-hidden rounded-[26px] border border-lime/40 bg-lime/10 p-5 sm:p-6">
          <div className="flex flex-wrap items-start gap-4">
            <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-lime text-brand-950">
              <Check className="size-6" strokeWidth={3} />
            </span>

            <div className="min-w-0 flex-1">
              <h2 className="text-base font-extrabold text-brand-950">
                {isSwahili
                  ? 'Tangazo moja la bure la maisha'
                  : 'One Free Lifetime Listing'}
              </h2>

              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
                {isSwahili
                  ? 'Kila akaunti ina haki ya kuchapisha tangazo moja la bure kwa maisha yote. Haki hii haitarudishwa baada ya tangazo kufutwa, kuuzwa au kufichwa.'
                  : 'Every account receives one free lifetime listing. This entitlement is never restored after the listing is deleted, sold or hidden.'}
              </p>

              <p className="mt-2 text-xs font-semibold text-slate-500">
                {isSwahili
                  ? 'Unaweza kuanza bila kununua mpango.'
                  : 'You can get started without purchasing a plan.'}
              </p>
            </div>
          </div>
        </section>

        {/* Draft checkout notice */}
        {listingId && (
          <div className="flex items-start gap-3 rounded-2xl border border-violet/20 bg-violet/5 p-4 text-sm leading-6 text-violet">
            <Sparkles className="mt-0.5 size-5 shrink-0" />
            <p>{t('draftWillPublish')}</p>
          </div>
        )}

        {/* Current subscription */}
        {currentSubscription && (
          <section className="rounded-[26px] border border-divider bg-white p-5 shadow-card sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="flex size-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                  <BadgeCheck className="size-6" />
                </span>

                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">
                    {isSwahili ? 'MPANGO UNAOTUMIKA' : 'CURRENT ACTIVE PLAN'}
                  </p>

                  <h2 className="mt-2 text-xl font-extrabold text-ink">
                    {currentSubscription.planName}
                  </h2>

                  <p className="mt-2 text-sm text-slate-500">
                    {t('activeUntil', {
                      date: formatDate(currentSubscription.until),
                    })}
                  </p>
                </div>
              </div>

              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">
                {isSwahili ? 'Unaendelea' : 'Active'}
              </span>
            </div>
          </section>
        )}

        {/* Queued subscriptions */}
        {queuedSubscriptions.length > 0 && (
          <section className="rounded-[26px] border border-divider bg-white p-5 shadow-card sm:p-6">
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-700">
                <Clock3 className="size-5" />
              </span>

              <div>
                <h2 className="text-base font-extrabold text-ink">
                  {isSwahili
                    ? 'Mipango inayofuata'
                    : 'Upcoming subscriptions'}
                </h2>

                <p className="mt-1 text-xs text-slate-500">
                  {isSwahili
                    ? 'Mipango hii itaanza baada ya muda uliopo kuisha.'
                    : 'These subscriptions start after the current period ends.'}
                </p>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              {queuedSubscriptions.map((subscription) => (
                <div
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-divider bg-slate-50 p-4"
                  key={subscription.id}
                >
                  <div>
                    <p className="text-sm font-bold text-ink">
                      {subscription.planName}
                    </p>

                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <CalendarDays className="size-3.5" />
                      {isSwahili ? 'Itakapoanza:' : 'Starts:'}{' '}
                      {formatDate(subscription.startsAt)}
                    </p>
                  </div>

                  <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-bold text-amber-800">
                    {isSwahili ? 'Inasubiri' : 'Queued'}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Plans */}
        <section className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">
              {isSwahili ? 'CHAGUA MPANGO WAKO' : 'CHOOSE YOUR PLAN'}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {isSwahili
                ? 'Mipango ya kuchapisha'
                : 'Seller membership options'}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isSwahili
                ? 'Chagua muda na uwezo unaolingana na mahitaji yako.'
                : 'Choose a duration and listing capacity that fits your needs.'}
            </p>
          </div>

          {availablePlans.length > 0 ? (
            <div className="grid items-stretch gap-5 md:grid-cols-2 xl:grid-cols-3">
              {availablePlans.map((plan) => {
                const isBusiness = plan.businessBadge;
                const isUnlimited = plan.listingLimit === null;

                return (
                  <article
                    className={`relative flex flex-col overflow-hidden rounded-[28px] border p-5 shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-card-hover sm:p-6 ${
                      isBusiness
                        ? 'border-brand-800 bg-brand-950 text-white'
                        : 'border-divider bg-white text-ink'
                    }`}
                    key={plan.id}
                  >
                    {isBusiness && (
                      <>
                        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-violet/30 blur-3xl" />

                        <div className="absolute right-5 top-5 rounded-full border border-lime/20 bg-lime/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-lime">
                          {isSwahili ? 'Biashara' : 'Business'}
                        </div>
                      </>
                    )}

                    <div className="relative">
                      <div className={`flex size-12 items-center justify-center rounded-2xl ${
                        isBusiness
                          ? 'bg-white/10 text-lime'
                          : 'bg-violet/10 text-violet'
                      }`}>
                        {isBusiness ? (
                          <Crown className="size-6" />
                        ) : (
                          <Sparkles className="size-6" />
                        )}
                      </div>

                      <h3 className="mt-5 text-xl font-extrabold">
                        {plan.name}
                      </h3>

                      <p className={`mt-2 text-xs font-medium ${
                        isBusiness ? 'text-white/55' : 'text-slate-500'
                      }`}>
                        {t('duration', {
                          days: plan.durationDays,
                        })}
                      </p>

                      <div className="mt-6 flex items-baseline gap-1">
                        <span className={`text-sm font-bold ${
                          isBusiness ? 'text-white/55' : 'text-slate-400'
                        }`}>
                          TSh
                        </span>

                        <span className={`text-3xl font-black tracking-tight sm:text-4xl ${
                          isBusiness ? 'text-lime' : 'text-violet'
                        }`}>
                          {plan.priceTsh.toLocaleString('en-TZ')}
                        </span>
                      </div>

                      <div className={`my-6 h-px ${
                        isBusiness ? 'bg-white/10' : 'bg-divider'
                      }`} />

                      <ul className="space-y-4">
                        <li className="flex items-start gap-3">
                          <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                            isBusiness
                              ? 'bg-lime text-brand-950'
                              : 'bg-violet/10 text-violet'
                          }`}>
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>

                          <span className={`text-sm leading-6 ${
                            isBusiness ? 'text-white/85' : 'text-slate-700'
                          }`}>
                            {isUnlimited ? (
                              <span className="inline-flex items-center gap-1.5 font-semibold">
                                <Infinity className="size-4" />
                                {t('unlimitedListings')}
                              </span>
                            ) : (
                              t('listingLimit', {
                                count: plan.listingLimit ?? 0,
                              })
                            )}
                          </span>
                        </li>

                        <li className="flex items-start gap-3">
                          <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full ${
                            isBusiness
                              ? 'bg-lime text-brand-950'
                              : 'bg-violet/10 text-violet'
                          }`}>
                            <Check className="size-3.5" strokeWidth={3} />
                          </span>

                          <span className={`text-sm leading-6 ${
                            isBusiness ? 'text-white/85' : 'text-slate-700'
                          }`}>
                            {isSwahili
                              ? 'Tangazo moja la bure linahesabiwa ndani ya kikomo cha mpango.'
                              : 'Your free lifetime listing counts toward this plan’s listing limit.'}
                          </span>
                        </li>

                        {plan.businessBadge && (
                          <li className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-brand-950">
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                            <span className="text-sm leading-6 text-white/85">
                              {t('businessBadge')}
                            </span>
                          </li>
                        )}

                        {plan.priorityPlacement && (
                          <li className="flex items-start gap-3">
                            <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-lime text-brand-950">
                              <Check className="size-3.5" strokeWidth={3} />
                            </span>
                            <span className="text-sm leading-6 text-white/85">
                              {t('priorityPlacement')}
                            </span>
                          </li>
                        )}
                      </ul>
                    </div>

                    <div className="relative mt-auto pt-8">
                      <PlanCheckout
                        planCode={plan.code}
                        listingId={listingId}
                        planName={plan.name}
                        priceTsh={plan.priceTsh}
                      />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[26px] border border-divider bg-white p-6 text-sm text-slate-500 shadow-card">
              {t('noPlans')}
            </div>
          )}
        </section>

        {/* Footer navigation */}
        <div className="flex flex-wrap gap-4 border-t border-divider pt-5 text-sm">
          <Link
            className="inline-flex items-center gap-2 font-semibold text-violet transition hover:gap-3"
            href="/payments/history"
          >
            {t('paymentHistory')}
            <ArrowRight className="size-4" />
          </Link>

          <Link
            className="inline-flex items-center gap-2 font-semibold text-slate-500 transition hover:text-violet"
            href="/mine"
          >
            {t('backToListings')}
          </Link>
        </div>

        <p className="text-xs leading-6 text-slate-400">
          {t('sandboxNotice')}
        </p>
      </div>
    </main>
  );
}
