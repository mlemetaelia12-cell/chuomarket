
'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  BookOpen,
  CircleUserRound,
  House,
  Plus,
  ShoppingBag,
  Users,
  X,
  ChevronRight,
  BellRing,
  BriefcaseBusiness,
} from 'lucide-react';

import { Link, usePathname } from '@/i18n/navigation';

const navigationItems = [
  { key: 'home', href: '/', Icon: House },
  { key: 'community', href: '/community', Icon: Users },
  { key: 'mine', href: '/mine', Icon: ShoppingBag },
  { key: 'me', href: '/me', Icon: CircleUserRound },
] as const;

const actions = [
  { key: 'sellItem', Icon: ShoppingBag, href: '/sell' },
  { key: 'rooms', Icon: House, href: '/rooms' },
  { key: 'uploadNotes', Icon: BookOpen, href: '/library' },
  { key: 'alerts', Icon: BellRing, href: '/alerts' },
  { key: 'services', Icon: BriefcaseBusiness, href: '/services' },
  { key: 'lostFound', Icon: Users, href: '/community/new?type=lost_found' },
] as const;

export function BottomNavigation() {
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  function isActive(href: string) {
    return href === '/'
      ? pathname === '/'
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <>
      {menuOpen && (
        <button
          aria-label={t('closeActions')}
          className="fixed inset-0 z-40 cursor-default bg-slate-950/25 backdrop-blur-[2px]"
          onClick={() => setMenuOpen(false)}
          type="button"
        />
      )}

      {menuOpen && (
        <section
          aria-labelledby="navigation-actions-title"
          aria-modal="true"
          className="fixed bottom-[calc(env(safe-area-inset-bottom)+6rem)] left-1/2 z-[60] max-h-[min(70vh,520px)] w-[min(380px,calc(100vw-28px))] -translate-x-1/2 overflow-y-auto rounded-3xl border border-divider bg-white p-4 shadow-2xl"
          id="navigation-actions-menu"
          role="dialog"
        >
          <div className="flex items-center justify-between gap-3 px-1 pb-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-brand-700">
                CHUO MARKET
              </p>

              <h2
                className="mt-1 text-base font-extrabold text-ink"
                id="navigation-actions-title"
              >
                {t('openActions')}
              </h2>
            </div>

            <button
              aria-label={t('closeActions')}
              className="flex size-9 items-center justify-center rounded-xl border border-divider bg-white text-ink-muted transition hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
              onClick={() => setMenuOpen(false)}
              type="button"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {actions.map(({ key, Icon, href }) => (
              <Link
                className="group flex min-h-24 min-w-0 flex-col justify-between rounded-2xl border border-divider bg-canvas p-3 text-sm font-semibold text-ink transition hover:border-brand-200 hover:bg-brand-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700"
                href={href}
                key={key}
                onClick={() => setMenuOpen(false)}
              >
                <span className="flex size-9 items-center justify-center rounded-xl bg-white text-brand-700 shadow-sm transition group-hover:bg-brand-700 group-hover:text-white">
                  <Icon aria-hidden="true" className="size-5" />
                </span>

                <span className="mt-3 flex items-center justify-between gap-2">
                  <span className="break-words">{t(key)}</span>
                  <ChevronRight
                    aria-hidden="true"
                    className="size-4 shrink-0 text-slate-400"
                  />
                </span>
              </Link>
            ))}
          </div>

          <p className="px-2 pb-1 pt-4 text-center text-[10px] font-medium text-ink-muted">
            {t('quickTagline')}
          </p>
        </section>
      )}

      <nav
        aria-label={t('mainNavigation')}
        className="fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 z-50 grid w-[min(460px,calc(100vw-24px))] -translate-x-1/2 grid-cols-5 items-center rounded-2xl border border-divider bg-white/95 px-2 py-2 shadow-[0_8px_30px_rgba(15,23,42,0.14)] backdrop-blur-xl"
      >
        {navigationItems.slice(0, 2).map(({ key, href, Icon }) => {
          const active = isActive(href);

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                active
                  ? 'bg-brand-100 text-brand-800'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink'
              }`}
              href={href}
              key={key}
            >
              <Icon
                aria-hidden="true"
                className="size-5"
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span className="max-w-full truncate">{t(key)}</span>
            </Link>
          );
        })}

        <button
          aria-controls="navigation-actions-menu"
          aria-expanded={menuOpen}
          aria-haspopup="dialog"
          aria-label={menuOpen ? t('closeActions') : t('openActions')}
          className="mx-auto flex size-12 items-center justify-center rounded-xl bg-brand-700 text-white shadow-sm transition hover:bg-brand-800 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 focus-visible:ring-offset-2"
          onClick={() => setMenuOpen((open) => !open)}
          type="button"
        >
          {menuOpen ? (
            <X aria-hidden="true" className="size-6" />
          ) : (
            <Plus aria-hidden="true" className="size-6" />
          )}
        </button>

        {navigationItems.slice(2).map(({ key, href, Icon }) => {
          const active = isActive(href);

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl py-2 text-[10px] font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-700 ${
                active
                  ? 'bg-brand-100 text-brand-800'
                  : 'text-ink-muted hover:bg-canvas hover:text-ink'
              }`}
              href={href}
              key={key}
            >
              <Icon
                aria-hidden="true"
                className="size-5"
                strokeWidth={active ? 2.4 : 1.8}
              />
              <span className="max-w-full truncate">{t(key)}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
