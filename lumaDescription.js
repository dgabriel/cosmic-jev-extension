/**
 * Pulls a Luma event's (or calendar's) description out of its page's HTML,
 * so Jev can judge it on what it actually is, not just its title. Luma's
 * listing cards (city pages, /discover) never show an event's description,
 * so background.js fetches the page itself (host_permissions cover
 * lu.ma/luma.com) and hands the HTML here.
 *
 * Sources, verified against live pages (events luma.com/warp-yb7x and
 * luma.com/juntodinnersep30, calendars luma.com/philosophy and
 * luma.com/bkrun, 2026-09-30/10-01), all in the page's Next.js
 * `__NEXT_DATA__` JSON under props.pageProps.initialData.data:
 *  1. Event page: `description_mirror` -- the full description as a
 *     ProseMirror-style doc ({type, content[], text}).
 *  2. Calendar page (a recurring club/organizer, e.g. "The New York
 *     Philosophy Club"): `calendar.description_short` is often just a
 *     tagline ("Pursuing wisdom, together."), so the names of its next few
 *     `upcoming.entries[].event` are appended -- they're what actually say
 *     what the club does ("Philosophy at the Museum: South Asian Art").
 *  3. Fallback: `<meta name="description">`, which Luma truncates to ~200
 *     chars with "…" and omits on some events.
 * `__NEXT_DATA__` is Luma's internal page data, not a public API, so it can
 * change without notice -- hence the fallback.
 * Returns null when none of these is there. Plain string parsing (no DOMParser):
 * MV3 service workers don't have one.
 */
(function (root) {
  "use strict";

  /** Plenty for Jev to get the gist; keeps one wordy event from bloating the request. */
  const MAX_DESCRIPTION_CHARS = 2000;
  const BLOCK_TYPES = new Set(["paragraph", "heading", "list_item", "blockquote", "code_block"]);
  const MAX_UPCOMING_EVENTS = 5;

  function flattenDoc(node) {
    if (!node || typeof node !== "object") return "";
    if (node.type === "text" && typeof node.text === "string") return node.text;
    const inner = Array.isArray(node.content) ? node.content.map(flattenDoc).join("") : "";
    return BLOCK_TYPES.has(node.type) ? `${inner}\n` : inner;
  }

  function fromNextData(html) {
    const match = /<script id="__NEXT_DATA__" type="application\/json"[^>]*>([\s\S]*?)<\/script>/.exec(html);
    if (!match) return null;
    try {
      const data = JSON.parse(match[1]);
      const page = data && data.props && data.props.pageProps && data.props.pageProps.initialData &&
        data.props.pageProps.initialData.data;
      if (!page) return null;
      if (page.description_mirror) return flattenDoc(page.description_mirror);
      // Event pages carry a `calendar` too (the host's), but only calendar pages have `upcoming`.
      if (page.calendar && page.upcoming) return calendarSummary(page);
      return null;
    } catch {
      return null;
    }
  }

  function calendarSummary(page) {
    const lines = [];
    if (typeof page.calendar.description_short === "string") lines.push(page.calendar.description_short);
    const entries = page.upcoming && Array.isArray(page.upcoming.entries) ? page.upcoming.entries : [];
    const names = entries
      .map((entry) => entry && entry.event && entry.event.name)
      .filter((name) => typeof name === "string" && name.trim() !== "")
      .slice(0, MAX_UPCOMING_EVENTS);
    if (names.length > 0) lines.push(`Upcoming events: ${names.join("; ")}`);
    return lines.join("\n");
  }

  function decodeEntities(text) {
    return text
      .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
      .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)))
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&amp;/g, "&");
  }

  function fromMetaDescription(html) {
    const match = /<meta\s+name="description"\s+content="([^"]*)"/i.exec(html);
    return match ? decodeEntities(match[1]) : null;
  }

  function tidy(text) {
    const cleaned = text
      .replace(/​/g, "")
      .split("\n")
      .map((line) => line.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .join("\n");
    if (cleaned === "") return null;
    return cleaned.length > MAX_DESCRIPTION_CHARS ? `${cleaned.slice(0, MAX_DESCRIPTION_CHARS - 1)}…` : cleaned;
  }

  function extractLumaDescription(html) {
    return tidy(fromNextData(html) || "") || tidy(fromMetaDescription(html) || "");
  }

  root.LumaDescription = { extractLumaDescription, MAX_DESCRIPTION_CHARS };
  if (typeof module !== "undefined") module.exports = root.LumaDescription;
})(typeof self !== "undefined" ? self : globalThis);
