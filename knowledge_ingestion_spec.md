# Knowledge Engine — Ingestion Architecture

## Current state (demo)
knowledge_store.json is manually curated and committed to the repository.
education.html fetches it client-side and renders entries with jurisdiction
and impact classification.

## Production architecture (Phase 2)
Three ingestion pipelines run as scheduled jobs (GitHub Actions or Lambda):

### Pipeline 1: Bailii RSS → Judgments
- Source: https://www.bailii.org/rss/caselaw.xml
- Schedule: Every 6 hours
- Filter: EC261, UK261, air passenger, extraordinary circumstances
- Output: judgment entries in knowledge_store.json

### Pipeline 2: EUR-Lex API → Regulatory updates  
- Source: https://eur-lex.europa.eu/api (REST API, no auth required)
- Schedule: Daily at 06:00 UTC
- Filter: Regulation 261/2004 amendments, CJEU rulings
- Output: regulatory entries in knowledge_store.json

### Pipeline 3: CAA page watch → Guidance updates
- Source: https://www.caa.co.uk/passengers/resolving-travel-problems/
- Schedule: Daily at 07:00 UTC  
- Method: HTTP fetch + SHA-256 hash comparison vs last-seen
- Output: regulatory entries when hash changes

## Downstream propagation
When knowledge_store.json is updated:
1. Evidence checklists query the store for entries matching disruption type 
   and jurisdiction — flash tags surface automatically
2. Triage recommendations reference impact:high entries for the case type
3. Drafting templates check for actionRequired entries affecting the case 
   jurisdiction and update template notes accordingly
4. Team leads receive a digest notification of new high-impact entries
