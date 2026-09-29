/**
 * Adapter for lu.ma. Card selector and title source verified via live
 * Playwright DOM inspection of a real city events page (after scrolling, to
 * catch lazily-rendered cards). `.content-card` is the visible card
 * container; the nested `a.event-link` is a same-sized overlay link whose
 * `aria-label` carries the plain event title, confirmed 1:1 with the visible
 * cards on the page.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = ".content-card";
  const LINK_SELECTOR = "a.event-link";

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function titleFor(card) {
    const link = card.querySelector(LINK_SELECTOR);
    if (!link) return null;
    const label = link.getAttribute("aria-label");
    return label ? label.trim() || null : null;
  }

  window.CosmicJevAdapter = { findCards, titleFor };
})();
