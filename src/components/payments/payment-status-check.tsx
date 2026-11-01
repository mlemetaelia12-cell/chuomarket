'use client';

import { useState } from 'react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type Props = { orderId: string };

export function PaymentStatusCheck({ orderId }: Props) {
  const t = useTranslations('Payments');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function check() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/payments/${orderId}/status`, { cache: 'no-store' });
      if (!response.ok) throw new Error('status_check_failed');
      router.refresh();
    } catch {
      setError(t('statusCheckError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3">
      <button className="rounded-full border border-brand-600 px-3 py-2 text-xs font-semibold text-brand-100 disabled:opacity-60" disabled={busy} onClick={() => void check()} type="button">
        {busy ? t('checking') : t('checkStatus')}
      </button>
      {error && <p className="mt-2 text-xs text-rose-300" role="alert">{error}</p>}
    </div>
  );
}
