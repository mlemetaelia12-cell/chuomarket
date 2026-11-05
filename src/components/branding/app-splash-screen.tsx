<<<<<<< HEAD
=======

>>>>>>> d286a82 (feat: update community, image storage and branding)
'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';

const SPLASH_KEY = 'chuo-market-splash-shown';
<<<<<<< HEAD
const SPLASH_DURATION_MS = 2800;
=======
>>>>>>> d286a82 (feat: update community, image storage and branding)

export function AppSplashScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
<<<<<<< HEAD
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
=======
    if (sessionStorage.getItem(SPLASH_KEY)) {
      setVisible(false);
      return;
    }

    sessionStorage.setItem(SPLASH_KEY, 'true');

    const timeout = window.setTimeout(() => {
      setVisible(false);
    }, 3000);
>>>>>>> d286a82 (feat: update community, image storage and branding)

    return () => window.clearTimeout(timeout);
  }, []);

  if (!visible) return null;

  return (
    <div
      aria-label="Loading Chuo Market"
      aria-live="polite"
<<<<<<< HEAD
      className="fixed inset-0 z-[9999] overflow-hidden bg-[#160044]"
=======
      className="fixed inset-0 z-[200] overflow-hidden bg-[#160044]"
>>>>>>> d286a82 (feat: update community, image storage and branding)
      role="status"
    >
      <Image
        alt="Chuo Market — Buy, Sell, Connect"
<<<<<<< HEAD
        className="object-cover md:object-contain"
        fill
        priority
        sizes="100vw"
        src="/chuo-market-splash-screen.jpg"
      />

      <span
        aria-hidden="true"
        className="absolute bottom-[9.3%] left-1/2 size-11 -translate-x-1/2 rounded-full border-[4px] border-white/20 border-r-lime-400 border-t-white animate-spin motion-reduce:animate-none"
=======
        className="object-contain"
        fill
        priority
        sizes="100vw"
        src="/splash-screen.jpg"
      />

      <div
        aria-hidden="true"
        className="absolute bottom-[11.5%] left-1/2 size-12 -translate-x-1/2 rounded-full border-[5px] border-lime-400/25 border-t-lime-400 border-r-white border-b-transparent animate-spin"
>>>>>>> d286a82 (feat: update community, image storage and branding)
      />
    </div>
  );
}
