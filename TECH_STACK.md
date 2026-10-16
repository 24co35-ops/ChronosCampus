# Technology Stack and Rationale

## 1. Recommended stack

| Layer | Recommendation | Why it fits the challenge | Guardrail |
|---|---|---|---|
| Web app | Next.js App Router + React + TypeScript | Fast delivery of a polished, responsive web experience with typed components and an optional server endpoint for AI. Official getting-started docs: https://nextjs.org/docs/app/getting-started | Use the currently supported stable release when scaffolding; pin versions in the lockfile. Do not upgrade during the final demo window. |
| Styling | Tailwind CSS | Rapid consistent spacing, responsive layout, design tokens | Keep a small token system; avoid making every card visually loud. |
| Accessible UI | shadcn/ui or simple local components + Lucide icons | Good form, dialog, table, badge, and button foundations | Use only components needed; verify keyboard use and mobile layout. |
| State | React state/reducer; optionally Zustand if state becomes cross-screen complex | Current MVP can recalculate from a small reviewed event array without a state library | Avoid introducing Zustand only for the architecture diagram. |
| Validation | Zod | Validate event objects and any optional LLM response before use | Invalid records must be shown to the user, not silently coerced into a different event. |
| Date parsing | Custom explicit regex rules for required formats + `chrono-node` as helper | The PS names specific formats; explicit patterns make India-style day/month dates predictable. Chrono supports natural-language date/time parsing and configurable reference times: https://github.com/NotSoBot/chrono-node | Do not rely on Chrono alone to extract multiple events correctly. Supply an explicit reference date, locale policy, and timezone. Validate every result. |
| Extraction | Deterministic segmenter + rules; optional Gemini API behind server route | Stable offline baseline, with semantic help only where it adds value | AI is optional and never determines clash truth. No API key in browser code. |
| Clash logic | Pure TypeScript functions + pairwise comparison | Easy to test, demonstrate, and trust | Keep it separate from UI and LLM modules. Use half-open intervals for ranged events. |
| Timeline | Custom SVG/CSS timeline first | Exact sample timeline is simple; no need for a heavyweight chart dependency | Timeline is a visualization of event data, not the source of truth. Include text/table equivalent. |
| Calendar export | Tested `ics` package or a carefully tested RFC-5545 builder | Avoid hand-waving calendar compatibility | Handle escaped strings, line folding, stable UID, timestamp generation, timezone policy, and non-zero event duration. See RFC 5545: https://www.rfc-editor.org/rfc/rfc5545.html |
| Testing | Vitest + Testing Library (or equivalent already familiar to team) | Fast unit tests for parser and clash engine, plus UI flow tests | At minimum, tests for all PS-02 expected results must run before demo. |
| Lint/type checks | ESLint + TypeScript | Catch obvious defects during fast changes | Run the production build before submission. |
| Hosting | Vercel or another known static/serverless host | Fast demo deployment for a Next.js app | Test deployed environment variables and downloadable `.ics`; also keep localhost demo ready. |
| OCR (stretch) | Browser PDF text extraction first; OCR library/service only for image-only pages | PDF text extraction is simpler and more reliable than OCR where text is selectable | OCR output is uncertain; require text review before extraction. |

## 2. Recommended implementation policy

### Baseline must run without a model
The initial release should parse the official sample and the supported formats with deterministic rules. If a model call fails, times out, returns malformed JSON, or no API key is set, the app must still complete the required workflow.

### AI belongs at the edges
Use an optional model for semantics that are hard to encode as simple rules—for example, proposing an event title or identifying the likely audience in a messy paragraph. Validate the response against a schema, show the source text, and ask the user to review it. Never ask an LLM to decide whether 10:00–11:30 overlaps 11:00–12:30.

### Date and timezone policy
- Use explicit date patterns for the PS-supported examples.
- Interpret slash dates as `DD/MM/YYYY` for the Indian demo locale, and display this policy.
- If no year is present, show **Year needs confirmation** unless the user has configured the academic year or the surrounding notice unambiguously establishes it.
- Store normalized local dates and times separately, with the campus timezone (`Asia/Kolkata` for the demo).
- Do not create a UTC timestamp by appending `Z` to a local wall-clock time. Use a documented timezone-aware conversion or floating local time consistent with the export strategy.

## 3. Suggested dependencies

Install only what the implementation uses. A reasonable starting set is:

```bash
npm install chrono-node zod ics lucide-react
```

UI libraries and test tools can be added when selected:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

If the team writes a custom `.ics` serializer, keep it only if automated tests cover escaping, stable IDs, valid date formatting, reminders, and content-line rules. Otherwise prefer a well-maintained library, then still inspect its output and test it in a calendar app.

## 4. Suggested project structure

```text
notice-decoder/
├── app/
│   ├── page.tsx                  # Main notice-to-action workspace
│   ├── layout.tsx
│   └── api/                      # Optional server-only AI route; not required for core logic
├── components/
│   ├── NoticeInput.tsx
│   ├── EventReviewTable.tsx
│   ├── Timeline.tsx
│   ├── ClashMatrix.tsx
│   ├── ActionPanel.tsx
│   └── AdminPreflightDemo.tsx
├── lib/
│   ├── extraction/
│   │   ├── segmentNotice.ts
│   │   ├── extractEvents.ts
│   │   ├── normalizeDateTime.ts
│   │   └── optionalAiExtractor.ts
│   ├── schedule/
│   │   ├── clashEngine.ts
│   │   ├── busyWindows.ts
│   │   ├── travelRisk.ts
│   │   └── recommendations.ts
│   ├── calendar/
│   │   └── exportIcs.ts
│   ├── validation.ts
│   └── sampleNotice.ts
├── tests/
│   ├── extraction.test.ts
│   ├── clashEngine.test.ts
│   ├── calendarExport.test.ts
│   └── sample-fixtures.test.ts
├── public/
├── .env.example
├── README.md
└── package.json
```

## 5. Avoid for this hackathon

- Microservices, message queues, or a separate Python service for a small deterministic rules engine.
- A database before the product needs accounts, shared timetables, or persistent calendar feeds.
- A complex interval-tree library: for a small notice, straightforward pairwise comparisons are easier to audit and are adequate. Use a sweep-line/interval index only if measured data volume warrants it.
- Multiple AI providers or model routing without a tested need.
- Google Calendar OAuth, WhatsApp automation, and live `webcal://` subscriptions as P0 features.
- Claims of “100% accurate,” “zero hallucinations,” or “sub-5-ms” without a measured test suite and stated limits.

## 6. Build order

1. TypeScript event model and official sample fixture.
2. Parser for the explicit supported date/time styles.
3. Deterministic clash engine and tests.
4. Editable review UI.
5. Timeline, recommendations, and exact sample outcomes.
6. Valid `.ics` export and calendar-app validation.
7. Mobile refinement and accessibility.
8. Optional cohort filter/admin demo.
9. Only then explore OCR or AI enrichment.
