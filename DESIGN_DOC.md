# Technical Design Document (TDD)

## 1. Design overview

NoticeDecoder follows a **human-reviewed, deterministic core**. Text extraction proposes event records; validation flags incomplete data; the user confirms/corrects the records; the rule engine computes clashes; the UI explains findings; and only reviewed records are exported.

### System boundaries
- **Core:** notice input, extraction for supported patterns, editable records, deterministic clash analysis, action recommendations, timeline, `.ics` export.
- **Optional:** model-assisted semantic extraction and OCR.
- **Demo-only boundary:** faculty pre-publish mode uses bundled sample timetable data unless an actual approved integration is built.

## 2. Processing pipeline

1. **Input:** paste text, or load the official example fixture.
2. **Normalize carefully:** preserve original notice for evidence; create a normalized working copy for whitespace and common text variants such as `12:00 noon`.
3. **Segment:** split by sentence/line while protecting quoted titles and common abbreviations where feasible. Keep raw source ranges so a detected field can point back to its source.
4. **Find event candidates:** use event keywords and temporal patterns to group text into candidate events. A candidate may span more than one sentence; do not assume every sentence is exactly one event.
5. **Extract fields:** title, type, date, start/due/end time, venue, audience. Use explicit patterns for the supported PS formats. Optional AI may fill a semantic gap but must return structured data and a source snippet.
6. **Normalize and validate:** validate calendar date existence, time bounds, end-after-start for ranged events, and complete required fields. Missing/ambiguous year must remain a review issue.
7. **Human review:** present the source snippet and make each field editable. User edits override extracted values.
8. **Recompute:** pairwise clashes, busy windows, travel-risk hints (only if travel data is configured), and actions are derived from the reviewed event list.
9. **Export:** generate `.ics` only from the final reviewed version.

## 3. Data model

```ts
export type EventType = "Test" | "Deadline" | "Lecture" | "Other";
export type FieldStatus = "matched" | "inferred" | "needs-review" | "missing" | "user-confirmed";

export interface ReviewedEvent {
  id: string;                 // Stable ID, e.g. crypto.randomUUID() in browser
  title: string;
  type: EventType;
  dateISO: string;             // YYYY-MM-DD, local campus date
  startTime: string;           // HH:mm; for Deadline this is the due instant
  endTime: string;             // HH:mm; equals due instant in core deadline logic
  venue: string | null;
  audience: string | null;
  timeZone: string;            // e.g. Asia/Kolkata
  rawSource: string;
  sourceSpans?: Array<{ start: number; end: number }>;
  fieldStatus: {
    title: FieldStatus;
    type: FieldStatus;
    date: FieldStatus;
    startTime: FieldStatus;
    endTime: FieldStatus;
    venue: FieldStatus;
    audience: FieldStatus;
  };
  confirmed: boolean;
}
```

A user-confirmed edit should update the field's status to `user-confirmed`. Do not treat a numeric confidence estimate as a calibrated probability unless the system has been evaluated and calibrated.

## 4. Date/time normalization policy

- `13 Nov 2026` → `2026-11-13`
- `13 Nov` → month/day known; year requires context or user confirmation
- `13/11/2026` → `2026-11-13` under the displayed Indian `DD/MM/YYYY` policy
- `2 PM` → `14:00`
- `14:00` → `14:00`
- `12:00 noon` or `12 noon` → `12:00`
- `12 midnight` → `00:00`

Validation rules:
- Reject impossible dates such as `31/02/2026`.
- Reject impossible times such as `25:90`.
- For ranged events, end time must be after start time on the same date unless explicit overnight-event support is added.
- If a notice only gives a start time for a lecture/test, do not silently invent a one-hour duration. Flag end time as missing and offer a clearly labelled editable suggestion (e.g. “suggest 60 minutes”), requiring confirmation.
- Deadlines are modeled as a point for conflict logic. They are represented differently in calendar export so the exported event has a valid duration.

## 5. Deterministic clash engine

Use minutes after local midnight for calculations. Events are only compared directly when their normalized date matches. Ranged event intervals use a half-open convention `[start, end)`: an event ending at 11:30 and another starting at 11:30 do not overlap.

### Case A — Two ranged events
For events A and B:

```text
overlapStart = max(A.start, B.start)
overlapEnd   = min(A.end, B.end)
clash        = overlapStart < overlapEnd
overlapMins   = max(0, overlapEnd - overlapStart)
```

On the sample: Internal Test 2 `[10:00, 11:30)` and Guest Lecture `[11:00, 12:30)` overlap `[11:00, 11:30)` for 30 minutes.

### Case B — Deadline against a ranged event
A deadline D at time `t` clashes with ranged event E if:

```text
E.start <= t && t < E.end
```

This is a containment warning, not a duration overlap. The upper bound is exclusive: a deadline exactly at an event's ending time is not considered inside that event. If the team chooses a different policy for a real institution, make it explicit and test it.

On the sample, the 12:00 deadline falls inside the Guest Lecture `[11:00, 12:30)`, but not inside the Test `[10:00, 11:30)`. Thus the required pairwise outcomes are preserved.

### Case C — Deadline vs deadline
The PS does not define this case. Treat deadlines at the same due instant as a **deadline collision warning** (not a duration overlap) so the user can prioritize tasks. Different due instants do not clash under the basic model; any added “nearby deadlines” warning must be labelled as a heuristic.

### Case D — Travel-buffer warning (optional)
When event A ends at venue X and event B begins at venue Y:
- Only evaluate this if the venues differ and configured travel time is available.
- `gapMinutes = B.start - A.end`.
- If `0 <= gapMinutes < estimatedTravelMinutes`, flag **Travel risk**, not hard time overlap.
- If travel time is unknown, say it is unknown; do not assume 10 minutes universally.
- Do not let travel risk change the PS-required hard-clash result.

For more than two events, a simple O(n²) pairwise pass is the clearest approach for a typical notice. A sorted sweep can merge busy windows in O(n log n). An interval tree is not necessary for the MVP unless real data volume proves a need.

## 6. Compound busy-window and deadline feasibility insight

Pairwise clash checking answers: **“Which pairs conflict under the time rules?”** It does not fully answer: **“Can the student realistically complete the task at the required venue before the deadline?”**

For the sample:
- Internal Test: 10:00–11:30
- Guest Lecture: 11:00–12:30
- Combined occupied union: 10:00–12:30 because the two intervals overlap
- Lab-record deadline: 12:00 at the Department Office

The UI should keep the official pairwise matrix intact, then show a distinct contextual insight:

> **Deadline risk:** The 12:00 PM submission falls during a schedule block that starts at 10:00 AM and continues until 12:30 PM. Safest option: submit the record before 10:00 AM, or confirm with the department whether a late handoff/alternate submission is acceptable.

This is deliberately framed as a recommendation, not proof of physical impossibility. The sample does not give walking time, attendance rules, or whether the student can leave the lecture/test venue.

Implementation: sort non-deadline intervals by start; merge intervals whenever `next.start <= current.end`; then inspect whether a deadline lies inside a merged block. Use the deadline venue and optional configured travel estimate when constructing more specific recommendations.

## 7. Recommendation rules

Recommendations must be deterministic, factual, and editable. Prioritize rules such as:

1. **Test vs lecture overlap:** state the exact overlap window; suggest contacting the lecture coordinator to clarify attendance, a recording, or an alternate session. Do not assert that tests always take precedence.
2. **Test vs test overlap:** mark as high priority and suggest escalation to the Exam Cell.
3. **Deadline contained in an event/busy window:** advise early submission or confirmation of an alternate process; include the reason.
4. **Travel-buffer issue:** advise confirming venue logistics or moving one event if possible; state that the travel estimate is configurable.
5. **Insufficient or ambiguous data:** ask the user to fix the data rather than manufacturing a confident resolution.

When the user clicks **Draft message**, generate a copyable editable draft, for example:

> Subject: Schedule conflict on 13 November 2026  
> Hello, I noticed that Internal Test 2 (10:00–11:30 AM in Room 204) overlaps with the AI in Healthcare guest lecture (11:00 AM–12:30 PM in Seminar Hall) from 11:00–11:30 AM. Could you please clarify the expected attendance arrangement or whether an alternative is available? Thank you.

The user chooses whether and where to send it. Do not claim it has been sent.

## 8. Calendar export design

Target iCalendar interoperability under [RFC 5545](https://www.rfc-editor.org/rfc/rfc5545.html). The standard requires a `DTEND` value later than `DTSTART` for a `VEVENT`; therefore, do **not** export a deadline as a zero-length event.

Recommended export convention:
- Ranged event: exact reviewed start and end.
- Deadline: create a small visible calendar block ending at the due time (e.g. `DTSTART = dueTime - 15 minutes`, `DTEND = dueTime`) and label the summary clearly, e.g. `[DEADLINE] Lab record submission — due 12:00 PM`. The 15 minutes is a calendar display convention only; it must not alter deadline clash calculations.
- Add a `VALARM` only when appropriate and supported by the chosen exporter. For a deadline with only a 15-minute display block, a 30-minute-before alarm would fire before the event starts, which may be confusing; choose a meaningful reminder policy per event type and document it.
- Use stable UIDs across repeated exports of the same event; do not generate a new UID from `Date.now()` every time if update/deduplication is desired.
- Generate `DTSTAMP` as a real current UTC timestamp, not from the event date.
- Escape backslashes, commas, semicolons, and newlines in text properties; fold long content lines according to RFC 5545.
- Include `SUMMARY`, `DTSTART`, `DTEND`, `UID`, `DTSTAMP`, and relevant `LOCATION`/`DESCRIPTION` properties.
- State and test the timezone strategy. Do not label campus-local wall-clock times as UTC by appending `Z`.
- Use `CRLF` line endings and verify the resulting file in a common calendar app.

For reminders, a sensible initial policy is 30 minutes before a test/lecture and 12–24 hours before a deadline (if the product intentionally supports that reminder). The user must be told what reminder has been added.

## 9. UX design specifications

### Main workspace
1. **Header:** product mark, selected cohort indicator, Student / Pre-publish Demo switch.
2. **Input panel:** paste area, sample loader, character count, clear empty/error state. OCR upload is secondary until it works.
3. **Review panel:** compact editable event cards on mobile; table/grid on desktop. Each field has a visible label, validation state, and source evidence expandable on demand.
4. **Timeline:** time ruler, event bars, deadline marker, labels for overlapping intervals. Never rely on color alone.
5. **Clash matrix:** pair label, status, exact time window/minutes, explanation. Include “No direct clash” for the test/deadline pair.
6. **Action panel:** one or two prioritized recommendations with “Copy draft” and “Mark reviewed” actions.
7. **Export panel:** disabled until required fields are reviewed/valid; show what will be exported and offer `.ics` download.

### Visual direction
- Calm, high-contrast product UI; light canvas or restrained dark theme, not both competing at once.
- Use red/orange/green only as supplementary status hints and pair every color with text/icons.
- Strong typography hierarchy, ample spacing, concise event names, and explicit time ranges.
- On phones, stack the review cards, timeline, matrix, and actions vertically; do not force a wide desktop table.
- Keep primary flow to one obvious action at a time: **Decode → Review → Resolve → Export**.

## 10. Error states

- Empty input: “Paste a college notice or load the PS-02 sample.”
- Text has no recognizable events: explain expected date/time examples and let the user retry.
- Some event fields missing: render an editable draft card with `Needs review` rather than dropping it without explanation.
- Ambiguous year: require user confirmation before export.
- Invalid start/end: show inline correction with the exact rule.
- AI unavailable: continue in rule-based mode and show a small non-blocking notice only if AI was requested.
- Export failure: preserve event state and display a retry message; do not erase the user’s review.

## 11. Privacy and security

- Process the baseline parser locally in the browser when practical.
- Do not persist notice text without consent.
- In AI mode, disclose that text is sent to an external provider and send only what is needed.
- Keep model keys in server environment variables.
- Parse model output as untrusted input; enforce schema and maximum lengths.
- Render notice text as text, not HTML; escape content in message drafts and calendar fields.
- Avoid uploading private notices to public log services.

## 12. Test plan

### Required fixtures
- Exact PS-02 sample produces three intended events and exact pairwise result text.
- `13 Nov 2026`, `13 Nov`, `13/11/2026`, `14:00`, `2 PM`, `12:00 noon`, and `12 noon`.
- Event boundary: 10:00–11:00 and 11:00–12:00 = no direct overlap.
- Partial overlap: 10:00–11:30 and 11:00–12:30 = 30 minutes.
- Containment: 12:00 deadline inside 11:00–12:30 = warning.
- Deadline at 12:30 and event 11:00–12:30 = no containment under half-open policy.
- Invalid date/time, absent year, absent venue, absent end time, empty notice, unrelated text.
- Editing an event immediately updates the clash matrix and timeline.
- `.ics` contains escaped text, stable UIDs, valid timestamps, non-zero event durations, and opens in a target calendar.

## 13. Implementation decision record

- **Decision:** Start with explicit deterministic rules for the named PS formats.  
  **Reason:** judges can inspect correctness, and the demo does not depend on an API.
- **Decision:** Keep AI optional and schema-validated.  
  **Reason:** semantic extraction can help, but time math and validation require deterministic behavior.
- **Decision:** Keep the pairwise matrix separate from compound busy-window advice.  
  **Reason:** preserves the PS's expected results while adding useful product insight.
- **Decision:** Do not implement dynamic webcal/OAuth before the core is stable.  
  **Reason:** these introduce backend, auth, sync, and privacy requirements that do not improve the must-have demo enough to justify their risk.
