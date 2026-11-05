import type { Metadata, Viewport } from 'next';
import Image from 'next/image';
import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, setRequestLocale } from 'next-intl/server';
import { Plus_Jakarta_Sans } from 'next/font/google';

import { AppSplashScreen } from '@/components/branding/app-splash-screen';
import { BottomNavigation } from '@/components/navigation/bottom-navigation';
import { LanguageSwitcher } from '@/components/navigation/language-switcher';
import { Link } from '@/i18n/navigation';
import { routing } from '@/i18n/routing';

import '../globals.css';

export const metadata: Metadata = {
  title: {
    default: 'Chuo Market',
    template: '%s | Chuo Market',
  },
  description:
    'The marketplace and community for university students in Tanzania.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Chuo Market',
  },
};

export const viewport: Viewport = {
  themeColor: '#3900A6',
  width: 'device-width',
  initialScale: 1,
};

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-plus-jakarta-sans',
  display: 'swap',
});

type LocaleLayoutProps = Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>;

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: LocaleLayoutProps) {
  const { locale } = await params;

  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${plusJakartaSans.variable} min-h-screen bg-canvas font-sans text-ink antialiased`}
      >
        <NextIntlClientProvider messages={messages}>
          <AppSplashScreen />

          <a
            className="sr-only fixed left-4 top-4 z-[100] rounded-xl bg-brand-950 px-5 py-3 text-sm font-bold text-white focus:not-sr-only"
            href="#main-content"
          >
            {locale === 'sw'
              ? 'Ruka kwenda kwenye maudhui'
              : 'Skip to main content'}
          </a>

          <header className="sticky top-0 z-30 border-b border-divider bg-white/90 shadow-sm backdrop-blur-xl">
            <div className="mx-auto flex h-[68px] w-full max-w-6xl items-center justify-between px-4 sm:px-6">
              <Link
                aria-label="Chuo Market home"
                className="group inline-flex items-center gap-2.5"
                href="/"
              >
                <Image
                  alt="Chuo Market"
                  className="size-10 rounded-xl object-cover shadow-sm transition group-hover:scale-105"
                  height={40}
                  priority
                  src="/icons/icon-192.png"
                  width={40}
                />

                <span className="text-lg font-black tracking-tight text-brand-950">
                  chuo
                  <span className="text-violet">market</span>
                </span>
              </Link>

              <div className="flex items-center gap-3">
                <Suspense
                  fallback={
                    <div
                      aria-hidden="true"
                      className="h-10 w-24 rounded-full border border-divider bg-slate-50"
                    />
                  }
                >
                  <LanguageSwitcher />
                </Suspense>
              </div>
            </div>
          </header>

          <div
            className="mx-auto min-h-[calc(100svh-68px)] w-full max-w-6xl pb-36 pt-6 sm:pt-8"
            id="main-content"
            tabIndex={-1}
          >
            {children}
          </div>

          <BottomNavigation />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}