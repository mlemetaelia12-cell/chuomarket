import { and, desc, eq, isNull } from 'drizzle-orm';
import { redirect } from 'next/navigation';
import { getLocale, getTranslations } from 'next-intl/server';
import { ArrowRight, Bell, CalendarDays, CreditCard, ShieldCheck, UserRound } from 'lucide-react';

import { getSession } from '@/lib/session';
import { ProfileActions } from '@/components/auth/profile-actions';
import { WhatsAppProfileForm } from '@/components/auth/whatsapp-profile-form';
import { GrowthPanel } from '@/components/growth/growth-panel';

import { db } from '@/db';
import { listings, userNotifications } from '@/db/schema';
import { requireMarketplaceUser } from '@/lib/marketplace-user';
import { Link } from '@/i18n/navigation';

export default async function ProfilePage() {
  const [session, locale] = await Promise.all([getSession(), getLocale()]);

  if (!session) {
    redirect(`/${locale}/login`);
  }

  const [t, paymentsT, user] = await Promise.all([
    getTranslations('Auth'),
    getTranslations('Payments'),
    requireMarketplaceUser(),
  ]);

  if (!user) {
    redirect(`/${locale}/login`);
  }

  const [boostable, reminders] = await Promise.all([
    db.query.listings.findMany({
      where: and(eq(listings.ownerId, user.id), eq(listings.status, 'published')),
      columns: {
        id: true,
      },
    }),

    db
      .select({
        id: userNotifications.id,
        message: userNotifications.message,
      })
      .from(userNotifications)
      .where(and(eq(userNotifications.userId, user.id), isNull(userNotifications.readAt)))
      .orderBy(desc(userNotifications.createdAt))
      .limit(5),
  ]);

  const username = session.user.username ?? user.username;
  const displayName = session.user.name || username;
  const whatsapp = session.user.whatsapp ?? user.whatsapp ?? '';

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-6 text-ink sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Profile header */}
        <header className="relative isolate overflow-hidden rounded-3xl border border-divider bg-white p-6 text-ink shadow-sm sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-20 -z-10 size-64 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 left-1/3 -z-10 size-56 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative flex flex-wrap items-center gap-5">
            <div className="flex size-16 shrink-0 items-center justify-center rounded-2xl bg-brand-100 text-2xl font-black text-brand-700 sm:size-20">
              {username.charAt(0).toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-brand-700">
                {t('profileEyebrow')}
              </p>

              <h1 className="mt-2 break-words text-2xl font-black tracking-tight text-ink sm:text-3xl">
                {displayName}
              </h1>

              <p className="mt-1 text-sm font-medium text-ink-muted">@{username}</p>
            </div>

            <span className="inline-flex items-center gap-2 rounded-full border border-divider bg-canvas px-3 py-2 text-xs font-bold text-ink">
              <ShieldCheck className="size-4 text-brand-700" />
              CHUO MARKET
            </span>
          </div>
        </header>

        {/* Account information */}
        <section className="overflow-hidden rounded-[26px] border border-divider bg-white shadow-card">
          <div className="flex items-center gap-3 border-b border-divider p-5 sm:p-6">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
              <UserRound className="size-5" />
            </span>

            <div>
              <h2 className="text-base font-extrabold text-ink">{t('profileEyebrow')}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {locale === 'sw' ? 'Taarifa za akaunti yako' : 'Your account information'}
              </p>
            </div>
          </div>

          <div className="divide-y divide-divider">
            <div className="flex flex-wrap items-center justify-between gap-2 p-5">
              <span className="text-sm font-medium text-slate-500">{t('username')}</span>
              <span className="text-sm font-bold text-ink">@{username}</span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-5">
              <span className="text-sm font-medium text-slate-500">{t('role')}</span>
              <span className="rounded-full bg-violet/10 px-3 py-1.5 text-xs font-bold capitalize text-violet">
                {session.user.role ?? 'user'}
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 p-5">
              <span className="text-sm font-medium text-slate-500">{t('language')}</span>
              <span className="text-sm font-bold text-ink">
                {session.user.language ?? user.language ?? locale}
              </span>
            </div>
          </div>
        </section>

        {/* WhatsApp profile */}
        <section className="rounded-[26px] border border-divider bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <UserRound className="size-5" />
            </span>

            <div>
              <h2 className="text-base font-extrabold text-ink">{t('whatsapp')}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {locale === 'sw'
                  ? 'Namba inayotumiwa na wanunuzi kuwasiliana nawe'
                  : 'The number buyers use to contact you'}
              </p>
            </div>
          </div>

          <WhatsAppProfileForm initialValue={whatsapp} />
        </section>

        {/* Notifications */}
        {reminders.length > 0 && (
          <section
            aria-label={locale === 'sw' ? 'Vikumbusho' : 'Notifications'}
            className="rounded-[26px] border border-amber-200 bg-amber-50 p-5 sm:p-6"
          >
            <div className="flex items-center gap-3">
              <span className="flex size-10 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
                <Bell className="size-5" />
              </span>

              <div>
                <h2 className="text-base font-extrabold text-amber-950">
                  {locale === 'sw' ? 'Vikumbusho' : 'Notifications'}
                </h2>
                <p className="mt-1 text-xs text-amber-800">
                  {locale === 'sw'
                    ? 'Taarifa zinazohitaji umakini wako'
                    : 'Updates that may need your attention'}
                </p>
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {reminders.map((reminder) => (
                <p
                  className="rounded-xl border border-amber-200 bg-white p-3 text-sm leading-6 text-amber-950"
                  key={reminder.id}
                >
                  {reminder.message}
                </p>
              ))}
            </div>
          </section>
        )}

        {/* Growth panel */}
        <section className="overflow-hidden rounded-[26px] border border-divider bg-white p-5 shadow-card sm:p-6">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
              <CalendarDays className="size-5" />
            </span>

            <div>
              <h2 className="text-base font-extrabold text-ink">
                {locale === 'sw' ? 'Ukuaji wa akaunti' : 'Account growth'}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {locale === 'sw' ? 'Pointi na zawadi zako' : 'Your points and rewards'}
              </p>
            </div>
          </div>

          <GrowthPanel
            username={user.username}
            points={user.points}
            featuredDaysCredit={user.featuredDaysCredit}
            listingIds={boostable.map((listing) => listing.id)}
          />
        </section>

        {/* Payment history */}
        <Link
          className="flex items-center justify-between gap-3 rounded-[22px] border border-divider bg-white p-5 shadow-card transition hover:border-violet/40 hover:shadow-card-hover"
          href="/payments/history"
        >
          <span className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
              <CreditCard className="size-5" />
            </span>

            <span>
              <span className="block text-sm font-extrabold text-ink">
                {paymentsT('paymentHistory')}
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                {locale === 'sw'
                  ? 'Angalia malipo na risiti zako'
                  : 'View your payments and receipts'}
              </span>
            </span>
          </span>

          <ArrowRight className="size-5 shrink-0 text-violet" />
        </Link>

        {/* Account actions */}
        <section className="rounded-[26px] border border-divider bg-white p-5 shadow-card sm:p-6">
          <ProfileActions />
        </section>
      </div>
    </main>
  );
}
