/**
 * Pulls a Luma event's description out of its event page's HTML, so Jev can
 * judge the event on what it actually is, not just its title. Luma's listing
 * cards (city pages, /discover) never show the description, so
 * background.js fetches the event page itself (host_permissions cover
 * lu.ma/luma.com) and hands the HTML here.
 *
 * Two sources, verified against live event pages (luma.com/warp-yb7x,
 * luma.com/juntodinnersep30, 2026-09-30):
 *  1. The page's Next.js `__NEXT_DATA__` JSON, at
 *     props.pageProps.initialData.data.description_mirror -- the full
 *     description as a ProseMirror-style doc ({type, content[], text}).
 *     Preferred: it's complete. It's also Luma's internal page data, not a
 *     public API, so it can change without notice -- hence the fallback.
 *  2. `<meta name="description">`, which Luma truncates to ~200 chars with
 *     "…", and omits entirely on some events.
 * Returns null when neither is there. Plain string parsing (no DOMParser):
 * MV3 service workers don't have one.
 */
(function (root) {
  "use strict";

  /** Plenty for Jev to get the gist; keeps one wordy event from bloating the request. */
  const MAX_DESCRIPTION_CHARS = 2000;
  const BLOCK_TYPES = new Set(["paragraph", "heading", "list_item", "blockquote", "code_block"]);

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
      const doc = data && data.props && data.props.pageProps && data.props.pageProps.initialData &&
        data.props.pageProps.initialData.data && data.props.pageProps.initialData.data.description_mirror;
      return doc ? flattenDoc(doc) : null;
    } catch {
      return null;
    }
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
