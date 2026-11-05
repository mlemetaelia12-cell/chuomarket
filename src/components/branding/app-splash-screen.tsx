'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const SPLASH_KEY = 'chuo-market-splash-shown';
const SPLASH_DURATION_MS = 2800;

export function AppSplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(SPLASH_KEY) === 'true') {
        setVisible(false);
        return;
      }
    } catch {
      // Continue showing the splash when browser storage is unavailable.
    }

    // Save the flag only after the timer finishes. This also behaves correctly
    // when React Strict Mode runs the effect setup/cleanup cycle in development.
    const timeout = window.setTimeout(() => {
      try {
        window.sessionStorage.setItem(SPLASH_KEY, 'true');
      } catch {
        // The splash can still close normally when browser storage is unavailable.
      }

      setVisible(false);
    }, SPLASH_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Loading Chuo Market"
      aria-live="polite"
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#160044]"
      role="status"
    >
      <Image
        alt="Chuo Market — Buy, Sell, Connect"
        className="object-cover md:object-contain"
        fill
        priority
        sizes="100vw"
        src="/chuo-market-splash-screen.jpg"
      />

      <span
        aria-hidden="true"
        className="absolute bottom-[9.3%] left-1/2 size-11 -translate-x-1/2 rounded-full border-[4px] border-white/20 border-r-lime-400 border-t-white animate-spin motion-reduce:animate-none"
      />
    </div>
  );
}
