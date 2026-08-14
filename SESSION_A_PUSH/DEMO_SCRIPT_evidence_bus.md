# Demo script — Evidence Bus (Etna cascade)

Numbered walkthrough for presenting the Evidence Bus query bar to a lawyer. Two
flights, same rotation, same aircraft (G-EZAB): **EZY7823** (CTA→LGW, 1 Aug
2026 — the flight actually cancelled by the ash closure) and **EZY4412**
(GVA→LGW, 3 Aug 2026 — the flight three sectors downstream that inherits the
disruption). Both live in the same demo case, `DEF-DEMO-ETNA-CASCADE`.

Before presenting: open `repository.html`, confirm you're on a clean session
(no half-finished searches on screen). No other setup needed — the case and
its evidence pack are pre-seeded.

---

## Part A — the cascade moment (EZY4412)

**1. Land on Repository → Live Evidence.**
Say: *"This is the sitewide search — before any case exists, or before you're
sure which case a flight belongs to, you can just ask about the flight."*

**2. Type `EZY4412` and `03/08/2026` into the query bar. Click Search.**
Say: *"This is EasyJet's Geneva–Gatwick service on the 3rd of August."*

**3. Two results appear.** Point at the top one first — the **CASCADE MATCH**
badge. Say: *"This is a METAR — a weather observation — for Catania. Catania
isn't on this flight's route at all. GVA to LGW never goes near Sicily."*

**4. Point at the second result — EVENT CONTEXT**, a Eurocontrol ATFM
regulation for Catania airspace. Say: *"That's supporting evidence too — a
live regulation citing volcanic ash. But the cascade match above is the one
that matters."*

<!-- Session A fix 3: reworded to match the actual render order (confirmed
live on repository.html — CASCADE MATCH always ranks above EVENT CONTEXT,
correctly, since cascade outranks event-context in EvidenceCascadeMatch's
tiering). The original text had this backwards, pointing "top" at EVENT
CONTEXT — a presenter following it literally would point at the wrong card. -->

Read the reason string aloud: *"Cascade match: aircraft G-EZAB — metar at
LICC relates to a prior sector (EZY7822, 2026-07-31), same aircraft. Next
scheduled sector affected: this flight."*

Say: *"The system worked out, on its own, that this aircraft was in Catania
two days before this flight, tied down by an ash cloud, and traced the
knock-on effect three sectors forward to the flight the passenger actually
complained about. That's not something a keyword search on 'Gatwick' or
'Geneva' would ever surface — you'd have to already know to go looking for
Catania."*

**5. Click "Open in case →".**
You land on the case's evidence workspace. Say: *"And because a case already
exists for this flight, it's gone straight there."*

**6. Point at the right-hand "Attached to case" panel — 5 items already there.**
Say: *"This case was opened this morning and the pack is already built:
the VAAC ash advisory that grounded the aircraft, the airport NOTAM, the
ATFM regulation, weather at Catania showing the ash, and weather at Gatwick
showing there was nothing wrong locally — which matters, because it proves
the delay traces back through the rotation, not a separate cause at the
destination."*

**7. Scroll the sidebar down to "Check another flight". Search `EZY7823` /
`01/08/2026`.**
Say: *"If you suspect there's more — another sector this same aircraft flew
— you can check it without leaving the case."*

**8. Click Attach on the result.**
Say: *"That's now six items, all hash-chained."*

**9. Open the case's Repository tab** (`Open workspace` → `Return to Case
Repository tab`, or navigate directly to
`case.html?ref=DEF-DEMO-ETNA-CASCADE&tab=repo`). Scroll down to
**"Compliance audit trail."** Click **"Verify chain."**
Status updates to: **"✓ 6 entries verified · chain intact."**
Say: *"Every attach is logged — who, when, from where — in a tamper-evident
SHA-256 hash chain. If anyone in this list is ever edited or deleted outside
the system, verification fails and it's visible immediately — that's what
this button just recomputed, live, in front of you."*

---

## Part B — the direct hit (EZY7823)

**1. Back on Repository → Live Evidence, search `EZY7823` / `01/08/2026`.**
Say: *"This is the flight that was actually cancelled — the root cause, not
the cascade."*

**2. Point at the DIRECT MATCH badge on the Catania METAR.**
Say: *"Same weather observation as before — but now it's tiered 'direct',
not 'cascade', because Catania *is* this flight's own airport. The system
isn't hardcoded to one tier per item — it re-evaluates the relationship
every time, relative to whichever flight you're asking about."*

**3. No case exists yet for EZY7823 on its own** (only the downstream
EZY4412 case is filed). Point out the "No case yet" state if it appears, or
route through the same Etna case if a picker offers it — the system doesn't
force an attach path that doesn't exist yet.

**If asked: "Why is there no case for EZY7823 — the flight that actually got
cancelled?"**
Say: *"Not every cancelled flight becomes a claim — most passengers accept
rebooking under Article 8. Cases only get opened when a passenger files. This
is realistic, not a gap in the demo: one root cancellation produces several
downstream cascade effects, but the claims that actually land on a legal
team's desk tend to be dominated by the cascade cases — the ones where
passengers had the bigger downstream impact and were more likely to
complain formally."*

---

## What's real vs. seeded — for Q&A

Be ready to answer directly if asked "is this live?":

- **Real, live, unpatched:** the search-to-classification pipeline itself —
  flight resolution, cross-source fetch, direct/cascade/route/event-context
  tiering, attach, and the SHA-256 audit chain. Verified end-to-end against
  the actual production code paths, not a mock.
- **Seeded (offline, like every other demo case in this system — Hartley,
  Taylor, etc. use the same pattern):** the 5 pre-attached evidence items on
  the case, so it reads as complete the moment you open it rather than empty
  until someone searches.
- **Augmented (clearly isolated, one file, `demo_fixture.js`):** two rows
  layered into the *live* METAR and ATFM feeds so the query bar has something
  to find on demo day — the real Etna dates are now a week-plus in the past,
  outside any live snapshot's window. Not a replacement for live data; it
  disappears if that script tag is removed.
- **Explicitly not faked:** the VAAC London ash-advisory source. It's
  access-gated in real life (see `evidence-ash.html`) and genuinely isn't
  live yet — the case's VAAC citation is seeded provenance metadata on an
  attachment, not a claim that the source is live-searchable today.

## Known rough edges (own these proactively, don't wait to be asked)

1. **Live cascade matching works from both the front-door query bar and from
   a case's own "All sources" stream when the case carries rotation data (as
   this one does).** Cases without seeded `case.meta.rotation` — Hartley et
   al. — still can't cascade-match in their main stream, because
   `opensky-flight-tracks` (the source that would supply rotation) is pending
   onboarding. Documenting the general limitation, not a gap for the demo
   case itself.
2. **The Eurocontrol ATFM item has no per-flight filtering** in the real
   system (not something this demo introduced) — it'll appear as a candidate
   in every case's live stream, Etna-relevant or not. Harmless — it's an
   unattached candidate, not something that auto-attaches.
