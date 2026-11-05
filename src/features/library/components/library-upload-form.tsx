'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

const field = 'min-h-11 w-full rounded-xl border border-divider bg-white px-3 py-2 text-sm text-ink outline-none focus:border-royal focus:ring-2 focus:ring-royal/10';
const label = 'grid gap-1.5 text-sm font-semibold text-ink';

export function LibraryUploadForm() {
  const t = useTranslations('Library');
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setNotice('');
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    try {
      if (!(file instanceof File) || file.type !== 'application/pdf' || file.size < 1 || file.size > 10 * 1024 * 1024) throw new Error('invalid_file');
      const signedResponse = await fetch('/api/library/uploads/sign', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contentType: 'application/pdf', size: file.size }),
      });
      const signed = (await signedResponse.json()) as { uploadUrl?: string; objectKey?: string };
      if (!signedResponse.ok || !signed.uploadUrl || !signed.objectKey) throw new Error('sign_failed');
      const uploadResponse = await fetch(signed.uploadUrl, { method: 'PUT', headers: { 'Content-Type': 'application/pdf' }, body: file });
      if (!uploadResponse.ok) throw new Error('upload_failed');
      const response = await fetch('/api/library', {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: form.get('title'), description: form.get('description'), university: form.get('university'),
          program: form.get('program'), studyYear: Number(form.get('studyYear')), subject: form.get('subject'),
          materialType: form.get('materialType'), objectKey: signed.objectKey, fileName: file.name, fileSize: file.size,
        }),
      });
      if (!response.ok) throw new Error('save_failed');
      setNotice(t('pending'));
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError(t('uploadError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="grid gap-4 rounded-3xl border border-divider bg-white p-4 shadow-card sm:p-6" onSubmit={submit}>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className={label}>{t('university')}<input className={field} maxLength={160} name="university" required /></label>
        <label className={label}>{t('program')}<input className={field} maxLength={160} name="program" required /></label>
        <label className={label}>{t('year')}<select className={field} name="studyYear">{[1, 2, 3, 4, 5, 6, 7, 8].map((year) => <option key={year} value={year}>{t('yearOption', { year })}</option>)}</select></label>
        <label className={label}>{t('subject')}<input className={field} maxLength={160} name="subject" required /></label>
        <label className={label}>{t('type')}<select className={field} name="materialType"><option value="notes">{t('notes')}</option><option value="past_paper">{t('pastPaper')}</option><option value="study_guide">{t('studyGuide')}</option><option value="assignment">{t('assignment')}</option><option value="revision">{t('revision')}</option></select></label>
      </div>
      <label className={label}>{t('titleField')}<input className={field} maxLength={160} minLength={5} name="title" required /></label>
      <label className={label}>{t('description')}<textarea className={`${field} min-h-24`} maxLength={1200} minLength={10} name="description" required /></label>
      <label className={label}>{t('file')}<input accept="application/pdf,.pdf" className={field} name="file" required type="file" /><span className="text-xs font-normal text-ink-muted">{t('fileHelp')}</span></label>
      {notice && <p className="rounded-xl bg-electric-light p-3 text-sm text-navy-950" role="status">{notice}</p>}
      {error && <p className="text-sm text-rose-700" role="alert">{error}</p>}
      <button className="min-h-11 rounded-xl bg-royal px-5 py-3 text-sm font-bold text-white disabled:opacity-50" disabled={busy} type="submit">{busy ? t('submitting') : t('submit')}</button>
    </form>
  );
}
