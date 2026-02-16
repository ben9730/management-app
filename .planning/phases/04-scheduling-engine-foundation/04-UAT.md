---
status: testing
phase: 04-scheduling-engine-foundation
source: [04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md]
started: 2026-02-16T10:10:00Z
updated: 2026-02-16T12:45:00Z
---

## Current Test
<!-- OVERWRITE each test - shows where we are -->

number: 9
name: Critical Path Shows in Dashboard
expected: |
  Tasks with zero slack (on the critical path) display a count in the "critical tasks" card in the project dashboard header.
  For a simple 2-task chain, both tasks should be critical.
awaiting: user response

## Tests

### 1. FS Dependency Cascade
expected: Create two tasks with an FS dependency. The successor's start date aligns to the day after the predecessor finishes.
result: pass

### 2. Duration Change Cascades to Successors
expected: Change the predecessor's duration (e.g., from 2 to 4 days). The successor's start date moves forward automatically without manual refresh.
result: pass
note: Required fix ca5d20a — removed invalidateQueries from mutation onSuccess to prevent stale refetch overwriting optimistic CPM update. Also fixed Gantt RTL (dir="ltr" on timeline container).

### 3. SS Dependency Aligns Starts
expected: Create an SS (Start-to-Start) dependency between two tasks. The successor's start date aligns to the predecessor's start date (plus any lag). Both tasks should start on the same date if lag=0.
result: pass

### 4. Negative Lag (Lead Time)
expected: Set a negative lag (e.g., -1) on an FS dependency. The successor starts 1 work day before the predecessor finishes, creating overlap between the two tasks.
result: pass
note: Required fixes 112dfc8 (delete cache invalidation) and 968b451 (infinite loop in workingDaysBetween when start > end). FS lag=-1 correctly places Task B on Task A's last day (Feb 19), creating 1-day overlap.

### 5. Dependency Line Visible in Gantt
expected: Switch to Gantt view. A curved line connects the two linked tasks. The line starts from the correct side of the predecessor bar and ends at the correct side of the successor bar (FS: end-to-start).
result: pass
note: Line visible but not the clearest — works functionally.

### 6. Hover Tooltip on Dependency Line
expected: Hover over the dependency line in the Gantt chart. A tooltip appears showing the dependency type and lag (e.g., "FS" or "FS +2d").
result: pass

### 7. Delete Dependency Updates Schedule
expected: Delete a dependency from the DependencyManager in the task edit modal. The successor task's dates should recalculate (it may move to the project start date if no other dependencies exist).
result: pass

### 8. Dates Persist After Page Refresh
expected: After scheduling changes, refresh the page (F5). The CPM-computed dates (ES, EF, start_date, end_date) are still correct — they were saved to the database.
result: pass

### 9. Critical Path Shows in Dashboard
expected: Tasks with zero slack (on the critical path) display a count in the "critical tasks" card in the project dashboard header. For a simple 2-task chain, both tasks should be critical.
result: pass

### 10. Critical Path UX Clarity
expected: Critical path indication in Gantt and dashboard should explain what "critical" means — not just show red/alarm styling that looks like an error.
result: issue
reported: "בגנט מופיע לי הכל באדום ורשום קריטי בלי באמת פירוט של מה הבעיה אם יש"
severity: minor

## Summary

total: 10
passed: 9
issues: 1
pending: 0
skipped: 0

## Gaps

- truth: "Critical path indication explains what 'critical' means — not just alarm styling"
  status: failed
  reason: "User reported: בגנט מופיע לי הכל באדום ורשום קריטי בלי באמת פירוט של מה הבעיה אם יש"
  severity: minor
  test: 10
  artifacts: []
  missing: []

## Feature Requests (out of scope)

- "אופציה לשנות סטטוס משימה מתצוגת הגנט" — Change task status directly from Gantt view
- "שם המשימה לא מוצג בגנט כשהבר קצר" — Task name hidden in Gantt bar when bar is too narrow (shows "...")
