/**
 * Adapter for meetup.com. Card selector and title source verified via live
 * Playwright DOM inspection of a real "Find Events" results page. The card
 * wrapper's `data-testid="categoryResults-eventCard"` is a real, intentional
 * authoring attribute (not a build hash), and every sampled card has an
 * `<h3>` with the plain event title, matching its image's `alt` text too.
 *
 * When: a semantic `<time>` element -- reliable regardless of any class
 * hashing, since it depends on no class at all. Where: Meetup cards don't
 * show a physical venue, only the hosting group's name as a "by <group>"
 * `<div>`, used here as a best-effort proxy. No price or tags are shown on
 * a Meetup card.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = '[data-testid="categoryResults-eventCard"]';

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function textOrNull(el) {
    if (!el) return null;
    const text = el.textContent.trim();
    return text || null;
  }

  function detailsFor(card) {
    const heading = card.querySelector("h3, h2");
    let title = textOrNull(heading);
    if (!title) {
      const img = card.querySelector("img[alt]");
      title = img ? (img.getAttribute("alt").trim() || null) : null;
    }
    if (!title) return null;

    const time = card.querySelector("time");
    const byGroupDiv = [...card.querySelectorAll("div")].find((d) => /^by\s+/i.test(d.textContent.trim()));

    return {
      title,
      when: textOrNull(time),
      where: byGroupDiv ? byGroupDiv.textContent.trim().replace(/^by\s+/i, "") || null : null,
      price: null,
      tags: null,
    };
  }

  window.CosmicJevAdapter = { findCards, detailsFor };
})();
