---
status: diagnosed
phase: 05-constraints-manual-mode
source: [05-01-SUMMARY.md, 05-02-SUMMARY.md, 05-03-PLAN.md]
started: 2026-02-17T00:00:00Z
updated: 2026-02-17T09:50:00Z
---

## Current Test

[testing complete]

## Tests

### 1. TaskForm Constraint Controls
expected: Edit any task. Scroll to "תזמון מתקדם" section. See constraint type dropdown (ללא/ASAP/MSO/SNET/FNLT), conditional date picker when selecting MSO/SNET/FNLT, and a manual scheduling checkbox.
result: pass

### 2. Manual Mode Toggle Hides Constraints
expected: In the task form, toggle the "תזמון ידני" checkbox ON. The constraint type dropdown and date picker should disappear (hidden, not just disabled). Toggle it OFF and the constraint fields should reappear.
result: pass

### 3. MSO Constraint Pins Task Start Date
expected: Set a task's constraint type to "חייב להתחיל ב- (MSO)" with a future date. After saving and recalculation, the task's start date should move to that MSO date. A blue "C" indicator dot should appear on the task's Gantt bar.
result: issue
reported: "i try but its look like it didnt save the choise, when i edit its not saved"
severity: major

### 4. SNET Constraint Prevents Early Start
expected: Set a task's constraint to "לא לפני (SNET)" with a future date. The task should not start before the SNET date. If a dependency would push later, the dependency date wins (task starts at whichever is later).
result: issue
reported: "same issue, constraint doesnt save so i cant test this"
severity: major

### 5. FNLT Constraint and Violation Warning
expected: Set a task's constraint to "לסיים לא אחרי (FNLT)" with a date. If the task finishes AFTER the FNLT date, you should see: (a) a red "!" indicator on the Gantt bar, (b) a red tint overlay on the bar, (c) a diamond marker on the timeline at the deadline date, (d) a toast notification about the deadline violation.
result: skipped
reason: Blocked by constraint save bug (same root cause as tests 3-4)

### 6. Constraint Override Toast
expected: Create a task with an MSO or SNET constraint. Then add a dependency where the predecessor finishes AFTER the constraint date. When recalculation runs, a Hebrew toast warning should appear explaining the constraint was adjusted because the dependency pushes the task later.
result: skipped
reason: Blocked by constraint save bug (same root cause as tests 3-4)

### 7. Manual Task Dates Survive Recalculation
expected: Toggle a task to manual mode and set custom start/end dates. Then change a predecessor task's duration. The manual task's dates should NOT change. However, any successors of the manual task should still cascade from its (fixed) dates.
result: skipped
reason: Blocked by constraint save bug — manual mode toggle likely has same persistence issue

### 8. Gantt Manual Task Styling
expected: A task in manual mode should display with a dashed border on its Gantt bar, visually distinguishing it from auto-scheduled tasks. Hovering over it should show "תזמון ידני" in the tooltip.
result: skipped
reason: Blocked — can't get manual task persisted

### 9. Gantt Constraint Tooltip Info
expected: Hover over a constrained task's Gantt bar (MSO, SNET, or FNLT). The tooltip should show the constraint type label in Hebrew and the constraint date.
result: skipped
reason: Blocked by constraint save bug

### 10. No Constraint Default
expected: Create a new task without touching any constraint settings. The constraint type should default to empty (no constraint). No constraint indicators should appear on the Gantt bar.
result: skipped
reason: Blocked — can't verify default vs saved state when saving is broken

### 11. Edit Task Modal UX
expected: The task edit modal should be usable — scrollable, closeable, and not overflow the viewport. All fields should be accessible without fighting the layout.
result: issue
reported: "the edit page is very dense and cant even close normally"
severity: major

## Summary

total: 11
passed: 2
issues: 3
pending: 0
skipped: 6

## Gaps

- truth: "Constraint type and date persist after saving and are loaded back when editing the task"
  status: failed
  reason: "User reported: constraint doesnt save, when i edit its not saved"
  severity: major
  test: 3
  root_cause: "database.ts missing constraint_type/constraint_date/scheduling_mode from tasks Row/Insert/Update types. Migration 007 may not be applied to remote DB. tasks.ts uses 'as never' casts masking PostgREST errors."
  artifacts:
    - path: "flowplan/src/types/database.ts"
      issue: "tasks table type missing constraint_type, constraint_date, scheduling_mode columns"
    - path: "flowplan/src/services/tasks.ts"
      issue: "'as never' casts on lines 111 and 190 bypass type checking, may mask DB errors"
    - path: "flowplan/supabase/migrations/007_add_constraints_manual_mode.sql"
      issue: "Migration may not have been applied to remote Supabase instance"
  missing:
    - "Add constraint_type, constraint_date, scheduling_mode to database.ts tasks types"
    - "Verify migration 007 applied to remote DB"
    - "Remove 'as never' casts after types updated"
  debug_session: ".planning/debug/constraint-fields-not-persisting.md"

- truth: "SNET constraint persists and prevents early start scheduling"
  status: failed
  reason: "User reported: same issue, constraint doesnt save"
  severity: major
  test: 4
  root_cause: "Same root cause as test 3 — database.ts types and possibly unapplied migration"
  artifacts: []
  missing: []
  debug_session: ".planning/debug/constraint-fields-not-persisting.md"

- truth: "Edit task modal is usable — scrollable, closeable, not overflowing viewport"
  status: failed
  reason: "User reported: the edit page is very dense and cant even close normally"
  severity: major
  test: 11
  root_cause: "Modal.tsx has overflow-visible (no containment), no max-height, no scroll on content div. Close button header not sticky. TaskForm has 11 stacked sections. DependencyManager defaults isAdding=true adding ~200px."
  artifacts:
    - path: "flowplan/src/components/ui/Modal.tsx"
      issue: "overflow-visible on dialog (line 139), no overflow-y-auto on content (line 176), no max-h constraint"
    - path: "flowplan/src/components/dependencies/DependencyManager.tsx"
      issue: "isAdding defaults to true (line 48), always showing expanded add form"
  missing:
    - "Add max-h-[90vh] to modal dialog, overflow-y-auto to content div"
    - "Make modal header with X button sticky"
    - "Change DependencyManager isAdding default to false"
  debug_session: ".planning/debug/task-edit-modal-dense-cant-close.md"
