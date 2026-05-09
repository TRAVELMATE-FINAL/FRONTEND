import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * ScrollToTop
 * -----------
 * React Router v6 keeps the browser's scroll position when you navigate
 * between routes — so jumping from a long Findfriend list to a short
 * RideDetail page can leave you stranded mid-page. Mounting this
 * component once inside <BrowserRouter> makes every navigation start at
 * the top of the new page (0,0), right under the sticky Header.
 *
 * • Uses `behavior: "auto"` so the jump is instant — no jarring smooth
 *   scroll mid-transition.
 * • Listens to both `pathname` and `search` so query-only changes (e.g.
 *   /find-friend?from=…&to=…) also reset the scroll position.
 */
export default function ScrollToTop() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // Try the smoothest available path first; fall back to legacy.
    if (typeof window === "undefined") return;
    try {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {
      window.scrollTo(0, 0);
    }
    // Some pages have an inner scroll container (e.g. fixed-height main).
    // Reset the document element + body too so we always end up at the top.
    if (document.documentElement) document.documentElement.scrollTop = 0;
    if (document.body) document.body.scrollTop = 0;
  }, [pathname, search]);

  return null;
}
