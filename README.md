# 261Claims
Case management for in-house legal and evidence teams handling EC261/UK261 aviation claims.

## Running the demo

Serve the repository root with any static web server and open `index.html`.

GitHub Pages: [https://evansharry165-wq.github.io/261Claims/index.html](https://evansharry165-wq.github.io/261Claims/index.html)

## Site structure

| Page | Purpose |
|---|---|
| `index.html` | **Work** — Do now / Watch / Portfolio |
| `cases.html` | Case register with next-action columns |
| `case.html` | Unified case workspace (Overview, Triage, Deadlines, Evidence, Documents, Activity) |
| `intake.html` | New claim intake (New LOC / Add to existing case) |
| `requests.html` | Evidence team request queue (EH user) |
| `repository.html` | Evidence filing store (SharePoint mirror) |
| `insights.html` | Reporting, faceted past cases archive, and legal intelligence |

Navigation: **Work · Cases · Repository · Insights** (Evidence team sees **Requests** instead of Cases).

## Demo path

1. **Sarah Booth** → Work → open AC-2026-0089 from the demo banner
2. Use case shell tabs or Continue CTA through triage → deadlines → evidence
3. Switch to **Emma Hughes** → complete evidence requests in Repository

Legacy URLs (`module2-case-management.html`, `module6-mi.html`, etc.) redirect automatically.

See `REDESIGN_SPEC.md` for the full redesign plan.
