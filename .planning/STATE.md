# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Task dependencies drive the schedule automatically -- when a predecessor changes, all successors cascade their dates like Microsoft Project
**Current focus:** Phase 4 complete -- ready for Phase 5

## Current Position

Phase: 4 of 6 (Scheduling Engine Foundation) -- COMPLETE
Plan: 3/3 complete
Status: Phase 4 complete, ready for Phase 5
Last activity: 2026-02-16 -- Completed all 3 plans + checkpoint verification

Progress: [███████░░░] 67% (v1.0 complete, v1.1 phase 4/6 done)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 10.7min
- Total execution time: ~1.1 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-phase-lock-logic | 1 | 5min | 5min |
| 02-lock-enforcement-ui | 1 | 7min | 7min |
| 03-unlock-notifications | 1 | 4min | 4min |
| 04-scheduling-engine-foundation | 3 | 56min | 18.7min |

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [v1.1 Roadmap]: Merged "wire CPM to UI" and "fix SS/FF/SF + lead/lag" into single Phase 4 -- engine correctness and UI wiring are one delivery boundary
- [v1.1 Roadmap]: Phase 6 (Progress Tracking) depends on Phase 4 but not Phase 5 -- constraints are not needed for progress tracking
- [04-01]: SS forward pass uses predES + lag; FF/SF back-compute ES from finish constraint via subtractWorkingDays
- [04-01]: Negative lag clamps to project start date to prevent scheduling before project begins
- [04-01]: computeCandidateES/computeCandidateLF centralized helpers for dependency-type dispatch in forward/backward pass
- [04-02]: One-shot recalculate pattern (explicit mutation trigger, not reactive useEffect) prevents infinite cascade loops
- [04-02]: start_date/end_date synced with es/ef during batch persist for Gantt chart compatibility
- [04-02]: AbortController serial queue: newest recalculation cancels in-flight persist
- [04-03]: batchUpdateTaskCPMFields must use individual .update() not .upsert() (PostgreSQL NOT NULL constraint on INSERT payload)
- [04-03]: recalculate() accepts updatedDependencies param to avoid stale closure after dependency mutations
- [04-03]: DependencyManager auto-opens add form for better UX discoverability

### Pending Todos

None.

### Blockers/Concerns

- page.tsx is ~1,300 lines -- new UI work should extract into hooks/components
- ~~Infinite cascade loop risk -- scheduling must be one-shot mutations, not reactive useEffect~~ RESOLVED in 04-02
- ~~SS/FF/SF dependency types currently broken in engine (treats all as FS) -- must fix in Phase 4~~ RESOLVED in 04-01
- ~~CPM fields not persisting to DB (upsert NOT NULL constraint issue)~~ RESOLVED in 04-03

## Session Continuity

Last session: 2026-02-16
Stopped at: Phase 4 complete -- ready for Phase 5 (Constraints & Manual Mode)
Resume file: None
