# Cosmic JEV Extension

A dramatically simplified, extension-only spin-off of [Cosmic JEV](https://github.com/dgabriel/cosmic-jev): glows event cards green or red across Eventbrite, Meetup, Luma, and confs.tech, based on what Jev thinks of attending, from your real birth chart.

No build step, no framework, no TypeScript. Plain JS files loaded straight into Chrome. See [`docs/spec.md`](docs/spec.md) for the full spec and design decisions.

## Build & load instructions, from a machine with nothing installed

There is nothing to compile — "building" this extension just means getting the plain files onto disk and pointing Chrome at the folder.

1. **Prerequisites**: Google Chrome, and Git to clone the repo. (Node.js is only needed later, optionally, to run the dev smoke test — not to load or use the extension itself.)

2. **Get the code**:

   ```bash
   git clone https://github.com/dgabriel/cosmic-jev-extension.git
   cd cosmic-jev-extension
   ```

3. **Enable Developer mode in Chrome** (off by default): open `chrome://extensions` and toggle **Developer mode** on, top-right — this reveals the "Load unpacked" button.

4. **Load it**: click **Load unpacked** and select the `cosmic-jev-extension` folder you just cloned. It should appear as "Cosmic JEV Extension." Because `manifest.json` pins a fixed `"key"`, it always gets the same extension ID (`pgnpdafilefemmcjhpbpnafepjkhfgon`) regardless of machine or file path — that ID is already allowlisted on the shared Cosmic JEV Worker, so no server-side setup is needed on your end.

5. **Pin it** (optional but recommended): click the puzzle-piece icon in Chrome's toolbar and pin "Cosmic JEV Extension" so its icon stays visible.

6. **Set your birthdate**: click the extension's icon, enter your birthdate, click Save. This is stored via `chrome.storage.local` — on this device only, never sent anywhere except as part of a live verdict request.

7. **Use it**: visit any of these and browse or search for events —
   - `https://www.eventbrite.com/`
   - `https://www.meetup.com/`
   - `https://lu.ma/`
   - `https://confs.tech/`

   Event cards glow green (Jev favors attending) or red (it doesn't) as they scroll into view. A card with no colored glow means Jev recused, asked for more detail, or the call failed — there's deliberately no thumbs-up/down shown for those.

That's the whole setup. No `npm install`, no build command, no server to run.

## Updating it later

Since it's loaded unpacked from the cloned folder, picking up changes is just:

```bash
git pull
```

then click the refresh icon on the extension's card at `chrome://extensions` (or toggle it off and on).

## Dev: the astrology smoke test

The one automated check in this repo, covering the real ephemeris math in `astro/*.js` against cited reference values:

```bash
npm install   # pulls in astronomy-engine for the test only -- not used by the extension itself
npm test
```
