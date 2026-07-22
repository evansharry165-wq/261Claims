# DefendAble — Structured ICC Prompt Specification
## The Living Input: three-section structure + keyword recognition gateway
### July 2026 — for Cursor implementation into defendable_analyser_v3.html

---

## THE PROBLEM THIS SOLVES

The current free-text box accepts anything and gives no signal about what the system
understands. The output quality depends entirely on what the user happens to include.
Harry's observation: **"You need to provide structure to the prompt to incite structure
in the answer."**

Every good ICC summary already has the same three-part shape. The input should make
that shape explicit, and the box should respond live as the user types — showing which
knowledge banks their words are engaging. The input becomes the gateway to the system,
not a dumb text field.

---

## PART 1 — THE THREE-SECTION STRUCTURE

Replace the single textarea with three labelled sections. Each has a mono-label header,
guidance placeholder, and its own keyword recognition strip.

### Section 1 — FLIGHT & LINE OF FLYING
*"What flight, what aircraft, what happened to it"*

Placeholder guidance:
> Flight number(s), date, registration/tail, route. What happened to this aircraft
> across the day — inbound sectors, delays inherited, diversions, swaps.
> e.g. "EZY4470 LGW–AMS 21/07, G-EZBX. Aircraft inbound from PMI 45 late.
> Ground hold LGW, departed 0941 vs STD 0620. Return EZY4471 departed AMS 1317."

What the parser extracts from this section:
- Flight numbers (all — primary + rotation sectors)
- Date, registration
- Route (IATA pairs)
- STD/ATD/STA/ATA times
- LOF construction: sector sequence, inherited delay, aircraft swaps

**Note on the LOF data gap:** without airline system connection the user must type
the line of flying manually. The section design acknowledges this honestly — the
guidance asks for it explicitly. When an airline data source is eventually connected,
this section pre-populates and the user verifies instead of types. The section
architecture doesn't change; only the data source does. Design it now as
type-first / verify-later.

### Section 2 — CAUSATION
*"Why the flight was disrupted, and what happened as a consequence"*

Placeholder guidance:
> The root cause (weather, technical, ATC, strike, crew, pax event...) and the
> consequence chain. What did the cause do to the operation?
> e.g. "CB activity Amsterdam FIR from 0800. Eurocontrol ATFM weather regulation,
> slot CTOT 0920 imposed. No diversion. Delay 194 mins at arrival."

Parser extracts:
- Root cause → disruption classification (drives DT tree selection)
- Consequence chain nodes (each becomes a timeline event)
- Weather detail / ATC restriction detail / tech defect detail
- Delay attribution per node

### Section 3 — REASONABLE MEASURES
*"Why the airline could not save the flight on the day"*

Placeholder guidance:
> What the airline did or couldn't do: standby aircraft/crew availability, sub
> options considered, network state, re-routing checked, curfew or FDP limits.
> e.g. "No standby aircraft LGW — all subs deployed to Storm Floris backlog.
> Re-crew not possible within FDP. Pax re-routing checked: no earlier arrival
> available own metal or interline."

Parser extracts:
- Measures taken (each maps to the reasonable-measures checklist per disruption type)
- Measures NOT available and why (this is the Art 5(3) "all reasonable measures" defence)
- Network context (cascade justification, T-656/24 causal chain integrity)

### Composition
A "Compose summary" action concatenates the three sections into one canonical ICC
text (with section markers) and feeds the existing pipeline. Existing single-box
paste still works — the parser detects section markers if present, falls back to
whole-text parsing if not. **No breaking change to the current engine.**

---

## PART 2 — LIVE KEYWORD RECOGNITION (the box comes alive)

### Behaviour
As the user types, the system scans against the keyword bank (client-side, on
`input` event, debounced ~300ms). Three visible responses:

1. **Recognition chips** — beneath each section, chips light up for each recognised
   term: `ATFM → ATC Restriction · DT-01`. The chip shows the term AND what it
   connects to. The user sees the system acknowledging their words.

2. **Route suggestions** — when a bank engages, related routes appear as ghost
   chips the user can click to insert canonical phrasing. Type "ATC" → offers:
   `slot restriction` `cascading delay` `ground stop` `flow regulation`.
   Clicking inserts the phrase. This teaches users the vocabulary the system
   parses best — the input trains its own inputs.

3. **System recognition rail** — a persistent side/below panel aggregating
   everything engaged: disruption type candidate, DT tree selected, evidence
   items the summary references vs. still needed, authorities in play.
   This IS the "key" Harry described — the visible map of word → knowledge bank.

### The completeness meter
Per section, a subtle 0–3 indicator: has the section given the parser what it
needs? Section 1 needs flight+date+times; Section 2 needs cause+consequence;
Section 3 needs at least one measure statement. Not a gate — a nudge.

---

## PART 3 — THE KEYWORD → KNOWLEDGE BANK MAP

This is the master table. Each entry: trigger lexicon → bank → DT tree →
evidence set → authorities. Cursor implements this as a data object
(`PROMPT_KEYWORD_BANKS`); I maintain the content.

### WEATHER (DT-02)
| Triggers | Route suggestions offered |
|---|---|
| thunderstorm, TSRA, TS, CB, convective, lightning storm | weather at departure / weather at arrival / weather en-route / ATFM weather regulation |
| snow, snowstorm, ice, freezing, de-ice queue | snow closure / de-icing delay (NOT extraordinary — flag) |
| fog, LVP, RVR, visibility, below minima | LVP operations / approach ban / diversion |
| wind, crosswind, gusts, windshear | crosswind limits / AFM limits exceeded |
| diversion, diverted, alternate | mandatory ATC diversion / crew decision diversion |
- Evidence set: METAR/TAF, SIGMET, ATIS, Eurocontrol regulation notice, commanders report
- Authorities: Recital 14, BGH X ZR 136/23 (snow = EC), BGH X ZR 146/23 (de-icing ≠ EC)
- Special flag: "de-ice/de-icing" alone → warn chip: *de-icing itself is NOT extraordinary (BGH 2024) — was there an underlying severe weather event?*

### ATC / ATFM (DT-01)
| Triggers | Route suggestions |
|---|---|
| ATC, ATFM, CTOT, slot, regulation, flow control, ground stop, ground hold | slot restriction / cascading delay / capacity regulation / staffing regulation |
| Eurocontrol, NMOC, network manager | ATFM regulation reference |
| airspace closed, airspace restriction | airspace closure / military activity / strike-related closure |
- Evidence: Eurocontrol NMOC log, CTOT assignment, delay codes 81–89, OCC log
- Authorities: Moens C-159/18, T-134/25, Recital 15

### TECHNICAL (DT-03)
| Triggers | Route suggestions |
|---|---|
| tech, technical, defect, engineering, AOG, unserviceable, MEL, fault | routine defect (NOT EC — flag) / hidden design defect (EC possible) / birdstrike damage |
| manufacturer, design defect, service bulletin, airworthiness directive, fleet-wide | hidden design defect route — C-385/23 / C-411/23 |
- Evidence: tech log, engineering report, OEM confirmation, EASA AD if design defect
- Authorities: Wallentin-Hermann, Van der Lans, Huzar (all ≠ EC); C-385/23 + C-411/23 (design defect = EC)
- Special flag: bare "technical fault" → warn chip: *routine technical ≠ extraordinary. Is there OEM/authority confirmation of a design defect?*

### BIRD STRIKE (DT-04)
- Triggers: bird, birdstrike, bird strike, wildlife, FOD (animal)
- Routes: bird strike + inspection / bird strike + damage / precautionary check
- Evidence: commanders report, engineering inspection record, MOR
- Authorities: Pešková C-315/15; flag: *post-strike timeline must itself be justified — each delay node after the strike*

### STRIKE / INDUSTRIAL (DT-05)
- Triggers: strike, industrial action, walkout, work to rule, sick-out, union
- Routes: **own staff strike (NOT EC — SAS C-28/20, Krüsemann)** / third-party strike: ATC, ground handler, airport, security (EC candidate — codified 2026 reform)
- The recognition chip must distinguish immediately: "own staff" vs "third party" is the whole case
- Evidence: strike notice, union communication, airport/handler notification

### CREW (DT-06)
- Triggers: crew sick, crew illness, captain unwell, FO sick, crew unavailable, FDP, flight time limitations, out of hours
- Routes: crew illness (NOT EC — Lipton UKSC 2024, hard flag) / FDP expiry downstream of other cause (causation question)
- Special flag: *crew illness is never extraordinary in UK — Lipton binding. Assess as compensation case; focus shifts to quantum + care.*

### PASSENGER EVENTS (DT-07)
- Triggers: disruptive pax, unruly, medical emergency, medical diversion, pax removed, police met aircraft, deportee
- Routes: unruly pax diversion (EC — LE v TAP C-74/19, but re-routing duty stringent) / medical emergency diversion / pax offload + bag identification
- Evidence: commanders report, police report, diversion records

### SECURITY (DT-08)
- Triggers: security alert, bomb threat, evacuation, screening failure, security breach, suspicious item
- Routes: threat to specific aircraft / airport-wide security event / screening system failure (third party)
- Flag: T-656/24 — *if carrier made discretionary choices after the security event (waiting for delayed pax), causal chain may break*

### AIRPORT / THIRD PARTY INFRA (DT-09)
- Triggers: runway closed, fuel system, fuelling failure, baggage system, ground handler, airbridge, power failure, IT outage airport
- Routes: runway closure (Moens) / airport fuelling failure (SATA C-308/21 = EC) / handler staff shortage (C-405/23 = EC, but must seek alternatives)
- Flag on handler shortage: *must show alternative handlers were sought — C-405/23*

### ROTATION / CASCADE (cross-cutting — feeds LOF)
- Triggers: inbound late, previous sector, rotation, knock-on, earlier delay, aircraft swap, positioning flight, standby aircraft, sub
- Routes: cascade from earlier EC (Austrian C-826/19 — permitted with direct causal link) / voluntary wait decision (T-656/24 — BREAKS chain, red flag)
- This bank wires into Section 1 AND Section 3

### REASONABLE MEASURES lexicon (Section 3 primary bank)
- Triggers: standby, sub, substitute aircraft, wet lease, charter, re-crew, reserve crew, re-route, rebook, interline, other carriers checked, curfew, no options, all deployed
- Each recognised term maps to a reasonable-measures checklist item and marks it "addressed in narrative"
- MISSING terms matter as much: if Section 3 is silent on re-routing search → recognition rail shows *"Re-routing search not addressed — LE v TAP requires evidence own-network AND third-party options were checked"*

---

## PART 4 — WHY THIS ALSO SOLVES THE TEMPLATED-BANK GOAL

Harry's third note asked for "a broad templated system that can bank and implement
factual layouts of all disruption types... the system will still pick up the key
points and direct the factual breakdown the right way every time."

The keyword map above IS that bank. Each disruption type carries its own factual
layout: what Section 1/2/3 should contain for that type, which evidence set
applies, which tree runs, which authorities attach. Whatever the user types, the
recognition engine routes it to the right template, and the recognition rail
shows the user what the template still needs. The structure guides free text
rather than constraining it.

---

## PART 5 — IMPLEMENTATION NOTES FOR CURSOR

1. **Non-breaking:** three-section input composes to a single canonical text with
   markers (`[FLIGHT]`, `[CAUSE]`, `[MEASURES]`). Existing parser runs unchanged;
   section markers (when present) let extractors target the right section, raising
   precision.
2. **Data object:** `PROMPT_KEYWORD_BANKS` — keep separate from `RM_DB` /
   `EVIDENCE_DB` but reference their ids so recognition chips deep-link to the
   same knowledge the engine uses. One source of truth, two consumers.
3. **Order of work:** (a) three-section UI + compose; (b) recognition chips per
   section; (c) recognition rail; (d) route-suggestion insert chips; (e) completeness
   meter. Each stage ships independently.
4. **The prototype** (`defendable_prompt_v1.html`) demonstrates all five stages
   standalone — use it as the reference implementation and fold into v3.
5. Fix in the same sprint (carried from yesterday's review): STD/ATD/ATA regex
   extraction, sequential rotation detection (EZY4471 missed), strengths column
   auto-populate.

---

*Spec version 1.0 — July 2026. Content maintained by Claude; implementation by Cursor.*
