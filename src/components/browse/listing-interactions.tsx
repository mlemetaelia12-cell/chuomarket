
'use client';

import { useState, type FormEvent } from 'react';
import { Link } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';
import {
  Heart,
  MessageCircle,
  Flag,
  Send,
  LoaderCircle,
  CheckCircle2,
} from 'lucide-react';

type Props = {
  listingId: string;
  title: string;
  loggedIn: boolean;
  initialFavorite?: boolean;
  compact?: boolean;
};

export function ListingInteractions({
  listingId,
  title,
  loggedIn,
  initialFavorite = false,
  compact = false,
}: Props) {
  const t = useTranslations('Browse');
  const [favorited, setFavorited] = useState(initialFavorite);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [noticeType, setNoticeType] = useState<'success' | 'error'>('error');
  const [reason, setReason] = useState('scam');
  const [details, setDetails] = useState('');

  async function favorite() {
    setBusy(true);
    setNotice('');

    try {
      const response = await fetch(`/api/listings/${listingId}/favorite`, {
        method: 'POST',
      });

      if (response.status === 401) {
        setNotice(t('loginToFavorite'));
        setNoticeType('error');
        return;
      }

      const result = (await response.json()) as {
        favorited?: boolean;
      };

      if (!response.ok || typeof result.favorited !== 'boolean') {
        throw new Error('favorite_failed');
      }

      setFavorited(result.favorited);
      setNoticeType('success');
      setNotice(
        result.favorited
          ? t('saved')
          : localeNoticeRemoved(),
      );
    } catch {
      setNotice(t('actionFailed'));
      setNoticeType('error');
    } finally {
      setBusy(false);
    }
  }

  function localeNoticeRemoved() {
    return 'Removed';
  }

  async function contactSeller() {
    if (!loggedIn) {
      setNotice(t('loginToContact'));
      setNoticeType('error');
      return;
    }

    setBusy(true);
    setNotice('');

    try {
      const response = await fetch(`/api/listings/${listingId}/whatsapp`, {
        method: 'POST',
      });

      const result = (await response.json()) as {
        phone?: string;
        error?: string;
      };

      if (response.status === 429) {
        setNotice(t('dailyLimit'));
        setNoticeType('error');
        return;
      }

      if (!response.ok || !result.phone) {
        setNotice(
          result.error === 'seller_phone_missing'
            ? t('sellerPhoneMissing')
            : t('actionFailed'),
        );
        setNoticeType('error');
        return;
      }

      let phone = result.phone;

      if (phone.startsWith('0')) {
        phone = `255${phone.slice(1)}`;
      }

      const message = t('whatsappMessage', { title });

      window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    } catch {
      setNotice(t('actionFailed'));
      setNoticeType('error');
    } finally {
      setBusy(false);
    }
  }

  async function report(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setNotice('');

    try {
      const response = await fetch(`/api/listings/${listingId}/report`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason, details }),
      });

      if (response.status === 401) {
        setNotice(t('loginToReport'));
        setNoticeType('error');
        return;
      }

      if (!response.ok) {
        throw new Error('report_failed');
      }

      setNotice(t('reportSuccess'));
      setNoticeType('success');
      setDetails('');
    } catch {
      setNotice(t('actionFailed'));
      setNoticeType('error');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Main actions */}
      <div className="flex flex-col gap-3">
        <button
          aria-pressed={favorited}
          className={`flex min-h-12 items-center justify-center gap-2 rounded-full border px-5 py-3 text-sm font-bold transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 ${
            favorited
              ? 'border-violet bg-violet/10 text-violet'
              : 'border-divider bg-white text-ink hover:border-violet hover:bg-violet/5'
          }`}
          disabled={busy}
          onClick={() => void favorite()}
          type="button"
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin" />
          ) : (
            <Heart
              className="size-4"
              fill={favorited ? 'currentColor' : 'none'}
            />
          )}
          {favorited ? t('saved') : t('favorite')}
        </button>

        {!compact &&
          (loggedIn ? (
            <button
              className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-button-gradient px-5 py-3 text-sm font-extrabold text-brand-button shadow-lime-glow transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              onClick={() => void contactSeller()}
              type="button"
            >
              {busy ? (
                <LoaderCircle className="size-5 animate-spin" />
              ) : (
                <MessageCircle className="size-5" />
              )}
              {t('whatsapp')}
            </button>
          ) : (
            <Link
              className="flex min-h-14 items-center justify-center gap-2 rounded-full bg-button-gradient px-5 py-3 text-center text-sm font-extrabold text-brand-button shadow-lime-glow transition hover:-translate-y-0.5 hover:brightness-105"
              href="/login"
            >
              <MessageCircle className="size-5" />
              {t('loginToContact')}
            </Link>
          ))}
      </div>

      {/* Action feedback */}
      {notice && (
        <div
          aria-live="polite"
          className={`flex items-start gap-2 rounded-2xl border p-3 text-sm leading-6 ${
            noticeType === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-700'
          }`}
          role="status"
        >
          {noticeType === 'success' ? (
            <CheckCircle2 className="mt-1 size-4 shrink-0" />
          ) : (
            <Flag className="mt-1 size-4 shrink-0" />
          )}
          <span>{notice}</span>
        </div>
      )}

      {/* Report listing */}
      {!compact && (
        <details className="group overflow-hidden rounded-2xl border border-divider bg-white">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4 text-sm font-bold text-slate-600 transition hover:bg-slate-50 [&::-webkit-details-marker]:hidden">
            <span className="flex items-center gap-2">
              <Flag className="size-4 text-slate-400" />
              {t('reportListing')}
            </span>
            <span className="text-slate-400 transition group-open:rotate-180">
              ↓
            </span>
          </summary>

          <div className="border-t border-divider p-4">
            {loggedIn ? (
              <form className="space-y-4" onSubmit={(event) => void report(event)}>
                <div className="space-y-2">
                  <label
                    className="text-xs font-bold uppercase tracking-wider text-slate-500"
                    htmlFor={`report-reason-${listingId}`}
                  >
                    {t('reportReason')}
                  </label>

                  <select
                    className="w-full rounded-xl border border-divider bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition focus:border-violet focus:ring-2 focus:ring-violet/10"
                    id={`report-reason-${listingId}`}
                    onChange={(event) => setReason(event.target.value)}
                    value={reason}
                  >
                    <option value="scam">{t('reasons.scam')}</option>
                    <option value="prohibited">{t('reasons.prohibited')}</option>
                    <option value="misleading">{t('reasons.misleading')}</option>
                    <option value="duplicate">{t('reasons.duplicate')}</option>
                    <option value="other">{t('reasons.other')}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label
                    className="text-xs font-bold uppercase tracking-wider text-slate-500"
                    htmlFor={`report-details-${listingId}`}
                  >
                    {t('reportDetails')}
                  </label>

                  <textarea
                    className="w-full resize-y rounded-xl border border-divider bg-slate-50 px-4 py-3 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-violet focus:ring-2 focus:ring-violet/10"
                    id={`report-details-${listingId}`}
                    maxLength={1000}
                    onChange={(event) => setDetails(event.target.value)}
                    placeholder={t('reportDetails')}
                    rows={3}
                    value={details}
                  />
                </div>

                <button
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-950 px-5 py-3 text-sm font-bold text-white transition hover:bg-violet disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={busy}
                  type="submit"
                >
                  {busy ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                  {t('submitReport')}
                </button>
              </form>
            ) : (
              <p className="text-sm leading-6 text-slate-500">
                {t('loginToReport')}{' '}
                <Link
                  className="font-bold text-violet underline underline-offset-4"
                  href="/login"
                >
                  {t('login')}
                </Link>
              </p>
            )}
          </div>
        </details>
      )}
    </div>
  );
}
