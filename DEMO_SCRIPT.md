# 261Claims · easyJet Legal — Demo Script

**Audience:** easyJet in-house legal team (UK, France, Spain)  
**Duration:** 35–40 minutes (+ 10 minutes Q&A)  
**Format:** Interactive prototype walkthrough — not a live production system

---

## Opening (2 minutes)

> "Thank you for your time. What you're about to see is **261Claims** — a concept prototype of a unified EC261/UK261 claims platform configured for easyJet's in-house legal operation.
>
> Today we'll walk through the full lifecycle: from letter of claim intake, through triage and CPR deadline management, evidence pack building, document drafting, portfolio reporting, and closed-case learning.
>
> The data is illustrative. Integrations with TOPS, DISCO, and Eurocontrol are simulated but designed to reflect how they would work in production. AI-assisted features run in **demonstration mode** — the solicitor always approves before anything is sent."

**Set browser:** Sarah Booth (Head of Legal Ops), dashboard at `index.html`

---

## Act 1 — Command centre (3 minutes)

**Screen:** Dashboard (`index.html`)  
**Persona:** Sarah Booth

**Talk track:**
- "This is the personal command centre for each legal team member."
- Point to **Priority strip** — AC-2026-0089 with 3-day CPR urgency.
- "Pipeline shows cases by stage — intake through resolve."
- "Exposure figure gives indicative claimed value across assigned cases."
- "Universal search finds cases, claimants, flights, and repository records."

**Do not click:** Bulk mailbox import (removed from demo path).

---

## Act 2 — Complex escalation (6 minutes)

**Screen:** Evidence workspace — AC-2026-0089  
**URL:** `module4-evidence-workspace.html?ref=AC-2026-0089`

**Talk track:**
- "Daniel Hartley v easyJet — EZY 1184 LTN to BCN, diverted to Valencia on 14 March 2026."
- "Claimed value £39,000+ — statutory €250 plus £38,250 consequential loss for a missed commercial contract."
- "AI triage classified this as **ESCALATE**, not a routine defend."
- Walk through **evidence checklist**: TOPS green, METAR amber, Valencia ground records red, consequential loss red.
- Show **Bronze/Gold pack progress** — 35% complete, Gold pack blocked on passenger care records.
- "Evidence sources pull from TOPS, DISCO, Eurocontrol — status shows Connected in the demo."
- Optional: submit an evidence request to Emma Hughes (Evidence Specialist).

**Key message:** The platform surfaces high-risk claims before CPR deadlines bite.

---

## Act 3 — Clean defend path (8 minutes)

**Switch persona:** James Patel (Senior Solicitor)  
**Screen:** Triage workspace — AC-2026-0091  
**URL:** `module2-case-workspace.html?ref=AC-2026-0091`

**Talk track:**
- "Rebecca Walsh — EZY 307 MAN to AMS, ATC delay, €250 claim."
- "AI recommends **DEFEND** — ATC ATFM restriction, strong Eurocontrol match expected."
- Show similar-case suggestion from repository (REP-2025-0178 pattern).
- Advance case to CPR stage.

**Screen:** CPR workspace — AC-2026-0091  
**URL:** `module3-cpr-workspace.html?ref=AC-2026-0091`

**Talk track:**
- "Jurisdiction engine tracks CPR Pre-Action Protocol deadlines — 21-day acknowledgement, 91-day response."
- Draft **Letter of Acknowledgement** — show template, edit, approve.
- Export to **ICS calendar** for Outlook integration.
- Compliance checklist tracks LOA sent, evidence started, LOR deadline.

**Key message:** Procedural compliance is built in, not tracked in spreadsheets.

---

## Act 4 — Drafting payoff (6 minutes)

**Screen:** Drafting workspace — AC-2026-0076  
**URL:** `module5-drafting-workspace.html?ref=AC-2026-0076`

**Talk track:**
- "Sarah Taylor — EZY 330 LGW to ALC, weather delay, evidence 100% complete."
- Open **Letter of Response** template.
- Click **Generate draft** — AI spinner (~2 seconds), then full LOR appears.
- "Template is pre-populated with case facts, Wallentin-Hermann arguments, and point-by-point responses."
- Show **Edit**, **Approve**, **Download**.
- Click **Send via Outlook** — toast confirms draft queued.
- Mention Defence, Witness Statement, Part 36 templates available for litigated cases.

**Key message:** Drafting time drops from hours to minutes; quality is consistent and auditable.

---

## Act 5 — Institutional memory (4 minutes)

**Screen:** Repository (`repository.html`)

**Talk track:**
- **Cases tab:** REP-2025-0178 — Oliver James, EZY 442, ATC restriction, defended, 97% confidence.
- "Closed cases become reusable playbooks — evidence used, case law applied, recommended approach."
- **Evidence tab:** Calendar view by operation day — 14 Mar 2026 EZY 1184/EZY 307 evidence file.
- **Education tab:** Law summaries generated from closed-case outcomes.

**Key message:** The platform learns from every case — not just stores files.

---

## Act 6 — Leadership view (3 minutes)

**Switch persona:** Sarah Booth  
**Screen:** MI module (`module6-mi.html`)

**Talk track:**
- Portfolio volume, outcomes, exposure by category.
- Risk register — AC-2026-0089 flagged high (consequential loss unresolved).
- Workload by solicitor, time-to-close trends.
- "This is the view for Head of Legal Ops and leadership reporting."

---

## Act 7 — Multi-jurisdiction (3 minutes)

**Switch persona:** Marie Dupont (Juriste senior, France)  
**Screen:** FR-2026-0012 triage workspace  
**URL:** `module2-case-workspace.html?ref=FR-2026-0012`

**Talk track:**
- UI switches to French.
- **Mandatory MTV mediation alert** — "Since 6 February 2026, médiation préalable is required before court action."
- French limitation (5 years), Tribunal Judiciaire procedure.
- Brief mention of Spanish AESA parallel enforcement for Carlos García cases.

**Key message:** One platform, jurisdiction-aware rules — not three separate tools.

---

## Act 8 — Evidence specialist (2 minutes)

**Switch persona:** Emma Hughes (Evidence Handling Specialist)  
**Screen:** Evidence queue (`module4-evidence.html`)

**Talk track:**
- "Emma sees a different queue — evidence completion requests, not legal drafting."
- REQ-001 for AC-2026-0089 — Valencia ground handling records outstanding.
- "Separates legal workflow from operational evidence gathering."

---

## Act 9 — Knowledge hub (optional, 3 minutes)

**Screen:** Education Hub (`module7-education.html`)

**Talk track:**
- Case law library, SOPs, disruption-type guides.
- **AI assistant** — ask "What is the Wallentin-Hermann test?" or "Does ATC strike qualify as extraordinary circumstances?"
- Demonstrates in-house legal knowledge base + AI, not external research.

---

## Closing (2 minutes)

> "261Claims gives easyJet Legal a single platform for the full EC261 lifecycle — with jurisdiction-aware deadlines, evidence-led defence, AI-assisted drafting, and closed-case learning.
>
> **Roadmap from prototype:** SSO integration, live TOPS/DISCO/Eurocontrol feeds, mailbox intake, production AI with audit trail, and deployment to easyJet's secure environment.
>
> We'd welcome your feedback on priorities — which module delivers the most value first?"

---

## Anchor case reference card

| Ref | Claimant | Flight | Stage | Demo purpose |
|-----|----------|--------|-------|--------------|
| AC-2026-0089 | Daniel Hartley | EZY 1184 LTN→BCN | Evidence | Complex escalation, £39k+, 3d CPR |
| AC-2026-0091 | Rebecca Walsh | EZY 307 MAN→AMS | Triage/CPR | Clean ATC defend |
| AC-2026-0076 | Sarah Taylor | EZY 330 LGW→ALC | Drafting | 100% evidence, LOR ready |
| FR-2026-0012 | Jean-Pierre Moreau | EZY 742 CDG→LTN | Triage | French MTV mediation |
| REP-2025-0178 | Oliver James | EZY 442 LGW→BCN | Repository | ATC playbook |

---

## Q&A preparation

See `PRESENTER_GUIDE.md` for anticipated questions and answers.
