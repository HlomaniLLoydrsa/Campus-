'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Returns `true` when a fixed/sticky header should be hidden.
 *
 * Behavior: hides the header when the user scrolls DOWN past a small threshold,
 * and reveals it again the moment they scroll UP — so navigation is always one
 * small upward flick away, no need to scroll back to the very top.
 *
 * Near the top of the page the header is always shown.
 */
export function useHideOnScroll(threshold = 8): boolean {
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);
  const ticking = useRef(false);

  useEffect(() => {
    // The scroll position can live on the window, <html>, or <body> depending on
    // CSS (this app sets `overflow-x: hidden` on html/body, which can move the
    // scroll container onto the body). Read whichever is actually scrolling.
    const getScrollY = () =>
      Math.max(
        window.scrollY || 0,
        window.pageYOffset || 0,
        document.documentElement?.scrollTop || 0,
        document.body?.scrollTop || 0,
      );

    lastY.current = getScrollY();

    const update = () => {
      const y = getScrollY();
      const delta = y - lastY.current;

      if (y < 64) {
        // Always show near the top.
        setHidden(false);
      } else if (delta < -threshold) {
        // Scrolling UP → always reveal.
        setHidden(false);
      } else if (delta > threshold) {
        // Scrolling DOWN → hide.
        setHidden(true);
      }
      lastY.current = y;
      ticking.current = false;
    };

    const onScroll = () => {
      if (!ticking.current) {
        ticking.current = true;
        window.requestAnimationFrame(update);
      }
    };

    // Listen on window AND in the capture phase so we catch scrolling no matter
    // which element (window / html / body / a scroll container) actually scrolls.
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    window.addEventListener('wheel', onScroll, { passive: true });
    window.addEventListener('touchmove', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true } as any);
      window.removeEventListener('wheel', onScroll);
      window.removeEventListener('touchmove', onScroll);
    };
  }, [threshold]);

  return hidden;
}
