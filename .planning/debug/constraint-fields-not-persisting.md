---
status: diagnosed
trigger: "Constraint type and constraint_date don't persist when saving a task. User selects MSO/SNET/FNLT constraint type and date in TaskForm, clicks save, but when re-opening the task the constraint fields are back to default."
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:00:00Z
---

## Current Focus

hypothesis: database.ts types missing constraint columns is the primary bug; migration may also not be applied to remote Supabase
test: Traced full data flow from TaskForm -> page.tsx -> tasks.ts service -> Supabase -> back
expecting: Find where fields are dropped
next_action: Return diagnosis

## Symptoms

expected: Constraint type (MSO/SNET/FNLT) and constraint_date persist after saving a task
actual: Fields revert to default when re-opening the task after save
errors: None reported (silent data loss)
reproduction: Select constraint type and date in TaskForm, save, re-open task
started: After constraint fields were added (Phase 05)

## Eliminated

- hypothesis: TaskForm drops constraint fields on submit
  evidence: TaskForm.tsx handleSubmit (line 475-493) explicitly includes constraint_type, constraint_date, scheduling_mode in the submitted data object
  timestamp: 2026-02-17

- hypothesis: page.tsx handleTaskFormSubmit strips constraint fields
  evidence: page.tsx lines 447-459 (update) and 482-495 (create) both include constraint_type, constraint_date, scheduling_mode in the mutation payload
  timestamp: 2026-02-17

- hypothesis: tasks.ts service UpdateTaskInput excludes constraint fields
  evidence: UpdateTaskInput (lines 31-45) includes constraint_type, constraint_date, scheduling_mode; updateTask spreads all updates into the Supabase call
  timestamp: 2026-02-17

- hypothesis: use-tasks.ts hook strips constraint fields
  evidence: useUpdateTask passes the full UpdateTaskInput through to updateTask service without modification
  timestamp: 2026-02-17

- hypothesis: batchUpdateTaskCPMFields overwrites constraint fields with NULL
  evidence: batchUpdateTaskCPMFields only updates CPM fields (es/ef/ls/lf/slack/is_critical/start_date/end_date); Supabase partial update does not touch unspecified columns
  timestamp: 2026-02-17

- hypothesis: Scheduling service calculateCriticalPath drops constraint fields from task objects
  evidence: forwardPass clones tasks with spread operator ({ ...t }) which preserves all properties including constraint_type, constraint_date, scheduling_mode
  timestamp: 2026-02-17

- hypothesis: initialValues in page.tsx don't populate constraint fields when editing
  evidence: page.tsx lines 1113-1120 correctly maps editingTask.constraint_type, constraint_date, scheduling_mode to initialValues
  timestamp: 2026-02-17

## Evidence

- timestamp: 2026-02-17
  checked: flowplan/src/types/database.ts - tasks table Row/Insert/Update types
  found: constraint_type, constraint_date, scheduling_mode are MISSING from the Database type definition (lines 96-161). The Row type has no knowledge of these columns. The Insert and Update types also lack them.
  implication: The Supabase client is typed with this Database interface. While TypeScript types don't affect runtime, this strongly indicates the database types were never regenerated after migration 007 was created. This may also indicate the migration was never actually applied to the remote Supabase instance.

- timestamp: 2026-02-17
  checked: flowplan/src/services/tasks.ts - use of "as never" cast
  found: Both createTask (line 111) and updateTask (line 190) cast the data payload to "as never" before passing to Supabase. This bypasses TypeScript type checking, allowing the constraint fields to pass through despite not being in the Database type.
  implication: The "as never" cast was specifically added to work around the missing Database types. At runtime, the fields ARE sent to the API. But if the DB columns don't exist, PostgREST would return an error.

- timestamp: 2026-02-17
  checked: flowplan/supabase/migrations/007_add_constraints_manual_mode.sql
  found: Migration file exists and adds constraint_type (TEXT), constraint_date (DATE), scheduling_mode (TEXT) with appropriate CHECK constraints and defaults.
  implication: The migration was authored correctly but may not have been applied to the actual Supabase instance.

- timestamp: 2026-02-17
  checked: Full code path tracing - TaskForm.tsx -> page.tsx -> tasks.ts -> use-tasks.ts -> use-scheduling.ts -> scheduling.ts
  found: The application code correctly passes constraint_type, constraint_date, and scheduling_mode through every layer. TaskFormData includes them, the submission handler includes them, the service includes them, and the scheduling pipeline preserves them via spread operator cloning.
  implication: The application code is correct. The bug is NOT in the TypeScript/React code path.

- timestamp: 2026-02-17
  checked: flowplan/src/types/entities.ts - Task interface
  found: The Task interface (lines 81-83) correctly defines constraint_type (ConstraintType | null), constraint_date (Date | string | null), scheduling_mode (SchedulingMode). The entity types are correct.
  implication: There is a mismatch between entities.ts (correct, includes constraint fields) and database.ts (incorrect, missing constraint fields). This confirms database.ts was not updated.

## Resolution

root_cause: The `database.ts` Supabase type definitions are missing the `constraint_type`, `constraint_date`, and `scheduling_mode` columns from the `tasks` table Row/Insert/Update types. This is the definitive code-level bug. Additionally, if the migration `007_add_constraints_manual_mode.sql` was never applied to the actual Supabase database instance, the columns would not exist in the DB at all, causing the fields to silently fail to persist (the `as never` cast in the service bypasses TypeScript, but PostgREST would reject unknown columns).
fix:
verification:
files_changed: []
