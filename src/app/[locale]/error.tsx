'use client';

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <section aria-live="assertive" className="mx-auto max-w-lg rounded-3xl border border-brand-700 bg-brand-800 p-6 text-center">
    <h1 className="text-xl font-extrabold text-brand-100">Something went wrong</h1>
    <p className="mt-2 text-sm text-brand-300">We could not load this page. Please try again.</p>
    <button className="mt-5 rounded-full bg-brand-200 px-5 py-3 text-sm font-bold text-brand-950 transition hover:bg-white focus-visible:outline-offset-4" onClick={reset} type="button">Try again</button>
  </section>;
}
