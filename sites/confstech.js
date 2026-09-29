/**
 * Adapter for confs.tech (swapped in for 10times.com -- see docs/spec.md's
 * "sites supported" note: 10times sits behind a Cloudflare bot check that
 * blocked live DOM verification entirely).
 *
 * confs.tech has no data-testid or other non-hashed marker at all -- every
 * class on the page is a CSS-module hash. Card: `li[class^="ConferenceItem_ConferenceItem"]`
 * matches that class by *prefix* rather than its exact (build-hashed)
 * suffix, since CSS Modules conventionally keep that prefix stable across
 * rebuilds even as the hash changes.
 *
 * When/where: each card embeds a real `<script type="application/ld+json">`
 * schema.org Event object (confirmed via live inspection) with structured
 * `startDate`/`endDate`/`location.name` fields -- far more reliable than
 * scraping visible text, and this is the only one of the four sites that
 * offers it. Tags: a "Topics" `<dt>`'s sibling `<dd>` contains `<li>` topic
 * chips (e.g. "#graphql"), stripped of their leading "#". No price is shown
 * (these are conferences, not always ticketed on this page).
 */
(function () {
  "use strict";

  const CARD_SELECTOR = 'li[class^="ConferenceItem_ConferenceItem"]';

  function findCards(doc) {
    return [...doc.querySelectorAll(CARD_SELECTOR)];
  }

  function detailsFor(card) {
    const link = card.querySelector('a[href^="http"]');
    const title = link ? link.textContent.trim() || null : null;
    if (!title) return null;

    let when = null;
    let where = null;
    const script = card.querySelector('script[type="application/ld+json"]');
    if (script) {
      try {
        const data = JSON.parse(script.textContent);
        if (data.startDate) {
          when = data.endDate && data.endDate !== data.startDate ? `${data.startDate} to ${data.endDate}` : data.startDate;
        }
        if (data.location && data.location.name) where = data.location.name;
      } catch {
        // Malformed JSON-LD: leave when/where null rather than guess.
      }
    }

    const topicsDt = [...card.querySelectorAll("dt")].find((dt) => dt.textContent.trim() === "Topics");
    const topicsDd = topicsDt ? topicsDt.nextElementSibling : null;
    const tags = topicsDd
      ? [...topicsDd.querySelectorAll("li")].map((li) => li.textContent.replace(/^#/, "").trim()).filter(Boolean)
      : [];

    return { title, when, where, price: null, tags: tags.length > 0 ? tags : null };
  }

  window.CosmicJevAdapter = { findCards, detailsFor };
})();
