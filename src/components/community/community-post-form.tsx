'use client';

import { useState, type FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

type Kind = 'material' | 'room' | 'lost_found';
export function CommunityPostForm({ kind }: { kind: Kind }) {
  const t = useTranslations('Community');
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [course, setCourse] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [location, setLocation] = useState('');
  const [lostFound, setLostFound] = useState<'lost' | 'found'>('lost');
  const [postStatus, setPostStatus] = useState<'open' | 'resolved'>('open');
  const [file, setFile] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function compressPhoto(selected: File): Promise<File> {
    const bitmap = await createImageBitmap(selected);
    const scale = Math.min(1, 1080 / bitmap.width);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error(t('photoLimit'));
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    let quality = 0.82;
    let blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/webp', quality),
    );
    while (blob && blob.size > 200 * 1024 && quality > 0.3) {
      quality -= 0.1;
      blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, 'image/webp', quality),
      );
    }
    if (!blob || blob.size > 200 * 1024) throw new Error(t('photoLimit'));
    return new File([blob], 'community-photo.webp', { type: 'image/webp' });
  }
  async function upload(selected: File, uploadKind: 'pdf' | 'photo') {
    const contentType = uploadKind === 'pdf' ? 'application/pdf' : 'image/webp';
    const sign = await fetch('/api/community/uploads/sign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind: uploadKind, contentType, size: selected.size }),
    });
    const signed = (await sign.json()) as { uploadUrl?: string; fileUrl?: string };
    if (!sign.ok || !signed.uploadUrl || !signed.fileUrl) throw new Error(t('uploadError'));
    const result = await fetch(signed.uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: selected,
    });
    if (!result.ok) throw new Error(t('uploadError'));
    return signed.fileUrl;
  }
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const body: Record<string, string | number> = { type: kind, title, description };
      if (kind === 'material') {
        if (!file || file.type !== 'application/pdf' || file.size > 5 * 1024 * 1024)
          throw new Error(t('pdfLimit'));
        body.course = course;
        body.year = Number(year);
        body.fileUrl = await upload(file, 'pdf');
      }
      if (kind === 'room') body.meetingPlace = location;
      if (kind === 'lost_found') {
        body.meetingPlace = location;
        body.lostFoundType = lostFound;
        body.postStatus = postStatus;
        if (photo) {
          if (!photo.type.startsWith('image/')) throw new Error(t('photoLimit'));
          body.photoUrl = await upload(await compressPhoto(photo), 'photo');
        }
      }
      const response = await fetch('/api/community', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!response.ok) throw new Error(t('saveError'));
      router.push('/community');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t('saveError'));
    } finally {
      setBusy(false);
    }
  }
  return (
    <form
      className="space-y-4 rounded-2xl border border-divider bg-white p-5 shadow-card"
      onSubmit={(event) => void submit(event)}
    >
      <label className="block space-y-2 text-sm">
        <span>{t('postTitle')}</span>
        <input
          className="w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
          maxLength={160}
          onChange={(e) => setTitle(e.target.value)}
          required
          value={title}
        />
      </label>
      <label className="block space-y-2 text-sm">
        <span>{t('description')}</span>
        <textarea
          className="min-h-28 w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
          maxLength={5000}
          onChange={(e) => setDescription(e.target.value)}
          required
          value={description}
        />
      </label>
      {kind === 'material' && (
        <>
          <label className="block space-y-2 text-sm">
            <span>{t('course')}</span>
            <input
              className="w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
              onChange={(e) => setCourse(e.target.value)}
              required
              value={course}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>{t('year')}</span>
            <input
              className="w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
              max="2100"
              min="1950"
              onChange={(e) => setYear(e.target.value)}
              required
              type="number"
              value={year}
            />
          </label>
          <label className="block space-y-2 text-sm">
            <span>{t('pdfFile')}</span>
            <input
              accept="application/pdf,.pdf"
              className="block w-full text-xs"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              required
              type="file"
            />
            <span className="text-xs text-slate-500">{t('pdfLimit')}</span>
          </label>
        </>
      )}
      {kind !== 'material' && (
        <label className="block space-y-2 text-sm">
          <span>{t('location')}</span>
          <input
            className="w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
            onChange={(e) => setLocation(e.target.value)}
            required
            value={location}
          />
        </label>
      )}
      {kind === 'lost_found' && (
        <>
          <label className="block space-y-2 text-sm">
            <span>{t('lostFoundType')}</span>
            <select
              className="w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
              onChange={(e) => setLostFound(e.target.value as 'lost' | 'found')}
              value={lostFound}
            >
              <option value="lost">{t('lost')}</option>
              <option value="found">{t('found')}</option>
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span>{t('postStatus')}</span>
            <select
              className="w-full rounded-xl border border-divider bg-canvas p-3 text-ink outline-none focus:border-brand-600 focus:ring-2 focus:ring-brand-600/10"
              onChange={(e) => setPostStatus(e.target.value as 'open' | 'resolved')}
              value={postStatus}
            >
              <option value="open">{t('open')}</option>
              <option value="resolved">{t('resolved')}</option>
            </select>
          </label>
          <label className="block space-y-2 text-sm">
            <span>{t('photoOptional')}</span>
            <input
              accept="image/*"
              className="block w-full text-xs"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              type="file"
            />
            <span className="text-xs text-slate-500">{t('photoLimit')}</span>
          </label>
        </>
      )}
      {error && (
        <p className="text-sm text-rose-700" role="alert">
          {error}
        </p>
      )}
      <button
        className="w-full rounded-xl bg-brand-700 hover:bg-brand-800 px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50"
        disabled={busy}
        type="submit"
      >
        {busy ? t('working') : t('publishPost')}
      </button>
    </form>
  );
}
