/**
 * Adapter for eventbrite.com. Card selector and title source verified via
 * live Playwright DOM inspection of real pages (not guessed, not read from a
 * static/markdown fetch, which cannot see real attributes at all). The card
 * wrapper (`section.discover-vertical-event-card`) is a plain, unhashed
 * class shared across page templates -- confirmed on both the homepage and
 * a `/d/{location}/events/` search page.
 *
 * Title source: a plain `<h3>` inside the card, present with the correct
 * text on both page templates (see git history for why -- an earlier
 * aria-label-based version broke on the homepage, where Eventbrite ships a
 * literal un-interpolated "View {eventName}" template string, a bug on
 * their end).
 *
 * When/where/price: the h3's nearest ancestor `<a>` is followed by two
 * `<p>` siblings (date, then venue) and then a price `<div>` (sometimes
 * after an empty `<span>`) -- confirmed structurally consistent across many
 * real cards regardless of the surrounding hashed CSS-module classes, which
 * is why this walks siblings by position/tag rather than matching a class.
 * No per-card tags/category are shown on an Eventbrite card, so `tags` is
 * always null here.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = "section.discover-vertical-event-card";

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function textOrNull(el) {
    if (!el) return null;
    const text = el.textContent.trim();
    return text || null;
  }

  function detailsFor(card) {
    const h3 = card.querySelector("h3");
    const title = textOrNull(h3);
    if (!title) return null;

    const anchor = h3.closest("a");
    const dateEl = anchor ? anchor.nextElementSibling : null;
    const venueEl = dateEl ? dateEl.nextElementSibling : null;
    let priceEl = venueEl ? venueEl.nextElementSibling : null;
    if (priceEl && priceEl.tagName === "SPAN") priceEl = priceEl.nextElementSibling;

    return {
      title,
      when: textOrNull(dateEl),
      where: textOrNull(venueEl),
      price: textOrNull(priceEl),
      tags: null,
    };
  }

  window.CosmicJevAdapter = { findCards, detailsFor };
})();
