'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

export function ContactButton({ endpoint }: { endpoint: string }) {
  const t = useTranslations('V2');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function contact() {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const response = await fetch(endpoint, { method: 'POST', cache: 'no-store' });
      const result = (await response.json()) as { url?: string };
      if (response.status === 401) {
        setError(t('loginRequired'));
      } else if (!response.ok || !result.url) {
        setError(t('contactUnavailable'));
      } else {
        window.location.assign(result.url);
      }
    } catch {
      setError(t('actionFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-1">
      <button className="inline-flex min-h-10 items-center justify-center rounded-xl bg-electric px-4 py-2 text-sm font-bold text-navy-950 transition hover:bg-electric-dark disabled:opacity-50" disabled={busy} onClick={() => void contact()} type="button">
        {busy ? t('working') : t('contact')}
      </button>
      {error && <p className="text-xs text-rose-700" role="status">{error}</p>}
    </div>
  );
}
