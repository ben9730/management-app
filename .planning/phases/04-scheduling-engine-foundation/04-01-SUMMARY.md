---
phase: 04-scheduling-engine-foundation
plan: 01
subsystem: scheduling
tags: [cpm, dependency-types, forward-pass, backward-pass, lead-lag, tdd]

# Dependency graph
requires:
  - phase: existing scheduling engine
    provides: FS-only CPM with forward/backward pass, calendar awareness
provides:
  - CPM engine with all 4 dependency types (FS, SS, FF, SF)
  - Lead/lag support (positive and negative lag) for all dependency types
  - Project-start clamping for negative lag
affects: [04-02, 04-03, gantt-chart, task-dependencies-ui]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "computeCandidateES/computeCandidateLF: dependency-type dispatch helpers for forward/backward pass"
    - "Switch on dep.type with FS/SS/FF/SF cases in both forward and backward pass"

key-files:
  created: []
  modified:
    - flowplan/src/services/scheduling.ts
    - flowplan/src/services/scheduling.test.ts

key-decisions:
  - "SS forward: candidateES = predES + lag (using addWorkingDays from predES)"
  - "FF forward: compute candidateEF from predEF + lag, then back-compute ES via subtractWorkingDays"
  - "SF forward: compute candidateEF from predES + lag, then back-compute ES"
  - "Negative lag clamps to project start to prevent scheduling before project begins"
  - "Backward pass for SS/SF derives predecessor LS from successor constraint, then computes LF from LS + duration"

patterns-established:
  - "computeCandidateES: centralized forward-pass logic reused by both forwardPass and calculateWithResources"
  - "computeCandidateLF: centralized backward-pass logic for all dependency types"

# Metrics
duration: 6min
completed: 2026-02-16
---

# Phase 4 Plan 1: CPM Dependency Types Summary

**CPM engine fixed to compute correct ES/EF/LS/LF for all 4 dependency types (FS/SS/FF/SF) with positive and negative lag support**

## Performance

- **Duration:** 6 min
- **Started:** 2026-02-16T08:39:22Z
- **Completed:** 2026-02-16T08:45:23Z
- **Tasks:** 2 (TDD: RED + GREEN)
- **Files modified:** 2

## Accomplishments
- Forward pass correctly handles SS, FF, SF dependency types (previously all treated as FS)
- Backward pass correctly handles SS, FF, SF with proper constraint propagation
- Negative lag (lead time) works for all dependency types, clamped to project start
- Resource-aware `calculateWithResources` also uses the new 4-type logic
- 13 new test cases covering all dependency types, negative lag, backward pass, mixed types, and full CPM

## Task Commits

Each task was committed atomically:

1. **Task 1: Write failing tests for SS/FF/SF and negative lag** - `64c8b0e` (test)
2. **Task 2: Fix forward/backward pass to handle all dependency types** - `a12a720` (feat)

## Files Created/Modified
- `flowplan/src/services/scheduling.ts` - CPM engine with 4 dependency types, computeCandidateES/LF helpers
- `flowplan/src/services/scheduling.test.ts` - 13 new test cases for SS/FF/SF, negative lag, backward pass, mixed types

## Decisions Made
- SS forward pass: align successor ES to predecessor ES plus lag working days
- FF forward pass: compute EF constraint from predecessor EF + lag, then derive ES by subtracting duration
- SF forward pass: compute EF constraint from predecessor ES + lag, then derive ES by subtracting duration
- Backward pass SS/SF: derive predecessor LS from successor constraint, then compute LF = LS + duration
- Backward pass FF: derive predecessor LF directly from successor LF minus lag
- Negative lag uses subtractWorkingDays and clamps result to project start date

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed createMockTimeOff using wrong field name**
- **Found during:** Task 1 (writing tests)
- **Issue:** `createMockTimeOff` helper used `user_id` instead of `team_member_id`, causing the pre-existing "considers employee time off" test to fail (time off was never matched to the user)
- **Fix:** Changed mock default and test override from `user_id` to `team_member_id`
- **Files modified:** flowplan/src/services/scheduling.test.ts
- **Verification:** Pre-existing time-off test now passes
- **Committed in:** 64c8b0e (Task 1 commit)

**2. [Rule 1 - Bug] Fixed full CPM test with incorrect critical path assertion**
- **Found during:** Task 2 (implementing dependency types)
- **Issue:** Original test used A(5)--SS-->B(3)--FF-->C(2) chain which produces slack on all tasks due to SS/FF flexibility. Test incorrectly asserted A would be critical.
- **Fix:** Redesigned test to use A(3)--FS-->B(2)--SS-->C(3) chain where all tasks are genuinely critical
- **Files modified:** flowplan/src/services/scheduling.test.ts
- **Verification:** All 51 tests pass with correct critical path identification
- **Committed in:** a12a720 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for test correctness. No scope creep.

## Issues Encountered
None - implementation matched the plan's formulas closely.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- CPM engine is algorithmically complete for all 4 dependency types
- Ready for Plan 02 (wiring engine to UI) and Plan 03 (Gantt chart updates)
- All 51 tests pass with zero regressions

## Self-Check: PASSED

- [x] flowplan/src/services/scheduling.ts exists
- [x] flowplan/src/services/scheduling.test.ts exists
- [x] 04-01-SUMMARY.md exists
- [x] Commit 64c8b0e exists (test)
- [x] Commit a12a720 exists (feat)
- [x] scheduling.ts contains `case 'SS':` (dependency type dispatch)
- [x] scheduling.test.ts contains `SS dependency` (test coverage)

---
*Phase: 04-scheduling-engine-foundation*
*Completed: 2026-02-16*
