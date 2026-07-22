# DefendAble — Strategy Notes
### July 2026 — responses to Harry's four considerations

---

## 1. Facts-first or legal-first? (The v2/v3 question)

**Ruling: stay facts-first. The factual workflow is the primary object; legal
workflows are applied to confirmed facts.**

Three reasons:

1. **It matches the product principle.** The system creates the layout; the lawyer
   makes the judgment. A legal-first system pre-judges — it starts with "is this
   defensible?" and bends fact-gathering toward the answer. A facts-first system
   builds the record neutrally and then shows what the law does to it. The second
   is what survives cross-examination.

2. **Facts are the stable element.** The reform lands ~2027. The two-limb test may
   get codified EC lists, care caps, new deadlines. Every legal workflow will need
   updating. The factual workflow — flight, LOF, causation, measures — will not
   change at all. Anchoring the system on the stable layer means reform is a
   content update, not a rebuild.

3. **v2 was never legal-first — it just looked like it.** What made v2 feel better
   was the *display*: the E1→E2→E3 chain where each factual node carried its legal
   test, tree reference, and authority inline. Facts and law woven in one thread,
   verdict at the top, conditions-before-response at the bottom. v3 runs the same
   facts-first pipeline but displays law *after* facts as separate panels — which
   reads as disconnected. The fix is presentation, not architecture:

   **Port into v3: (a) the woven thinking-trail display, (b) the prominent
   verdict-first card, (c) CONDITIONS BEFORE FINAL RESPONSE, (d) IMPO/CRIT
   evidence priorities.** Nothing about the pipeline changes.

---

## 2. The plumbing issue — Ed/Matt call, then Jet2

**The situation:** easyJet (per Dan) still can't reliably pull documents from
their own systems. If Jet2 is behind easyJet on access, the evidence-pull layer
of DefendAble has nothing to plumb into.

**The reframe to take into the Ed/Matt call: DefendAble was accidentally designed
for exactly this situation.** The engine is narrative-first — its input is what
ICC already writes on the day, not a systems integration. That means:

- **The decision layer works with zero plumbing.** Classification, two-limb test,
  quantum, verdict, case law — all run off the disruption narrative alone.
- **The evidence layer degrades gracefully.** Where a plumbed airline would
  auto-pull the METAR and NMOC log, an unplumbed airline gets a *precise,
  minimal, per-claim pull list* — "for this claim you need exactly these four
  documents." That converts an open-ended systems-access problem into a scoped
  retrieval task a human can do in minutes.
- **The pull list is itself the integration roadmap.** Six months of DefendAble
  pull lists tell an airline exactly which systems matter, how often, for which
  claim types — the business case for fixing the plumbing, ranked by claim value.

**Positioning line for Jet2:** *"DefendAble doesn't need access to your systems
to start defending your claims. It needs the disruption summary your ops team
already writes. It hands back a legal position, a quantified exposure, and the
shortest possible list of documents to retrieve. When your systems access
improves, those retrievals automate — but you're defending claims from day one."*

**Sequencing:** raise with Ed and Matt first, agree the "works without plumbing"
narrative, then take it to Jet2 as a strength. Do not let the conversation frame
plumbing as a precondition — it's the roadmap, not the gate.

**Secondary market note:** the claims-company pre-screen use is real and needs no
airline plumbing at all — but keep it as the fallback channel. Airline defence
remains primary; the pre-screen market is validation and revenue while airline
procurement grinds.

---

## 3. Reform urgency — the sales wind

easyJet said it directly: they don't know how they'll need to defend claims under
the new regulation. That uncertainty is the strongest sales condition possible:

- **30-day response deadline** (acknowledge + pay or refuse with reasons) makes
  manual claim triage arithmetically unsustainable at airline volumes.
- **4-day proactive contact** requires disruption→claim infrastructure that
  doesn't exist at most carriers.
- **Codified EC lists + new re-routing/care duties** mean every airline's defence
  playbook needs rewriting — they must re-learn their own defence logic at
  exactly the moment DefendAble arrives with it built in.
- DefendAble's legal content layer (trees, authorities, quantum) is a data
  update when the reform lands — carriers using it inherit reform-readiness.

Line for the deck: *"You will have 30 days to answer every claim, and a new
rulebook to answer them under. The airlines that automate the decision get
compliance; the ones that don't get fines."*

---

## 4. The full-cycle demo — Fable draws the connection to Manage

Sequence to build (after the structured prompt + v2-display port):

1. **Typed disruption** → structured three-section input (spec written, prototype built)
2. **Engine** → factual breakdown → legal workflows applied → verdict + conditions
3. **Lawyer confirms** (G0 facts, G1 opinion) → case packet + decision packet
4. **Sent to platform** → user opens the repository, sees the case: details,
   verdict, evidence-required checklist, document drafts — and can take the
   defence actions from inside the system.

My contribution (Fable): the case packet/decision packet content structure,
document template language, the repository case-view content model, and the
demo script that walks a Jet2/easyJet audience through the full cycle in five
minutes. Cursor: the wiring per the existing integration plan (bridge, type map,
CaseFiling).

---

## Build order (recommended)

| # | Work | Who |
|---|---|---|
| 1 | Structured prompt: 3-section UI + keyword recognition into v3 (spec + prototype delivered) | Cursor |
| 2 | Same sprint: STD/ATD/ATA regex, rotation detection, strengths auto-populate fixes | Cursor |
| 3 | v2 display port: woven trail, verdict-first, conditions card, IMPO/CRIT | Cursor |
| 4 | Decide stage per agreed plan (confirmedRecord → trees → G1 → packets) | Cursor |
| 5 | Keyword bank content expansion + reform content + packet/template language | Claude/Fable |
| 6 | Ed/Matt call → Jet2 positioning (notes above) | Harry |

*The input becomes intelligent first — structure in, structure out — then the
output learns to look like v2, then the cycle closes into Manage.*
