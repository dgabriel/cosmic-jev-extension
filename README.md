# Cosmic JEV Extension

A dramatically simplified, extension-only spin-off of [Cosmic JEV](https://github.com/dgabriel/cosmic-jev): glows event cards green or red across Eventbrite, Meetup, Luma, and confs.tech, based on what Jev thinks of attending, from your real birth chart.

No build step, no framework, no TypeScript. Plain JS files loaded straight into Chrome. See [`docs/spec.md`](docs/spec.md) for the full spec and the (one remaining) known blocker.

## Loading it

1. Clone this repo.
2. Go to `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**, and select this repo's folder.
3. Click the extension's icon in the toolbar and save your birthdate.
4. Visit `https://www.eventbrite.com/`, `https://www.meetup.com/`, `https://lu.ma/`, or `https://confs.tech/` and browse — event cards glow green/red as Jev scores them (lazily, as they scroll into view).

No `npm install` is needed for any of the above.

## Known blocker: Worker CORS

This extension's manifest pins a fixed ID (`pgnpdafilefemmcjhpbpnafepjkhfgon`). Until that ID is added to the `cosmic-oracle` repo's Worker `ALLOWED_ORIGINS` and redeployed, real-Jev calls from this extension will fail with `origin_not_allowed`. See `docs/spec.md` for details — this is a change in the *other* repo, not this one.

## Dev: the astrology smoke test

The one automated check in this repo, covering the real ephemeris math in `astro/*.js` against cited reference values:

```bash
npm install   # pulls in astronomy-engine for the test only -- not used by the extension itself
npm test
```
