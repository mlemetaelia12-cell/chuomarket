'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { ArrowRight, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';

type Props = {
  planCode: string;
  listingId?: string;
  priceTsh: number;
  planName: string;
};

export function PlanCheckout({ planCode, listingId, priceTsh, planName }: Props) {
  const t = useTranslations('Payments');
  const locale = useLocale();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function checkout() {
    if (busy) return;

    setBusy(true);
    setError('');

    try {
      const response = await fetch('/api/payments/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planCode,
          listingId,
          locale,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as {
        redirectUrl?: string;
        error?: string;
      };

      if (!response.ok || !result.redirectUrl) {
        setError(
          result.error === 'whatsapp_required'
            ? t('whatsappRequired')
            : result.error === 'payment_status_pending'
              ? t('paymentPending')
              : t('checkoutError'),
        );
        return;
      }

      // Continue to the payment provider.
      window.location.assign(result.redirectUrl);
    } catch (checkoutError) {
      console.error('PLAN CHECKOUT ERROR:', checkoutError);
      setError(t('checkoutError'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 space-y-4">
      <button
        aria-busy={busy}
        className="group flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-button-gradient px-5 py-3.5 text-sm font-extrabold text-brand-button shadow-lime-glow transition duration-200 hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
        disabled={busy}
        onClick={() => void checkout()}
        type="button"
      >
        {busy ? (
          <>
            <LoaderCircle className="size-5 animate-spin" />
            {t('starting')}
          </>
        ) : (
          <>
            <CreditCard className="size-5" />
            <span>
              {t('payNow', {
                price: priceTsh.toLocaleString('en-TZ'),
                plan: planName,
              })}
            </span>
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </>
        )}
      </button>

      {error && (
        <div
          aria-live="polite"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold leading-6 text-rose-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="flex items-start gap-3 rounded-2xl border border-divider bg-slate-50 p-3.5">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
          <ShieldCheck className="size-5" />
        </span>

        <div className="min-w-0">
          <p className="text-xs font-bold text-ink">
            {locale === 'sw' ? 'Malipo salama' : 'Secure payment'}
          </p>

          <p className="mt-1 text-[11px] leading-5 text-slate-500">
            {locale === 'sw'
              ? 'Malipo yanathibitishwa kupitia mfumo wa seva kabla oda haijakamilishwa.'
              : 'Payments are verified server-side before an order is marked completed.'}
          </p>
        </div>

        <LockKeyhole className="mt-1 size-4 shrink-0 text-slate-400" />
      </div>
    </div>
  );
}
