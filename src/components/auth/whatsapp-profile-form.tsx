'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';

export function WhatsAppProfileForm({ initialValue }: { initialValue: string }) {
  const t = useTranslations('Auth');
  const [value, setValue] = useState(initialValue);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [failed, setFailed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setMessage('');
    setFailed(false);
    try {
      const response = await fetch('/api/me/whatsapp', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ whatsapp: value }),
      });
      if (!response.ok) throw new Error('save_failed');
      const result = (await response.json()) as { whatsapp: string };
      setValue(result.whatsapp);
      setMessage(t('whatsappSaved'));
    } catch {
      setFailed(true);
      setMessage(t('whatsappSaveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="mt-4 space-y-3" onSubmit={(event) => void submit(event)}>
      <label className="block space-y-2 text-sm font-medium text-ink">
        {t('whatsapp')}
        <input
          autoComplete="tel"
          className="w-full rounded-xl border border-divider bg-canvas px-4 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:bg-white focus:ring-2 focus:ring-brand-600/10"
          maxLength={20}
          onChange={(event) => setValue(event.target.value)}
          placeholder="+2557XXXXXXXX"
          required
          value={value}
        />
      </label>
      <button
        className="min-h-10 rounded-full bg-brand-700 px-5 py-2 text-sm font-bold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
        disabled={busy}
        type="submit"
      >
        {busy ? t('working') : t('saveWhatsapp')}
      </button>
      {message && (
        <p
          aria-live="polite"
          className={`text-xs ${failed ? 'text-rose-700' : 'text-emerald-700'}`}
        >
          {message}
        </p>
      )}
    </form>
  );
}
