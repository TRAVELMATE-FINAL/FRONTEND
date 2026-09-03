import { useEffect, useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";
import { scrollAllToTopPersistent } from "../../utils/scrollToTop";

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
    // Reset the real scroll container (#root) before paint, next frame, and a
    // few times after — see utils/scrollToTop for details.
    return scrollAllToTopPersistent();
  }, [pathname, search, navType]);

  return null;
}
