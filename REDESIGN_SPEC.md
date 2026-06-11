# 261Claims — Redesign Specification

**Version:** 1.0  
**Date:** June 2026  
**Status:** Wireframe-level spec for implementation  
**Principle:** *One case. One timeline. One next action. Everything else is context on demand.*

---

## Table of contents

1. [Design principles](#1-design-principles)
2. [Target information architecture](#2-target-information-architecture)
3. [Shared components (new files)](#3-shared-components-new-files)
4. [File-by-file wireframe spec](#4-file-by-file-wireframe-spec)
5. [Files to deprecate or redirect](#5-files-to-deprecate-or-redirect)
6. [Data & routing changes](#6-data--routing-changes)
7. [Demo narrative script](#7-demo-narrative-script)
8. [Implementation phases](#8-implementation-phases)
9. [Feature retention matrix](#9-feature-retention-matrix)

---

## 1. Design principles

| Principle | Current problem | Target behaviour |
|---|---|---|
| **Case-centric** | 9 nav items + 5 duplicate case lists | User always knows which case they're in and what to do next |
| **Progressive disclosure** | All features visible at once | Default view shows 3–5 items; "Show all" reveals power features |
| **Collaboration visible** | Evidence requests buried in workspace | "Waiting on" strip on every case |
| **Stage inside case** | CPR/Evidence/Drafting are top-level nav | Stages are tabs inside one case workspace |
| **Infrastructure vs destination** | Repository competes with Cases | Repository is pull/upload infrastructure; past cases live under Insights |
| **Role-aware, not role-confusing** | EH user sees completely different Evidence page | Same shell, different primary queue |

### Visual language (unchanged)

Keep existing design tokens: navy `#0B1628`, DM Sans, Tabler icons, `.panel`, `.pstat`, pills, progress bars. Simplify *layout and hierarchy*, not the design system.

### New recurring components

```
┌─ CASE HEADER (sticky) ─────────────────────────────────────────────────────┐
│ AC-2026-0089 · Daniel Hartley · HC 1184 · £39,000+ · 🇬🇧 E&W · 3d CPR    │
│ [ESCALATE]  Evidence 35% ████░░░░░  ·  Waiting on: Evidence team (2 items) │
│                                                    [ Primary CTA: ▶ Action ]│
└────────────────────────────────────────────────────────────────────────────┘

┌─ STAGE TABS (not full pipeline) ───────────────────────────────────────────┐
│  Overview │ Triage │ Deadlines │ Evidence │ Documents │ Activity           │
│            ─────────   (current stage underlined; past = ✓; future = dim)  │
└────────────────────────────────────────────────────────────────────────────┘

┌─ WAITING ON (collaboration strip) ──────────────────────────────────────────┐
│ ⏳ Evidence team · REQ-001 · Valencia ground records, passenger care (2d)   │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Target information architecture

### Navigation (4 items + user)

```
[Logo 261Claims]   Work   Cases   Repository   Insights          [User ▾]
```

| Nav item | Replaces | Primary audience |
|---|---|---|
| **Work** | `index.html` (dashboard) | All — daily driver |
| **Cases** | `module2-case-management.html` + module list pages | Legal — case register |
| **Repository** | `repository.html` (evidence filing only) | Evidence team primary; legal pull-only |
| **Insights** | `module6-mi.html` + `education.html` + repository case archive | Management + reference |

**Removed from top nav:** Intake, CPR, Evidence, Drafting, MI, Knowledge (functions move inside Cases or Insights).

### URL structure (target)

| URL | Purpose |
|---|---|
| `index.html` | Work dashboard |
| `cases.html` | Case list (rename from `module2-case-management.html`) |
| `case.html?ref=AC-2026-0089&tab=evidence` | **Unified case workspace** (new shell) |
| `intake.html` | New claim flow (rename from `module1-intake.html`) |
| `repository.html` | Evidence filing store |
| `insights.html` | MI + Guidance + Past cases (new hub) |
| `requests.html` | Evidence team request queue (extracted from `module4-evidence.html` EH view) |

**Legacy redirects:** `module3-cpr.html` → `cases.html?filter=deadlines` · `module4-evidence.html` → `cases.html?filter=evidence` · workspace HTML files → `case.html?ref=&tab=`

---

## 3. Shared components (new files)

### `shared_nav.js` + `shared_nav.css`

Single nav renderer used on **every page including workspaces**.

```javascript
NAV_LINKS = [
  { key:'work',       icon:'ti-layout-dashboard', href:'index.html' },
  { key:'cases',      icon:'ti-briefcase',        href:'cases.html' },
  { key:'repository', icon:'ti-database',         href:'repository.html' },
  { key:'insights',   icon:'ti-chart-dots',       href:'insights.html' },
];
// Evidence team (EH): add { key:'requests', href:'requests.html' } after Work
```

**Case context bar** (when `?ref=` present or `261c_case` in session):

```
Global nav (48px)
Case bar (40px): ← Cases · AC-2026-0089 · Evidence · 3d CPR · [tabs as secondary nav]
Content
```

### `case_helpers.js` (extend `shared_data.js`)

New helpers required across pages:

```javascript
getNextAction(case)      // { text, tab, urgency, blocker }
getWaitingOn(case)       // [{ team, items, since, requestId }]
getStageTab(case)        // default tab from stage
routeToCase(ref, tab)    // case.html?ref=&tab=
```

### `demo_guide.js` (optional first-run)

Dismissible banner on Work dashboard:

> **Demo path:** Open urgent case AC-2026-0089 → Request evidence → Switch to Emma Hughes → Complete request

Stored in `sessionStorage` key `261c_demo_dismissed`.

---

## 4. File-by-file wireframe spec

---

### `index.html` → **Work**

**Role:** Answer "What do I need to do right now?" — nothing else above the fold.

#### REMOVE
- Always-visible search results panel
- 4-stat grid (My cases, Intake queue, CPR watch, Exposure)
- Full 7-column pipeline strip
- Duplicate panels: My cases, Evidence progress, CPR deadlines, Drafting queue (as separate panels)
- Legal news panel
- Network & operations grid
- Team coverage panel
- Quick action chips: Bulk mailbox import, Repository analytics (move to Insights or intake)

#### KEEP (relocated)
- Universal search → compact, single line in header
- Priority urgent strip → becomes **Watch** zone
- `dashboardTasks()` logic → becomes **Do now** list
- `openCase()` routing → update to `case.html`
- Evidence team dashboard (`renderEvidenceDashboard`) → keep as EH variant of Work

#### WIREFRAME — Legal user

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL NAV: Work*  Cases  Repository  Insights                    [SB ▾]      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Good morning, Sarah                                                         │
│ Head of Legal Ops · 6 active cases                                          │
│ [🔍 Search cases…]                              [+ New claim]               │
├─────────────────────────────────────────────────────────────────────────────┤
│ DO NOW                                                          View all →  │
│ ┌─────────────────────────────────────────────────────────────────────────┐ │
│ │ ● AC-2026-0089  Complete key evidence pack          3d URGENT    [Open]│ │
│ │ ● AC-2026-0076  Review AI draft and sign off          7d         [Open]│ │
│ │ ● AC-2026-0101  Review extracted claim (intake)      21d         [Open]│ │
│ └─────────────────────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────────────────────┤
│ WATCH                                                                       │
│ ⚠ AC-2026-0089 · CPR 3d · Evidence 35% · Waiting on Evidence team          │
│ ⚠ ES-2026-0031 · CPR 10d · Eurocontrol pending                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ ▼ Portfolio (collapsed by default)                                          │
│   6 cases · 2 intake · 1 triage · 1 CPR · 2 evidence · 1 drafting          │
│   Indicative exposure: £39,500+                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### WIREFRAME — Evidence user (EH)

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL NAV: Work*  Requests  Repository  Insights               [EH ▾]      │
├─────────────────────────────────────────────────────────────────────────────┤
│ Evidence operations — Emma Hughes                                           │
│ Specialist queue replacing Outlook evidence requests                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ DO NOW                                                                      │
│ ● REQ-001  AC-2026-0089  Gold pack  Valencia ground records, pax care  3d  │
│ ● REQ-002  AC-2026-0091  Bronze     Eurocontrol PDF, MAX OPS comms     21d  │
├─────────────────────────────────────────────────────────────────────────────┤
│ REPOSITORY TODAY                                                              │
│ 14 Mar 2026 · HC 1184 — Gold pack 62% · Passenger care outstanding         │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Implementation notes
- `render()` builds 3 zones: `do-now`, `watch`, `portfolio` (portfolio hidden via `<details>`)
- Head of Legal (SB): portfolio expanded by default; solicitors: collapsed
- Max 5 items in Do now; "View all" → `cases.html?sort=urgency`
- Search: on input, dropdown overlay (not persistent panel)

---

### `module1-intake.html` → **`intake.html` (New claims)**

**Role:** Receive LOC, extract fields, hand off to legal. Not a daily nav destination — entered via `[+ New claim]` on Work.

#### REMOVE
- Global nav item "Intake" (page reachable via CTA only, or Cases → filter intake)
- Competing flows in right panel without tabs

#### KEEP
- Left queue (320px) — intake-stage cases only
- Upload LOC → AI extraction
- Deposit into existing case
- Start triage handoff

#### RESTRUCTURE — Right panel tabs

```
┌──────────────┬──────────────────────────────────────────────────────────────┐
│ NEW CLAIMS   │  [New LOC]  [Add to existing case]              ← tab switch   │
│ (queue)      │                                                              │
│              │  NEW LOC TAB:                                                │
│ [+ Upload]   │  ┌─ Drop zone ─────────────────────────────────────────────┐ │
│              │  │  Upload letter of claim                                  │ │
│ AC-2026-0101 │  └──────────────────────────────────────────────────────────┘ │
│ AC-2026-0094 │  Extracted fields (editable)                                 │
│ ...          │  Initial triage issues (RAG)                                 │
│              │  ┌─ Handoff card ───────────────────────────────────────────┐ │
│              │  │ ✓ Case created · Assigned to [solicitor]                │ │
│              │  │ ✓ CPR clock started                                       │ │
│              │  │ → [Start triage] opens case.html?tab=triage               │ │
│              │  └──────────────────────────────────────────────────────────┘ │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

#### Nav
- Show global nav with **Cases** active (intake is a sub-flow)
- Breadcrumb: `Cases → New claim`

---

### `module2-case-management.html` → **`cases.html` (Cases)**

**Role:** Single canonical case register. Replaces all module list pages.

#### REMOVE
- Separate CPR/Evidence/Drafting list pages (redirect to filtered Cases)
- Stage-only routing without next-action context

#### ADD

| Column | Source |
|---|---|
| Ref | `c.ref` |
| Claimant | `c.claimant` |
| Flight | `c.flightNum` |
| Stage | pill |
| **Next action** | `getNextAction(c).text` |
| **Blocker** | `getWaitingOn(c)` or evidence % |
| CPR | days pill |
| Value | `c.value` |

#### WIREFRAME

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL NAV: Work  Cases*  Repository  Insights                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Cases · 6 assigned                                                          │
│ [🔍 Search]  [All▾] [Intake] [Triage] [Deadlines≤7d] [Evidence] [Drafting] │
├─────────────────────────────────────────────────────────────────────────────┤
│ Ref          Claimant      Flight   Stage     Next action           CPR     │
│ AC-2026-0089 Hartley       HC1184   Evidence  Complete key evid.  3d ⚠   │
│ AC-2026-0091 Walsh         HC 307    Triage    Confirm jurisdiction  21d    │
│ ...                                                                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Behaviour
- Default sort: `cprDaysLeft` ascending
- Row click → `case.html?ref=&tab=getStageTab(c)`
- Filter chips map to `?filter=` query params
- Stat chips row: total, urgent, blocked (optional, single line below header)

#### `[+ New claim]` button → `intake.html`

---

### **NEW: `case.html` (Unified case workspace)**

**Role:** One shell for all stage work. Replaces four separate workspace files.

**Merges logic from:**
- `module2-case-workspace.html` (triage)
- `module3-cpr-workspace.html` (CPR)
- `module4-evidence-workspace.html` (evidence)
- `module5-drafting-workspace.html` (drafting)

#### Layout

```
┌─ GLOBAL NAV ────────────────────────────────────────────────────────────────┐
├─ CASE BAR ──────────────────────────────────────────────────────────────────┤
│ ← Cases │ AC-2026-0089 │ Daniel Hartley │ HC 1184 │ 3d CPR │ [ESCALATE]   │
├─ STAGE TABS ────────────────────────────────────────────────────────────────┤
│ Overview │ Triage │ Deadlines │ Evidence* │ Documents │ Activity              │
├─ WAITING ON (if any) ───────────────────────────────────────────────────────┤
│ ⏳ Evidence team · REQ-001 · 2 items outstanding (requested 2d ago) [View]  │
├─ PRIMARY CTA (sticky bottom or top-right) ────────────────────────────────────┤
│                                    [ Request evidence completion ] (example) │
├─ TAB CONTENT ───────────────────────────────────────────────────────────────┤
│  (stage-specific panel loaded here)                                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Overview (new)
- Case summary card: parties, flight, value, jurisdiction, disruption type
- **Next action** card (large, single CTA)
- Mini timeline: Intake ✓ → Triage ✓ → CPR ✓ → **Evidence** → Drafting → Resolve
- Similar cases (from repository) — 2 cards max, link to Insights
- Jurisdiction alert (if `J.important`)

#### Tab: Triage
*Source: `module2-case-workspace.html`*

**REMOVE from default view:**
- Full-width similar cases panel → move to Overview
- Next-case task list at bottom
- Separate AI block → merge into checklist rows

**KEEP with changes:**
```
┌─ Triage checklist ──────────────────────────────────────────────────────────┐
│ ☑ Jurisdiction confirmed     [AI: ✓ England & Wales applicable]            │
│ ☐ Claim points reviewed      [AI: ESCALATE — consequential loss risk]      │
│ ☐ CPR position recorded                                                    │
│ ☐ Triage note saved                                                        │
├─ Triage note (inline) ──────────────────────────────────────────────────────┤
│ [textarea]                                                                  │
├─ Primary CTA ───────────────────────────────────────────────────────────────│
│ [Advance to Deadlines →]  (disabled until checklist complete)               │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Each checklist row shows inline AI verdict (1 line)
- Jurisdiction alert: compact banner above checklist

#### Tab: Deadlines
*Source: `module3-cpr-workspace.html`*

**REMOVE:**
- Module badge "Module 3"
- Separate document requirements list → fold into checklist

**RESTRUCTURE — LOA stepper:**
```
┌─ Deadline banner ───────────────────────────────────────────────────────────┐
│ 🔴 Acknowledgement due in 3 days · LOA not sent                             │
├─ Key dates timeline (jurisdiction-aware) ───────────────────────────────────┤
│ ● 21d Acknowledge LOC  ● 91d Letter of Response  ○ Limitation review       │
├─ LOA stepper ───────────────────────────────────────────────────────────────┤
│  (1) Decide ● — (2) Draft ○ — (3) Review ○ — (4) Send ○                    │
│  [Decision radios: Acknowledge / Partial / Dispute]                         │
│  [AI draft panel — collapsed until decision made]                           │
├─ CPR checklist (compact) ─────────────────────────────────────────────────────┤
│ ☑ LOC logged  ☐ LOA sent  ☐ Calendar exported                              │
├─ Primary CTA ───────────────────────────────────────────────────────────────│
│ [Advance to Evidence →]                                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Tab: Evidence
*Source: `module4-evidence-workspace.html`*

**REMOVE from default view:**
- 15-button disruption grid on load (disruption pre-filled from case; change via "Edit disruption" link)
- Collapsible disruption summary expanded by default
- Per-item three buttons (Upload / Pull API / Pull repo) → single smart action

**DEFAULT VIEW — "Missing for defence":**
```
┌─ Pack readiness header ─────────────────────────────────────────────────────┐
│ Gold pack: 2/5 key items · 35% · NOT DEFENDABLE          [Request from team]│
├─ Key evidence (K tier only, max 5 visible) ─────────────────────────────────┤
│ ☐ Valencia ground records      [Pull from repository] or [Request]         │
│ ☐ METAR/SIGMET                 [Pull API]                                    │
│ ☑ TOPS flight data             ✓ Attached                                  │
├─ ▼ Supporting evidence (8)  ▼ Reference (4)  ▼ Disruption details           │
├─ Claim points cross-ref (compact table) ──────────────────────────────────────│
└─────────────────────────────────────────────────────────────────────────────┘
```

**KEEP in collapsed sections:**
- Full tier list (K/S/W)
- Disruption summary form
- Bulk pull actions
- Defendability verdict
- Link to repository filing

**Primary CTA:** `[Request evidence completion]` → creates EH queue item; populates Waiting on strip

#### Tab: Documents
*Source: `module5-drafting-workspace.html`*

**REMOVE:**
- Left sidebar always visible → document picker as step 1 of wizard

**RESTRUCTURE:**
```
┌─ Document status ───────────────────────────────────────────────────────────┐
│ LOA ✓ Sent │ LOR ○ Draft │ Defence ○ Not started                            │
├─ Wizard ────────────────────────────────────────────────────────────────────│
│ What do you need?  [Letter of Response ▾]  [Generate draft]                 │
├─ Editor (contenteditable) ──────────────────────────────────────────────────│
│ Evidence pills linked below editor                                          │
├─ Resolution panel (when ready) ─────────────────────────────────────────────│
│ Evidence ✓ · CPR ✓ · [Approve & send] · [Close case → Repository]          │
└─────────────────────────────────────────────────────────────────────────────┘
```

- Document library: dropdown or left drawer toggled by `[All documents]`
- Close & store → marks resolved, writes to repository, toast with link to Insights past cases

#### Tab: Activity
*Source: audit sidebar from all workspaces*

- Full audit trail (moved from right sidebar)
- Add note input at bottom
- **Remove** fixed 300px audit sidebar from all tabs — frees horizontal space

#### Activity sidebar → eliminated
Replace with Activity tab. Optional: floating `[Activity]` button opens narrow drawer on any tab.

---

### `module2-case-workspace.html` → **Redirect**

```
module2-case-workspace.html?ref=X  →  case.html?ref=X&tab=triage
```

Keep file as thin redirect stub during migration, then delete.

---

### `module3-cpr.html` → **Redirect**

```
module3-cpr.html  →  cases.html?filter=deadlines
```

Optional: preserve as `cases.html?filter=cpr-stage` if needed for bookmarks.

---

### `module3-cpr-workspace.html` → **Redirect**

```
module3-cpr-workspace.html?ref=X  →  case.html?ref=X&tab=deadlines
```

---

### `module4-evidence.html` → **Split**

| Audience | New destination |
|---|---|
| Legal users | `cases.html?filter=evidence` |
| Evidence team (EH) | **`requests.html`** (new file) |

#### NEW: `requests.html`

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL NAV: Work  Requests*  Repository  Insights                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ Evidence requests · 2 open                                                  │
│ [Open] [In progress] [Complete]                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ REQ-001  AC-2026-0089  Gold  Urgent 3d                                      │
│ Requested by S. Booth · Missing: Valencia ground, passenger care          │
│ [Open case] [Mark in progress] [Open in repository]                         │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### `module4-evidence-workspace.html` → **Redirect**

```
module4-evidence-workspace.html?ref=X  →  case.html?ref=X&tab=evidence
```

---

### `module5-drafting.html` → **Redirect**

```
module5-drafting.html  →  cases.html?filter=drafting
```

---

### `module5-drafting-workspace.html` → **Redirect**

```
module5-drafting-workspace.html?ref=X  →  case.html?ref=X&tab=documents
```

---

### `module6-mi.html` → **`insights.html` tab: Reporting**

**Role:** Management view — not daily nav for solicitors.

#### REMOVE from standalone prominence
- Full case register table (duplicate of Cases — link to `cases.html` instead)

#### KEEP
- 6 KPI stat cards (condensed to 4: Volume, Exposure, Defence rate, CPR compliance)
- Charts: volume, outcomes, stage pipeline, workload by solicitor
- Risk register
- CPR deadline tracker (links to cases)

#### WIREFRAME — Insights hub with tabs

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL NAV: Work  Cases  Repository  Insights*                              │
├─────────────────────────────────────────────────────────────────────────────┤
│ Insights                                                                    │
│ [Reporting] [Past cases] [Guidance]                                         │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Reporting tab = current module6 content, minus case register table)        │
│ KPI cards → charts → risk register                                          │
│ Each chart segment clickable → cases.html?filter=...                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

### `education.html` + `module7-education.html` → **`insights.html` tab: Guidance**

**Role:** Reference material + AI assistant. Merge both files.

#### MERGE strategy

| From `education.html` | From `module7-education.html` | Result |
|---|---|---|
| 13 sidebar sections | AI chat assistant | Guidance tab with search + chat |
| Article cards | Document library + filters | Unified searchable library |
| — | Platform module guide | Rename to "How 261Claims works" |
| — | Upload modal | Defer / demo-only |

#### WIREFRAME — Guidance tab

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ [Reporting] [Past cases] [Guidance*]                                        │
├──────────────┬──────────────────────────────────────────────────────────────┤
│ SIDEBAR      │  [🔍 Search guidance…]                                       │
│ Regulation   │                                                              │
│ Case law     │  ┌─ AI Assistant ──────────────────────────────────────────┐│
│ Defence      │  │ Ask about EC261, CPR, evidence…                          ││
│ Evidence     │  │ [suggested prompts]                                      ││
│ CPR          │  └──────────────────────────────────────────────────────────┘│
│ How it works │  Article cards / document content                            │
│ ...          │                                                              │
└──────────────┴──────────────────────────────────────────────────────────────┘
```

#### REMOVE
- "Module 1–7" numbering in user-facing copy → use stage names (Intake, Triage, Deadlines…)

#### ADD
- Global search across sections
- Contextual deep links from case tabs (e.g. Evidence tab → "Weather defence guide")

---

### `repository.html` → **Repository (simplified)**

**Role:** Evidence filing infrastructure. Not a three-app command centre.

#### REMOVE
- Gateway hub with 3 cards (Cases / Evidence / Education)
- "Repository Command Centre" hero
- Education from outcomes section → move to Insights → Past cases
- Live-case similarity on repository home → move to case Overview tab
- Green "special" nav styling (equal weight to other nav items)

#### KEEP
- Evidence filing: calendar view + folder browser
- Upload (EH) / Pull (legal) flows
- SharePoint path display
- Category tree (TOPS, DISCO, Eurocontrol, Weather, AMOS…)

#### RESTRUCTURE

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ GLOBAL NAV: Work  Cases  Repository*  Insights                                │
├─────────────────────────────────────────────────────────────────────────────┤
│ Evidence store                                                              │
│ Legal: find and pull files into active cases · Evidence team: upload & file  │
│ [Folder browser] [Operations calendar]                    [+ Upload] (EH)   │
├─────────────────────────────────────────────────────────────────────────────┤
│ (Existing filing-layout: tree │ main │ upload panel)                        │
│ Pull banner (role-specific) — unchanged                                     │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Past cases → `insights.html` tab: Past cases

Move `renderCases()` from repository:
- Outcome tabs (defended / settled / paid / withdrawn)
- Case detail panel with confidence %, recommendation
- Similar-case matching (also surfaced on case Overview)

---

### `shared_data.js`

#### ADD

```javascript
function getNextAction(c) { /* stage-based next action text + tab */ }
function getWaitingOn(c) { /* from 261c_evidence_requests session + seed */ }
function getPrimaryTab(c) { /* map stage → tab name */ }
function CASE_ROUTE(ref, tab) { return 'case.html?ref='+encodeURIComponent(ref)+(tab?'&tab='+tab:''); }
```

#### UPDATE

```javascript
function openCase(ref) {
  var c = getCase(ref);
  if (!c) return;
  sessionStorage.setItem('261c_case', JSON.stringify(c));
  window.location.href = CASE_ROUTE(ref, getPrimaryTab(c));
}
```

#### ADD i18n keys

```javascript
work, requests, insights, deadlines, documents, doNow, watch, portfolio,
waitingOn, nextAction, missingForDefence, newClaim, pastCases, reporting, guidance
```

---

### `nav.js` / `_nav.js`

Consolidate to `shared_nav.js`. Update `NAV_LINKS` to 4 items. Remove duplicate inline nav HTML from every page (long-term).

**Migration approach:** Phase 1 — update `nav.js` links; Phase 2 — extract inline nav to shared include.

---

### `evidence_filing.js`

No schema changes. Update pull targets to reference `case.html?tab=evidence` instead of `module4-evidence-workspace.html`.

---

### `README.md`

Update to reflect:
- 4-item nav and case-centric workflow
- Demo path script (5 min)
- File renames and redirects

---

## 5. Files to deprecate or redirect

| File | Action |
|---|---|
| `module2-case-workspace.html` | Redirect → `case.html?tab=triage` |
| `module3-cpr.html` | Redirect → `cases.html?filter=deadlines` |
| `module3-cpr-workspace.html` | Redirect → `case.html?tab=deadlines` |
| `module4-evidence.html` | Redirect → `cases.html?filter=evidence` or `requests.html` (EH) |
| `module4-evidence-workspace.html` | Redirect → `case.html?tab=evidence` |
| `module5-drafting.html` | Redirect → `cases.html?filter=drafting` |
| `module5-drafting-workspace.html` | Redirect → `case.html?tab=documents` |
| `module6-mi.html` | Redirect → `insights.html?tab=reporting` |
| `education.html` | Redirect → `insights.html?tab=guidance` |
| `module7-education.html` | Merge into `insights.html`, then redirect |

**New files:**
- `case.html` — unified workspace
- `cases.html` — rename from `module2-case-management.html`
- `intake.html` — rename from `module1-intake.html`
- `insights.html` — MI + guidance + past cases
- `requests.html` — evidence team queue
- `shared_nav.js` / `case_helpers.js` (optional split)

---

## 6. Data & routing changes

### Session storage (unchanged keys)

| Key | Use |
|---|---|
| `261c_user` | Active user |
| `261c_case` | Active case object |
| `aeroCaseData` | Legacy payload for workspace readers |
| `261c_evidence_requests` | EH queue |
| `261c_lang` | i18n override |

### New query params

| Param | Values |
|---|---|
| `tab` | `overview`, `triage`, `deadlines`, `evidence`, `documents`, `activity` |
| `filter` | `intake`, `triage`, `deadlines`, `evidence`, `drafting`, `urgent` |
| `sort` | `urgency`, `stage`, `value` |

### Stage → tab mapping

| Stage | Default tab |
|---|---|
| intake | — (intake.html) |
| triage | triage |
| cpr | deadlines |
| evidence | evidence |
| drafting, defence | documents |
| resolve | overview |

---

## 7. Demo narrative script

**5-minute guided path** (for `demo_guide.js`):

| Step | User | Action | Proves |
|---|---|---|---|
| 1 | Sarah Booth (SB) | Open Work → Do now → AC-2026-0089 | Task-first dashboard |
| 2 | SB | Case opens on Evidence tab → see Waiting on / missing items | Case-centric workspace |
| 3 | SB | Click Request evidence completion | Legal → Evidence collaboration |
| 4 | Emma Hughes (EH) | Switch user → Work/Requests shows REQ-001 | Queue replacement |
| 5 | EH | Repository → pull/file evidence → mark complete | Evidence ops |
| 6 | SB | Return → Evidence 80%+ → Documents → generate LOR | Automation payoff |
| 7 | SB | Close case → Insights → Past cases | Learning loop |

---

## 8. Implementation phases

### Phase 1 — Navigation & Work (low risk, high impact)
- [x] Update `nav.js` / `shared_nav.js` to 4 links
- [x] Simplify `index.html` to Do now / Watch / Portfolio
- [x] Add `getNextAction()` and helpers in `case_helpers.js`
- [x] Update `openCase()` to point at `case.html` (unified case shell)
- [x] Add demo guide banner

### Phase 2 — Unified case shell
- [x] Create `case.html` with header, tabs, waiting-on strip
- [x] Port triage content into tab (iframe embed of `module2-case-workspace.html`)
- [x] Port deadlines content into tab (iframe embed of `module3-cpr-workspace.html`)
- [x] Port evidence content into tab (iframe embed of `module4-evidence-workspace.html`)
- [x] Port documents content into tab (iframe embed of `module5-drafting-workspace.html`)
- [x] Add Overview and Activity tabs (inline in `case_shell.js`)
- [x] Redirect legacy workspace URLs (`case_embed.js` → `case.html?ref=&tab=`)

### Phase 3 — Cases & intake
- [x] Rename/enhance case list (`cases.html`) with next-action columns
- [x] Restructure intake with tabs (`intake.html` — New LOC / Add to existing case)
- [x] Remove/redirect module list pages (`legacy_redirect.js`)
- [x] Create `requests.html` for EH

### Phase 4 — Insights & Repository
- [x] Create `insights.html` (3 tabs: Reporting, Past cases, Guidance)
- [x] Merge education hubs (Guidance tab embeds `education.html`)
- [x] Simplify `repository.html` to evidence store only (default to filing view)
- [x] Move past cases to Insights (`insights_data.js`)

### Phase 5 — Cleanup
- [x] Update nav to new URLs (`shared_nav.js`, `nav.js`, cross-page links)
- [x] Legacy module list pages redirect to new URLs (workspace iframes retained)
- [x] Update README

### Phase 6 — Insights Intelligence
- [x] `insights_search.js` — faceted search + URL-synced filters
- [x] `court_profiles.js` — mock court/judge profiles + `CourtDataAdapter` stub
- [x] `insight_engine.js` — similarity, court stats, improvement suggestions
- [x] `insight_tags.js` + `legal_updates.js` — taxonomy + Education cross-links
- [x] `insights.html` — Reporting, Past cases (faceted), Legal intelligence tabs
- [x] Enriched `insights_data.js` schema (court, judge, tags, closedAt)
- [x] Case Overview / Evidence / Drafting integration via `getInsightSuggestions()`
- [ ] Stage 5 live data — replace mock profiles when public API access confirmed

---

## 9. Feature retention matrix

Features marked **hidden** remain in code behind progressive disclosure; none are deleted without explicit approval.

| Feature | Disposition |
|---|---|
| Universal search | **Keep** — compact on Work |
| AI triage DEFEND/ESCALATE | **Keep** — inline in checklist |
| Similar cases | **Keep** — Overview tab (2 cards) |
| Jurisdiction alerts | **Keep** — banner on triage/deadlines |
| LOA AI draft | **Keep** — deadlines stepper |
| 15 disruption types | **Keep** — behind "Edit disruption" |
| K/S/W evidence tiers | **Keep** — default K only; expand for S/W |
| Pull API / Upload / Repository | **Keep** — single smart action per item |
| Request evidence completion | **Keep** — promote to primary CTA |
| Bronze/Gold packs | **Keep** — pack readiness header |
| Document library (6+ doc types) | **Keep** — drawer/wizard |
| AI document generation | **Keep** |
| Close & store to repository | **Keep** — documents tab |
| MI charts & risk register | **Keep** — Insights → Reporting |
| Knowledge 13 sections | **Keep** — Insights → Guidance |
| AI chat assistant | **Keep** — merge from module7 |
| Repository filing tree | **Keep** — simplified repo page |
| Operations calendar | **Keep** |
| Live-case similarity | **Move** — case Overview |
| Past cases archive | **Move** — Insights → Past cases |
| Education from outcomes | **Move** — Insights → Past cases |
| Bulk mailbox import | **Hide** — Insights or intake overflow |
| Legal news feed | **Hide** — Insights optional widget |
| Network tools grid | **Hide** — contextual in evidence pull |
| Team coverage panel | **Hide** — Insights reporting |
| 7-column pipeline strip | **Replace** — one-line portfolio summary |
| Module badges "Module 3" | **Remove** — stage tabs instead |
| Audit sidebar (always visible) | **Replace** — Activity tab |
| Full case register in MI | **Remove** — link to Cases |
| Repository 3-card gateway | **Remove** |
| module7 as orphan | **Merge** |

---

## Appendix: CSS additions

```css
/* New layout classes */
.zone-do-now { margin-bottom: 16px; }
.zone-watch { margin-bottom: 16px; }
.zone-portfolio details summary { cursor: pointer; font-size: 12px; color: var(--text3); }
.case-bar { height: 40px; background: var(--surface); border-bottom: 1px solid var(--border); }
.stage-tabs { display: flex; gap: 0; border-bottom: 1px solid var(--border); }
.stage-tab { padding: 10px 16px; font-size: 12px; border-bottom: 2px solid transparent; }
.stage-tab.active { border-bottom-color: var(--blue); color: var(--blue-text); }
.waiting-on { background: var(--amber-faint); border: 1px solid #FDE68A; padding: 8px 14px; font-size: 12px; }
.cta-primary { position: sticky; bottom: 0; background: var(--surface); border-top: 1px solid var(--border); padding: 12px 24px; text-align: right; }
```

---

*End of spec. Implementation can proceed phase-by-phase; features marked Hidden can be restored on request without architectural change.*
