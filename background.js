/**
 * Background service worker: the only place this extension talks to the
 * network (a MV3 service worker with host_permissions bypasses CORS the way
 * a content script's own fetch can't). Classic (non-module) worker --
 * importScripts, not ES `import`, so nothing here needs a bundler.
 *
 * Routing priority (violence_person/safety/legal recuse; vague asks for more
 * detail; health/money/relationship_ending/job_quitting proceed with a
 * disclaimer flag) mirrors the main cosmic-jev repo's src/oracle.ts `route()`
 * -- reimplemented here directly since duplicating one ~15-line function is
 * simpler than sharing code across two repos.
 *
 * Call 2 (verdict) is deliberately given the whole chart (all 7 bodies'
 * natal + transit positions, the full unfiltered aspect list) and whatever
 * event details the page's adapter could find, rather than a pre-narrowed
 * slice -- see oracleClient.js's own header comment for the full reasoning.
 * `category` from Call 1 still drives our own routing/disclaimer decision
 * and the popover's displayed category, it's just not handed to Call 2 as a
 * hint.
 */
importScripts(
  "vendor/astronomy-engine.min.js",
  "astro/sky.js",
  "astro/natal.js",
  "astro/aspects.js",
  "storage.js",
  "oracleClient.js",
);

const VAGUE_THRESHOLD = 0.75; // matches cosmic-jev's src/oracle.ts
const RECUSAL_SENSITIVITIES = new Set(["violence_person", "safety", "legal"]);
const DISCLAIMER_SENSITIVITIES = new Set(["health", "money", "relationship_ending", "job_quitting"]);

function route(classification) {
  if (RECUSAL_SENSITIVITIES.has(classification.sensitivity)) {
    return { kind: "recusal" };
  }
  if (classification.vague >= VAGUE_THRESHOLD) {
    return { kind: "needs-detail" };
  }
  return {
    kind: "proceed",
    category: classification.category,
    disclaimer: DISCLAIMER_SENSITIVITIES.has(classification.sensitivity),
  };
}

/**
 * The deadpan explanation sentence shown in the badge's hover popover, in
 * the same spirit as cosmic-jev's src/explain.ts (trimmed to what this
 * extension actually has: no ambiguity/disclaimer wording, since this repo
 * has no birth-time-based ambiguity concept -- see astro/natal.js). Now also
 * breaks out the two independent sub-scores (chart fit vs. today's timing)
 * that Call 2 asks for separately, alongside the ruling body's own position.
 */
function describeAspects(aspects) {
  const parts = aspects.map((a) => `${a.aspect} your natal ${a.natal}`);
  if (parts.length === 0) return "";
  if (parts.length === 1) return `, ${parts[0]}`;
  return `, ${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
}

function explainVerdict(category, rulingBodyTransit, aspectsForCategory, verdict) {
  const motion = rulingBodyTransit.retrograde ? "retrograde" : "direct";
  const verdictWord = verdict.favor >= 0.5 ? "endorses" : "is skeptical of";
  return (
    `Ruled by ${category}. ${category} is ${motion} in ${rulingBodyTransit.sign}${describeAspects(aspectsForCategory)}. ` +
    `The cosmos ${verdictWord} this (p = ${verdict.favor.toFixed(2)}). ` +
    `Chart fit ${verdict.chartFit.toFixed(2)}, today's timing ${verdict.timingFit.toFixed(2)}.`
  );
}

const REASON_FOR_KIND = {
  recusal: "The stars recommend therapy for this one.",
  "needs-detail": "Too vague to categorize -- Jev needs more detail.",
  "no-birthdate": "Set your birthdate in the extension popup to get a real verdict.",
};

/** `details`: `{ title, when, where, price, tags }` from the page's site adapter. */
async function scoreEvent(details) {
  const birthdate = await Storage.loadBirthdate();
  if (!birthdate) {
    return { kind: "no-birthdate", reason: REASON_FOR_KIND["no-birthdate"] };
  }

  try {
    const natal = Natal.computeNatalChart(birthdate);
    // Each event is its own independent "does the sky favor this, today"
    // question, same as the main app/its own extension.
    const transits = Sky.computeTransitChart(new Date());

    const classification = await OracleClient.classifyActivity(details);
    const decision = route(classification);

    if (decision.kind === "recusal" || decision.kind === "needs-detail") {
      return { kind: decision.kind, reason: REASON_FOR_KIND[decision.kind] };
    }

    // The full, unfiltered aspect list (all 7 transiting bodies vs. natal
    // Sun/Moon) goes to Jev; this filtered copy is only for the popover's
    // own explanation sentence, which still talks about the ruling body
    // specifically.
    const allAspects = Aspects.computeAspects(transits, natal);
    const aspectsForCategory = allAspects.filter((a) => a.transit === decision.category);
    const rulingBodyTransit = transits.bodies[decision.category];

    const verdict = await OracleClient.getVerdict({
      event: details,
      natal: natal.bodies,
      transits: transits.bodies,
      aspects: allAspects,
      moonPhase: transits.moonPhase,
    });

    return {
      kind: "verdict",
      favor: verdict.favor,
      intensity: verdict.intensity,
      timingFit: verdict.timingFit,
      chartFit: verdict.chartFit,
      category: decision.category,
      reason: explainVerdict(decision.category, rulingBodyTransit, aspectsForCategory, verdict),
    };
  } catch (error) {
    return { kind: "error", reason: error instanceof Error ? error.message : "Unknown error" };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SCORE_EVENT") {
    return false;
  }
  const { type, ...details } = message;
  scoreEvent(details).then(sendResponse);
  return true; // Keeps the message channel open for the async sendResponse above.
});
