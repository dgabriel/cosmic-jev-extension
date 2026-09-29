/**
 * Talks to the already-deployed Cosmic JEV Worker (POST /api/decide) -- the
 * same one the main cosmic-jev site and its own extension use. No new
 * backend, no API key here (there never is one client-side; see the main
 * repo's worker/handler.ts). Loaded into background.js via importScripts --
 * this is the only file in this extension that touches the network.
 *
 * Question/criteria wording is copied verbatim from the main repo's
 * src/oracle-jev.ts (itself transcribed from docs/jev-openrouter.md /
 * docs/spec.md) -- not reinvented here.
 *
 * Unlike the main repo's JevOracle, this throws one plain Error for any
 * failure (network, non-2xx, malformed body) rather than a taxonomy of typed
 * error codes: the only thing any caller here does with a failure is skip
 * that event card (no glow), so there's no UI that would ever show a
 * specific error message to distinguish.
 */
(function (root) {
  "use strict";

  const WORKER_URL = "https://cosmic-oracle-worker.cosmic-oracle.workers.dev";
  const DECIDE_ROUTE = "/api/decide";

  const CATEGORY_CRITERIA = {
    Mars: "Sports, exercise, competition, confrontation, bold new starts.",
    Venus: "Romance, dating, art, beauty, fashion, socializing, treats.",
    Mercury: "Communication, writing, emails, short trips, tech, contracts.",
    Jupiter: "Learning, long travel, games of chance, celebrations.",
    Saturn: "Work, chores, commitments, long-term planning.",
    Moon: "Home, cooking, family, rest, self-care.",
    Sun: "Performance, creative self-expression, being the center of attention.",
  };

  const SENSITIVITY_CRITERIA = {
    violence_person:
      "Violence, harm, or aggression directed at a person or animal -- including the asker harming themselves " +
      "(self-harm, suicide, or wanting to end their own life). Always pick this over health/safety/legal if it applies.",
    safety: "A decision about physical safety or risk of injury, not otherwise about violence toward a person, animal, or object.",
    legal: "A decision with legal consequences: lawsuits, contracts with legal weight, breaking the law, legal advice.",
    health: "A decision about physical or mental health, medication, medical treatment, surgery, or diagnosis -- not self-harm.",
    money: "A significant financial decision: investing, borrowing, a loan or mortgage, savings, or debt.",
    relationship_ending: "A decision about ending a romantic relationship or marriage (breakup, divorce).",
    job_quitting: "A decision about quitting or resigning from a job.",
    violence_object:
      "Violence, force, or destruction directed only at an inanimate object or thing (e.g. smashing a printer) -- " +
      "never at a person or animal, and not self-harm.",
    none: "None of the above: an ordinary activity with no special real-life-consequence or safety concern.",
  };

  const INTENSITY_LEVELS = [
    "Barely a cosmic murmur",
    "A mild celestial nudge",
    "A noticeable planetary pull",
    "A strong astral push",
    "An overwhelming cosmic surge",
  ];

  function isRecord(value) {
    return typeof value === "object" && value !== null && !Array.isArray(value);
  }

  async function decide(body) {
    let response;
    try {
      response = await fetch(`${WORKER_URL}${DECIDE_ROUTE}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error("Could not reach the oracle.");
    }

    let json;
    try {
      json = await response.json();
    } catch {
      throw new Error("Oracle sent back something unreadable.");
    }

    if (!response.ok || !isRecord(json) || !isRecord(json.answers)) {
      throw new Error("Oracle could not answer.");
    }
    return json.answers;
  }

  async function classifyActivity(activityText) {
    const answers = await decide({
      state: activityText,
      questions: {
        category: { type: "choice", instructions: "Which celestial body rules this activity?", criteria: CATEGORY_CRITERIA },
        sensitivity: {
          type: "choice",
          instructions:
            "Classify this activity's sensitivity. Check for violence or harm to a person or animal (including self-harm) " +
            "first -- that always wins over every other category. Otherwise pick whichever single category best applies, " +
            "or 'none' if nothing applies.",
          criteria: SENSITIVITY_CRITERIA,
        },
        vague: { type: "noul", instructions: "Is this activity description too vague to categorize?" },
      },
    });

    const category = answers.category;
    const sensitivity = answers.sensitivity;
    const vague = answers.vague;
    if (
      !isRecord(category) || typeof category.choice !== "string" ||
      !isRecord(sensitivity) || typeof sensitivity.choice !== "string" ||
      !isRecord(vague) || typeof vague.noul !== "number"
    ) {
      throw new Error("Oracle sent back an unexpected classification shape.");
    }
    return { category: category.choice, sensitivity: sensitivity.choice, vague: vague.noul };
  }

  async function getVerdict(input) {
    const answers = await decide({
      state: {
        category: input.category,
        rulingBodyTransit: input.rulingBodyTransit,
        aspects: input.aspects,
        moonPhase: input.moonPhase,
        activityText: input.activityText,
      },
      questions: {
        favor: { type: "noul", instructions: "Do the stars favor this activity for this person today?" },
        intensity: {
          type: "score",
          instructions: "How intense are today's cosmic influences on this activity?",
          criteria: INTENSITY_LEVELS,
        },
      },
    });

    const favor = answers.favor;
    const intensity = answers.intensity;
    if (!isRecord(favor) || typeof favor.noul !== "number" || !isRecord(intensity) || typeof intensity.score !== "number") {
      throw new Error("Oracle sent back an unexpected verdict shape.");
    }
    const normalizedIntensity = Math.min(1, Math.max(0, intensity.score / (INTENSITY_LEVELS.length - 1)));
    return { favor: favor.noul, intensity: normalizedIntensity };
  }

  root.OracleClient = { classifyActivity, getVerdict };
})(typeof self !== "undefined" ? self : globalThis);
