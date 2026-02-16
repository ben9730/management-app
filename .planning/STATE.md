# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-16)

**Core value:** Task dependencies drive the schedule automatically -- when a predecessor changes, all successors cascade their dates like Microsoft Project
**Current focus:** Phase 5 in progress -- Constraints & Manual Mode

## Current Position

Phase: 5 of 6 (Constraints & Manual Mode)
Plan: 1/3 complete
Status: Phase 5 plan 1 complete, ready for plan 2
Last activity: 2026-02-16 -- Completed 05-01 (constraint types + manual mode in CPM engine)

Progress: [████████░░] 78% (v1.0 complete, v1.1 phase 5/6 plan 1/3)

## Performance Metrics

**Velocity:**
- Total plans completed: 7
- Average duration: 9.9min
- Total execution time: ~1.2 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-phase-lock-logic | 1 | 5min | 5min |
| 02-lock-enforcement-ui | 1 | 7min | 7min |
| 03-unlock-notifications | 1 | 4min | 4min |
| 04-scheduling-engine-foundation | 3 | 56min | 18.7min |
| 05-constraints-manual-mode | 1/3 | 5min | 5min |

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
- [05-01]: constraint_type default is null (no constraint), NOT ASAP -- locked user decision
- [05-01]: Dependencies always win over constraints (max of dependency ES and constraint date)
- [05-01]: FNLT violations are transient flags, not persisted to database
- [05-01]: Manual task skip occurs BEFORE dependency resolution in forward/backward pass

### Pending Todos

3 pending -- `/gsd:check-todos` to review
- Fix critical path styling to explain meaning not alarm (ui)
- Add task status change from Gantt view (ui, future)
- Show task name in narrow Gantt bars (ui, future)

### Blockers/Concerns

- page.tsx is ~1,300 lines -- new UI work should extract into hooks/components
- ~~Infinite cascade loop risk -- scheduling must be one-shot mutations, not reactive useEffect~~ RESOLVED in 04-02
- ~~SS/FF/SF dependency types currently broken in engine (treats all as FS) -- must fix in Phase 4~~ RESOLVED in 04-01
- ~~CPM fields not persisting to DB (upsert NOT NULL constraint issue)~~ RESOLVED in 04-03

## Session Continuity

Last session: 2026-02-16
Stopped at: Completed 05-01-PLAN.md (constraint types + manual mode in CPM engine)
Resume file: None
