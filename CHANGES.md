# Session A — post-review fix pass — push pack contents

All 13 files below go to the **repository root** on GitHub (overwrite existing files of the same name — the root already has current versions of all except `DEMO_SCRIPT_evidence_bus.md`, which already exists at root too from the last upload). Three files also need to be **deleted** from the repo — listed at the bottom, not included in this folder since there's nothing to upload for a deletion.

## Files to upload (overwrite existing)

- **dio-case.html** — Fix 1: added `case_filing.js` script include and a `CaseFiling.getCase()` fallback lookup when `ALL_CASES` doesn't have the case, so DIO-store-only cases (e.g. `DEF-DEMO-ETNA-CASCADE`) can be opened by Emma, not just cases seeded into `shared_data.js`.
- **evidence-weather.html** — Fix 2: `extractMetric()`'s "no METAR for this station" branch returned the bare value `null` (rendered as literal text "null" in tiles) instead of the `'—'` string every other no-data branch in the same function uses; also bumped its `nav.js` script tag to `?v=sessA4` so Fix 4 below actually loads.
- **evidence-atfm.html** — Fix 4: bumped `nav.js` script tag to `?v=sessA4` (no content change of its own beyond the version bump).
- **evidence-flights.html** — Fix 4: same `nav.js` version bump.
- **evidence-ash.html** — Fix 4: same `nav.js` version bump.
- **evidence-notams.html** — Fix 4: same `nav.js` version bump.
- **evidence-strikes.html** — Fix 4: same `nav.js` version bump.
- **evidence-news.html** — Fix 4: same `nav.js` version bump.
- **evidence-global.html** — Fix 4: same `nav.js` version bump.
- **evidence-workspace.html** — Fix 4: same `nav.js` version bump.
- **nav.js** — Fix 4: the user-switcher dropdown had no CSS default-hidden/open-visible state at all (so it rendered visible on every page load regardless of the `.open` class) and its click-to-open handler was defined but never wired to the avatar button — both fixed in the one shared file responsible for the whole `evidence-*.html` family, plus click-outside-to-close now works correctly since it has CSS to react to.
- **dio.html** — Fix 5: added `id="w-portfolio"` to the "DIO tools" widget (where the "My cases" tile lives) so the DIO "Cases" nav link's `#w-portfolio` anchor has a real target instead of silently doing nothing; also hardened the page-init trigger to run immediately if the document is already loaded rather than solely depending on a `window` `load` event listener that could theoretically register after the event already fired.
- **DEMO_SCRIPT_evidence_bus.md** — Fix 3 (doc-only, no code): reworded Part A steps 3–4 so the presenter's pointing order matches the actual live render order (CASCADE MATCH renders first/top, EVENT CONTEXT second — the original text had this backwards). **This file goes at the repo root**, same location as the last upload — not inside `outputs/`.

## Files to delete from the repo (optional Fix 7 — nothing to upload, just delete these three)

- **defendable_evidence_status_widget.js** — zero references anywhere in live HTML/JS; the only mention anywhere in the repo was in an old `.patch` file.
- **defendable_engine.js** — mentioned once in prose text on `defendable_legal_tree.html`, never actually loaded by a script tag or required by another JS file.
- **_nav.js** — self-documented as a legacy shim ("use shared_nav.js on new pages"); re-verified with exact-match grep (not substring) that nothing loads it — earlier broad greps had been catching `shared_nav.js`/`dio_health_check.js` as false positives.

Not touched, per explicit scope: `defendable_analyser.html` (v2 — Harry's archive-vs-keep call), any root-level `.patch`/`.sh`/`.xlsx` file, and no DIO-attribution / Session B work.
