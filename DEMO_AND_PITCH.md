# Demo Runbook and Pitch

## 1. Judge-demo objective

In three minutes, prove four things in this order:
1. The required PS-02 flow works end-to-end.
2. The clash results are explainable and mathematically correct.
3. The interface helps a student decide what to do next.
4. The business model has a real buyer hypothesis—not just a paid parser button.

Do not demo unfinished OCR, a simulated live sync, or an AI call that may fail.

## 2. Pre-demo checklist

- [ ] App deployed and localhost backup ready.
- [ ] Browser zoom and phone-width layout checked.
- [ ] Load PS-02 Sample button works from a clean state.
- [ ] Exactly three expected events appear.
- [ ] The review table allows at least one field edit.
- [ ] Timeline and matrix update after an edit.
- [ ] Pairwise results show 30-minute overlap, deadline inside lecture, and no direct test/deadline clash.
- [ ] Busy-window recommendation is displayed as a separate risk/action.
- [ ] Message draft copies correctly.
- [ ] `.ics` download tested in a real calendar app.
- [ ] No secrets or live API dependencies required.
- [ ] Faculty mode says the timetable is demo data.

## 3. Suggested three-minute flow

### 0:00–0:25 — Hook and sample load
“College notices often contain several events in one paragraph. Students have to manually extract times, remember deadlines, and notice conflicts themselves. NoticeDecoder turns that paragraph into a schedule they can review and act on.”

Paste or load the official sample. Do not begin with the dashboard tour.

### 0:25–0:55 — Extraction and human review
“Here are the three detected events. Every field is editable, and uncertain values are flagged instead of silently assumed. The source sentence stays visible so the user can check where the value came from.”

Edit one venue or time and show that the derived results update. Avoid editing a field that would distract from the expected sample outcome; reset the fixture immediately after if necessary.

### 0:55–1:35 — The logic differentiator
“The test and guest lecture overlap from 11:00 to 11:30, so that is a 30-minute direct conflict. The 12:00 deadline falls inside the lecture. The test ends at 11:30, so under the PS’s pairwise rules, the test and deadline do not directly clash.”

Then show the separate busy-window insight: “That pairwise result is not the whole student experience. The test and lecture form a continuous occupied window from 10:00 to 12:30. The safest action is to submit before 10:00 or confirm another arrangement with the department. We label this as a risk recommendation because the notice doesn’t state walking time or submission rules.”

### 1:35–2:00 — Action and export
“Instead of leaving the student with a red warning, we provide a factual message they can review and copy to the coordinator, and we export the reviewed schedule as an `.ics` file for calendar apps.”

Show the message draft and export button. Do not claim account sync unless you built OAuth-based synchronization.

### 2:00–2:35 — Business case
“The student workflow is free and drives adoption. The stronger paying-customer hypothesis is the department or Exam Cell: validate a draft notice against a timetable before publishing it to a cohort. Our pre-publish view demonstrates that workflow on sample timetable data. A real pilot would measure confirmed conflicts found and staff time saved before we set pricing.”

If you have the demo mode implemented, switch to it and show one simple comparison. Label bundled timetable data as demo.

### 2:35–3:00 — Close
“Our principle is simple: AI can help interpret messy language, but it should not decide the mathematics or make unreviewed changes to a student’s calendar. NoticeDecoder combines editable extraction, deterministic conflict checks, and clear next actions in one flow.”

## 4. Likely judge questions

**Q: Why not just use ChatGPT?**  
A: “A general model can propose event fields, but users need editable evidence and repeatable time calculations. We make the extraction reviewable and keep conflict decisions in deterministic rules.”

**Q: Is parsing always correct?**  
A: “No parser can guarantee that for arbitrary notices. We support stated formats, show missing/ambiguous fields, and require review before export. The PS fixture is part of our regression tests.”

**Q: How do you make money?**  
A: “Our first buyer hypothesis is institutional pre-publish validation for departments, the Exam Cell, or T&P teams. We’d validate it in a small pilot by measuring confirmed conflicts found and staff time saved. We are not claiming market-validated pricing yet.”

**Q: Does it read Google Calendar?**  
A: “The MVP exports a calendar file. Reading/syncing a user’s existing calendar requires a separate authorized integration and is not implied by the `.ics` download.”

**Q: Is the admin mode connected to a real college timetable?**  
A: “For this demo it uses sample timetable data. A production deployment would require authorized timetable access and institution-specific validation.”

**Q: Why does the test/deadline pair say no clash while you still advise submitting early?**  
A: “Those are two distinct checks. The exact deadline point is after the test ends, so there is no direct pairwise overlap. But another event overlaps the test and continues past the deadline, creating a broader schedule-risk window. The app preserves both facts rather than changing the required pairwise result.”

## 5. Delivery strategy

- One person drives the demo; other team members answer targeted technical/business questions.
- Use the same official sample data on slides, in the app, and in tests.
- Never narrate a future feature as if it is working now.
- If a live feature fails, switch to the tested sample path—not to an unsupported claim.
