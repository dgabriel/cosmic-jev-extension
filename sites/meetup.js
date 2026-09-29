/**
 * Adapter for meetup.com. Card selector and title source verified via live
 * Playwright DOM inspection of a real "Find Events" results page. The card
 * wrapper's `data-testid="categoryResults-eventCard"` is a real, intentional
 * authoring attribute (not a build hash), and every sampled card has an
 * `<h3>` with the plain event title, matching its image's `alt` text too.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = '[data-testid="categoryResults-eventCard"]';

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function titleFor(card) {
    const heading = card.querySelector("h3, h2");
    if (heading && heading.textContent.trim()) return heading.textContent.trim();
    const img = card.querySelector("img[alt]");
    return img ? img.getAttribute("alt").trim() || null : null;
  }

  window.CosmicJevAdapter = { findCards, titleFor };
})();
