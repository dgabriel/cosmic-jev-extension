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
 *
 * Every card also gets a small brownie badge in its top-right corner:
 * brownie-check-small.png / brownie-x-small.png for a verdict (alongside the
 * colored outline), brownie-question-small.png for anything else (recusal,
 * needs-detail, no saved birthdate, or a call failure -- Jev's opinion is
 * unknown, not a specific yes/no). See content.css's .cosmic-jev-badge and
 * manifest.json's web_accessible_resources.
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

  function badgeIconForResponse(response) {
    if (response.kind !== "verdict") return "icons/brownie-question-small.png"; // recusal/needs-detail/no-birthdate/error: unknown
    return response.favor >= 0.5 ? "icons/brownie-check-small.png" : "icons/brownie-x-small.png";
  }

  function setBadge(card, iconPath) {
    let badge = card.querySelector(":scope > .cosmic-jev-badge");
    if (!iconPath) {
      if (badge) badge.remove();
      return;
    }
    if (!badge) {
      // The badge is positioned absolute relative to the card, so the card
      // needs its own positioning context -- most sites' cards are already
      // position:relative (or similar) for their own internal overlays, but
      // this doesn't assume that.
      if (getComputedStyle(card).position === "static") {
        card.style.position = "relative";
      }
      badge = document.createElement("img");
      badge.className = "cosmic-jev-badge";
      card.appendChild(badge);
    }
    badge.src = chrome.runtime.getURL(iconPath);
  }

  async function scoreCard(card, title) {
    setGlow(card, "cosmic-jev-glow-pending");
    let response = resultCache.get(title);
    if (!response) {
      response = await chrome.runtime.sendMessage({ type: "SCORE_EVENT", title });
      resultCache.set(title, response);
    }
    setGlow(card, glowForResponse(response));
    setBadge(card, badgeIconForResponse(response));
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
