# Session B — DIO ↔ Lawyer connective tissue — Design doc

Two findings surfaced during investigation that change the shape of the work. Both are flagged up front because they affect whether B.1/B.2/B.3 can be built as literally specified — read this before the five parts below.

**Finding 1 — the Etna case's evidence was attached by "SB", not a DIO.** Every one of the 5 seeded Etna items (and the audit-chain entries) has `attachedBy: 'SB'` / `actor: 'SB'` — Sarah Booth, Head of Legal Ops, not a DIO. There is no `capturedBy` field anywhere in the codebase; `attachedBy` is the only field that exists. Building B.1/B.2 against the data as it stands today would render "attached by Sarah Booth" on the flagship demo case — the opposite of the story this session is trying to tell. See part (a) for the fix I'm proposing.

**Finding 2 — the Etna case is invisible to all territory math, and it's a real bug, not just missing polish.** The case object in `case_filing.js` has `route: 'GVA–LGW'` but no `dep`/`arr` fields. `DIOTerritory.casesInTerritory()` and `caseCountByAirport()` both filter on `c.dep`/`c.arr`. I loaded the live app as Emma (EH) against the current codebase and confirmed by direct console query: **Territory pulse currently reads 0/0/0/0**, and `dio-case.html`'s own "Route" fact row renders blank (`→` with nothing on either side) for this case, because the same missing fields are read there too. This isn't cosmetic — it's a genuine data-shape gap on the one case this session is built around. See part (d) for the scoped fix and the honest numbers it produces.

Everything below assumes those two fixes land as part of this session (both are single-object edits to the Etna case's seed data in `case_filing.js`, not touches to shared logic, other cases, or Session A's work).

---

## (a) Actual quoted values — `attachedBy` on the seeded Etna items

From `case_filing.js`, the `seedEvidenceAttachments('DEF-DEMO-ETNA-CASCADE', [...])` call (lines 383–405), all 5 items:

```js
{ itemKey: 'seed-vaac-etna-310726', ..., attachedBy: 'SB', ... }
{ itemKey: 'seed-notam-cta-310726', ..., attachedBy: 'SB', ... }
{ itemKey: 'seed-atfm-cta-010826', ..., attachedBy: 'SB', ... }
{ itemKey: 'seed-metar-licc-010826', ..., attachedBy: 'SB', ... }
{ itemKey: 'seed-metar-egkk-030826', ..., attachedBy: 'SB', ... }
```

And the matching audit chain (`seedAuditChain('DEF-DEMO-ETNA-CASCADE', [...])`, lines 442–447) — all 5 entries have `"actor":"SB"`.

There is no `capturedBy` field on any item anywhere in the codebase (`grep` confirms `attachedBy` is the only such field in `case_filing.js`). `USERS.SB` = Sarah Booth, `role:'Head of Legal Ops'` (not `team:'dio'`). `USERS.EH` = Emma Hughes, `role:'DIO — England & Wales'`, `team:'dio'`, `jurisdiction:'england-wales'`.

**Proposed fix (part of this session's diff):** change all 5 `attachedBy: 'SB'` → `attachedBy: 'EH'` and all 5 audit-chain `"actor":"SB"` → `"actor":"EH"` on the Etna case only. This is synthetic demo data seeded specifically to be "the cascade differentiator" showcase (per the file's own comment) — it carries no real-world audit meaning, so correcting it to match the narrative it was built to tell is a data fix, not a fabrication. No other case's `attachedBy`/`actor` values are touched (Hartley's `DEF-2026-EW-0089`, Taylor's `DEF-2026-EW-0076`, etc. all stay exactly as seeded — this is what gives B.1's "graceful fallback for Hartley's older items" line something real to demonstrate, since Hartley's items keep their genuine `SB\ JP` attribution and simply won't show a DIO attribution line).

Audit-chain hashes are pre-computed over a payload that includes `actor` (confirmed via the file's own comment: "payload shape matches `case_audit_trail.js`'s `_doAppend` exactly — seq/ts/actor/action/..."). Changing `actor` without recomputing the hash chain would break "Verify chain" for this case. I'll regenerate the 5 hashes using the same build-time method the file already documents, so `CaseAuditTrail.verify()` still passes clean.

## (b) Existing patterns to match — verbatim

**SEED DATA chip** (`case_evidence_repository_ui.js`, part of `renderAttached()`, line 253):
```js
chips.push('<span class="cer-prov-chip ' + (seed ? 'chip-seed' : 'chip-live') + '" title="Data provenance status">' +
           '<i class="ti ti-' + (seed ? 'test-pipe' : 'circle-check') + '"></i>' +
           '<span class="v">' + (seed ? 'SEED DATA' : 'LIVE FEED') + '</span></span>');
```
CSS: `.cer-prov-chip{display:inline-flex;align-items:center;gap:5px;padding:3px 8px 3px 6px;background:var(--surface2,#F7F7F9);border:1px solid var(--rule,#D8D8E0);border-radius:12px;font-size:10.5px;color:var(--text2,#2D2D44);font-family:var(--mono,Courier New,monospace)}` — a pill chip, not plain text.

**Current attribution line** (same file, line 262–264) — this already exists, and it's exactly the pattern B.1 needs to extend, not invent:
```js
chips.push('<span class="cer-prov-chip" title="Attached by">' +
           '<i class="ti ti-user"></i>' +
           '<span class="k">by</span><span class="v">' + esc(a.attachedBy || '—') + '</span></span>');
```
Today this renders as a pill chip reading "BY SB" (mono font, `.k`/`.v` split — label in muted grey uppercase, value in dark text), sitting inline in the `.cer-prov-strip` row alongside the SEED DATA / src / retrieved / endpoint chips.

**This is the one place where the brief and the existing pattern pull in different directions.** The brief for B.1 says: "Text-only, no chip container of its own... reads inline with the existing timestamp line... same font, size, and colour as the existing timestamp text — muted grey, not accent." But the *existing* "by SB" attribution is already a full `.cer-prov-chip` pill, identical in weight to SEED DATA / LIVE FEED / src / endpoint. Matching the brief exactly (plain text, no chip) means B.1 will look visually *lighter* than the chip sitting right next to it in the same row — which is arguably the point ("attached by Emma Hughes" as quiet metadata, not another pill competing for attention), but it does mean the two things are stylistically inconsistent with each other on the same line.

**My call:** keep the existing "by SB" chip exactly as-is (untouched, still a pill — it's a distinct fact: *which raw actor record the attachment event carries*), and add the new DIO attribution as a separate plain-text fragment appended after the `.cer-prov-strip` chip row, inside `.cer-att-body`, styled off `.cer-att-meta` (already exists: `font-size:10.5px;color:var(--text3,#6B6B80)` — the exact "muted grey, not accent" the brief asks for, and already used for the Note line on this same card). This satisfies the brief's letter (text-only, no chip, matches the timestamp/note weight) without editing the existing chip row's contents or semantics.

**News feed item** (`dio.html`, `renderFeed()`, lines 727–737):
```html
<div class="feed-item severity-event">
  <div>
    <div class="feed-title">[title, linked <a> if it.link present, else plain text]</div>
    <div class="feed-meta"><span class="feed-src-chip feed-src-herald">Aviation Herald</span><span>[date]</span></div>
    <div class="feed-desc">[description, 2-line clamp]</div>
  </div>
  <div class="feed-actions">
    <span class="feed-match-count">[n matches / no matches]</span>
    [Fetch button, only if matchCount > 0]
  </div>
</div>
```
`renderFeed` is fed by a live, four-source async fetch (`loadTerritoryFeed()` — Aviation Herald, Simple Flying, GDACS, Copernicus EFFIS), filtered through `matchIncidentToTerritory()`. There's no static seed array to add an entry to — the Etna entry has to be injected into the `items` array that pipeline builds, before `renderFeed()` runs, using the exact same object shape (`{source, title, description, link, pub_date, severity}`) every real item uses.

## (c) B.2 destination — modal, not a tab

`dio-case.html` has **no tab-nav structure at all**. It's a single flat view: header strip → optional focused-request banner → "Two ways to add evidence" panel → case summary strip → a two-column grid (`Evidence required` / `Already on file`) → dropzone. I read the full page (`render()` in the inline `<script>`, ~460 lines) and confirmed no `tab`/`data-tab`/`role="tab"` markup exists anywhere in it or in the DIO nav bar's per-page structure.

Per the brief's own fallback instruction, this means **B.2 uses a modal.** Reasoning beyond just "the brief said so": adding a first tab-nav pattern to `dio-case.html` to host a single link's destination would be exactly the kind of new-visual-language invention the styling principles rule out — a modal triggered by the existing plain-text link is one self-contained addition, versus retrofitting page-wide navigation structure for one use case.

The modal itself must stay equally restrained: a plain overlay listing the same 5 attached-item summaries with their timestamps (i.e., "what Emma did on this case," reusing text already computed for the Repository tab — no new data-fetching), a close control, no extra chrome. Not a redesign of `dio-case.html`.

## (d) Etna feed entry copy + territory-pulse numbers, with justification

**Root-cause fix (also covers Finding 2 above):** add `dep: 'GVA'` and `arr: 'LGW'` to the `DEF-DEMO-ETNA-CASCADE` case object in `case_filing.js` (currently only has `route: 'GVA–LGW'`). This is the only case object I'll touch. I am deliberately **not** touching the same gap on any other case (Hartley, Taylor, etc. all have the same `route`-only shape in `CaseFiling`'s clone, which is why *all* territory numbers read zero today, not just Etna's) — that's a pre-existing, systemic issue across the whole case-filing pipeline, well outside this session's scope, and fixing it properly means auditing 16 case objects' dep/arr parsing, not a Session B change. I'll flag it as a follow-up rather than pull it in.

The effect of the scoped fix, verified against the live computation (`DIOTerritory.caseCountByAirport`/`casesInTerritory`, run in-browser as EH):

| Counter | Formula (existing code, unchanged) | Before fix | After fix (Etna dep/arr added) |
|---|---|---|---|
| Hot airports | `airports where caseCountByAirport() >= 3`, scoped to **Emma's own 13 UK+IE airports only** | 0 | **0** — EGKK (LGW) goes from 0→1 case; 1 is below the >=3 "hot" threshold |
| Open req | `mineOverdue \|\| mineCount` (evidence-request forum, unrelated to case dep/arr) | 0 | **0** — no evidence request exists for the Etna case |
| Territory cases | `casesInTerritory('EH').length` | 0 | **1** — Etna is the only case in the store with dep/arr populated, so it's also the only one this fix newly surfaces |
| Engine intake | `collectEngineIntake()` — filters on `c.source==='engine'`, unrelated to Etna | 0 | **0** — unchanged, no engine-sourced field on the Etna case |

**I'm not going to hit the brief's suggested "hot airports: probably 2-3."** That number assumed CTA/PMO (Catania/Palermo, Italy) would count toward "hot airports" — but "Hot airports" is coded as a *workload-concentration metric scoped to Emma's own UK+IE territory list* (LHR/LGW/STN/etc.), not "airports touched by this incident." CTA and PMO are Sicilian airports; they were never in scope for that counter regardless of what happens to Etna's data, and the only UK+IE airport the case touches (LGW) contributes exactly 1 case, not 3. Hitting "2-3 hot" would mean either fabricating 2 more UK+IE cases that don't exist, or changing what the metric measures — both cross the brief's own "real numbers, not fake inflation" rule. I'm reporting 0 as the honest answer and flagging the mismatch here for a decision rather than quietly picking one.

**Feed entry** — copy exactly as specified in the brief, mapped onto the real item shape `renderFeed()` expects:
```js
{
  source: 'dio',                 // new — see below
  title: 'Mount Etna eruption — 5 evidence artefacts captured (VAAC, NOTAM, ATFM, METAR ×2). Fed to case DEF-DEMO-ETNA-CASCADE.',
  description: null,             // no separate description — title carries the full copy per the brief
  link: null,                    // plain text, not a clickable headline — it isn't an external article
  pub_date: '2026-08-01T09:36:00Z',
  severity: 'event'              // the existing default/quiet tier — same as any ordinary item, no accident/incident escalation
}
```
This gets unshifted into `items` inside `loadTerritoryFeed()`'s `.then()`, after the four live sources are merged and before the territory filter — Emma should always see it regardless of whether the live GDACS/Copernicus/Herald fetches happen to also carry Etna coverage that day.

**Open question — the source chip.** The four existing chip colours (`feed-src-herald` tan, `feed-src-simple` blue-grey, `feed-src-gdacs` red, `feed-src-copernicus` amber) all represent *external syndicated sources*. This item isn't from any of them — it's an internal fact ("Emma captured this"), and using GDACS's red chip risks reading as the "alert" styling the brief explicitly bans, while mislabelling it as Aviation Herald would be inaccurate. My proposal: add one new chip variant, `.feed-src-dio{background:var(--surface3,#EFEFF2);color:var(--text3,#6B6B80)}` — the same structural chip (no new markup, no new sizing), just a new colour pairing using tokens the app already uses elsewhere for its quietest/neutral state (this exact grey pairing is already `chip-nohit`'s colour in the Repository tab). Label: "DIO CAPTURE". This is the smallest way to keep the item honest without borrowing an existing source's identity. Flagging for approval since it is, technically, one new CSS rule.

## (e) Interactions with existing gates

- **`_isDIOActor()`** (`case_evidence_repository_ui.js`) gates only the source-cards/catalogue block on the Repository tab. B.1's attribution line and B.2's provenance line both sit in the block that's already unconditional for both actors (`renderAttached()`, called before the `_isDIOActor()` branch) — no gate changes needed, both items render identically for solicitor and DIO viewers.
- **`ensureDIOAccess()`** (`dio_core.js`) redirects non-DIO users away from `dio-case.html` to `index.html`. B.2's link sends a **solicitor** to `dio-case.html?ref=<caseRef>` — that would bounce them straight back out before they ever see the Etna activity, defeating the link's purpose. Since B.2 is being built as a modal (part c) rather than a same-page tab, this is moot for the modal itself (it renders inline on the Repository tab, no navigation) — but it means the modal must **not** shell out to `dio-case.html` at all; it has to render the activity summary using data already available to the current page (the same `attached` array `renderAttached()` already has), not by navigating/iframing the DIO-only page.
- **`guardModuleAccess()`** redirects DIO users away from `case.html` to `dio-case.html` — unrelated to this session's additions, no interaction.
- Regression check: cases with no DIO-attached evidence (any case where every item's `attachedBy` is absent or non-DIO — e.g. Hartley's, once Etna is switched to `EH`) must render **zero** B.1/B.2 output, not an empty label — confirmed achievable since both are conditional on `attachedBy` resolving to a `team:'dio'` user in `USERS`.

---

## Summary of the actual diff this session produces

1. `case_filing.js` — Etna case object: add `dep:'GVA'`, `arr:'LGW'`. Etna's 5 evidence items: `attachedBy: 'SB'` → `'EH'`. Etna's audit chain: `actor` → `'EH'` on all 5 entries, hashes recomputed to match.
2. `case_evidence_repository_ui.js` — `renderAttached()`: append a plain-text `.cer-att-meta`-styled attribution fragment (B.1) reading `attachedBy` off each item, rendering nothing when absent/non-DIO. Below `renderAttached()`'s output: a one-line provenance summary (B.2) with a text link opening a lightweight modal built from data already in scope (no navigation to `dio-case.html`).
3. `dio.html` — `loadTerritoryFeed()`: unshift the one synthetic Etna item into `items` before the territory filter. New CSS rule `.feed-src-dio`. No changes to the territory-pulse widget's markup or formulas — the numbers change because the underlying case data does (item 1), not because the widget logic changes.

No changes to `defendable_analyser.html`, repo root layout, or any Session A file.

**Stopping here for approval** — flagging three decision points explicitly: (1) switching Etna's `attachedBy`/`actor` from SB to EH, (2) accepting "0" for hot airports rather than the brief's suggested 2-3, (3) the new `.feed-src-dio` chip colour. Everything else above is either a direct read of existing code or a mechanical application of the brief's own spec.
