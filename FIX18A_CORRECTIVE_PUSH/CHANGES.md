# Corrective push fix18a — applied fresh against `261Claims-main (17).zip`

Verified against the uploaded baseline first: confirmed none of fixes A–J had landed (baseline still cited DDJ Linwood in DT-09, still had DT5-G2b/G3/G4, no version query on `defendable_trees.js` at all). All six files in this pack were re-diffed against that exact baseline before packing — every change below is present and nothing outside these fixes was touched.

**Marker:** all four changed script tags in `defendable_analyser_v3.html` (`defendable_trees.js`, `defendable_registry.js`, `defendable_type_map.js`, `defendable_tree_dt01_atc.js`) bumped to `?v=fix18a`. `defendable_tree_dt02_weather.js`'s content was already correct in the baseline (see F) so its tag is left unversioned — nothing changed there to go stale.

## Fixes applied

- **A — DT-09 rebuild** (`defendable_trees.js`): full 6-gate restructure — G1 entry → G2 foreseeability confirm → G3 concede (foreseeable) / G4 defend-track confirm (sudden in-flight, `conclusionIds: ['DT9_MEDICAL_EC','U7_EC_ESTABLISHED']`) → G5 commander/medical documentation confirm → G6 `stdMeasures`. Authority string cites LE v TAP + Wallentin-Hermann + Air Navigation Order/ICAO Annex 6 only — no Linwood/Lipton. `DT9_MEDICAL_EC` added to `defendable_registry.js`.
- **B — LEGAL_CHAR.medical** (`defendable_analyser_v3.html`): rewritten to the DEFEND position, LE v TAP anchor, full evidence chain, distinct-from-Lipton framing, foreseeability carve-out.
- **C — DT-05 simplification** (`defendable_trees.js`): collapsed to G1 entry → G2 concede only. G2b/G3/G4 deleted. Authority string rewritten to route external events elsewhere. `lightning` removed from `matches()`.
- **D — DT-15 Art 4 downgrade** (`defendable_trees.js`): regex tightened to primary-event-only phrasing (confirmed via negative test: "denied boarding" as context inside a crew-sickness cancellation no longer matches). Conclusion rewritten to the Art 4 pathway text. `LEGAL_CHAR.denied_boarding` added.
- **E — DT-01 Moens removal**: removed from the wrapper `authority` string in `defendable_trees.js` and from the internal `var AUTHORITY` constant in `defendable_tree_dt01_atc.js`. **Not removed**: one separate, narrower gate inside `defendable_tree_dt01_atc.js` (`DT1-G2`, "Third-party imposition (Moens)") that distinguishes carrier-requested vs third-party-imposed restrictions — this is a different, deliberate use of the citation, not the "ATC restrictions = EC" framing the fix targets, and the instruction named the `AUTHORITY` const specifically. Flagging again since it's the reason a blanket `grep -c Moens` on that file won't return zero.
- **F — DT-02 Blanche citation**: wrapper string in `defendable_trees.js` updated to the full reported citation. `defendable_tree_dt02_weather.js`'s internal constant **already had the correct citation in the baseline** — confirmed byte-identical to baseline, no edit needed, included in the pack only for completeness/consistency.
- **G — DT-08 date fix** (`defendable_analyser_v3.html`): `LEGAL_CHAR.security`'s NI, HZ v European Air Charter date corrected to 4 Mar 2026.
- **H — DT-17 routing fix** (`defendable_type_map.js`): `'political-unrest'` remapped from `DT-11` to `DT-17`.
- **I — LEGAL_CHAR.ground-damage rewrite** (`defendable_analyser_v3.html`): rewritten to concede-by-default, matching what DT-05 (its actual routing target per the type map) now produces.
- **J — LEGAL_CHAR.technical rewrite** (`defendable_analyser_v3.html`): aligned to DT-05's pure-concede position, hidden-defect exception clearly separated as DT-14's job.

## Verification — actual exit objects (`?v=fix18a` loaded, zero console errors)

**1. DT-09** — `DefendAbleTrees.runTree('DT-09', {iccText: 'passenger cardiac event in-flight, diverted to nearest suitable airport for medical treatment'}, true).exit`
```json
{
  "verdict": "DEFEND_HOLD",
  "conditions": ["EVIDENCE_HOLD: Commander diversion + medical documentation — proof pending", "EVIDENCE_HOLD: Reasonable measures — proof pending", "Collect key evidence: Safety reporting system — Event Records", "Collect key evidence: Operational delay records — Flight Details & Legislation", "Collect key evidence: Safety reporting system — Event Records", "Collect key evidence: Operational delay records — Flight Details & Legislation", "Collect key evidence: Operational delay records — Flight Details & Legislation"],
  "authority": "LE v TAP Air Portugal C-74/19 — sudden external event beyond the carrier's control requiring mandatory commander diversion is EC by analogy; Wallentin-Hermann C-549/07 — not inherent to the normal exercise of activity, beyond actual control; Air Navigation Order / ICAO Annex 6 — mandatory commander duty to divert for urgent medical care",
  "conditionType": "EVIDENCE_HOLD"
}
```

**2. DT-05** — `DefendAbleTrees.runTree('DT-05', {iccText: 'hydraulic system fault, aircraft AOG, MEL raised'}, true).exit`
```json
{
  "verdict": "CONCEDE",
  "conditions": ["Concede EC on technical fault.", "Art 9 care remains owed (McDonagh)."],
  "authority": "van der Lans / Huzar / Wallentin-Hermann — technical faults NOT EC"
}
```

**3. DT-15** — `DefendAbleTrees.runTree('DT-15', {iccText: 'passenger involuntarily denied boarding due to flight oversold'}, true).exit`
```json
{
  "verdict": "CONCEDE",
  "conditions": ["Article 4 pathway — not a defence tree.", "Offer Article 8 rerouting and Article 4 compensation per the statutory scheme.", "This is not an EC 5(3) matter."],
  "authority": "EC261 Article 4 — denied boarding is a distinct statutory pathway from Article 5/7 delay/cancellation compensation. No EC defence applies because there is no delay/cancellation to defend — the passenger did not fly."
}
```

**4. DT-17** — `DefendAbleTrees.runTree('DT-17', {iccText: 'airspace closure due to political unrest and government travel ban'}, true).exit` (confirmed `treeId: 'DT-17'`, not DT-11)
```json
{
  "verdict": "DEFEND_HOLD",
  "conditions": ["EVIDENCE_HOLD: Authority notice — proof pending", "EVIDENCE_HOLD: Reasonable measures — proof pending", "Collect key evidence: NOTAM Records", "Collect key evidence: Operational delay records — Flight Details & Legislation", "Collect key evidence: NOTAM Records", "Collect key evidence: Operational delay records — Flight Details & Legislation", "Collect key evidence: Operational delay records — Flight Details & Legislation"],
  "authority": "Government restriction / conflict zone = EC",
  "conditionType": "EVIDENCE_HOLD"
}
```

All four match the expected verdict/authority exactly.

## Fingerprints — run these against your local copy of each file before uploading

Every string below was tested against the exact files in this pack and confirmed to match (count shown = 1 for all).

- **defendable_trees.js**: `grep -c "Air Navigation Order / ICAO Annex 6 — mandatory commander duty to divert for urgent medical care" defendable_trees.js` → should return `1` (proves DT-09 rebuilt). Also: `grep -c "Technical fault — concede EC (van der Lans / Huzar / Wallentin-Hermann)" defendable_trees.js` → `1` (proves DT-05 simplified). Also: `grep -c "Denied boarding falls under Article 4, not Article 5/7" defendable_trees.js` → `1` (proves DT-15 downgraded).
- **defendable_analyser_v3.html**: `grep -c "?v=fix18a" defendable_analyser_v3.html` → should return `4` (proves the marker landed on all four bumped script tags). Also: `grep -c "LE v Transportes Aéreos Portugueses (C-74/19, 11 Jun 2020) — like disruptive-passenger" defendable_analyser_v3.html` → `1` (proves LEGAL_CHAR.medical rewritten).
- **defendable_tree_dt01_atc.js**: `grep -n "var AUTHORITY" defendable_tree_dt01_atc.js` → should show `var AUTHORITY = 'Pešková C-315/15; Wallentin-Hermann C-549/07';` with no Moens. **Do not** use a blanket `grep -c Moens` on this file — it will return `5`, not `0` — those are a separate, deliberately-untouched gate (see fix E above), not a miss.
- **defendable_tree_dt02_weather.js**: `grep -c "Blanche v EasyJet \[2019\] EWCA Civ 69" defendable_tree_dt02_weather.js` → should return `1`. (Byte-identical to the baseline zip — nothing to fix here, included for completeness.)
- **defendable_type_map.js**: `grep -c "'political-unrest': 'DT-17'" defendable_type_map.js` → should return `1`.
- **defendable_registry.js**: `grep -c "DT9_MEDICAL_EC" defendable_registry.js` → should return `1`.
