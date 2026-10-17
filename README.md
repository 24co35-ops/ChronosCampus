# NoticeDecoder — Forge Realm PS-02

> Turn messy college notices into reviewed events, explain schedule conflicts, and export a calendar that students can trust.

**Hackathon:** SETU 2026 · Forge Realm · Problem Statement PS-02  
**Working product name:** NoticeDecoder  
**Product direction:** a student-first notice-to-action tool, with a future faculty-side clash-prevention workflow.

## The problem
College notices arrive as paragraphs in group chats, PDFs, screenshots, and notice-board photos. Dates, deadlines, venues, and time ranges are easy to miss. A basic parser can extract events but still fail at ambiguous dates, mislabel an event, or miss the real-world consequence of a conflict.

## The solution
NoticeDecoder turns a notice into a **reviewable schedule**, not an unquestioned AI answer:

1. Paste a notice or load the PS-02 sample.
2. Extract event titles, types, dates, times, venues, and audience hints.
3. Review and correct every detected field before export.
4. Inspect exact pairwise clashes and a separate deadline-feasibility warning.
5. Get practical next actions and copy a conflict-resolution message.
6. Export a standards-conscious `.ics` calendar file.

## Why this approach is different
- **Deterministic clash logic:** the model does not decide whether two times overlap. Explicit interval rules do.
- **Human review before export:** uncertain fields are visible and editable; no silent assumptions about missing years or times.
- **Two levels of reasoning:** a pairwise clash table matches the problem statement, while a separate busy-window analysis surfaces risky deadlines.
- **Evidence-aware extraction:** show the source phrase that supports each detected field where possible.
- **Demo resilience:** core sample and clash logic must work without an AI API key. Optional AI may help with ambiguous titles or event classification, but it never overrides deterministic time math.
- **Honest product boundary:** faculty pre-publish validation is a demo mode backed by sample timetable data until a real institution integration exists.

## PS-02 example outcome
For the fictional notice in the problem statement, the reviewed events should be:

| Event | Type | Date | Time | Venue |
|---|---|---|---|---|
| Internal Test 2 | Test | 13 Nov 2026 | 10:00–11:30 | Room 204 |
| Lab record submission | Deadline | 13 Nov 2026 | Due at 12:00 | Department office |
| Guest lecture: AI in Healthcare | Lecture | 13 Nov 2026 | 11:00–12:30 | Seminar Hall |

Expected pairwise results:
- **Test ↔ Lecture:** clash from 11:00 to 11:30 (30 minutes).
- **Deadline ↔ Lecture:** the 12:00 deadline falls inside the lecture window; flag it.
- **Test ↔ Deadline:** no direct pairwise clash; the test ends at 11:30, before the 12:00 deadline.

The separate **deadline-feasibility insight** should note that the schedule is effectively occupied from 10:00 to 12:30 once the overlapping test and lecture are considered. Recommend submitting the record before the first event, or confirming a workable handoff/exception with faculty. Do not claim the deadline is mathematically impossible unless venue travel time and attendance assumptions are known.

## Planned stack
See [`TECH_STACK.md`](TECH_STACK.md) for the rationale and optional integrations. Recommended MVP: Next.js App Router, TypeScript, Tailwind CSS, small accessible UI primitives, a deterministic extraction layer, a pure TypeScript clash engine, and an RFC-5545-aware calendar export implementation or tested library.

## Quick start (once the app scaffold exists)

```bash
npm install
npm run dev
```

Open the local URL shown by Next.js, then choose **Load PS-02 Sample** and run the full workflow. The repository must include the sample notice and expected results as a deterministic fixture; never depend on a live model response for the judge demo.

If starting from scratch:

```bash
npx create-next-app@latest notice-decoder --typescript --tailwind --eslint --app
cd notice-decoder
```

Install the dependencies that are actually used by the implementation (see `TECH_STACK.md`). Avoid adding libraries simply to make the stack look more sophisticated.

## Environment variables
The baseline demo should not require any secret keys. If optional AI assistance is added, place its key in a server-only environment variable, for example:

```env
GEMINI_API_KEY=
```

Never expose provider keys through a `NEXT_PUBLIC_` variable, commit `.env.local`, or silently send a notice to a third-party model. Make AI enhancement opt-in and explain that notice text will be transmitted to the configured provider.

## Acceptance test before presenting
- [ ] Loading the supplied PS-02 sample produces exactly three intended events.
- [ ] User can correct title, type, date, start/end time, and venue.
- [ ] Any edit recalculates clashes and timeline from the current reviewed data.
- [ ] Pairwise outputs match all three expected PS-02 results above.
- [ ] Deadline boundary rule is documented and tested.
- [ ] Empty, invalid, incomplete, and ambiguous input produces actionable feedback, not invented fields.
- [ ] Downloaded `.ics` opens in at least one target calendar app and has a valid non-zero duration for each exported `VEVENT`.
- [ ] A live demo succeeds with AI disabled and no network request to a model.
- [ ] Phone-width layout remains usable.
- [ ] Admin validation is labelled **demo data** unless connected to real timetable data.

## Documentation
- [`PRD.md`](PRD.md) — product scope and acceptance criteria
- [`TECH_STACK.md`](TECH_STACK.md) — selected stack and dependency boundaries
- [`DESIGN_DOC.md`](DESIGN_DOC.md) — algorithms, domain model, validation, export, and UI behavior
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — system architecture diagrams and data flow
- [`STRATEGY_AND_GAP_ANALYSIS.md`](STRATEGY_AND_GAP_ANALYSIS.md) — startup critique, scoring plan, and feature prioritization
- [`DEMO_AND_PITCH.md`](DEMO_AND_PITCH.md) — reliable demo sequence and short pitch

## Product honesty
This pack is a build specification, not a claim that every listed feature has already been implemented. OCR, live calendar subscriptions, institutional ERP integrations, automated WhatsApp ingestion, and Google Calendar OAuth are **future/stretch scope** unless the team builds and tests them. The core judged workflow takes priority.
# ChronosCampus
