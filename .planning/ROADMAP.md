# Roadmap: FlowPlan

## Milestones

- ✅ **v1.0 Phase Dependencies & Notifications** -- Phases 1-3 (shipped 2026-02-14)
- 🚧 **v1.1 MS Project-Style Scheduling** -- Phases 4-6 (in progress)

## Phases

<details>
<summary>✅ v1.0 Phase Dependencies & Notifications (Phases 1-3) -- SHIPPED 2026-02-14</summary>

- [x] Phase 1: Phase Lock Logic (1/1 plans) -- completed 2026-02-12
- [x] Phase 2: Lock Enforcement UI (1/1 plans) -- completed 2026-02-14
- [x] Phase 3: Unlock Notifications (1/1 plans) -- completed 2026-02-14

</details>

### 🚧 v1.1 MS Project-Style Scheduling (In Progress)

**Milestone Goal:** Task dependencies drive the schedule automatically -- when a predecessor changes, all successors cascade their dates like Microsoft Project. Constraint types, manual scheduling, and progress tracking bring feature parity with MS Project.

- [x] **Phase 4: Scheduling Engine Foundation** -- Fix all dependency types, add lead/lag, wire CPM to UI with auto-cascading (completed 2026-02-16)
- [ ] **Phase 5: Constraints & Manual Mode** -- Constraint types (ASAP/MSO/SNET/FNLT) and per-task manual scheduling toggle
- [ ] **Phase 6: Progress Tracking** -- Percent complete, actual dates, frozen completed tasks, Gantt progress bars

## Phase Details

### Phase 4: Scheduling Engine Foundation
**Goal**: Users see task dates cascade automatically through dependency chains when any task or dependency changes -- the CPM engine is connected to the UI and computes all dependency types correctly
**Depends on**: Phase 3 (v1.0 complete)
**Requirements**: SCHED-01, SCHED-02, SCHED-03, SCHED-04, SCHED-05, SCHED-06, SCHED-07, SCHED-08
**Success Criteria** (what must be TRUE):
  1. User changes a task's duration and all downstream successor dates update automatically in the Gantt chart within seconds
  2. User creates an SS dependency between two tasks and the successor's start date aligns to the predecessor's start date (plus any lag)
  3. User creates an FF dependency and the successor's finish date aligns to the predecessor's finish date (plus any lag)
  4. User sets a negative lag (lead time) on a dependency and the successor starts before the predecessor finishes
  5. After any scheduling change, the Gantt chart reflects the new dates and critical path without manual refresh
**Plans**: 3 plans

Plans:
- [x] 04-01-PLAN.md -- Fix CPM engine for all dependency types (SS/FF/SF) with lead/lag (TDD)
- [x] 04-02-PLAN.md -- Create useScheduling hook, batch persistence, wire to UI mutations
- [x] 04-03-PLAN.md -- Update Gantt chart with type-aware dependency lines and hover tooltips

### Phase 5: Constraints & Manual Mode
**Goal**: Users can pin tasks to specific dates using constraint types and toggle individual tasks to manual scheduling mode that the engine respects but does not move
**Depends on**: Phase 4
**Requirements**: CNST-01, CNST-02, CNST-03, CNST-04, CNST-05, MANU-01, MANU-02, MANU-03, MANU-04
**Success Criteria** (what must be TRUE):
  1. User sets a Must Start On constraint with a date and the task starts on that date regardless of when its predecessor finishes
  2. User sets a Start No Earlier Than constraint and the task cannot schedule before that date even if dependencies allow it
  3. User sets a Finish No Later Than constraint and a warning appears if the calculated finish date exceeds the deadline
  4. User toggles a task to manual mode, sets custom dates, and those dates remain fixed when predecessors are rescheduled -- but the manual task's successors still cascade from its dates
  5. Manual tasks display a distinct visual style in the Gantt chart distinguishing them from auto-scheduled tasks
**Plans**: 3 plans

Plans:
- [ ] 05-01-PLAN.md -- Types, DB migration, and CPM engine constraint/manual logic (TDD)
- [ ] 05-02-PLAN.md -- Service/hook wiring, constraint violation toasts, TaskForm UI
- [ ] 05-03-PLAN.md -- Gantt visual indicators and end-to-end verification

### Phase 6: Progress Tracking
**Goal**: Users can track task completion with percent complete, automatic actual dates, and visual progress on the Gantt chart -- completed tasks are frozen in the schedule
**Depends on**: Phase 4 (cascading must work for frozen-task behavior)
**Requirements**: PROG-01, PROG-02, PROG-03, PROG-04, PROG-05, PROG-06, PROG-07
**Success Criteria** (what must be TRUE):
  1. User sets percent complete on a task and the task status syncs automatically (0%=pending, 1-99%=in_progress, 100%=done)
  2. When user first moves a task above 0% complete, the actual start date is recorded automatically
  3. A task at 100% complete does not move when its predecessor dates change -- it is frozen in the schedule
  4. Gantt bars show a darker filled portion representing the completed percentage of each task
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD

## Progress

**Execution Order:** Phases execute in numeric order: 4 -> 5 -> 6

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Phase Lock Logic | v1.0 | 1/1 | Complete | 2026-02-12 |
| 2. Lock Enforcement UI | v1.0 | 1/1 | Complete | 2026-02-14 |
| 3. Unlock Notifications | v1.0 | 1/1 | Complete | 2026-02-14 |
| 4. Scheduling Engine Foundation | v1.1 | 3/3 | Complete | 2026-02-16 |
| 5. Constraints & Manual Mode | v1.1 | 0/3 | Planned | - |
| 6. Progress Tracking | v1.1 | 0/? | Not started | - |
