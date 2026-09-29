/**
 * Adapter for lu.ma. Verified via live Playwright DOM inspection across TWO
 * different real page templates, since they turned out to differ (the same
 * bug class as the Eventbrite homepage-vs-search-page mismatch, see that
 * adapter's own header comment):
 *  - A city page (e.g. lu.ma/sf): cards are `.content-card` divs, each
 *    wrapping a same-sized overlay `a.event-link` whose `aria-label` carries
 *    the plain title.
 *  - lu.ma/discover: `.content-card` also exists on this page, but for
 *    calendar/category tiles, NOT individual events -- real events here are
 *    plain `div.event-row` containers with no `.content-card` ancestor at
 *    all, though they still use the exact same `a.event-link[aria-label]`
 *    convention for the title.
 *
 * So rather than searching for a specific card wrapper class (which isn't
 * consistent across templates), this finds every `a.event-link` on the page
 * first, then uses its `.content-card` ancestor if one exists, falling back
 * to its immediate parent otherwise -- covering both templates uniformly.
 *
 * When: a `<span>` matched by a time-of-day text pattern (not anchored, so
 * it matches both a bare "4:30 PM" and a prefixed "Today, 5:30 PM"),
 * regardless of any class, since Luma's classes are hash-suffixed. Where:
 * the first `<div>` in the card that isn't the title itself, an organizer
 * ("By <name>"), or a known status word ("Near Capacity" etc.) --
 * best-effort, since Luma doesn't mark location with any distinct attribute
 * on either template. No price or tags are shown on a Luma card.
 */
(function () {
  "use strict";

  const LINK_SELECTOR = "a.event-link";
  const TIME_PATTERN = /\d{1,2}:\d{2}\s*(AM|PM)/i;
  const STATUS_WORDS = new Set(["Near Capacity", "Waitlist", "Sold Out", "Just Added"]);

  function findCards(doc) {
    const cards = new Set();
    for (const link of doc.querySelectorAll(LINK_SELECTOR)) {
      cards.add(link.closest(".content-card") || link.parentElement);
    }
    return [...cards].filter(Boolean);
  }

  function detailsFor(card) {
    const link = card.querySelector(LINK_SELECTOR);
    const rawLabel = link ? link.getAttribute("aria-label") : null;
    const title = rawLabel ? rawLabel.trim() || null : null;
    if (!title) return null;

    const spans = [...card.querySelectorAll("span")].map((s) => s.textContent.trim());
    const when = spans.find((text) => TIME_PATTERN.test(text)) || null;

    // Leaf divs only (no element children): a wrapping div's own textContent
    // recursively concatenates every descendant's text (title + organizer +
    // location all run together), which would otherwise pass this same
    // filter and get picked as "where" before reaching the real, specific one.
    const divs = [...card.querySelectorAll("div")]
      .filter((d) => d.children.length === 0)
      .map((d) => d.textContent.trim())
      .filter(Boolean);
    const where =
      divs.find((text) => text !== title && !/^by\s+/i.test(text) && !STATUS_WORDS.has(text) && text !== "​") || null;

    return { title, when, where, price: null, tags: null };
  }

  window.CosmicJevAdapter = { findCards, detailsFor };
})();
