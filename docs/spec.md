# Cosmic JEV Extension — spec (v1, for review)

## What this is

A dramatically simplified, extension-only spin-off of [Cosmic JEV](https://github.com/dgabriel/cosmic-jev). Same core trick — a deadpan 👍/👎 verdict from real planetary positions, interpreted by Jev — delivered as a glowing outline on event cards across a few event/conference listing sites, instead of a website you visit and fill out a form on.

This repo is **just the extension**. No React (the original didn't use it either, but to be explicit: no framework at all), no build tooling beyond what's unavoidable, no server code, no shared monorepo imports. Plain JS, a manifest, and the smallest amount of astrology math needed to make the verdict real rather than random.

## Sites supported

1. **Eventbrite** (eventbrite.com)
2. **Meetup** (meetup.com)
3. **Luma** (lu.ma) — picked as the third site: a popular, comparatively simple indie/tech-event listing site.
4. **10times** (10times.com) — picked as the fourth: a global conference/trade-show listing site, to cover "conference listing" specifically rather than just meetups.

(2 and 3 are my picks per your ask — swap either out if you'd rather have something else.)

Each site gets one small adapter file: "how to find event cards on this page" + "how to read this card's title out of it." Nothing else about a site is special-cased. **Exact CSS selectors are not guessed here** — per this project's own established rule, they get found by live-inspecting each real site's DOM during implementation, the same way the first extension's Eventbrite selectors were found. This spec fixes the *shape* of an adapter, not selector strings.

## How it works, end to end

1. You set your birthdate once, in the popup. Stored via `chrome.storage.local` — this device only, never sent anywhere except as part of a live verdict request.
2. On a supported site, the content script finds event cards on the page and asks the background service worker to score each one's title, lazily (only once a card is near the viewport) and with a per-event cache, so scrolling a long results page doesn't burn through API spend.
3. The background worker computes your natal chart and today's transits from real ephemeris data, then calls the **same already-deployed Cosmic JEV Worker** (`cosmic-oracle-worker.cosmic-oracle.workers.dev`) the main site and its own extension already use — Call 1 (classify) then, if warranted, Call 2 (verdict). No new backend, no new API key, no new secret to manage.
4. The card gets a green glow (Jev favors it), red glow (doesn't), or no glow (recusal / needs more detail / error) — same visual language as the original extension.

## What's deliberately cut, and why

The point of this repo is to strip the *engineering*, not the *idea*. Specifically cut, relative to the original extension:

- **Birth time, location, UTC offset.** Only a birthdate. The natal chart always uses UTC noon on that date — this is already the original app's own documented default for "no birth time given," so it's not a new behavior, just the only behavior. This alone removes: Ascendant computation, cusp-ambiguity messaging, timezone arithmetic, and 4 of the original popup's 5 fields.
- **TypeScript, esbuild, tsconfig, any build step.** Plain `.js` files. The background service worker is declared `"type": "module"` in the manifest (a standard, well-supported MV3 feature), so it can use native `import` between local files — no bundler needed. The content script and popup script are deliberately kept import-free (see Architecture below), so this is the *only* place module loading matters.
- **The local keyword-classification heuristic (`StubOracle`).** This extension only ever talks to real Jev — there's no offline dev mode to fake, so there's no reason to carry the ~400 lines of keyword-matching/sensitivity-bucket logic that exist solely to make that fake mode plausible.
- **Cross-repo code sharing.** The original extension imported the main app's TypeScript modules directly (`../../src/oracle.ts` etc.). This repo is fully standalone: its own small plain-JS files for exactly the astrology it needs, copied and trimmed from the original logic (not linked, not shared).
- **Aspects-to-natal-chart precision beyond Sun/Moon.** Unchanged from the original, just calling it out: aspects are only computed between the day's ruling-body transit and the natal Sun/Moon, same as today.

## What's kept, and why

- **Real ephemeris**, not a sun-sign lookup table. Computing actual planetary positions for a given date is the one thing that makes this "astrology done seriously as a bit" rather than a random-number generator with horoscope flavor text. It's also genuinely small: the position math for 7 bodies is a few dozen lines once you're not also handling Ascendant/houses.
- **The classify → route → verdict pipeline's shape** (Call 1 decides category/sensitivity/vague, routing decides recusal vs. needs-detail vs. proceed, Call 2 gets a real verdict) — this is the Worker's existing contract, so keeping it is free, and reimplementing it differently would just be a new way to get it wrong.

## Architecture

```
cosmic-jev-extension/
  manifest.json
  background.js          # type: module. Orchestrates everything; the only
                          # code that calls the network (MV3 pattern: a
                          # service worker with host_permissions bypasses
                          # CORS the way a content script's own fetch can't).
  content.js              # Classic script, no imports. Per-tab: picks the
                          # active site's adapter, finds cards, lazily asks
                          # background to score each one, applies the glow.
  content.css
  popup.html
  popup.js                 # Classic script, no imports. Birthdate form only.
  popup.css
  storage.js                # Shared by background.js and popup.js: get/set
                             # the saved birthdate via chrome.storage.local.
  oracleClient.js             # Shared by background.js: fetch wrapper for
                               # POST /api/decide against the existing Worker.
  astro/
    sky.js                     # Plain-JS: the 7 traditional bodies' ecliptic
                                # longitude/sign/retrograde for a given date,
                                # plus Moon phase. Ported and trimmed from the
                                # original sky.ts (no houses/Ascendant).
    natal.js                    # Plain-JS: sky.js at UTC-noon on a birthdate.
                                # No ambiguity/cusp handling (out of scope
                                # without a birth time to disambiguate with).
    aspects.js                   # Plain-JS: angular separation + orb rules
                                  # between one transiting body and the natal
                                  # Sun/Moon.
  sites/
    eventbrite.js                  # Each: { findCards(doc), titleFor(card) }.
    meetup.js
    luma.js
    tentimes.js
  vendor/
    astronomy-engine.js              # Unmodified, vendored copy of the
                                      # astronomy-engine package's ESM build.
                                      # Copied in once by hand; not installed
                                      # via npm, not modified.
  icons/
  docs/
    spec.md                          # this document
```

No `package.json` is required to *load or run* the extension — clone the repo, load `cosmic-jev-extension/` unpacked, done. (One may still get added later purely for optional dev conveniences like a formatter, but it's not part of the runtime path.)

## Cross-repo dependency (flagging now, not at the end)

The existing Worker's `ALLOWED_ORIGINS` allowlist only contains the *original* extension's pinned ID. This extension gets its own fresh, stable manifest `"key"` (a new, different ID), so before real-Jev calls will work from it, `cosmic-oracle/worker/wrangler.toml` needs that new ID added and redeployed — a small change in the *other* repo, same as when the first extension was added. Not blocking spec review, just flagging it as a real step in the implementation plan rather than a surprise at the end.

## Open questions for your review

1. **Test strategy.** Options: (a) none at all — fits "no over-engineering" literally; (b) one tiny, framework-free Node smoke script that checks `astro/*.js`'s output against a couple of known reference values, run by hand (not CI). I'd lean (b): the astrology math is the one part that's silently wrong if it's wrong, and a handful of plain assertions costs almost nothing. Your call.
2. **The two extra sites** — Luma and 10times, or something else?
3. **Astrology fidelity** — real ephemeris (as proposed above) vs. going even simpler (Sun-sign-only, from a static date-range table, no vendored library at all)? I think real ephemeris is worth the small amount of code it costs, but flagging the alternative since you emphasized "simplest possible."
4. **Repo visibility** — created public (matching `cosmic-jev`'s own visibility). Say so if you'd rather it be private.

Nothing beyond this document has been written yet. Once you're happy with the shape of this, I'll implement it.
