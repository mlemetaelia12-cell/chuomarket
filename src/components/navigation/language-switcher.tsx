
'use client';

import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { Globe2, ChevronDown } from 'lucide-react';

import { usePathname, useRouter } from '@/i18n/navigation';

export function LanguageSwitcher() {
  const locale = useLocale();
  const t = useTranslations('Navigation');
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  function changeLanguage(nextLocale: 'en' | 'sw') {
    if (nextLocale === locale) return;

    const query = searchParams.toString();
    const href = query ? `${pathname}?${query}` : pathname;

    router.replace(href, {
      locale: nextLocale,
      scroll: false,
    });
  }

  return (
    <label className="relative inline-flex min-h-10 items-center gap-2 rounded-full border border-divider bg-white px-3 py-2 text-xs font-semibold text-ink shadow-sm transition hover:border-violet/40">
      <Globe2
        aria-hidden="true"
        className="size-4 shrink-0 text-violet"
      />

      <span className="sr-only">{t('languageLabel')}</span>

      <select
        aria-label={t('languageLabel')}
        className="cursor-pointer appearance-none bg-transparent pr-4 text-xs font-bold text-ink outline-none focus-visible:text-violet"
        onChange={(event) =>
          changeLanguage(event.target.value === 'sw' ? 'sw' : 'en')
        }
        value={locale}
      >
        <option className="bg-white text-ink" value="en">
          {t('english')}
        </option>

        <option className="bg-white text-ink" value="sw">
          {t('swahili')}
        </option>
      </select>

      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2 size-3.5 text-slate-400"
      />
    </label>
  );
}
