'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

type TargetType = 'housing_listing' | 'roommate_request' | 'study_material' | 'campus_alert' | 'service_listing';

export function ReportButton({ targetType, targetId }: { targetType: TargetType; targetId: string }) {
  const t = useTranslations('V2');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  async function report() {
    if (busy || message) return;
    setBusy(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason: 'other' }),
      });
      if (response.status === 401) setMessage(t('loginRequired'));
      else if (response.status === 409) setMessage(t('alreadyReported'));
      else if (!response.ok) setMessage(t('actionFailed'));
      else setMessage(t('reportSent'));
    } catch {
      setMessage(t('actionFailed'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button className="text-xs font-semibold text-ink-muted underline underline-offset-4 disabled:opacity-50" disabled={busy || Boolean(message)} onClick={() => void report()} type="button">
        {busy ? t('working') : t('report')}
      </button>
      {message && <span className="text-xs text-ink-muted" role="status">{message}</span>}
    </div>
  );
}
