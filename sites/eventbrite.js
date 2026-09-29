/**
 * Adapter for eventbrite.com. Card selector and title source verified via
 * live Playwright DOM inspection of a real search results page (not
 * guessed, not read from a static/markdown fetch, which cannot see real
 * attributes at all). `a.event-card-link`'s aria-label ("View <title>") is a
 * plain, intentional-looking authoring convention; the card wrapper
 * (`section.discover-vertical-event-card`) was picked over Eventbrite's
 * surrounding hashed CSS-module classes (e.g. `Container_root__163eu`),
 * which are webpack build hashes likely to change on Eventbrite's next
 * deploy.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = "section.discover-vertical-event-card";
  const LINK_SELECTOR = "a.event-card-link";

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function titleFor(card) {
    const link = card.querySelector(LINK_SELECTOR);
    if (!link) return null;
    const label = link.getAttribute("aria-label") || link.textContent || "";
    return label.replace(/^View\s+/i, "").trim() || null;
  }

  window.CosmicJevAdapter = { findCards, titleFor };
})();
