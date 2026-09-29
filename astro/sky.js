/**
 * Real planetary positions for a given date. Ported and trimmed from Cosmic
 * JEV's src/sky.ts (see the main cosmic-jev repo) -- the ephemeris math
 * itself is unchanged, just re-expressed as plain JS with no framework.
 *
 * Depends on the global `Astronomy` object from vendor/astronomy-engine.js
 * (loaded first via importScripts in background.js, or via `require` below
 * when run from the Node smoke test in test/).
 */
/* global Astronomy */
(function (root) {
  "use strict";

  const Astro = typeof Astronomy !== "undefined" ? Astronomy : root.Astronomy;

  const TRANSIT_BODIES = ["Sun", "Moon", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];

  const ASTRONOMY_BODY = {
    Sun: Astro.Body.Sun,
    Moon: Astro.Body.Moon,
    Mercury: Astro.Body.Mercury,
    Venus: Astro.Body.Venus,
    Mars: Astro.Body.Mars,
    Jupiter: Astro.Body.Jupiter,
    Saturn: Astro.Body.Saturn,
  };

  // Sun and Moon are never reported retrograde: their apparent motion can
  // read as near-zero/ambiguous around stationary points, so the original
  // app hardcodes them as always direct rather than flag a meaningless flip.
  const NEVER_RETROGRADE = new Set(["Sun", "Moon"]);

  const ZODIAC_SIGNS = [
    "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
    "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
  ];

  const MOON_PHASE_NAMES = [
    "new", "waxing crescent", "first quarter", "waxing gibbous",
    "full", "waning gibbous", "last quarter", "waning crescent",
  ];

  function normalizeDegrees(angle) {
    const wrapped = angle % 360;
    return wrapped < 0 ? wrapped + 360 : wrapped;
  }

  // Normalizes a longitude delta to (-180, 180], so a naive subtraction
  // across the 360->0 wraparound (e.g. 359 -> 1) reads as +2, not -358.
  function normalizeLongitudeDelta(delta) {
    let d = delta % 360;
    if (d <= -180) d += 360;
    if (d > 180) d -= 360;
    return d;
  }

  function signForLongitude(longitude) {
    const normalized = normalizeDegrees(longitude);
    const index = Math.floor(normalized / 30);
    return { sign: ZODIAC_SIGNS[index], degreeInSign: normalized - index * 30 };
  }

  function eclipticLongitudeOfDate(astronomyBody, date) {
    const vector = Astro.GeoVector(astronomyBody, date, true);
    return normalizeDegrees(Astro.Ecliptic(vector).elon);
  }

  // Retrograde by comparing longitude at `date` against `date + 24h`: normal
  // (prograde) motion increases ecliptic longitude over time.
  function isRetrograde(bodyName, astronomyBody, date) {
    if (NEVER_RETROGRADE.has(bodyName)) return false;
    const lonNow = eclipticLongitudeOfDate(astronomyBody, date);
    const later = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    const lonLater = eclipticLongitudeOfDate(astronomyBody, later);
    return normalizeLongitudeDelta(lonLater - lonNow) < 0;
  }

  function positionForBody(bodyName, date) {
    const astronomyBody = ASTRONOMY_BODY[bodyName];
    const longitude = eclipticLongitudeOfDate(astronomyBody, date);
    const { sign, degreeInSign } = signForLongitude(longitude);
    return { body: bodyName, longitude, sign, degreeInSign, retrograde: isRetrograde(bodyName, astronomyBody, date) };
  }

  // Boundaries follow the conventional 8-phase split: each named phase spans
  // a 45deg arc centered on its cardinal angle (0/90/180/270 = new/first
  // quarter/full/last quarter).
  function moonPhaseName(phaseAngle) {
    const angle = normalizeDegrees(phaseAngle);
    if (angle < 22.5 || angle >= 337.5) return "new";
    if (angle < 67.5) return "waxing crescent";
    if (angle < 112.5) return "first quarter";
    if (angle < 157.5) return "waxing gibbous";
    if (angle < 202.5) return "full";
    if (angle < 247.5) return "waning gibbous";
    if (angle < 292.5) return "last quarter";
    return "waning crescent";
  }

  function computeTransitChart(date) {
    const bodies = {};
    for (const bodyName of TRANSIT_BODIES) {
      bodies[bodyName] = positionForBody(bodyName, date);
    }
    const moonPhaseAngle = normalizeDegrees(Astro.MoonPhase(date));
    return { date, bodies, moonPhaseAngle, moonPhase: moonPhaseName(moonPhaseAngle) };
  }

  const Sky = {
    TRANSIT_BODIES,
    normalizeDegrees,
    normalizeLongitudeDelta,
    signForLongitude,
    positionForBody,
    moonPhaseName,
    computeTransitChart,
  };

  root.Sky = Sky;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Sky;
  }
})(typeof self !== "undefined" ? self : globalThis);
