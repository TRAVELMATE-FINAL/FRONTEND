import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/**
 * ScrollToTop
 * -----------
 * React Router v6 keeps the browser's scroll position when you navigate
 * between routes, and browsers also do their own scroll restoration on
 * history changes. Together that's why the next page can appear mid-scroll.
 *
 * This resets the scroll to the very top on EVERY navigation (PUSH, POP
 * back/forward, and REPLACE), before paint, and again shortly after — to
 * also catch pages whose content grows asynchronously (data/images) after
 * the first reset.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();
  const navType = useNavigationType(); // PUSH | POP | REPLACE

  // Stop the browser from auto-restoring the previous scroll offset.
  useEffect(() => {
    if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

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

    // Before paint.
    reset();
    // After first paint.
    const raf = requestAnimationFrame(reset);
    // After async content may have shifted layout.
    const t1 = setTimeout(reset, 60);
    const t2 = setTimeout(reset, 200);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname, search, navType]);

  return null;
}
