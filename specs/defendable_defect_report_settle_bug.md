# DefendAble — Defect Report: False SETTLE on Defendable Weather/ATC Case
### 22 July 2026 — reproduced live on v3, full decision path inspected

---

## REPRO CASE

Input (verbatim):
> EZY848, G-EZTY, MAN BCN MAN was diverted to VLC EZY848 had an arrival delay
> of 2 hours due to this. EZY849 was further delayed due to ATC restrictions at
> BCN due to the thunderstorms disrupting flow. The diversion was caused by
> thunderstorms over BCN. The return sector, EZY849 was further delayed by ATC
> restrictions. The crew were operating within hours and did not need replacing.
> forecast predicted that weather would clear within an hour or two.

Engine output: **"Settle recommended — Chain or evidence does not support a full defence."**

Correct legal answer: **EZY848 — not compensable at all (2h arrival delay,
below Sturgeon 3h threshold). EZY849 — DEFEND subject to evidence** (weather
root + ATC cascade; Moens/Pešková; conditions: METAR/TAF BCN, Eurocontrol
regulation record, rotation records).

Observed decision state: Type map correctly chose Primary DT-01 / Secondary
DT-02. DT-02 exited DEFEND_WITH_CONDITIONS. DT-13 (Crew Hours) exited SETTLE
via contested gate DT13-G2. Overall verdict took DT-13's SETTLE.
Classification panel simultaneously showed "Extraordinary — Initial Position:
Defend". CRIT condition shown: "Contested gate in DT-13 — EC chain not clean."

---

## DEFECT 1 — Negation blindness engaged the wrong tree (root cause)

"The crew were operating **within hours** and **did not need** replacing" is a
negative assertion — crew is expressly NOT in issue. The classifier matched
crew+hours keywords and ran DT-13.

**Fix:** negation guard in the classifier. Before a keyword activates a bank,
scan a ±6-word window for negators: `not, no, without, within (hours|limits),
did not, no need, unaffected, remained legal, in hours`. A negated hit must
SUPPRESS the bank (and can log "crew expressly excluded — noted as strength").
Crew tree activation should require positive assertion: `crew sick / out of
hours / FDP exceeded / discretion used / could not be replaced`.

**Test:** this exact narrative must NOT run DT-13, and should add
"Crew within FDP — no crew issue" to the strengths column.

## DEFECT 2 — Missing evidence scored as adverse finding

DT13-G2 "full rotation on file?" = NO (nothing uploaded yet — a fresh case)
→ "EC chain not clean" → SETTLE. Absent documents are the NORMAL state of a
new case, not a defence failure.

**Fix:** gates must be tri-state: `YES / NO / UNKNOWN(evidence-pending)`.
- UNKNOWN ⇒ exit **DEFEND_HOLD** (conditions list = the missing items).
- SETTLE requires an affirmative adverse finding on evidence actually seen
  (EC absent, RM failure shown, chain affirmatively broken).
This is the DEFEND_HOLD exit state from the plan review — implement it as a
first-class verdict.

## DEFECT 3 — Worst-of-all-trees aggregation

The final position took the worst exit of ANY tree that ran (DT-13 SETTLE),
overriding the primary (DT-01) and the supportive secondary (DT-02
DEFEND_WITH_CONDITIONS).

**Fix:** the PRIMARY tree exit drives the headline position. Secondary exits
attach as conditions/risk notes. If the primary tree cannot produce an exit
(see Defect 4), fall to the highest-priority secondary per the type map —
never min() across unrelated trees.

## DEFECT 4 — Primary tree DT-01 has no gates

Decide showed "DT-01 · Primary — No gate detail for this tree." The chosen
primary is a stub, so the verdict fell through to secondaries.

**Fix:** build DT-01 gates (minimum viable):
- G1: ATFM/CTOT restriction evidenced? (Eurocontrol record / regulation ref)
- G2: Restriction third-party imposed (not carrier request)? — Moens
- G3: Weather/strike/staffing driver upstream? route context to DT-02 etc.
- G4: Delay attributable to restriction (delay codes 81–89 / OCC log)?
- G5: RM — earlier slot sought, swap/reroute considered?
- Exits: DEFEND_WITH_CONDITIONS / DEFEND_HOLD / SETTLE (affirmative failures only)

## DEFECT 5 — Sturgeon threshold never gated the verdict

EZY848 arrival delay = 2 hours ⇒ **no Art 7 compensation exposure on that
sector regardless of cause**. Engine assessed defence anyway and never
surfaced non-compensability. U-5 (delay threshold) exists in the universal
nodes but doesn't precede the position.

**Fix:** per-sector quantum pre-gate, FIRST in the verdict sequence:
- delay < 3h ⇒ sector flagged NOT COMPENSABLE (Art 7) — defence moot;
  Art 9 care/expenses may still apply.
- Verdict must be per-sector: EZY848 "No compensation due — below threshold";
  EZY849 assessed on its own delay (if unstated, EVIDENCE_HOLD for the
  arrival time — do not assume).

## DEFECT 6 — On-screen contradiction

"Classified: Extraordinary — Initial Position: Defend" (classification card)
rendered alongside "Settle recommended" (position card). Two subsystems
disagreeing on one screen destroys lawyer trust.

**Fix:** single verdict authority — the tree aggregate (post Defects 2–4
fixes) owns the position; classification card shows classification only, no
position language. If they diverge internally, render "Position under
review — see gates" rather than both.

## DEFECT 7 — Redaction leak on public page (policy breach)

Visible on live page: "MAX OPS — Passenger Communications", "DPM Notes",
"Connected Portal — Flight Plans & Scratchpads", and source ids `tops`,
`safetynet`, `hermes`, `max_ops`, `dpm`, `connected`, `ogimet` label mix.
Carrier-specific internal system names must not appear (standing redaction
rule).

**Fix:** generic labels throughout EVIDENCE_DB source tags:
`ops_delay_records`, `safety_reports`, `acars_log`, `pax_comms`,
`duty_manager_notes`, `flight_planning_portal`. Ogimet/Met Office/
Flightradar24 are public sources — fine to keep.

---

## FEATURE FIX — Occurrence-first event cards (LOF factual workflow)

Current: "Aircraft diversion — VLC" with body focused on cause.
Required: state WHAT happened with its key facts, THEN why.

Template per event card:
```
TITLE:    [Flight] [OCCURRENCE] — key fact
          e.g. "EZY848 DIVERTED → VLC (planned MAN–BCN)"
LINE 1:   Occurrence details: planned vs actual routing, times where known,
          e.g. "Planned BCN; landed VLC. Arrival delay 2h 00m."
LINE 2:   Cause: "Due thunderstorm activity over BCN (TS at destination)."
LINE 3+:  Evidence chips as now.
```
Occurrence detail fields per type: DIVERTED → alternate + planned dest +
arrival delay; CANCELLED → point of cancellation + pax count; DELAYED →
duration + phase (ground hold/airborne); AOG → location + tail; RETURNED →
airport returned to. The occurrence line is factual record; the cause line is
analysis. Keep them separate and in that order.

---

## REGRESSION SUITE (run all after fixes)

1. This repro case ⇒ EZY848 not compensable; EZY849 DEFEND_HOLD/DEFEND_WITH_CONDITIONS. DT-13 not engaged.
2. Same case + "captain went sick at VLC" ⇒ DT-13 legitimately engages.
3. EZY4470/4471 weather+ATFM+fuel case ⇒ primary DT-02 or DT-01 per type map, no DT-13.
4. Fresh narrative, zero evidence marked ⇒ never SETTLE; DEFEND_HOLD with conditions.
5. "Waited 40 mins for connecting passengers" ⇒ T-656 causal gate flags discretionary decision.
6. 2h50m delay ⇒ not compensable flag; 3h05m ⇒ compensable.
7. Page-wide grep: no `tops|safetynet|hermes|max.?ops|dpm|connected portal` in rendered output.

*Priority order: 2 → 3 → 1 → 5 → 4 → 6 → 7 (aggregation and hold-state first —
they fix the verdict class; then negation; then threshold; then content).*
