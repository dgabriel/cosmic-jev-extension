/**
 * Adapter for eventbrite.com. Card selector and title source verified via
 * live Playwright DOM inspection of real pages (not guessed, not read from a
 * static/markdown fetch, which cannot see real attributes at all). The card
 * wrapper (`section.discover-vertical-event-card`) is a plain, unhashed
 * class shared across page templates -- confirmed on both the homepage and
 * a `/d/{location}/events/` search page.
 *
 * Title source: a plain `<h3>` inside the card, present with the correct
 * text on both page templates. An earlier version of this file read the
 * title link's `aria-label` instead ("View <title>") -- that worked on a
 * search page, but on the plain eventbrite.com homepage every card's
 * aria-label is a literal, un-interpolated template string
 * ("View {eventName}"), a real bug on Eventbrite's own end, not a timing
 * issue (confirmed it doesn't resolve even after a 10s wait). The `<h3>`
 * always has the real, correct text on both templates, and depends on no
 * class name at all -- switched to it entirely rather than adding a
 * fallback for the broken case.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = "section.discover-vertical-event-card";

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function titleFor(card) {
    const heading = card.querySelector("h3");
    return heading ? heading.textContent.trim() || null : null;
  }

  window.CosmicJevAdapter = { findCards, titleFor };
})();
