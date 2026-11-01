'use client';

import { useState, type FormEvent } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  ArrowRight,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { Link, useRouter } from '@/i18n/navigation';
import { authClient } from '@/lib/auth-client';

type AuthFormProps = {
  mode: 'login' | 'signup';
};

export function AuthForm({ mode }: AuthFormProps) {
  const t = useTranslations('Auth');
  const locale = useLocale();
  const router = useRouter();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';
  const isSwahili = locale === 'sw';

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    setError('');

    const normalizedUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9_]{3,32}$/.test(normalizedUsername)) {
      setError(t('invalidUsername'));
      return;
    }

    if (password.length < 8) {
      setError(t('shortPassword'));
      return;
    }

    if (isSignup && password !== confirmPassword) {
      setError(t('passwordMismatch'));
      return;
    }

    setBusy(true);

    try {
      const result = isSignup
        ? await authClient.signUp.email({
            username: normalizedUsername,
            name: normalizedUsername,
            email: `${normalizedUsername}@accounts.chuomarket.invalid`,
            password,
          })
        : await authClient.signIn.username({
            username: normalizedUsername,
            password,
          });

      if (result.error) {
        setError(result.error.message ?? t('genericError'));
        return;
      }

      // Account creation/login has succeeded.
      // Growth tracking must not prevent the user from entering the app.
      if (isSignup) {
        try {
          const ref = new URLSearchParams(window.location.search).get('ref');

          if (ref) {
            const referralResponse = await fetch('/api/growth/referral', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ ref }),
            });

            if (!referralResponse.ok) {
              console.warn('Referral attribution could not be recorded.');
            }
          }
        } catch (referralError) {
          console.warn('Referral attribution failed:', referralError);
        }
      }

      // Daily login tracking is also best-effort.
      try {
        const dailyLoginResponse = await fetch('/api/growth/daily-login', {
          method: 'POST',
        });

        if (!dailyLoginResponse.ok) {
          console.warn('Daily login tracking failed.');
        }
      } catch (trackingError) {
        console.warn('Daily login tracking failed:', trackingError);
      }

      router.replace('/mine');
      router.refresh();
    } catch (authError) {
      console.error('Authentication failed:', authError);
      setError(t('genericError'));
    } finally {
      setBusy(false);
    }
  }

  const inputClass =
    'w-full rounded-2xl border border-divider bg-slate-50 px-4 py-3.5 text-sm text-ink outline-none transition placeholder:text-slate-400 focus:border-violet focus:bg-white focus:ring-4 focus:ring-violet/10';

  const labelClass = 'mb-2 block text-sm font-bold text-ink';

  return (
    <main className="min-h-[75vh] bg-canvas px-4 py-8 sm:px-6 sm:py-12">
      <div className="mx-auto grid w-full max-w-5xl items-stretch gap-6 lg:grid-cols-[1fr_0.9fr]">
        {/* Cinematic welcome panel */}
        <section className="relative isolate flex min-h-60 flex-col justify-between overflow-hidden rounded-3xl border border-divider bg-white p-7 text-ink shadow-sm sm:p-9 lg:min-h-[540px]">
          <div className="pointer-events-none absolute -right-20 -top-20 -z-10 size-72 rounded-full bg-violet/35 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 -z-10 size-64 rounded-full bg-lime/10 blur-3xl" />

          <div className="relative">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-700">
              <span className="text-lg font-black">CM</span>
            </div>

            <p className="mt-7 text-xs font-bold uppercase tracking-[0.2em] text-brand-700">
              {t('eyebrow')}
            </p>

            <h1 className="mt-4 max-w-md text-3xl font-black leading-tight tracking-tight sm:text-4xl">
              {isSignup
                ? isSwahili
                  ? 'Soko lako. Jamii yako. Fursa zako.'
                  : 'Your campus. Your marketplace. Your opportunity.'
                : isSwahili
                  ? 'Karibu tena Chuo Market.'
                  : 'Welcome back to Chuo Market.'}
            </h1>

            <p className="mt-4 max-w-md text-sm leading-7 text-ink-muted">
              {isSignup
                ? isSwahili
                  ? 'Jiunge na wanafunzi wengine kununua, kuuza na kushiriki fursa ndani ya jamii ya vyuo.'
                  : 'Join other students to buy, sell and discover opportunities within the campus community.'
                : isSwahili
                  ? 'Ingia ili kuendelea kusimamia matangazo yako na kushiriki kwenye soko la wanafunzi.'
                  : 'Sign in to manage your listings and continue exploring the student marketplace.'}
            </p>
          </div>

          <div className="relative mt-8 space-y-4 border-t border-divider pt-6">
            <div className="flex items-center gap-3">
              <span className="flex size-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
                <ShieldCheck className="size-5" />
              </span>

              <p className="text-xs font-semibold leading-5 text-slate-600">
                {isSwahili
                  ? 'Akaunti yako inalindwa kwa mfumo wa uthibitishaji.'
                  : 'Your account is protected with secure authentication.'}
              </p>
            </div>

            <p className="text-[10px] font-bold tracking-[0.18em] text-slate-400">
              CHUO MARKET · BUILT FOR CAMPUS LIFE
            </p>
          </div>
        </section>

        {/* Authentication form */}
        <section className="flex flex-col justify-center rounded-[30px] border border-divider bg-white p-5 shadow-card sm:p-8 lg:p-9">
          <div className="mb-7">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-violet">
              {t('eyebrow')}
            </p>

            <h2 className="mt-2 text-2xl font-black tracking-tight text-ink sm:text-3xl">
              {isSignup ? t('signupTitle') : t('loginTitle')}
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              {isSignup
                ? isSwahili
                  ? 'Unda akaunti yako kwa kutumia jina la mtumiaji na nywila.'
                  : 'Create your account using a username and password.'
                : isSwahili
                  ? 'Weka taarifa zako ili kuendelea.'
                  : 'Enter your account details to continue.'}
            </p>
          </div>

          <form className="space-y-5" onSubmit={submit}>
            {/* Username */}
            <div>
              <label className={labelClass} htmlFor="auth-username">
                {t('username')}
              </label>

              <div className="relative">
                <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                <input
                  autoComplete="username"
                  autoCapitalize="none"
                  className={`${inputClass} pl-11`}
                  id="auth-username"
                  maxLength={32}
                  minLength={3}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder={isSwahili ? 'Jina la mtumiaji' : 'Your username'}
                  required
                  spellCheck={false}
                  value={username}
                />
              </div>

              <p className="mt-2 text-[11px] leading-5 text-slate-400">
                {isSwahili
                  ? 'Herufi ndogo, namba na underscore pekee.'
                  : 'Use lowercase letters, numbers and underscores only.'}
              </p>
            </div>

            {/* Password */}
            <div>
              <label className={labelClass} htmlFor="auth-password">
                {t('password')}
              </label>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                <input
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  className={`${inputClass} pl-11 pr-12`}
                  id="auth-password"
                  minLength={8}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder={isSwahili ? 'Weka nywila yako' : 'Enter your password'}
                  required
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                />

                <button
                  aria-label={
                    showPassword
                      ? isSwahili
                        ? 'Ficha nywila'
                        : 'Hide password'
                      : isSwahili
                        ? 'Onyesha nywila'
                        : 'Show password'
                  }
                  className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-violet"
                  onClick={() => setShowPassword((visible) => !visible)}
                  type="button"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>

              <p className="mt-2 text-[11px] text-slate-400">
                {isSwahili ? 'Angalau herufi 6.' : 'At least 6 characters.'}
              </p>
            </div>

            {/* Confirm password */}
            {isSignup && (
              <div>
                <label className={labelClass} htmlFor="auth-confirm-password">
                  {t('confirmPassword')}
                </label>

                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-400" />

                  <input
                    autoComplete="new-password"
                    className={`${inputClass} pl-11 pr-12`}
                    id="auth-confirm-password"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder={isSwahili ? 'Rudia nywila yako' : 'Confirm your password'}
                    required
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                  />

                  <button
                    aria-label={
                      showConfirmPassword
                        ? isSwahili
                          ? 'Ficha nywila'
                          : 'Hide password'
                        : isSwahili
                          ? 'Onyesha nywila'
                          : 'Show password'
                    }
                    className="absolute right-3 top-1/2 flex size-9 -translate-y-1/2 items-center justify-center rounded-xl text-slate-400 transition hover:bg-slate-100 hover:text-violet"
                    onClick={() => setShowConfirmPassword((visible) => !visible)}
                    type="button"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div
                aria-live="polite"
                className="rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-sm leading-6 text-rose-700"
                role="alert"
              >
                {error}
              </div>
            )}

            {/* Submit */}
            <button
              className="flex min-h-14 w-full items-center justify-center gap-2 rounded-full bg-button-gradient px-5 py-3.5 text-sm font-extrabold text-brand-button shadow-lime-glow transition hover:-translate-y-0.5 hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={busy}
              type="submit"
            >
              {busy ? (
                <>
                  <LoaderCircle className="size-5 animate-spin" />
                  {t('working')}
                </>
              ) : (
                <>
                  {isSignup ? t('signupAction') : t('loginAction')}
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-7 border-t border-divider pt-6 text-center">
            <p className="text-sm text-slate-500">
              {isSignup
                ? isSwahili
                  ? 'Tayari una akaunti?'
                  : 'Already have an account?'
                : isSwahili
                  ? 'Bado huna akaunti?'
                  : "Don't have an account yet?"}
            </p>

            <Link
              className="mt-2 inline-flex items-center gap-1 font-extrabold text-violet underline decoration-violet/30 underline-offset-4 transition hover:text-brand-950"
              href={isSignup ? '/login' : '/signup'}
            >
              {isSignup
                ? isSwahili
                  ? 'Ingia'
                  : 'Sign In'
                : isSwahili
                  ? 'Fungua Akaunti'
                  : 'Create Account'}
              <ArrowRight className="size-4" />
            </Link>
          </div>

          <p className="mt-6 text-center text-[10px] font-medium text-slate-400">
            {t('languageHint', { locale })}
          </p>
        </section>
      </div>
    </main>
  );
}
