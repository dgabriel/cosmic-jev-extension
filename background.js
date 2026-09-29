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

async function scoreEvent(title) {
  const birthdate = await Storage.loadBirthdate();
  if (!birthdate) {
    return { kind: "no-birthdate" };
  }

  try {
    const natal = Natal.computeNatalChart(birthdate);
    // Each event is its own independent "does the sky favor this, today"
    // question, same as the main app/its own extension.
    const transits = Sky.computeTransitChart(new Date());

    const classification = await OracleClient.classifyActivity(title);
    const decision = route(classification);

    if (decision.kind === "recusal" || decision.kind === "needs-detail") {
      return { kind: decision.kind };
    }

    const rulingBodyTransit = transits.bodies[decision.category];
    const aspects = Aspects.computeAspects(transits, natal).filter((a) => a.transit === decision.category);
    const verdict = await OracleClient.getVerdict({
      category: decision.category,
      rulingBodyTransit,
      aspects,
      moonPhase: transits.moonPhase,
      activityText: title,
    });

    return { kind: "verdict", favor: verdict.favor, intensity: verdict.intensity };
  } catch (error) {
    return { kind: "error", message: error instanceof Error ? error.message : "Unknown error" };
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || message.type !== "SCORE_EVENT") {
    return false;
  }
  scoreEvent(message.title).then(sendResponse);
  return true; // Keeps the message channel open for the async sendResponse above.
});
