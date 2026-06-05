# 261Claims · easyJet Legal

An EC261/UK261 passenger compensation claims platform prototype for in-house airline legal teams. Configured for easyJet Legal (UK, France, Spain).

## Running the demo

Serve the repository root with any static web server and open `index.html`:

```bash
python3 -m http.server 8080
# Open http://localhost:8080/index.html
```

Or: `npx serve .`

**Important:** Use HTTP, not `file://`. Pre-select **Sarah Booth** as the demo user.

## Demo materials

| File | Purpose |
|------|---------|
| [DEMO_SCRIPT.md](DEMO_SCRIPT.md) | Full 35-minute talk track with case references |
| [PRESENTER_GUIDE.md](PRESENTER_GUIDE.md) | Quick setup, bookmarks, Q&A, troubleshooting |

## Anchor demo cases

| Ref | Purpose |
|-----|---------|
| AC-2026-0089 | Complex escalation — Hartley, EZY 1184, £39k+ |
| AC-2026-0091 | Clean ATC defend — Walsh, EZY 307 |
| AC-2026-0076 | Drafting — Taylor, EZY 330, LOR ready |
| FR-2026-0012 | French MTV mandatory mediation |

## Modules

1. **Intake** — LOC upload and document deposit  
2. **Cases / Triage** — AI classification, DEFEND/ESCALATE  
3. **CPR** — Jurisdiction deadlines, LOA, ICS export  
4. **Evidence** — Bronze/Gold packs, ops system sources  
5. **Drafting** — LOA, LOR, Defence, Part 36 templates  
6. **MI** — Portfolio reporting and risk register  
7. **Education Hub** — Case law, SOPs, AI assistant  
8. **Repository** — Closed-case learning and evidence calendar  

## Prototype notes

- Static HTML/JS — no backend, database, or authentication  
- AI features run in **demonstration mode** (simulated responses)  
- Case data is illustrative; canonical source is `shared_data.js`  
- Session state persists in `sessionStorage` until browser refresh  
