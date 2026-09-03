// utils/scrollToTop.js
// ---------------------------------------------------------------------------
// Single source of truth for "jump to the top of the page".
//
// This app renders inside #root, which is itself the scrolling element
// (overflow-y: auto; height: 100vh) on BOTH desktop and mobile — the window /
// <html> / <body> do not scroll. So window.scrollTo(0,0) alone does nothing;
// the scroll actually lives on #root. Reset every candidate to be safe.
//
// Used by the route-level <ScrollToTop> and by multi-step forms (e.g. Post
// Ride) that change "page" via internal state without a route change.
// ---------------------------------------------------------------------------
export function scrollAllToTop() {
  if (typeof window === "undefined") return;
  try {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  } catch {
    window.scrollTo(0, 0);
  }
  if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
  if (document.documentElement) document.documentElement.scrollTop = 0;
  if (document.body) document.body.scrollTop = 0;
  // The real scroll container in this app.
  const rootEl = document.getElementById("root");
  if (rootEl) {
    rootEl.scrollTop = 0;
    rootEl.scrollLeft = 0;
  }
  // Any explicitly-marked nested scroll wrapper.
  document.querySelectorAll("[data-scroll-container]").forEach((el) => {
    el.scrollTop = 0;
    el.scrollLeft = 0;
  });
}

// Run the reset now, again next frame, and a few times after — to out-last
// async content growth and any smooth-scroll animation carrying over.
export function scrollAllToTopPersistent() {
  scrollAllToTop();
  const raf = requestAnimationFrame(scrollAllToTop);
  const t1 = setTimeout(scrollAllToTop, 60);
  const t2 = setTimeout(scrollAllToTop, 200);
  const t3 = setTimeout(scrollAllToTop, 400);
  return () => {
    cancelAnimationFrame(raf);
    clearTimeout(t1);
    clearTimeout(t2);
    clearTimeout(t3);
  };
}
