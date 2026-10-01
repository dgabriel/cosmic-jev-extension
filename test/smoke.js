#!/usr/bin/env node
/**
 * Framework-free smoke test for astro/*.js against real, cited reference
 * values -- not a full suite, just enough to catch the one thing that would
 * be silently wrong if the ephemeris math were broken. Sources are the same
 * ones already cited and verified in the main cosmic-jev repo's
 * src/sky.reference.test.ts:
 *
 *  A. Wikipedia, "March equinox" (astronomical almanac data table): March
 *     equinox 2024 = 2024-03-20T03:07 UTC -- the Sun's geocentric tropical
 *     ecliptic longitude crosses 360deg -> 0deg (Pisces -> Aries).
 *  B. Cafe Astrology dated event pages (published retrograde calendar):
 *     Mercury stations retrograde 2024-04-01T22:14Z at 27.217deg Aries;
 *     stations direct 2024-04-25T12:54Z at 15.983deg Aries (the whole cycle
 *     stayed within Aries).
 *
 * Run with: node test/smoke.js  (requires `npm install` once, for the real
 * astronomy-engine package this reads from -- NOT the vendored copy the
 * extension itself uses, see vendor/astronomy-engine.min.js's own header).
 */
"use strict";

global.Astronomy = require("astronomy-engine");
const Sky = require("../astro/sky.js");
require("../astro/natal.js");
require("../astro/aspects.js");
const Natal = global.Natal;
const Aspects = global.Aspects;

let failures = 0;

function check(name, actual, expected) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) {
    failures++;
    console.error(`FAIL ${name}\n  expected: ${JSON.stringify(expected)}\n  actual:   ${JSON.stringify(actual)}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

function checkRange(name, actual, min, maxExclusive) {
  const ok = actual >= min && actual < maxExclusive;
  if (!ok) {
    failures++;
    console.error(`FAIL ${name}\n  expected: [${min}, ${maxExclusive})\n  actual:   ${actual}`);
  } else {
    console.log(`ok   ${name}`);
  }
}

// --- Source A: March 2024 equinox (Sun crosses Pisces -> Aries at 03:07Z) ---

{
  // ~15h before the crossing: safely on the Pisces side.
  const chart = Sky.computeTransitChart(new Date("2024-03-19T12:00:00Z"));
  check("Sun sign well before the equinox is Pisces", chart.bodies.Sun.sign, "Pisces");
  checkRange("Sun longitude well before the equinox is in (350, 360)", chart.bodies.Sun.longitude, 350, 360);
}
{
  // ~33h after the crossing: safely on the Aries side.
  const chart = Sky.computeTransitChart(new Date("2024-03-21T12:00:00Z"));
  check("Sun sign well after the equinox is Aries", chart.bodies.Sun.sign, "Aries");
  checkRange("Sun longitude well after the equinox is in [0, 10)", chart.bodies.Sun.longitude, 0, 10);
}

// --- Source B: Mercury retrograde in Aries, spring 2024 ---

{
  // ~9 days after the Apr 1 retrograde station, ~15 days before the Apr 25
  // direct station: comfortably inside the window.
  const chart = Sky.computeTransitChart(new Date("2024-04-10T00:00:00Z"));
  check("Mercury is retrograde mid-window", chart.bodies.Mercury.retrograde, true);
  check("Mercury sign mid-window is Aries", chart.bodies.Mercury.sign, "Aries");
}
{
  // ~11h15m after the Apr 25 12:54Z direct station: comfortably clear of the
  // turn itself.
  const chart = Sky.computeTransitChart(new Date("2024-04-26T00:00:00Z"));
  check("Mercury is direct just after the station", chart.bodies.Mercury.retrograde, false);
  check("Mercury sign just after the station is still Aries", chart.bodies.Mercury.sign, "Aries");
}

// --- Structural sanity for natal.js / aspects.js (no external citation
// needed: these just check internal self-consistency, same as the original
// repo's sky.test.ts/natal.test.ts/aspects.test.ts "mechanical" tests) ---

{
  const natal = Natal.computeNatalChart({ year: 1990, month: 7, day: 4 });
  check("natal chart resolves to UTC noon on the given date", natal.instant.toISOString(), "1990-07-04T12:00:00.000Z");
  check("natal chart has all seven bodies", Object.keys(natal.bodies).sort(), [...Sky.TRANSIT_BODIES].sort());

  const transits = Sky.computeTransitChart(new Date("2024-04-10T00:00:00Z"));
  const aspects = Aspects.computeAspects(transits, natal);
  check("every returned aspect is within its own orb", aspects.every((a) => a.orb <= 6), true);
  check(
    "every returned aspect is to the natal Sun or Moon only",
    aspects.every((a) => a.natal === "Sun" || a.natal === "Moon"),
    true,
  );
}

// Luma event-page description extraction (lumaDescription.js). Fixtures are
// trimmed copies of the shapes seen on live pages (luma.com/warp-yb7x,
// luma.com/juntodinnersep30, 2026-09-30): the __NEXT_DATA__ description_mirror
// doc, and the truncated meta description fallback.
{
  const { extractLumaDescription, MAX_DESCRIPTION_CHARS } = require("../lumaDescription.js");
  const nextData = {
    props: {
      pageProps: {
        initialData: {
          data: {
            description_mirror: {
              type: "doc",
              content: [
                { type: "paragraph", content: [{ type: "text", text: "Wine and " }, { type: "text", text: "poker", marks: [{ type: "bold" }] }, { type: "text", text: " night." }] },
                { type: "heading", attrs: { level: 2 }, content: [{ type: "text", text: "\u200b\u200bWhat to expect:" }] },
                { type: "bullet_list", content: [{ type: "list_item", content: [{ type: "paragraph", content: [{ type: "text", text: "Cards" }] }] }] },
              ],
            },
          },
        },
      },
    },
  };
  const page = `<meta name="description" content="Short &amp; truncated…"/><script id="__NEXT_DATA__" type="application/json">${JSON.stringify(nextData)}</script>`;
  check("luma: full description from __NEXT_DATA__, one line per block", extractLumaDescription(page), "Wine and poker night.\nWhat to expect:\nCards");
  check("luma: falls back to the meta description", extractLumaDescription(`<meta name="description" content="Wine &amp; poker &quot;night&quot;…">`), 'Wine & poker "night"…');
  check("luma: null when the page has neither", extractLumaDescription("<html></html>"), null);
  const calendarPage = (data) =>
    `<meta name="description" content="View and follow events from X on Luma."><script id="__NEXT_DATA__" type="application/json">${JSON.stringify({ props: { pageProps: { initialData: { data } } } })}</script>`;
  check(
    "luma: calendar page -> tagline plus upcoming event names",
    extractLumaDescription(
      calendarPage({
        calendar: { name: "The New York Philosophy Club", description_short: "Pursuing wisdom, together." },
        upcoming: { entries: [{ event: { name: "Philosophy at the Museum: South Asian Art" } }, { event: { name: "Midtown East" } }] },
      }),
    ),
    "Pursuing wisdom, together.\nUpcoming events: Philosophy at the Museum: South Asian Art; Midtown East",
  );
  check(
    "luma: an event page without a description doesn't borrow its host calendar's",
    extractLumaDescription(calendarPage({ calendar: { description_short: "Host tagline" }, event: { name: "E" } })),
    "View and follow events from X on Luma.",
  );
  const longPage = `<meta name="description" content="${"x".repeat(5000)}">`;
  check("luma: long descriptions are capped", extractLumaDescription(longPage).length, MAX_DESCRIPTION_CHARS);
}

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll smoke checks passed.");
