import { useEffect, useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop
 * -----------
 * React Router v6 keeps the browser's scroll position when you navigate
 * between routes — and modern browsers also do their own "scroll
 * restoration" on history changes. Together that's why the next page
 * keeps appearing mid-scroll.
 *
 * Fix:
 *   1. Disable native scroll restoration once on mount so the browser
 *      stops trying to restore the previous offset.
 *   2. On every route change, run a useLayoutEffect that resets all
 *      three scroll containers (window, documentElement, body) BEFORE
 *      paint — so the user never sees a flash of mid-scroll content.
 *   3. Schedule a second reset via requestAnimationFrame to catch the
 *      case where the new page mounts taller content asynchronously
 *      after the first reset (e.g. images / route-loaded data).
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  // Disable browser scroll restoration once. This is what stops the
  // browser from auto-restoring the previous page's scroll position
  // when you navigate (forward or back) between routes.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  // Use useLayoutEffect so the reset happens BEFORE the browser paints
  // the new route — eliminates the visible "jump" you'd see with a
  // post-paint useEffect.
  useLayoutEffect(() => {
    if (typeof window === "undefined") return;

    const reset = () => {
      try {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      } catch {
        window.scrollTo(0, 0);
      }
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
    };

    reset();
    // Second pass after the first paint, in case the new page renders
    // additional content asynchronously (route data, lazy components).
    const raf = requestAnimationFrame(reset);
    return () => cancelAnimationFrame(raf);
  }, [pathname, search]);

  return null;
}
