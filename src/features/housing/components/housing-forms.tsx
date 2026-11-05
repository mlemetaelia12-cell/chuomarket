'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { uploadPublicWebpImages } from '@/features/shared/client-uploads';

const field = 'min-h-11 w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/10';
const label = 'grid gap-1.5 text-sm font-semibold text-ink';

export function HousingListingForm() {
  const t = useTranslations('Housing');
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
      const files = form.getAll('images').filter((value): value is File => value instanceof File && value.size > 0);
      const imageKeys = files.length ? await uploadPublicWebpImages('housing', files) : [];
      const response = await fetch('/api/housing/listings', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          listingType: form.get('listingType'), title: form.get('title'), description: form.get('description'),
          university: form.get('university'), campus: form.get('campus'), area: form.get('area'),
          monthlyPriceTsh: Number(form.get('monthlyPriceTsh')), roomType: form.get('roomType'),
          availableSpaces: Number(form.get('availableSpaces')), imageKeys,
        }),
      });
      if (!response.ok) throw new Error('save');
      router.push('/rooms');
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
        <label className={label}>{t('listingType')}<select className={field} name="listingType"><option value="room">{t('room')}</option><option value="hostel">{t('hostel')}</option><option value="bed_space">{t('bedSpace')}</option></select></label>
        <label className={label}>{t('roomType')}<select className={field} name="roomType"><option value="single">{t('single')}</option><option value="shared">{t('shared')}</option><option value="self_contained">{t('selfContained')}</option><option value="hostel">{t('hostel')}</option></select></label>
      </div>
      <label className={label}>{t('title')}<input className={field} maxLength={140} minLength={5} name="title" required /></label>
      <label className={label}>{t('description')}<textarea className={`${field} min-h-28`} maxLength={2500} minLength={20} name="description" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('university')}<input className={field} maxLength={160} name="university" required /></label>
        <label className={label}>{t('campus')}<input className={field} maxLength={160} name="campus" required /></label>
        <label className={label}>{t('area')}<input className={field} maxLength={180} name="area" required /></label>
        <label className={label}>{t('monthlyPrice')}<input className={field} max="10000000" min="1" name="monthlyPriceTsh" required type="number" /></label>
        <label className={label}>{t('spaces')}<input className={field} max="30" min="1" name="availableSpaces" required type="number" defaultValue="1" /></label>
      </div>
      <label className={label}>{t('images')}<input accept="image/jpeg,image/png,image/webp" className={field} multiple name="images" type="file" /><span className="text-xs font-normal text-ink-muted">{t('imageHelp')}</span></label>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <button className="min-h-11 rounded-xl bg-royal px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('working') : t('publish')}</button>
    </form>
  );
}

export function RoommateRequestForm() {
  const t = useTranslations('Housing');
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
      const response = await fetch('/api/housing/roommate-requests', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          introduction: form.get('introduction'), university: form.get('university'), campus: form.get('campus'),
          preferredArea: form.get('preferredArea'), minBudgetTsh: Number(form.get('minBudgetTsh')),
          maxBudgetTsh: Number(form.get('maxBudgetTsh')), requirements: form.get('requirements'), moveInPeriod: form.get('moveInPeriod'),
        }),
      });
      if (!response.ok) throw new Error('save');
      router.push('/rooms');
      router.refresh();
    } catch {
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-3xl border border-divider bg-white p-4 shadow-card sm:p-6" onSubmit={submit}>
      <label className={label}>{t('introduction')}<textarea className={`${field} min-h-24`} maxLength={600} minLength={20} name="introduction" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('university')}<input className={field} name="university" required /></label>
        <label className={label}>{t('campus')}<input className={field} name="campus" required /></label>
        <label className={label}>{t('preferredArea')}<input className={field} name="preferredArea" required /></label>
        <label className={label}>{t('moveInPeriod')}<input className={field} name="moveInPeriod" placeholder={t('moveInExample')} required /></label>
        <label className={label}>{t('minBudget')}<input className={field} min="0" name="minBudgetTsh" required type="number" /></label>
        <label className={label}>{t('maxBudget')}<input className={field} min="0" name="maxBudgetTsh" required type="number" /></label>
      </div>
      <label className={label}>{t('requirements')}<textarea className={`${field} min-h-24`} maxLength={800} name="requirements" required /></label>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <button className="min-h-11 rounded-xl bg-royal px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('working') : t('publishRequest')}</button>
    </form>
  );
}
