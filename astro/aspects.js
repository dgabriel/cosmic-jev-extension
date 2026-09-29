/**
 * Aspects between today's transiting bodies and the natal Sun/Moon. Ported
 * and trimmed from Cosmic JEV's src/aspects.ts -- unlike the original, the
 * natal Moon here is never "ambiguous" (this repo has no birth-time
 * ambiguity concept at all, see astro/natal.js), so aspects are always
 * computed against both Sun and Moon, with no conditional.
 *
 * Depends on Sky (astro/sky.js), loaded first.
 */
/* global Sky */
(function (root) {
  "use strict";

  const S = typeof Sky !== "undefined" ? Sky : root.Sky;

  const ASPECT_TYPES = ["conjunction", "sextile", "square", "trine", "opposition"];
  const NATAL_POINTS = ["Sun", "Moon"];

  const ASPECT_ANGLES = { conjunction: 0, sextile: 60, square: 90, trine: 120, opposition: 180 };

  // Transit-to-natal-point orbs. Widened to 2x the original cosmic-jev
  // values (conjunction/opposition: 3->6, square/trine: 2->4, sextile: 1->2)
  // so more aspects actually show up per request -- for this demo, more
  // signal for Jev to reason about is worth more than the tighter orb's
  // precision. Still comfortably under half the 60deg minimum gap between
  // aspect angles, so no two aspect types can ever overlap into ambiguity.
  const ASPECT_ORBS = { conjunction: 6, opposition: 6, square: 4, trine: 4, sextile: 2 };

  const TWENTY_FOUR_HOURS_MILLIS = 24 * 60 * 60 * 1000;

  function angularSeparation(lonA, lonB) {
    return Math.abs(S.normalizeLongitudeDelta(lonA - lonB));
  }

  // At most one aspect type can match: the five aspect angles are each at
  // least 60deg apart and every orb above is well under half that gap.
  function aspectForSeparation(separation) {
    for (const aspect of ASPECT_TYPES) {
      const orb = Math.abs(separation - ASPECT_ANGLES[aspect]);
      if (orb <= ASPECT_ORBS[aspect]) return { aspect, orb };
    }
    return null;
  }

  function isApplying(orbNow, orbLater) {
    return orbLater < orbNow;
  }

  function computeAspects(transits, natal) {
    const later = new Date(transits.date.getTime() + TWENTY_FOUR_HOURS_MILLIS);
    const aspects = [];

    for (const transitBody of S.TRANSIT_BODIES) {
      const transitLongitudeNow = transits.bodies[transitBody].longitude;

      for (const natalPoint of NATAL_POINTS) {
        const natalLongitude = natal.bodies[natalPoint].longitude;
        const separationNow = angularSeparation(transitLongitudeNow, natalLongitude);
        const match = aspectForSeparation(separationNow);
        if (!match) continue;

        const transitLongitudeLater = S.positionForBody(transitBody, later).longitude;
        const separationLater = angularSeparation(transitLongitudeLater, natalLongitude);
        const orbLater = Math.abs(separationLater - ASPECT_ANGLES[match.aspect]);

        aspects.push({
          transit: transitBody,
          natal: natalPoint,
          aspect: match.aspect,
          orb: match.orb,
          applying: isApplying(match.orb, orbLater),
        });
      }
    }
    return aspects;
  }

  const Aspects = { angularSeparation, aspectForSeparation, isApplying, computeAspects };

  root.Aspects = Aspects;
  if (typeof module !== "undefined" && module.exports) {
    module.exports = Aspects;
  }
})(typeof self !== "undefined" ? self : globalThis);
