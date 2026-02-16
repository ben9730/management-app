---
phase: 05-constraints-manual-mode
plan: 01
subsystem: scheduling
tags: [cpm, constraints, mso, snet, fnlt, asap, manual-mode, tdd]

# Dependency graph
requires:
  - phase: 04-scheduling-engine-foundation
    provides: CPM forward/backward pass with SS/FF/SF dependency types, topological sort, calendar-aware scheduling
provides:
  - ConstraintType and SchedulingMode type definitions in entities.ts
  - Constraint-aware forward pass (MSO/SNET floor, FNLT violation detection)
  - Manual task skip in forward and backward pass
  - Database migration for constraint_type, constraint_date, scheduling_mode columns
  - 11 new test cases covering all constraint types and manual mode
affects: [05-02-PLAN, 05-03-PLAN, ui-constraint-forms, task-service-crud]

# Tech tracking
tech-stack:
  added: []
  patterns: [transient-computation-flags, manual-task-skip-pattern, constraint-as-floor]

key-files:
  created:
    - flowplan/supabase/migrations/007_add_constraints_manual_mode.sql
  modified:
    - flowplan/src/types/entities.ts
    - flowplan/src/services/scheduling.ts
    - flowplan/src/services/scheduling.test.ts
    - flowplan/src/app/findings/page.test.tsx

key-decisions:
  - "constraint_type default is null (no constraint), NOT ASAP -- locked user decision from research phase"
  - "Dependencies always win over constraints (max of dependency ES and constraint date)"
  - "FNLT violations are transient flags (_fnltViolation), not persisted to database"
  - "ASAP has no special code path -- identical to null constraint_type"
  - "Manual task skip occurs BEFORE dependency resolution to avoid compute-then-discard"

patterns-established:
  - "Transient computation flags: use (task as unknown as Record<string, unknown>)._flag for non-persisted results"
  - "Manual task skip: check scheduling_mode at loop top, set ES/EF from user dates, continue"
  - "Constraint-as-floor: constraints set a minimum ES, dependencies can override by being later"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 5 Plan 1: Constraint Types and Manual Mode Summary

**CPM engine extended with MSO/SNET/FNLT constraint types and manual scheduling mode via TDD, 65 tests passing**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T12:34:06Z
- **Completed:** 2026-02-16T12:39:45Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Added ConstraintType (ASAP/MSO/SNET/FNLT) and SchedulingMode (auto/manual) types to domain model
- Forward pass applies MSO/SNET as scheduling floor, detects FNLT violations, skips manual tasks
- Backward pass skips manual tasks preserving user-set dates as LS/LF
- 11 new test cases covering all constraint types and manual mode behaviors
- Zero regressions: all 54 pre-existing tests continue to pass
- Database migration adds constraint_type, constraint_date, scheduling_mode columns

## Task Commits

Each task was committed atomically:

1. **Task 1: Add constraint/manual types and write failing tests (RED)** - `61b6e62` (test)
2. **Task 2: Implement constraint and manual mode logic in engine (GREEN)** - `7f525a8` (feat)

## Files Created/Modified
- `flowplan/src/types/entities.ts` - Added ConstraintType, SchedulingMode types; constraint fields on Task and CreateTaskInput
- `flowplan/src/services/scheduling.ts` - Forward pass constraint logic (MSO/SNET floor, FNLT violation), manual task skip in forward and backward pass
- `flowplan/src/services/scheduling.test.ts` - 11 new tests for constraint types and manual mode; updated createMockTask helper
- `flowplan/supabase/migrations/007_add_constraints_manual_mode.sql` - ALTER TABLE adding constraint_type, constraint_date, scheduling_mode
- `flowplan/src/app/findings/page.test.tsx` - Added new required Task fields to mock objects

## Decisions Made
- constraint_type default is null (no constraint), NOT 'ASAP' -- this was a locked decision from the research phase to avoid confusion between "no constraint" and "ASAP constraint"
- Dependencies always win over constraints: the engine takes max(dependency_ES, constraint_date) for MSO/SNET, ensuring dependency chains are never violated
- FNLT violations are transient computation flags (_fnltViolation on the task object), not persisted to the database -- they are recomputed on each scheduling pass
- ASAP constraint has no special code path in the engine; it behaves identically to null constraint_type, reducing complexity
- Manual task skip occurs BEFORE dependency resolution in the loop to avoid computing dates that would be immediately discarded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Task interface change breaking findings page test**
- **Found during:** Task 1 (type definitions)
- **Issue:** Adding required constraint_type, constraint_date, scheduling_mode fields to Task interface caused TypeScript errors in findings/page.test.tsx mock objects
- **Fix:** Added the three new fields with default values to both mock Task objects
- **Files modified:** flowplan/src/app/findings/page.test.tsx
- **Verification:** TypeScript compilation of test file succeeds
- **Committed in:** 61b6e62 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Necessary fix for type compatibility. No scope creep.

## Issues Encountered
None -- plan executed smoothly. All 7 failing tests in RED phase passed after implementation in GREEN phase.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Engine constraint logic complete, ready for Plan 02 (service layer CRUD for constraints) and Plan 03 (UI forms)
- Manual mode engine support ready for wiring to task create/update flows
- Migration ready for application to Supabase instance

## Self-Check: PASSED

All files verified present. All commits verified in git log.

---
*Phase: 05-constraints-manual-mode*
*Completed: 2026-02-16*
