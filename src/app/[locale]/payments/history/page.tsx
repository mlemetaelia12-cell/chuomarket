
import { desc, eq } from 'drizzle-orm';
import { getLocale, getTranslations } from 'next-intl/server';
import { redirect } from 'next/navigation';
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  Clock3,
  CreditCard,
  Receipt,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

import { db } from '@/db';
import { orders, plans } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { Link } from '@/i18n/navigation';
import { PaymentStatusCheck } from '@/components/payments/payment-status-check';

type SearchParams = Promise<{ status?: string }>;

function getStatusStyle(status: string) {
  switch (status) {
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-700';

    case 'pending':
      return 'border-amber-200 bg-amber-50 text-amber-700';

    case 'failed':
      return 'border-rose-200 bg-rose-50 text-rose-700';

    default:
      return 'border-slate-200 bg-slate-100 text-slate-600';
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'completed':
      return CheckCircle2;

    case 'pending':
      return Clock3;

    case 'failed':
      return XCircle;

    default:
      return Receipt;
  }
}

export default async function PaymentHistoryPage({
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

  const rows = await db
    .select({
      order: orders,
      planName: plans.name,
    })
    .from(orders)
    .leftJoin(plans, eq(orders.planId, plans.id))
    .where(eq(orders.userId, user.id))
    .orderBy(desc(orders.createdAt))
    .limit(100);

  const completedCount = rows.filter(
    ({ order }) => order.status === 'completed',
  ).length;

  const pendingCount = rows.filter(
    ({ order }) => order.status === 'pending',
  ).length;

  const failedCount = rows.filter(
    ({ order }) => order.status === 'failed',
  ).length;

  const completedAmount = rows
    .filter(({ order }) => order.status === 'completed')
    .reduce((total, { order }) => total + order.amountTsh, 0);

  const returnStatus = params.status
    ? ['completed', 'pending', 'failed', 'not_found'].includes(
        params.status,
      )
      ? params.status
      : 'unknown'
    : null;

  const formatAmount = (amount: number) =>
    amount.toLocaleString('en-TZ');

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-6 text-ink sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-5xl space-y-7">

        {/* Cinematic page header */}
        <header className="relative isolate overflow-hidden rounded-[30px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-80 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-28 left-1/3 -z-10 size-72 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative flex flex-wrap items-end justify-between gap-5">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime backdrop-blur">
                <Receipt className="size-3.5" />
                {t('historyEyebrow')}
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {t('historyTitle')}
              </h1>

              <p className="mt-3 max-w-lg text-sm leading-6 text-white/65">
                {locale === 'sw'
                  ? 'Fuatilia malipo yako, risiti na hali ya miamala yako ya Chuo Market.'
                  : 'Track your payments, receipts and transaction status on Chuo Market.'}
              </p>
            </div>

            <div className="flex size-16 items-center justify-center rounded-[22px] border border-white/15 bg-white/10 text-lime shadow-lg backdrop-blur sm:size-20">
              <CreditCard className="size-9" strokeWidth={1.5} />
            </div>
          </div>

          <div className="relative mt-7 flex items-center gap-2 border-t border-white/10 pt-5 text-xs font-semibold text-white/55">
            <ShieldCheck className="size-4 text-lime" />
            {locale === 'sw'
              ? 'Historia ya miamala ya akaunti yako'
              : 'Your account transaction history'}
          </div>
        </header>

        {/* Payment return status */}
        {returnStatus && (
          <div
            aria-live="polite"
            className="flex items-start gap-3 rounded-2xl border border-violet/20 bg-violet/5 p-4 text-sm leading-6 text-ink"
            role="status"
          >
            <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet/10 text-violet">
              <Receipt className="size-5" />
            </span>
            <p>{t(`returnStatus.${returnStatus}`)}</p>
          </div>
        )}

        {/* Payment summary */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
          <article className="rounded-[24px] border border-divider bg-white p-4 shadow-card sm:p-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-violet/10 text-violet">
              <Receipt className="size-5" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-ink">
              {rows.length}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {locale === 'sw' ? 'Miamala' : 'Transactions'}
            </p>
          </article>

          <article className="rounded-[24px] border border-divider bg-white p-4 shadow-card sm:p-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckCircle2 className="size-5" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-ink">
              {completedCount}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {locale === 'sw' ? 'Yaliyokamilika' : 'Completed'}
            </p>
          </article>

          <article className="rounded-[24px] border border-divider bg-white p-4 shadow-card sm:p-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
              <Clock3 className="size-5" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-ink">
              {pendingCount}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {locale === 'sw' ? 'Zinazosubiri' : 'Pending'}
            </p>
          </article>

          <article className="rounded-[24px] border border-divider bg-white p-4 shadow-card sm:p-5">
            <span className="flex size-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700">
              <XCircle className="size-5" />
            </span>
            <p className="mt-4 text-2xl font-black tabular-nums text-ink">
              {failedCount}
            </p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">
              {locale === 'sw' ? 'Zilizoshindikana' : 'Failed'}
            </p>
          </article>
        </section>

        {/* Completed payment total */}
        <section className="rounded-[26px] border border-divider bg-white p-5 shadow-card sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-400">
                {locale === 'sw'
                  ? 'JUMLA YA MALIPO YALIYOKAMILIKA'
                  : 'COMPLETED PAYMENTS TOTAL'}
              </p>

              <p className="mt-3 text-3xl font-black tracking-tight text-violet sm:text-4xl">
                <span className="mr-1 text-base font-bold text-slate-400">
                  TSh
                </span>
                {formatAmount(completedAmount)}
              </p>

              <p className="mt-2 text-xs text-slate-400">
                {locale === 'sw'
                  ? 'Imekokotolewa kutoka kwenye miamala 100 ya hivi karibuni au chini yake.'
                  : 'Calculated from your latest 100 transactions or fewer.'}
              </p>
            </div>

            <div className="flex size-14 items-center justify-center rounded-2xl bg-lime/25 text-brand-950">
              <CheckCircle2 className="size-7" />
            </div>
          </div>
        </section>

        {/* Transaction list */}
        <section className="space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">
              CHUO MARKET
            </p>

            <h2 className="mt-2 text-xl font-black tracking-tight text-ink sm:text-2xl">
              {locale === 'sw' ? 'Miamala yako' : 'Your transactions'}
            </h2>
          </div>

          {rows.length > 0 ? (
            <div className="space-y-4">
              {rows.map(({ order, planName }) => {
                const StatusIcon = getStatusIcon(order.status);

                return (
                  <article
                    className="overflow-hidden rounded-[26px] border border-divider bg-white shadow-card transition hover:shadow-card-hover"
                    key={order.id}
                  >
                    <div className="p-4 sm:p-6">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-violet/10 text-violet">
                            <CreditCard className="size-5" />
                          </span>

                          <div className="min-w-0">
                            <h3 className="break-words text-sm font-extrabold leading-6 text-ink sm:text-base">
                              {planName ?? t(`orderTypes.${order.type}`)}
                            </h3>

                            <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-400">
                              <CalendarDays className="size-3.5" />
                              {order.createdAt.toLocaleString(locale)}
                            </p>
                          </div>
                        </div>

                        <span
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide ${getStatusStyle(order.status)}`}
                        >
                          <StatusIcon className="size-3.5" />
                          {t(`status.${order.status}`)}
                        </span>
                      </div>

                      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-400">
                            {locale === 'sw' ? 'Kiasi' : 'Amount'}
                          </p>

                          <p className="mt-1 text-2xl font-black tracking-tight text-ink">
                            <span className="mr-1 text-sm font-bold text-slate-400">
                              TSh
                            </span>
                            {formatAmount(order.amountTsh)}
                          </p>
                        </div>

                        {order.receiptNumber && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              {t('receiptNumber')}
                            </p>
                            <p className="mt-1 break-all text-xs font-bold text-slate-600">
                              {order.receiptNumber}
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Verified receipt details */}
                      {order.status === 'completed' && (
                        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4">
                          <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-emerald-800">
                            <ShieldCheck className="size-5" />
                            {locale === 'sw'
                              ? 'Taarifa za malipo yaliyothibitishwa'
                              : 'Verified payment details'}
                          </div>

                          <div className="grid gap-4 sm:grid-cols-2">
                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/60">
                                {t('receiptNumber')}
                              </p>
                              <p className="mt-1 break-all text-xs font-semibold text-emerald-900">
                                {order.receiptNumber ??
                                  `CM-${order.id.toUpperCase()}`}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/60">
                                {t('paymentMethod')}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-emerald-900">
                                {order.paymentMethod ?? t('notAvailable')}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/60">
                                {t('confirmationCode')}
                              </p>
                              <p className="mt-1 break-all text-xs font-semibold text-emerald-900">
                                {order.confirmationCode ?? t('notAvailable')}
                              </p>
                            </div>

                            <div>
                              <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/60">
                                {t('verifiedAt')}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-emerald-900">
                                {order.verifiedAt?.toLocaleString(locale) ??
                                  t('notAvailable')}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Pending payment */}
                      {order.status === 'pending' && (
                        <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                          <p className="text-sm font-bold text-amber-900">
                            {t('pendingHelp')}
                          </p>

                          {order.pesapalTrackingId && (
                            <div className="mt-3">
                              <PaymentStatusCheck orderId={order.id} />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[26px] border border-divider bg-white px-6 py-14 text-center shadow-card">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-violet/10 text-violet">
                <Receipt className="size-7" />
              </span>

              <p className="mt-5 text-sm font-semibold leading-6 text-slate-500">
                {t('emptyHistory')}
              </p>
            </div>
          )}
        </section>

        {/* Browse plans */}
        <div className="flex justify-center">
          <Link
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-button-gradient px-7 py-3 text-sm font-extrabold text-brand-button shadow-lime-glow transition hover:-translate-y-0.5"
            href="/plans"
          >
            {t('viewPlans')}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
