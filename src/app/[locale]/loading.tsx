export default function Loading() {
  return <div aria-label="Loading content" aria-busy="true" className="space-y-6">
    <div className="h-8 w-2/3 animate-pulse rounded-xl bg-brand-700" />
    <div className="h-4 w-full max-w-xl animate-pulse rounded-lg bg-brand-800" />
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{Array.from({ length: 8 }, (_, index) => <div className="space-y-3 rounded-2xl border border-brand-700 bg-brand-800 p-3" key={index}><div className="aspect-square animate-pulse rounded-xl bg-brand-700" /><div className="h-4 animate-pulse rounded bg-brand-700" /><div className="h-4 w-2/3 animate-pulse rounded bg-brand-700" /></div>)}</div>
  </div>;
}
