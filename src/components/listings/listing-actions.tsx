
'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  LoaderCircle,
  LockKeyhole,
  PackageCheck,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';

type Props = {
  id: string;
  status: 'draft' | 'published' | 'sold' | 'hidden';
};

type PublishMode = 'free' | 'plan';

type ApiResult = {
  redirect?: string;
  error?: string;
};

export function ListingActions({ id, status }: Props) {
  const t = useTranslations('Listings');
  const router = useRouter();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [publishOpen, setPublishOpen] = useState(false);
  const [portalReady, setPortalReady] = useState(false);

  const requestInFlight = useRef(false);

  useEffect(() => {
    setPortalReady(true);
  }, []);

  // Prevent background scrolling while the dialog is open.
  useEffect(() => {
    if (!publishOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && !requestInFlight.current) {
        setError('');
        setPublishOpen(false);
      }
    }

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [publishOpen]);

  function getErrorMessage(code?: string): string {
    switch (code) {
      case 'free_listing_used':
        return t('freeListingUsed');
      case 'subscription_required':
        return t('subscriptionRequired');
      case 'listing_limit_reached':
        return t('listingLimitReached');
      default:
        return t('actionError');
    }
  }

  async function run(
    path: string,
    method: 'POST' | 'DELETE',
    body?: Record<string, string>,
  ) {
    if (requestInFlight.current) return;

    requestInFlight.current = true;
    setBusy(true);
    setError('');

    try {
      const response = await fetch(path, {
        method,
        headers: body
          ? { 'Content-Type': 'application/json' }
          : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });

      const result = (await response.json().catch(() => ({}))) as ApiResult;

      if (response.status === 402 && result.redirect) {
        setPublishOpen(false);
        router.push(result.redirect);
        return;
      }

      if (!response.ok) {
        setError(
          path.endsWith('/publish')
            ? getErrorMessage(result.error)
            : t('actionError'),
        );
        return;
      }

      setPublishOpen(false);
      router.refresh();
    } catch (requestError) {
      console.error('LISTING ACTION FAILED:', requestError);
      setError(t('actionError'));
    } finally {
      requestInFlight.current = false;
      setBusy(false);
    }
  }

  function publish(mode: PublishMode) {
    void run(`/api/listings/${id}/publish`, 'POST', { mode });
  }

  function openPublishDialog() {
    if (busy) return;

    setError('');
    setPublishOpen(true);
  }

  function closePublishDialog() {
    if (busy || requestInFlight.current) return;

    setError('');
    setPublishOpen(false);
  }

  return (
    <>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {status === 'draft' && (
          <>
            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => router.push(`/sell/${id}/edit`)}
              type="button"
            >
              {t('edit')}
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-bold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={openPublishDialog}
              type="button"
            >
              <Sparkles aria-hidden="true" className="size-3.5" />
              {t('publish')}
            </button>

            <button
              className="inline-flex items-center justify-center gap-2 rounded-full border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={busy}
              onClick={() => void run(`/api/listings/${id}`, 'DELETE')}
              type="button"
            >
              <Trash2 aria-hidden="true" className="size-3.5" />
              {t('delete')}
            </button>
          </>
        )}

        {status === 'published' && (
          <button
            className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-200 bg-white px-4 py-2 text-xs font-bold text-blue-700 disabled:opacity-50"
            disabled={busy}
            onClick={() => void run(`/api/listings/${id}/sold`, 'POST')}
            type="button"
          >
            {busy ? (
              <LoaderCircle className="size-3.5 animate-spin" />
            ) : (
              <PackageCheck className="size-3.5" />
            )}
            {t('markSold')}
          </button>
        )}

        {error && !publishOpen && (
          <p
            aria-live="polite"
            className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium leading-5 text-rose-700"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>

      {publishOpen &&
        status === 'draft' &&
        portalReady &&
        createPortal(
          <div
            className="fixed inset-0 z-[99999] flex items-center justify-center overflow-y-auto p-3 sm:p-5"
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 99999,
              isolation: 'isolate',
              overscrollBehavior: 'contain',
            }}
          >
            {/* Backdrop */}
            <button
              aria-label={t('cancel')}
              className="absolute inset-0 z-0 cursor-default bg-slate-950/60"
              disabled={busy}
              onClick={closePublishDialog}
              type="button"
            />

            {/* Dialog */}
            <section
              aria-labelledby="publish-choice-title"
              aria-describedby="publish-choice-description"
              aria-modal="true"
              aria-busy={busy}
              className="relative z-10 my-auto flex max-h-[calc(100dvh-24px)] w-full max-w-lg flex-col overflow-y-auto rounded-[28px] border border-slate-200 bg-white shadow-2xl"
              role="dialog"
              onClick={(event) => event.stopPropagation()}
            >
              <header className="shrink-0 border-b border-slate-100 bg-white px-5 py-5 sm:px-7 sm:py-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                      <PackageCheck className="size-5" />
                    </span>

                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-700">
                        CHUO MARKET
                      </p>

                      <h2
                        className="mt-1 text-lg font-extrabold leading-tight text-slate-900 sm:text-xl"
                        id="publish-choice-title"
                      >
                        {t('publishChoiceTitle')}
                      </h2>
                    </div>
                  </div>

                  <button
                    aria-label={t('cancel')}
                    className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:opacity-50"
                    disabled={busy}
                    onClick={closePublishDialog}
                    type="button"
                  >
                    <X aria-hidden="true" className="size-4" />
                  </button>
                </div>

                <p
                  className="mt-4 text-sm leading-6 text-slate-600"
                  id="publish-choice-description"
                >
                  {t('publishChoiceDescription')}
                </p>
              </header>

              <div className="shrink-0 space-y-3 bg-slate-50 p-4 sm:p-6">
                {/* Free lifetime listing */}
                <button
                  aria-label={t('publishFreeTitle')}
                  className="w-full cursor-pointer touch-manipulation appearance-none rounded-2xl border border-green-200 bg-white p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
                  disabled={busy}
                  onClick={() => publish('free')}
                  type="button"
                >
                  <span className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-green-700">
                      <CheckCircle2 className="size-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 sm:text-base">
                          {t('publishFreeTitle')}
                        </span>

                        <span className="rounded-full bg-green-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
                          Lifetime
                        </span>
                      </span>

                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {t('publishFreeDescription')}
                      </span>

                      <span className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-green-700 px-4 py-2 text-xs font-bold text-white">
                        {busy ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="size-4" />
                        )}
                        {busy ? t('publishing') : t('publishFree')}
                        {!busy && (
                          <ChevronRight className="size-3.5" />
                        )}
                      </span>
                    </span>
                  </span>
                </button>

                {/* Active seller plan */}
                <button
                  aria-label={t('publishPlanTitle')}
                  className="w-full cursor-pointer touch-manipulation appearance-none rounded-2xl border border-blue-200 bg-white p-4 text-left shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 sm:p-5"
                  disabled={busy}
                  onClick={() => publish('plan')}
                  type="button"
                >
                  <span className="flex items-start gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
                      <Sparkles className="size-5" />
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-extrabold text-slate-900 sm:text-base">
                          {t('publishPlanTitle')}
                        </span>

                        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
                          Seller plan
                        </span>
                      </span>

                      <span className="mt-2 block text-sm leading-6 text-slate-600">
                        {t('publishPlanDescription')}
                      </span>

                      <span className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-bold text-white">
                        {busy ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <CircleDollarSign className="size-4" />
                        )}
                        {busy ? t('publishing') : t('publishWithPlan')}
                        {!busy && (
                          <ChevronRight className="size-3.5" />
                        )}
                      </span>
                    </span>
                  </span>
                </button>

                {error && (
                  <div
                    aria-live="polite"
                    className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium leading-6 text-rose-700"
                    role="alert"
                  >
                    {error}
                  </div>
                )}
              </div>

              <footer className="mt-auto flex shrink-0 flex-col gap-3 border-t border-slate-100 bg-white px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                <div className="flex items-center gap-2 text-xs leading-5 text-slate-500">
                  <LockKeyhole className="size-4 shrink-0 text-green-700" />
                  <span>Secure publishing</span>
                </div>

                <button
                  className="inline-flex min-h-10 items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-2 text-xs font-bold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={busy}
                  onClick={closePublishDialog}
                  type="button"
                >
                  {t('cancel')}
                </button>
              </footer>
            </section>
          </div>,
          document.body,
        )}
    </>
  );
}
