/**
 * Natal chart: real planetary positions at UTC noon on a birthdate. Ported
 * and trimmed from Cosmic JEV's src/natal.ts -- this repo only ever asks for
 * a birthdate (see docs/spec.md's "what's cut" section), so there is no
 * birth time/location to compute an Ascendant or sign-cusp ambiguity from.
 * UTC noon matches the original app's own documented fallback for "no birth
 * time given."
 *
 * Depends on Sky (astro/sky.js), loaded first.
 */
/* global Sky */
(function (root) {
  "use strict";

  const S = typeof Sky !== "undefined" ? Sky : root.Sky;

  /**
   * @param {{year: number, month: number, day: number}} birthDate month is 1-12
   */
  function computeNatalChart(birthDate) {
    const instant = new Date(Date.UTC(birthDate.year, birthDate.month - 1, birthDate.day, 12, 0, 0));
    const bodies = {};
    for (const bodyName of S.TRANSIT_BODIES) {
      bodies[bodyName] = S.positionForBody(bodyName, instant);
    }
    return { date: birthDate, instant, bodies };
  }

  const Natal = { computeNatalChart };

  root.Natal = Natal;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Natal;
  }
})(typeof self !== "undefined" ? self : globalThis);
