'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { uploadPublicWebpImages } from '@/features/shared/client-uploads';

const field = 'min-h-11 w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/10';
const label = 'grid gap-1.5 text-sm font-semibold text-ink';

export function ServiceForm() {
  const t = useTranslations('Services');
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
      const imageKeys = files.length ? await uploadPublicWebpImages('services', files) : [];
      const rawFrom = String(form.get('priceFromTsh') ?? '').trim();
      const rawTo = String(form.get('priceToTsh') ?? '').trim();
      const response = await fetch('/api/services', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'), description: form.get('description'), category: form.get('category'),
          priceFromTsh: rawFrom ? Number(rawFrom) : null, priceToTsh: rawTo ? Number(rawTo) : null,
          university: form.get('university'), campus: form.get('campus'), availability: form.get('availability'), imageKeys,
        }),
      });
      if (!response.ok) throw new Error('save');
      router.push('/services');
      router.refresh();
    } catch {
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-3xl border border-divider bg-white p-4 shadow-card sm:p-6" onSubmit={submit}>
      <label className={label}>{t('category')}<select className={field} name="category"><option value="web_development">{t('webDevelopment')}</option><option value="graphic_design">{t('graphicDesign')}</option><option value="photography">{t('photography')}</option><option value="tutoring">{t('tutoring')}</option><option value="typing">{t('typing')}</option><option value="technical_support">{t('technicalSupport')}</option><option value="other">{t('other')}</option></select></label>
      <label className={label}>{t('titleField')}<input className={field} maxLength={140} minLength={5} name="title" required /></label>
      <label className={label}>{t('description')}<textarea className={`${field} min-h-32`} maxLength={1600} minLength={20} name="description" required /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('university')}<input className={field} name="university" required /></label>
        <label className={label}>{t('campus')}<input className={field} name="campus" required /></label>
        <label className={label}>{t('priceFrom')}<input className={field} min="0" name="priceFromTsh" type="number" /></label>
        <label className={label}>{t('priceTo')}<input className={field} min="0" name="priceToTsh" type="number" /></label>
        <label className={label}>{t('availability')}<input className={field} maxLength={80} name="availability" placeholder={t('availabilityExample')} required /></label>
      </div>
      <label className={label}>{t('portfolio')}<input accept="image/jpeg,image/png,image/webp" className={field} multiple name="images" type="file" /><span className="text-xs font-normal text-ink-muted">{t('imageHelp')}</span></label>
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <button className="min-h-11 rounded-xl bg-royal px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('working') : t('publish')}</button>
    </form>
  );
}
