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
      window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;

    lastY.current = getScrollY();

    const update = () => {
      const y = getScrollY();
      const delta = y - lastY.current;

      // Always show near the top.
      if (y < 64) {
        setHidden(false);
      } else if (Math.abs(delta) > threshold) {
        // Scrolling down → hide; scrolling up → show.
        setHidden(delta > 0);
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

    // Listen on window (bubbles from document) AND capture scrolls from any
    // scrolling element via the capture phase, so we catch body/html scrolling too.
    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('scroll', onScroll, { passive: true, capture: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('scroll', onScroll, { capture: true } as any);
    };
  }, [threshold]);

  return hidden;
}
