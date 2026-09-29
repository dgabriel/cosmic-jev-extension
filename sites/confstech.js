/**
 * Adapter for confs.tech (swapped in for 10times.com -- see docs/spec.md's
 * "sites supported" note: 10times.com sits behind a Cloudflare bot check
 * that blocked live DOM verification entirely, and this project's own rule
 * is to verify selectors against a real page, never guess them).
 *
 * confs.tech has no data-testid or other non-hashed marker at all -- every
 * class on the page is a CSS-module hash (e.g. `ConferenceItem_ConferenceItem__orfQz`).
 * This uses a *prefix* match on that class (`[class^="ConferenceItem_ConferenceItem"]`)
 * rather than the exact hash: CSS Modules typically keep the human-readable
 * component-name prefix stable across builds and only rehash the short
 * suffix, so this is meaningfully more durable than matching the literal
 * class, though still less stable than a real `data-testid` would be. Card
 * selector and title source verified via live Playwright DOM inspection
 * (183 matching cards on a real load, each with a clean title).
 */
(function () {
  "use strict";

  const CARD_SELECTOR = 'li[class^="ConferenceItem_ConferenceItem"]';

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function titleFor(card) {
    const link = card.querySelector('a[href^="http"]');
    return link ? link.textContent.trim() || null : null;
  }

  window.CosmicJevAdapter = { findCards, titleFor };
})();
