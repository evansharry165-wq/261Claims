# 261Claims · easyJet Legal — Presenter Guide

Quick reference for delivering the demo. Read this before the session; use `DEMO_SCRIPT.md` as the full talk track.

---

## Before the room

### Technical setup

```bash
cd /path/to/261Claims
python3 -m http.server 8080
# Open http://localhost:8080/index.html
```

- Use **Chrome** or **Edge** — one dedicated browser profile for the demo.
- Serve over **HTTP** (not `file://`).
- Resolution: 1440×900 or 1920×1080; hide bookmarks bar.
- Pre-select user **Sarah Booth** before attendees arrive.
- Do **not** refresh mid-demo — session state is in `sessionStorage`.

### Bookmark these URLs

| Label | URL |
|-------|-----|
| Dashboard | `/index.html` |
| Hartley evidence | `/module4-evidence-workspace.html?ref=AC-2026-0089` |
| Walsh triage | `/module2-case-workspace.html?ref=AC-2026-0091` |
| Walsh CPR | `/module3-cpr-workspace.html?ref=AC-2026-0091` |
| Taylor drafting | `/module5-drafting-workspace.html?ref=AC-2026-0076` |
| Repository | `/repository.html` |
| MI | `/module6-mi.html` |
| French case | `/module2-case-workspace.html?ref=FR-2026-0012` |
| Education Hub | `/module7-education.html` |

### Opening line

> "This is an interactive **concept prototype** — illustrative data, simulated integrations, AI in demonstration mode. It shows how a unified platform *could* work for easyJet Legal."

---

## Persona switcher

Bottom-right avatar on every page. Use these transitions:

| When | Switch to | Why |
|------|-----------|-----|
| Start | Sarah Booth (SB) | Head of Legal Ops view |
| Triage + CPR + Drafting | James Patel (JP) | Solicitor workflow |
| French jurisdiction | Marie Dupont (MD) | MTV mediation, French UI |
| Evidence queue | Emma Hughes (EH) | Specialist vs solicitor view |

---

## What works reliably

| Feature | How to demo |
|---------|-------------|
| Dashboard pipeline & urgent CPR | Open as Sarah Booth |
| Triage AI recommendation | AC-2026-0091 — DEFEND shown on load |
| CPR LOA draft/approve/ICS | AC-2026-0091 CPR workspace |
| Evidence pack builder | AC-2026-0089 — checklist, source tiers |
| Drafting generate | AC-2026-0076 — click Generate, wait ~2s |
| Send via Outlook | After approve — toast appears |
| Repository playbooks | REP-2025-0178 on Cases tab |
| MI charts | module6-mi.html |
| Education AI chat | Suggested question chips work best |
| Multi-language | Switch to Marie Dupont or Carlos García |

---

## What NOT to demo

| Avoid | Reason |
|-------|--------|
| Refreshing the browser | Loses session state (triage decisions, checklists) |
| "Generate draft" on AC-2026-0089 | Case is in evidence stage — use AC-2026-0076 |
| Expecting live TOPS/DISCO pulls | Integrations are simulated |
| Uploading a real LOC unless prepared | Upload creates placeholder case from filename |
| Deep-clicking every evidence source | Some open external URLs (Eurocontrol, Ogimet) |

---

## If something goes wrong

| Problem | Recovery |
|---------|----------|
| Wrong case opens | Use bookmark URL with `?ref=` parameter |
| Empty queue after user switch | Expected — each user sees only their cases |
| AI chat slow | Wait up to 3 seconds; use suggested question chips |
| Page looks unstyled | Confirm you're on `http://localhost:8080`, not `file://` |
| Lost triage state | Reload bookmark URL; re-walk from dashboard |

---

## Anticipated Q&A

**Is this connected to our systems?**  
No — prototype. TOPS, DISCO, AIMS, Eurocontrol are designed-in; production would use API integration behind easyJet's firewall.

**How does AI work?**  
Assists triage classification and draft generation. Solicitor reviews and approves everything. Demo uses pre-built templates with a simulated generation delay. Production would use audited AI with SSO and logging.

**CPR / limitation tracking?**  
Jurisdiction rules engine with configurable deadlines. ICS export for Outlook calendars. England & Wales: 21-day acknowledgement, 91-day response under Pre-Action Protocol.

**France MTV post-Feb 2026?**  
Built-in mandatory mediation flag on French cases. FR-2026-0012 demonstrates the alert.

**Data security / GDPR?**  
Production would be SSO, UK/EU hosting, role-based access, audit trail. This prototype has no backend, auth, or persistence beyond the browser session.

**Can we customize templates?**  
Yes — LOR, Defence, LOA, Part 36 templates are starting points for easyJet house style.

**What about consequential loss?**  
AC-2026-0089 demonstrates the workflow: ESCALATE classification, Montreal Convention denial in LOR, strict proof requirements.

**easyJet branding?**  
Demo is skinned for easyJet — defendant name, EZY flight numbers, Hangar 89 address, orange nav accent.

**Timeline to production?**  
Out of scope for this session — gather feedback on module priority (intake vs evidence vs drafting vs MI).

---

## Demo personas (reference)

| ID | Name | Role | Jurisdiction |
|----|------|------|--------------|
| SB | Sarah Booth | Head of Legal Ops | UK |
| JP | James Patel | Senior Solicitor | UK |
| KR | Kiran Rahman | Solicitor | UK |
| MD | Marie Dupont | Juriste senior | France |
| PL | Pierre Laurent | Juriste | France |
| CG | Carlos García | Abogado senior | Spain |
| IM | Isabel Martín | Abogada | Spain |
| EH | Emma Hughes | Evidence Specialist | UK (evidence team) |

---

## After the demo

- Note which modules resonated most (evidence, CPR, drafting, MI, repository).
- Capture questions on integration priority (TOPS first? mailbox intake?).
- Offer follow-up on production scoping if requested.
