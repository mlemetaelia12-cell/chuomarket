
'use client';

import Image from 'next/image';
import {
  useState,
  type FormEvent,
} from 'react';
import {
  ImagePlus,
  LoaderCircle,
  MapPin,
  Package,
  Sparkles,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

type ListingDraft = {
  id?: string;
  title: string;
  description: string;
  category: 'books' | 'electronics' | 'clothes' | 'utensils' | 'other';
  priceTsh: number;
  meetingPlace: string;
  images: string[];
};

type SignedUpload = {
  uploadUrl?: string;
  fileUrl?: string;
  error?: string;
};

const categories = [
  'books',
  'electronics',
  'clothes',
  'utensils',
  'other',
] as const;

async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);

  try {
    const scale = Math.min(1, 1080 / bitmap.width);
    const canvas = document.createElement('canvas');

    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);

    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('image_processing_failed');
    }

    context.drawImage(
      bitmap,
      0,
      0,
      canvas.width,
      canvas.height,
    );

    for (const quality of [0.82, 0.72, 0.62, 0.52, 0.42]) {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, 'image/webp', quality);
      });

      if (blob && blob.size <= 200 * 1024) {
        return blob;
      }
    }

    throw new Error('image_too_large');
  } finally {
    bitmap.close();
  }
}

type Props = {
  initial?: ListingDraft;
};

export function ListingEditor({ initial }: Props) {
  const t = useTranslations('Listings');
  const router = useRouter();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(
    initial?.description ?? '',
  );
  const [category, setCategory] = useState<ListingDraft['category']>(
    initial?.category ?? 'other',
  );
  const [price, setPrice] = useState(
    String(initial?.priceTsh ?? ''),
  );
  const [meetingPlace, setMeetingPlace] = useState(
    initial?.meetingPlace ?? '',
  );
  const [images, setImages] = useState<string[]>(
    initial?.images ?? [],
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const inputClass =
    'w-full rounded-2xl border border-divider bg-slate-50 px-4 py-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-violet focus:bg-white focus:ring-4 focus:ring-violet/10';

  const labelClass =
    'mb-2 block text-sm font-bold text-ink';

  const previewPrice =
    price && Number(price) > 0
      ? Number(price).toLocaleString()
      : '—';

  async function addFiles(files: FileList | null) {
    if (!files || files.length === 0) {
      return;
    }

    if (images.length + files.length > 3) {
      setError(t('maxImages'));
      return;
    }

    setBusy(true);
    setError('');

    try {
      const uploaded: string[] = [];

      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          throw new Error('unsupported_image_type');
        }

        const blob = await compressImage(file);

        // Step 1: Request a signed R2 upload URL.
        const signedResponse = await fetch('/api/uploads/sign', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contentType: 'image/webp',
            size: blob.size,
          }),
        });

        const signed = (await signedResponse
          .json()
          .catch(() => ({}))) as SignedUpload;

        if (!signedResponse.ok) {
          throw new Error(
            `SIGN_FAILED: HTTP ${signedResponse.status}: ${signed.error ?? 'Unknown server error'}`,
          );
        }

        if (!signed.uploadUrl || !signed.fileUrl) {
          throw new Error('SIGN_RESPONSE_MISSING_URL');
        }

        // Step 2: Upload directly to Cloudflare R2.
        let putResponse: Response;

        try {
          putResponse = await fetch(signed.uploadUrl, {
            method: 'PUT',
            headers: {
              'Content-Type': 'image/webp',
            },
            body: blob,
          });
        } catch (uploadError) {
          console.error(
            'Cloudflare R2 network/CORS error:',
            uploadError,
          );

          throw new Error('R2_FETCH_FAILED');
        }

        if (!putResponse.ok) {
          const responseBody = await putResponse
            .text()
            .catch(() => '');

          throw new Error(
            `R2_UPLOAD_FAILED: HTTP ${putResponse.status}: ${responseBody.slice(0, 300)}`,
          );
        }

        uploaded.push(signed.fileUrl);
      }

      setImages((current) => [...current, ...uploaded]);
    } catch (uploadError) {
      console.error('LISTING IMAGE UPLOAD FAILED:', uploadError);
      setError(t('uploadError'));
    } finally {
      setBusy(false);
    }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) {
      return;
    }

    setBusy(true);
    setError('');

    try {
      const response = await fetch(
        initial?.id
          ? `/api/listings/${initial.id}`
          : '/api/listings',
        {
          method: initial?.id ? 'PATCH' : 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title,
            description,
            category,
            priceTsh: Number(price),
            meetingPlace,
            images,
          }),
        },
      );

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        console.error('LISTING SAVE FAILED:', {
          status: response.status,
          result,
        });

        throw new Error(result.error ?? 'save_failed');
      }

      router.push('/mine');
      router.refresh();
    } catch (saveError) {
      console.error('LISTING SAVE ERROR:', saveError);
      setError(t('saveError'));
    } finally {
      setBusy(false);
    }
  }

  function removeImage(url: string) {
    setImages((current) => current.filter((item) => item !== url));
  }

  return (
    <main className="min-h-screen bg-canvas px-4 pb-28 pt-6 text-ink sm:px-6 sm:pt-9">
      <div className="mx-auto max-w-6xl space-y-7">

        {/* Cinematic header */}
        <header className="relative isolate overflow-hidden rounded-[30px] bg-cinematic-gradient p-6 text-white shadow-cinematic sm:p-9">
          <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-72 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 -z-10 size-64 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative flex flex-wrap items-start justify-between gap-5">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-lime backdrop-blur">
                <Sparkles className="size-3.5" />
                {t('draftLabel')}
              </div>

              <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">
                {initial?.id ? t('editTitle') : t('createTitle')}
              </h1>

              <p className="mt-3 max-w-xl text-sm leading-7 text-white/70 sm:text-base">
                {t('draftDescription')}
              </p>
            </div>

            <div className="hidden size-20 items-center justify-center rounded-[26px] border border-white/15 bg-white/10 text-lime shadow-lg backdrop-blur sm:flex">
              <Package className="size-10" strokeWidth={1.5} />
            </div>
          </div>

          <div className="relative mt-7 flex flex-wrap items-center gap-3 border-t border-white/10 pt-5">
            <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <span className="flex size-6 items-center justify-center rounded-full bg-lime text-xs font-black text-brand-950">
                1
              </span>
              {t('title')}
            </span>

            <span className="h-px w-7 bg-white/20" />

            <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                2
              </span>
              {t('images')}
            </span>

            <span className="h-px w-7 bg-white/20" />

            <span className="flex items-center gap-2 text-xs font-semibold text-white/70">
              <span className="flex size-6 items-center justify-center rounded-full bg-white/10 text-xs font-black text-white">
                3
              </span>
              {t('saveDraft')}
            </span>
          </div>
        </header>

        {/* Editor and live preview */}
        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">

          {/* Main form */}
          <form
            className="min-w-0 space-y-6 rounded-[28px] border border-divider bg-white p-5 shadow-card sm:p-7"
            onSubmit={submit}
          >
            {/* Basic information */}
            <section className="space-y-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">
                  CHUO MARKET
                </p>
                <h2 className="mt-2 text-xl font-extrabold text-ink">
                  {t('createTitle')}
                </h2>
              </div>

              <div>
                <label className={labelClass} htmlFor="listing-title">
                  {t('title')}
                </label>

                <input
                  autoComplete="off"
                  className={inputClass}
                  id="listing-title"
                  maxLength={140}
                  minLength={3}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder={t('title')}
                  required
                  value={title}
                />

                <p className="mt-2 text-right text-xs text-slate-400">
                  {title.length}/140
                </p>
              </div>

              {/* Price and category */}
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="listing-price">
                    {t('price')}
                  </label>

                  <div className="relative">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      TSh
                    </span>

                    <input
                      className={`${inputClass} pl-14 font-bold`}
                      id="listing-price"
                      inputMode="numeric"
                      min="1"
                      onChange={(event) => setPrice(event.target.value)}
                      placeholder="0"
                      required
                      step="1"
                      type="number"
                      value={price}
                    />
                  </div>
                </div>

                <div>
                  <label className={labelClass} htmlFor="listing-category">
                    {t('category')}
                  </label>

                  <select
                    className={inputClass}
                    id="listing-category"
                    onChange={(event) =>
                      setCategory(
                        event.target.value as ListingDraft['category'],
                      )
                    }
                    value={category}
                  >
                    {categories.map((key) => (
                      <option key={key} value={key}>
                        {t(`categories.${key}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label
                  className={labelClass}
                  htmlFor="listing-description"
                >
                  {t('description')}
                </label>

                <textarea
                  className={`${inputClass} min-h-40 resize-y leading-7`}
                  id="listing-description"
                  maxLength={5000}
                  minLength={5}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  placeholder={t('description')}
                  required
                  value={description}
                />

                <p className="mt-2 text-right text-xs text-slate-400">
                  {description.length}/5000
                </p>
              </div>
            </section>

            {/* Meeting location */}
            <section className="border-t border-divider pt-6">
              <div className="mb-4 flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-violet/10 text-violet">
                  <MapPin className="size-5" />
                </span>

                <div>
                  <h3 className="text-sm font-extrabold text-ink">
                    {t('meetingPlace')}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('imageHint')}
                  </p>
                </div>
              </div>

              <label
                className="sr-only"
                htmlFor="listing-meeting-place"
              >
                {t('meetingPlace')}
              </label>

              <input
                className={inputClass}
                id="listing-meeting-place"
                maxLength={180}
                minLength={2}
                onChange={(event) =>
                  setMeetingPlace(event.target.value)
                }
                placeholder={t('meetingPlace')}
                required
                value={meetingPlace}
              />
            </section>

            {/* Image uploader */}
            <section className="border-t border-divider pt-6">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-base font-extrabold text-ink">
                    {t('images')}
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    {t('imageHint')}
                  </p>
                </div>

                <span className="rounded-full bg-violet/10 px-3 py-1.5 text-xs font-bold text-violet">
                  {images.length}/3
                </span>
              </div>

              <label
                className={`group flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-[24px] border-2 border-dashed p-6 text-center transition ${
                  busy || images.length >= 3
                    ? 'cursor-not-allowed border-divider bg-slate-50 opacity-60'
                    : 'border-violet/30 bg-violet/5 hover:border-violet hover:bg-violet/10'
                }`}
                htmlFor="listing-images"
              >
                <span className="flex size-14 items-center justify-center rounded-2xl bg-white text-violet shadow-sm transition group-hover:scale-105">
                  {busy ? (
                    <LoaderCircle className="size-7 animate-spin" />
                  ) : (
                    <UploadCloud className="size-7" />
                  )}
                </span>

                <span className="mt-4 text-sm font-extrabold text-ink">
                  {busy
                    ? t('saving')
                    : t('images')}
                </span>

                <span className="mt-1 text-xs text-slate-500">
                  {t('imageHint')}
                </span>
              </label>

              <input
                accept="image/*"
                className="sr-only"
                disabled={busy || images.length >= 3}
                id="listing-images"
                multiple
                onChange={(event) => {
                  void addFiles(event.currentTarget.files);
                  event.currentTarget.value = '';
                }}
                type="file"
              />

              {images.length > 0 && (
                <div className="mt-5 grid grid-cols-3 gap-3">
                  {images.map((url, index) => (
                    <div
                      className="group relative aspect-square overflow-hidden rounded-2xl border border-divider bg-slate-100"
                      key={url}
                    >
                      <Image
                        alt={`${t('imagePreview')} ${index + 1}`}
                        className="object-cover transition duration-300 group-hover:scale-105"
                        fill
                        sizes="(max-width: 640px) 30vw, 180px"
                        src={url}
                        unoptimized
                      />

                      <span className="absolute left-2 top-2 rounded-lg bg-brand-950/80 px-2 py-1 text-[10px] font-bold text-white backdrop-blur">
                        {index + 1}/3
                      </span>

                      <button
                        aria-label={t('removeImage')}
                        className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full bg-rose-500 text-white shadow-lg transition hover:scale-105 hover:bg-rose-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => removeImage(url)}
                        type="button"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Error message */}
            {error && (
              <div
                aria-live="polite"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium leading-6 text-rose-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <div className="border-t border-divider pt-6">
              <button
                className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-button-gradient px-6 py-4 text-sm font-extrabold text-brand-button shadow-lime-glow transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={busy}
                type="submit"
              >
                {busy ? (
                  <>
                    <LoaderCircle className="size-5 animate-spin" />
                    {t('saving')}
                  </>
                ) : (
                  <>
                    <Sparkles className="size-5" />
                    {t('saveDraft')}
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Live preview sidebar */}
          <aside className="space-y-5 lg:sticky lg:top-24">
            <section className="overflow-hidden rounded-[28px] border border-divider bg-white shadow-card">
              <div className="flex items-center justify-between border-b border-divider px-5 py-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet">
                    CHUO MARKET
                  </p>
                  <h2 className="mt-1 text-sm font-extrabold text-ink">
                    {t('imagePreview')}
                  </h2>
                </div>

                <span className="rounded-full bg-lime/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-brand-950">
                  Preview
                </span>
              </div>

              <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                {images[0] ? (
                  <Image
                    alt={title || t('imagePreview')}
                    className="object-contain"
                    fill
                    sizes="(max-width: 1024px) 100vw, 340px"
                    src={images[0]}
                    unoptimized
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center bg-gradient-to-br from-brand-950 via-brand-900 to-violet-700 text-white">
                    <ImagePlus className="size-12 text-lime/80" />
                    <p className="mt-3 text-xs font-bold uppercase tracking-[0.18em] text-white/60">
                      CHUO MARKET
                    </p>
                  </div>
                )}

                {images.length > 1 && (
                  <span className="absolute bottom-3 right-3 rounded-full bg-brand-950/85 px-3 py-1.5 text-xs font-bold text-white backdrop-blur">
                    +{images.length - 1}
                  </span>
                )}
              </div>

              <div className="space-y-4 p-5">
                <div>
                  <p className="text-xs font-semibold text-slate-400">
                    {t('categories.' + category)}
                  </p>

                  <h3 className="mt-2 break-words text-lg font-extrabold leading-snug text-ink">
                    {title || t('title')}
                  </h3>

                  <p className="mt-3 text-2xl font-black tracking-tight text-violet">
                    <span className="mr-1 text-sm font-bold text-slate-400">
                      TSh
                    </span>
                    {previewPrice}
                  </p>
                </div>

                <div className="h-px bg-divider" />

                <div className="flex items-start gap-2 text-sm text-slate-500">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-violet" />
                  <span className="break-words">
                    {meetingPlace || t('meetingPlace')}
                  </span>
                </div>

                <p className="line-clamp-4 whitespace-pre-wrap break-words text-sm leading-6 text-slate-500">
                  {description || t('description')}
                </p>
              </div>
            </section>

            <section className="relative isolate overflow-hidden rounded-[26px] bg-cinematic-gradient p-5 text-white shadow-cinematic">
              <div className="pointer-events-none absolute -right-12 -top-12 -z-10 size-36 rounded-full bg-violet/30 blur-3xl" />

              <div className="flex items-center gap-3">
                <span className="flex size-10 items-center justify-center rounded-xl bg-lime text-brand-950">
                  <Package className="size-5" />
                </span>

                <div>
                  <p className="text-sm font-extrabold">
                    CHUO MARKET
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {t('draftLabel')}
                  </p>
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-white/75">
                {t('draftDescription')}
              </p>
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
