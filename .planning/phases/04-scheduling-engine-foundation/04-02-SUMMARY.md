---
phase: 04-scheduling-engine-foundation
plan: 02
subsystem: scheduling
tags: [cpm, react-query, hooks, batch-persist, optimistic-update, gantt]

# Dependency graph
requires:
  - phase: 04-01
    provides: CPM engine with all 4 dependency types (FS/SS/FF/SF) and lead/lag support
provides:
  - useScheduling hook for CPM orchestration (recalculate, batch persist, cache update)
  - batchUpdateTaskCPMFields for batch persistence of CPM fields
  - Automatic CPM recalculation wired into task mutation flows
  - GanttChart receives real dependency data
affects: [04-03, gantt-chart, task-dependencies-ui, page-tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "One-shot recalculate pattern: CPM triggered by explicit mutation, not reactive useEffect"
    - "AbortController serial queue: cancel in-flight batch persist on rapid recalculations"
    - "Optimistic cache update: put recalculated tasks into React Query cache before DB persist"
    - "start_date/end_date synced with es/ef during batch persist for Gantt chart compatibility"

key-files:
  created:
    - flowplan/src/hooks/use-scheduling.ts
  modified:
    - flowplan/src/services/tasks.ts
    - flowplan/src/app/page.tsx

key-decisions:
  - "One-shot pattern over reactive useEffect to prevent infinite cascade loops"
  - "AbortController serial queue: newest recalculation cancels in-flight persist"
  - "start_date/end_date synced with es/ef during batch persist for Gantt chart compatibility"
  - "Merge updated task into tasks array before recalculate to avoid stale closure data"
  - "workDays hardcoded to [0,1,2,3,4] (Israeli Sun-Thu calendar) matching existing convention"

patterns-established:
  - "useScheduling hook: one-shot CPM orchestration consumed by page.tsx"
  - "batchUpdateTaskCPMFields: batch upsert for CPM fields with date sync"
  - "expandCalendarExceptions: date range to individual Date[] expansion"

# Metrics
duration: 5min
completed: 2026-02-16
---

# Phase 4 Plan 2: Scheduling Wiring Summary

**useScheduling hook bridges CPM engine to UI with one-shot recalculation, optimistic cache updates, and batch persistence on every task mutation**

## Performance

- **Duration:** 5 min
- **Started:** 2026-02-16T08:50:31Z
- **Completed:** 2026-02-16T08:55:19Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Created useScheduling hook that orchestrates CPM recalculation, React Query cache updates, and batch DB persistence
- Added batchUpdateTaskCPMFields to tasks service for efficient batch upsert of CPM fields
- Wired recalculate() into all task mutation flows (create, update, status change, delete)
- GanttChart now receives real dependency data instead of empty array
- No infinite loop risk: one-shot pattern only, no useEffect triggers recalculation

## Task Commits

Each task was committed atomically:

1. **Task 1: Add batchUpdateTaskCPMFields and create useScheduling hook** - `838867c` (feat)
2. **Task 2: Wire useScheduling into page.tsx mutation flows** - `aa735c4` (feat)

## Files Created/Modified
- `flowplan/src/hooks/use-scheduling.ts` - New useScheduling hook with one-shot recalculate pattern, AbortController serial queue, calendar exception expansion
- `flowplan/src/services/tasks.ts` - Added batchUpdateTaskCPMFields for batch CPM field persistence with start_date/end_date sync
- `flowplan/src/app/page.tsx` - Imported useScheduling, wired recalculate() into task mutations, passed real dependencies to GanttChart

## Decisions Made
- One-shot mutation pattern: recalculate() called explicitly after mutation success, never via useEffect watching data. This prevents the infinite cascade loop identified as a risk in STATE.md.
- Merge updated task into tasks array before passing to recalculate(): avoids stale closure data from React Query cache not yet being invalidated.
- start_date/end_date synced with es/ef during batch persist: ensures Gantt chart (which reads start_date/end_date) shows correct CPM-computed dates.
- AbortController serial queue: if rapid mutations trigger multiple recalculations, only the newest persist survives. Optimistic cache update is immediate regardless.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed Supabase upsert type error with `as never[]` cast**
- **Found during:** Task 1 (batchUpdateTaskCPMFields)
- **Issue:** Supabase generated types require `never` cast for partial upsert objects (same pattern used in existing createTask)
- **Fix:** Added `as never[]` cast to upsert call, matching existing codebase convention
- **Files modified:** flowplan/src/services/tasks.ts
- **Verification:** TypeScript compiles without errors
- **Committed in:** 838867c (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 blocking)
**Impact on plan:** Type cast is a known Supabase pattern already used in the codebase. No scope creep.

## Issues Encountered
None - plan executed cleanly. Dependency mutation wiring deferred to future work since page.tsx doesn't yet have dependency CRUD UI.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- useScheduling hook is ready for consumption by any future dependency CRUD UI
- GanttChart receives real dependencies, ready for Plan 03 (Gantt chart dependency visualization)
- All 51 scheduling tests pass with zero regressions
- Infinite cascade loop blocker from STATE.md is now resolved

## Self-Check: PASSED

- [x] flowplan/src/hooks/use-scheduling.ts exists
- [x] flowplan/src/services/tasks.ts exists
- [x] 04-02-SUMMARY.md exists
- [x] Commit 838867c exists (feat: batchUpdateTaskCPMFields + useScheduling)
- [x] Commit aa735c4 exists (feat: wire useScheduling into page.tsx)
- [x] useScheduling export exists in use-scheduling.ts
- [x] batchUpdateTaskCPMFields exists in tasks.ts
- [x] useScheduling imported and used in page.tsx
- [x] GanttChart receives real dependencies (not empty array)
- [x] No useEffect calls recalculate (grep returns no matches)

---
*Phase: 04-scheduling-engine-foundation*
*Completed: 2026-02-16*
