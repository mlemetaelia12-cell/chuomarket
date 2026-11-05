/* eslint-disable @next/next/no-img-element */
export function PublicImage({ src, alt, className = '' }: { src: string | null; alt: string; className?: string }) {
  if (!src) return <div aria-hidden="true" className={`bg-gradient-to-br from-violet/10 via-canvas to-brand-100 ${className}`} />;
  return <img alt={alt} className={className} loading="lazy" src={src} />;
}
