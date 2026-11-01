'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

export function GrowthPanel({
  username,
  points,
  featuredDaysCredit,
  listingIds,
}: {
  username: string;
  points: number;
  featuredDaysCredit: number;
  listingIds: string[];
}) {
  const t = useTranslations('Growth');
  const locale = useLocale();
  const [balance, setBalance] = useState(points);
  const [credits, setCredits] = useState(featuredDaysCredit);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const referralPath = `/${locale}/signup?ref=${encodeURIComponent(username)}`;

  async function redeemBoost(listingId: string) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/growth/redeem-boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      const data = (await response.json()) as { points?: number };
      if (!response.ok) throw new Error();
      setBalance(data.points ?? balance - 100);
      setNotice(t('redeemSuccess'));
    } catch {
      setNotice(t('redeemError'));
    } finally {
      setBusy(false);
    }
  }

  async function redeemFeatured(listingId: string) {
    if (busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/growth/redeem-featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ listingId }),
      });
      if (!response.ok) throw new Error();
      setCredits((value) => value - 2);
      setNotice(t('featuredRedeemSuccess'));
    } catch {
      setNotice(t('featuredRedeemError'));
    } finally {
      setBusy(false);
    }
  }

  async function copyReferral() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${referralPath}`);
      setNotice(t('copied'));
    } catch {
      setNotice(t('copyError'));
    }
  }

  return (
    <section className="space-y-4 rounded-3xl border border-divider bg-white p-5 shadow-card sm:p-6">
      <header>
        <p className="text-sm font-semibold text-brand-700">{t('eyebrow')}</p>
        <h2 className="mt-1 text-xl font-extrabold text-ink">
          {t('pointsBalance', { points: balance })}
        </h2>
        <p className="mt-1 text-xs leading-5 text-slate-500">{t('earnRules')}</p>
      </header>

      <div className="rounded-2xl border border-divider bg-canvas p-4">
        <p className="text-sm font-bold text-ink">{t('referrals')}</p>
        <p className="mt-1 break-all text-xs text-slate-500">{referralPath}</p>
        <button
          className="mt-3 min-h-9 rounded-full border border-brand-200 bg-white px-4 py-2 text-xs font-bold text-brand-700 transition hover:border-brand-600"
          onClick={() => void copyReferral()}
          type="button"
        >
          {t('copyLink')}
        </button>
        <p className="mt-3 text-xs font-medium text-slate-600">
          {t('featuredCredit', { days: credits })}
        </p>
      </div>

      <div>
        <p className="mb-1 text-sm font-bold text-ink">{t('redeemTitle')}</p>
        <p className="mb-3 text-xs leading-5 text-slate-500">{t('redeemDescription')}</p>
        {listingIds.length ? (
          <div className="space-y-2">
            {listingIds.map((id) => (
              <div className="flex flex-wrap gap-2" key={id}>
                <button
                  className="min-h-9 rounded-full bg-brand-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy || balance < 100}
                  onClick={() => void redeemBoost(id)}
                  type="button"
                >
                  {t('redeemBoost')}
                </button>
                <button
                  className="min-h-9 rounded-full border border-brand-200 bg-white px-3 py-2 text-xs font-bold text-brand-700 transition hover:border-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy || credits < 2}
                  onClick={() => void redeemFeatured(id)}
                  type="button"
                >
                  {t('redeemFeatured')}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-slate-400">{t('noListings')}</p>
        )}
      </div>

      {notice && (
        <p
          aria-live="polite"
          className="rounded-xl bg-canvas p-3 text-xs text-slate-700"
          role="status"
        >
          {notice}
        </p>
      )}
    </section>
  );
}
