/**
 * Adapter for lu.ma. Card selector and title source verified via live
 * Playwright DOM inspection of a real city events page (after scrolling, to
 * catch lazily-rendered cards). `.content-card` is the visible card
 * container; the nested `a.event-link` is a same-sized overlay link whose
 * `aria-label` carries the plain event title, confirmed 1:1 with the visible
 * cards on the page.
 *
 * When: the card's start-time `<span>`, matched by a plain "H:MM AM/PM"
 * text pattern rather than any class, since Luma's classes are also
 * hash-suffixed. Where: the first non-organizer, non-status `<div>` inside
 * the card (organizer divs start with "By "; status divs like "Near
 * Capacity"/"Waitlist" are excluded by an explicit list) -- best-effort,
 * since Luma doesn't mark location with any distinct attribute either. No
 * price or tags are shown on a Luma card.
 */
(function () {
  "use strict";

  const CARD_SELECTOR = ".content-card";
  const LINK_SELECTOR = "a.event-link";
  const TIME_PATTERN = /^\d{1,2}:\d{2}\s*(AM|PM)$/i;
  const STATUS_WORDS = new Set(["Near Capacity", "Waitlist", "Sold Out", "Just Added"]);

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function detailsFor(card) {
    const link = card.querySelector(LINK_SELECTOR);
    const rawLabel = link ? link.getAttribute("aria-label") : null;
    const title = rawLabel ? rawLabel.trim() || null : null;
    if (!title) return null;

    const spans = [...card.querySelectorAll("span")].map((s) => s.textContent.trim());
    const when = spans.find((text) => TIME_PATTERN.test(text)) || null;

    const divs = [...card.querySelectorAll("div")].map((d) => d.textContent.trim()).filter(Boolean);
    const where = divs.find((text) => !/^by\s+/i.test(text) && !STATUS_WORDS.has(text) && text !== "​") || null;

    return { title, when, where, price: null, tags: null };
  }

  window.CosmicJevAdapter = { findCards, detailsFor };
})();
