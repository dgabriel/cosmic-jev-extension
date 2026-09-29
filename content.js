/**
 * Content script: finds event cards using whichever site adapter matched
 * this page (see sites/*.js, loaded before this file per-site in
 * manifest.json) and glows each one green/red based on background.js's
 * verdict. Classic script, no imports, no network access of its own (MV3
 * content scripts can't bypass CORS the way the background service worker
 * can -- see background.js's own comment).
 *
 * Scoring is lazy (IntersectionObserver: only once a card is near the
 * viewport) and cached per event title, since real Jev calls cost real
 * money and share a per-IP spend cap with the main site. A MutationObserver
 * picks up cards added later by infinite scroll.
 */
(function () {
  "use strict";

  const adapter = window.CosmicJevAdapter;
  if (!adapter) return;

  const GLOW_CLASSES = ["cosmic-jev-glow-green", "cosmic-jev-glow-red", "cosmic-jev-glow-neutral", "cosmic-jev-glow-pending"];
  const resultCache = new Map(); // title -> response
  const seenCards = new WeakSet();

  function setGlow(card, className) {
    card.classList.remove(...GLOW_CLASSES);
    if (className) card.classList.add(className);
  }

  function glowForResponse(response) {
    if (response.kind === "verdict") {
      return response.favor >= 0.5 ? "cosmic-jev-glow-green" : "cosmic-jev-glow-red";
    }
    return null; // recusal / needs-detail / no-birthdate / error: no opinion shown
  }

  async function scoreCard(card, title) {
    setGlow(card, "cosmic-jev-glow-pending");
    let response = resultCache.get(title);
    if (!response) {
      response = await chrome.runtime.sendMessage({ type: "SCORE_EVENT", title });
      resultCache.set(title, response);
    }
    setGlow(card, glowForResponse(response));
  }

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        const title = adapter.titleFor(entry.target);
        if (title) scoreCard(entry.target, title);
      }
    },
    { rootMargin: "200px" },
  );

  function watchNewCards() {
    for (const card of adapter.findCards(document)) {
      if (seenCards.has(card)) continue;
      seenCards.add(card);
      observer.observe(card);
    }
  }

  watchNewCards();
  new MutationObserver(watchNewCards).observe(document.body, { childList: true, subtree: true });
})();
