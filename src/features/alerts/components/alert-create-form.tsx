'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

const field = 'min-h-11 w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/10';
const label = 'grid gap-1.5 text-sm font-semibold text-ink';

export function AlertCreateForm({ canPublishOfficial }: { canPublishOfficial: boolean }) {
  const t = useTranslations('Alerts');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    const form = new FormData(event.currentTarget);
    try {
      const rawExpiry = String(form.get('expiresAt') ?? '');
      const response = await fetch('/api/alerts', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'), description: form.get('description'), category: form.get('category'),
          university: form.get('university') || null, campus: form.get('campus') || null,
          trustLabel: form.get('trustLabel'), sourceName: form.get('sourceName') || null,
          sourceUrl: form.get('sourceUrl') || null, expiresAt: rawExpiry ? new Date(rawExpiry).toISOString() : null,
        }),
      });
      if (!response.ok) throw new Error('save');
      router.push('/alerts');
      router.refresh();
    } catch {
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-3xl border border-divider bg-white p-4 shadow-card sm:p-6" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('category')}<select className={field} name="category"><option value="academic_deadline">{t('academicDeadline')}</option><option value="registration">{t('registration')}</option><option value="examinations">{t('examinations')}</option><option value="scholarships">{t('scholarships')}</option><option value="events">{t('events')}</option><option value="announcements">{t('announcements')}</option><option value="lost_found">{t('lostFound')}</option></select></label>
        <label className={label}>{t('trustLabel')}<select className={field} name="trustLabel"><option value="community">{t('community')}</option><option value="unverified">{t('unverified')}</option>{canPublishOfficial && <option value="official">{t('official')}</option>}</select></label>
        <label className={label}>{t('university')}<input className={field} name="university" /></label>
        <label className={label}>{t('campus')}<input className={field} name="campus" /></label>
      </div>
      <label className={label}>{t('titleField')}<input className={field} maxLength={160} minLength={5} name="title" required /></label>
      <label className={label}>{t('description')}<textarea className={`${field} min-h-32`} maxLength={3000} minLength={20} name="description" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('sourceName')}<input className={field} maxLength={180} name="sourceName" /></label>
        <label className={label}>{t('sourceUrl')}<input className={field} maxLength={1000} name="sourceUrl" type="url" /></label>
        <label className={label}>{t('expiry')}<input className={field} name="expiresAt" type="datetime-local" /></label>
      </div>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <button className="min-h-11 rounded-xl bg-royal px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('working') : t('publish')}</button>
    </form>
  );
}
