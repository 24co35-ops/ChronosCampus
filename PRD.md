# Product Requirements Document (PRD)

## 1. Product summary

**Product:** NoticeDecoder (Forge Realm PS-02)  
**One-line value proposition:** Turn unstructured academic notices into an editable, conflict-aware schedule and a usable calendar export—with clear reasoning for every warning.

**Primary user:** a college student who receives time-sensitive notices through WhatsApp, email, PDFs, or notice boards.  
**Secondary user:** a Class Representative (CR), faculty coordinator, Exam Cell, or Training & Placement (T&P) team that wants to validate an announcement before broadcasting it.

## 2. Problem statement

Students have to interpret free-form notices containing several dates, events, deadlines, audiences, and venues. Important details get buried, different date/time formats are used, and schedule conflicts may only become obvious after the notice is circulated. Existing generic AI extraction is not enough: students need to correct the output, understand the reason for each warning, and export reliable event data.

## 3. Product principles

1. **Correctness before cleverness.** The clash engine uses deterministic rules; AI is never the authority for time arithmetic.
2. **Review before action.** No event is exported until the user has had the opportunity to review it. Uncertain fields remain visibly uncertain.
3. **Evidence over confidence theatre.** Highlight the source phrase behind a detected value. A percentage is useful only when backed by a calibrated method; otherwise use labels such as `Matched`, `Needs review`, and `Missing`.
4. **No invented facts.** Missing dates, years, end times, or venues must be flagged or explicitly inferred with a visible assumption.
5. **MVP must survive offline model/API failure.** The PS-02 sample and core business rules must work without an AI provider.
6. **Transparent boundary between conflict types.** A time overlap, a deadline falling inside an event, and a travel-buffer risk are different findings and must not be conflated.

## 4. Goals and non-goals

### Goals for the hackathon MVP
- Parse the supplied PS-02 sample into three correct events.
- Support the listed date and time styles: `13 Nov`, `13 Nov 2026`, `13/11/2026`, `2 PM`, `14:00`, and `12:00 noon`.
- Allow full review/editing of title, type, date, start time, end/due time, venue, and audience when available.
- Detect and explain direct event overlaps and deadline containment.
- Produce a useful recommendation for the sample’s compound schedule pressure.
- Export a valid `.ics` file and provide a reliable phone-friendly interface.
- Demonstrate a plausible institutional business case without pretending a real college integration exists.

### Explicit non-goals for the first version
- Production integration with a college ERP, Moodle, Samarth, MasterSoft, or a student information system.
- Full Google Calendar account OAuth/synchronization.
- A public dynamic `webcal://` subscription service.
- A WhatsApp bot, SMS/call alert service, or paid billing workflow.
- Guaranteed multilingual understanding, complete OCR, or perfect parsing of arbitrary notice formats.
- Automatically changing real exam/lecture schedules. Suggestions are proposals for human approval only.

## 5. Core user journeys

### Journey A — Student decodes a notice
1. Opens NoticeDecoder on desktop or phone.
2. Pastes notice text or loads the supplied sample.
3. Selects their cohort (optional) to distinguish relevant and irrelevant events.
4. Reviews extracted event cards/table, with source phrases and missing/ambiguous-field warnings.
5. Corrects any field and sees clash results update immediately.
6. Reviews the pairwise clash matrix, timeline, and recommended actions.
7. Copies a coordinator message if needed and exports reviewed events as `.ics`.

### Journey B — CR/faculty previews a notice
1. Opens **Pre-publish check (demo)**.
2. Selects a demo cohort and sample master timetable.
3. Pastes a proposed notice.
4. Compares the new event(s) with the demo timetable.
5. Sees conflicts before the notice is published.
6. Receives a clear exportable report.

The UI must label this as a demo until the timetable comes from an authorized real source.

## 6. Functional requirements

| ID | Priority | Requirement | Acceptance criteria |
|---|---|---|---|
| FR-01 | P0 | Notice input | Paste text; load one-click PS-02 sample; empty input shows a clear prompt. |
| FR-02 | P0 | Deterministic extraction | Extract title/type/date/time/venue for the sample and supported common formats. Retain the raw source sentence and source spans where feasible. |
| FR-03 | P0 | Review/edit | Every extracted field can be edited before export. Add/delete event controls are useful but secondary to editing. |
| FR-04 | P0 | Missing/ambiguous fields | Missing venue, absent year, ambiguous date, invalid time, or missing end time is marked for review; do not silently invent a definite value. |
| FR-05 | P0 | Pairwise clash checking | Correctly identify test–lecture overlap (30 min), deadline–lecture containment, and no direct test–deadline clash in the supplied sample. |
| FR-06 | P0 | Recommendation engine | Suggest practical actions with a reason. Separate deterministic findings from assumptions (e.g., venue travel time). |
| FR-07 | P0 | `.ics` export | Export reviewed events with valid `VEVENT` fields, stable unique IDs, correct date/time interpretation, escaped text, and valid duration. |
| FR-08 | P0 | Demo reliability | Core sample demo runs without API keys or model connectivity. |
| FR-09 | P1 | Visual timeline | Show event durations, exact overlap window, deadline marker, and conflict labels; update from edited data. |
| FR-10 | P1 | Conflict message | Generate a factual, polite editable email/message including event names, date, time, and overlap. User must review before sending. |
| FR-11 | P1 | Audience/cohort filter | Match audience phrases such as `III-year CSE`; mark relevant/possibly irrelevant events and allow the user to override. |
| FR-12 | P1 | Faculty pre-publish demo | Compare the proposed schedule with bundled sample timetable data; label the result as simulated/demo data. |
| FR-13 | P2 | Image/PDF ingestion | Extract text from PDFs and OCR image-only notices; show OCR text for correction before event extraction. |
| FR-14 | P2 | Optional AI assist | When explicitly enabled, improve semantic classification/title extraction. Validate model output with a schema and never trust it for clash calculations. |
| FR-15 | P2 | Dynamic calendar feed | Authenticated/persistent hosted calendar feed with revocation and privacy controls; not a static URL pretending to be live. |

## 7. Event data requirements

Each event should include:
- `id`: stable unique identifier
- `title`: user-editable event name
- `type`: `Test`, `Deadline`, `Lecture`, or `Other`
- `date`: normalized local date (`YYYY-MM-DD`)
- `startTime`: local time (`HH:mm`)
- `endTime`: local time (`HH:mm`) for ranged events; same as due time for point-in-time deadline logic
- `venue`: string or `Unknown`
- `audience`: extracted audience/cohort if found
- `rawSource`: original sentence/snippet
- `sourceSpans`: optional offsets from the full notice
- `fieldStatus`: matched / inferred / missing / needs-review by field
- `userConfirmed`: boolean or confirmation state
- `timeZone`: default to the configured campus time zone; for the demo, use `Asia/Kolkata`

Avoid presenting an uncalibrated model-generated number such as `96% confidence` as statistically meaningful. A transparent state label and evidence snippet are safer and easier to explain to judges.

## 8. Business model requirements

### Primary hypothesis: institution-paid pre-publish validation
- **Buyer:** Exam Cell, academic administration, T&P cell, department office, or campus IT team.
- **Value:** catch preventable schedule conflicts before a notice is distributed to a cohort.
- **Pilot offer:** free/low-cost proof-of-concept with one department and a small set of authorized timetables.
- **Possible pricing experiment:** per-department or per-campus annual license after validating buyer demand and integration cost. Do not present a specific price as market-validated.
- **Cost drivers:** onboarding and timetable cleanup, support, secure handling of schedules, hosting, and any optional model/OCR usage.

### Secondary hypothesis: free student tool with paid convenience features
The student version should remain useful for free. Potential paid extras could include saved cohort schedules, multiple-calendar feeds, or automation. Do not rely on students paying solely to parse one notice; test willingness to pay before committing to a subscription.

### Monetization proof for the judging demo
Show a believable buyer, repeated institutional pain, what is being sold, why it saves time/reduces errors, and a low-cost pilot path. Use clearly labelled illustrative pricing only if needed, not claimed revenue or proven market size.

## 9. Non-functional requirements

- **Responsiveness:** usable at 375 px width and desktop width; no essential action hidden behind hover.
- **Accessibility:** keyboard-operable inputs, visible focus, labels for form fields, status communicated by text as well as color, adequate contrast.
- **Performance:** deterministic parsing and recalculation should feel immediate for ordinary notices. Do not advertise an unmeasured sub-5-ms guarantee.
- **Reliability:** sample result is stable and does not depend on current time, model temperature, internet access, or random IDs.
- **Privacy:** do not persist pasted text by default. Optional model use requires clear disclosure. Store as little data as possible.
- **Security:** API keys server-side only; validate all model output; sanitize rendered text; don't execute content extracted from a notice.
- **Calendar portability:** target RFC 5545-compatible `.ics`; test with at least one common calendar application.

## 10. Success measures for the hackathon

- Exact PS-02 fixture passes on every demo run.
- All fields can be corrected before export.
- No unexplained/hidden assumptions in date/time extraction.
- Correct pairwise results and exact overlap minutes.
- Valid `.ics` opens and shows the intended events/reminder behavior.
- New user can complete the sample journey in under 90 seconds without coaching.
- Judges can explain the business buyer and key differentiator after the pitch.

## 11. Key risks and mitigations

| Risk | Mitigation |
|---|---|
| Parser misses an event or confuses sentence boundaries | Build the supplied sample as a regression fixture; retain source snippets; let user add/edit/delete events. |
| Ambiguous date such as `04/05` | Apply an explicit locale policy and require confirmation when year/order cannot be determined. |
| AI/network unavailable during judging | Core sample and rules work without AI; include a deterministic demo button. |
| Incorrect `.ics` output | Use a tested library or add escape/folding/UID/date tests; ensure `DTEND` is later than `DTSTART`. |
| Scope explosion | Freeze P0 before OCR, live feeds, or account synchronization. |
| Unsupported monetization assertions | Treat pricing as a hypothesis and show validation steps, not invented traction. |
