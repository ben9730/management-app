---
phase: 05-constraints-manual-mode
plan: 03
subsystem: ui
tags: [gantt, constraints, fnlt, manual-mode, visual-indicators]

requires:
  - phase: 05-constraints-manual-mode (plans 01-02)
    provides: constraint_type, constraint_date, scheduling_mode on Task objects
provides:
  - Constraint visual indicators on Gantt bars (blue C dot for MSO/SNET, red ! for FNLT)
  - FNLT violation red tint overlay computed inline from ef vs constraint_date
  - Manual task dashed border styling on Gantt bars
  - Constraint and manual mode info in hover tooltips
affects: []

tech-stack:
  added: []
  patterns: [inline FNLT violation computation from persisted fields]

key-files:
  created: []
  modified:
    - flowplan/src/components/gantt/GanttChart.tsx

key-decisions:
  - "FNLT violation computed inline in GanttChart (not from transient _fnltViolation flag) — survives cache refetch"
  - "FNLT diamond marker removed — red tint + ! badge are sufficient visual indicators"
  - "Manual task end_date computed from start_date + duration in scheduling engine"

patterns-established:
  - "Inline computation pattern: derive visual state from persisted fields rather than transient engine flags"

duration: 15min
completed: 2026-02-17
---

# Plan 05-03: Gantt Visual Indicators Summary

**Constraint indicators (blue C dot, red ! badge, red tint overlay) and manual task dashed borders on Gantt chart bars with inline FNLT violation computation**

## Performance

- **Duration:** 15 min (across 2 sessions)
- **Started:** 2026-02-16
- **Completed:** 2026-02-17
- **Tasks:** 2 (1 auto + 1 human-verify)
- **Files modified:** 1

## Accomplishments
- MSO/SNET tasks show blue "C" dot indicator on Gantt bar
- FNLT tasks show red "!" indicator + red tint overlay when violation detected
- Manual tasks show dashed border on Gantt bar
- Hover tooltips show constraint type/date and manual mode info
- FNLT violation persists across page refreshes (computed inline from ef vs constraint_date)

## Task Commits

1. **Task 1: Gantt constraint visual indicators** - `bdd89c5` (feat)
2. **Task 2: Human verification** - approved by user
3. **Bug fix: FNLT inline computation** - `76c6ae3` (fix, found during verification)
4. **Bug fix: Manual task end_date** - `e004ae3` (fix, found during verification)
5. **Bug fix: FNLT diamond positioning** - `1a4c311` → `df3531f` (fix then remove)

## Files Created/Modified
- `flowplan/src/components/gantt/GanttChart.tsx` - Constraint indicators, FNLT tint, manual dashed border, tooltips, isFnltViolation helper

## Decisions Made
- Replaced transient `_fnltViolation` flag with inline computation from `ef` vs `constraint_date` — flag was lost on DB refetch
- Removed FNLT diamond marker — positioning issues, red tint + ! badge are sufficient
- Fixed manual task `end_date` sync: engine computes ef = start_date + duration, batchUpdateTaskCPMFields syncs end_date = ef

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] FNLT violation flag lost on refetch**
- **Found during:** Task 2 (human verification)
- **Issue:** `_fnltViolation` transient flag disappeared after DB persist + cache invalidation
- **Fix:** Added `isFnltViolation()` helper that computes violation inline from persisted fields
- **Committed in:** `76c6ae3`

**2. [Rule 3 - Blocking] Manual task Gantt bar showing wrong width**
- **Found during:** Task 2 (human verification)
- **Issue:** `end_date` was stale for manual tasks — batchUpdateTaskCPMFields skipped date sync
- **Fix:** Engine now computes ef = start_date + duration for manual tasks; service syncs end_date = ef
- **Committed in:** `e004ae3`

**3. [Rule 1 - UX] FNLT diamond marker mispositioned**
- **Found during:** Task 2 (human verification)
- **Issue:** Diamond rendered inside task bar div, floated awkwardly when deadline was before task start
- **Fix:** Moved to standalone timeline element, then removed entirely per user preference
- **Committed in:** `1a4c311`, `df3531f`

---

**Total deviations:** 3 auto-fixed (2 blocking, 1 UX)
**Impact on plan:** All fixes necessary for correct visual feedback. Diamond removal was user preference.

## Issues Encountered
- None beyond the deviations above

## User Setup Required
None.

## Next Phase Readiness
- Phase 5 complete — all constraint types, manual mode, and visual indicators working
- Ready for Phase 6 (Progress Tracking)

---
*Phase: 05-constraints-manual-mode*
*Completed: 2026-02-17*
