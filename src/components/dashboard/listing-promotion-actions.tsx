'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type Props = { listingId: string; featured: boolean };

export function ListingPromotionActions({ listingId, featured }: Props) {
  const t = useTranslations('Dashboard');
  const locale = useLocale();
  const [busy, setBusy] = useState<'featured' | 'boost' | null>(null);
  const [error, setError] = useState('');

  async function purchase(addOn: 'featured' | 'boost') {
    setBusy(addOn);
    setError('');
    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ addOn, listingId, locale }),
      });
      const result = (await response.json()) as { redirectUrl?: string; error?: string };
      if (!response.ok || !result.redirectUrl) {
        setError(
          result.error === 'payment_status_pending' ? t('promotionPending') : t('promotionError'),
        );
        return;
      }
      window.location.assign(result.redirectUrl);
    } catch {
      setError(t('promotionError'));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      {!featured && (
        <button
          className="rounded-full border border-brand-500 px-3 py-1.5 text-xs font-semibold"
          disabled={busy !== null}
          onClick={() => void purchase('featured')}
          type="button"
        >
          {busy === 'featured' ? t('processing') : t('feature')}
        </button>
      )}
      <button
        className="rounded-full border border-brand-500 px-3 py-1.5 text-xs font-semibold"
        disabled={busy !== null}
        onClick={() => void purchase('boost')}
        type="button"
      >
        {busy === 'boost' ? t('processing') : t('boost')}
      </button>
      {error && <p className="w-full text-xs text-rose-300">{error}</p>}
    </div>
  );
}
