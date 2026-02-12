# Roadmap: FlowPlan — Phase Dependencies & Notifications

## Overview

This milestone adds sequential phase enforcement to FlowPlan. We start by building the lock/unlock logic as a service (Phase 1), then wire it into the UI with visual indicators and interaction blocking (Phase 2), and finally add Toast notifications when phases complete and unlock (Phase 3). The result: users cannot work on Phase N+1 until Phase N is 100% complete, with clear visual feedback throughout.

## Phases

- [ ] **Phase 1: Phase Lock Logic** - Service layer that determines phase lock status and detects completion
- [ ] **Phase 2: Lock Enforcement UI** - Visual indicators, interaction blocking, and progress display
- [ ] **Phase 3: Unlock Notifications** - Toast notifications when phases complete and unlock

## Phase Details

### Phase 1: Phase Lock Logic
**Goal**: The system correctly knows which phases are locked and which are unlocked at all times
**Depends on**: Nothing (first phase)
**Requirements**: PDEP-01, PDEP-02, PDEP-05
**Success Criteria** (what must be TRUE):
  1. Given a project with multiple phases, the system returns correct lock/unlock status for every phase based on prior phase task completion
  2. The first phase in any project is always reported as unlocked regardless of any other state
  3. When the last incomplete task in a phase is marked complete, the next phase transitions from locked to unlocked without page reload
**Plans:** 1 plan

Plans:
- [ ] 01-01-PLAN.md — TDD phase lock service (computePhaseLockStatus) + usePhaseLockStatus React hook

### Phase 2: Lock Enforcement UI
**Goal**: Users see which phases are locked, see completion progress, and cannot interact with locked phase tasks
**Depends on**: Phase 1
**Requirements**: PDEP-03, PDEP-04, PDEP-06
**Success Criteria** (what must be TRUE):
  1. A locked phase section displays a visible lock indicator (icon or overlay) that communicates "this phase is blocked"
  2. Users cannot edit, change status, or modify any task within a locked phase — all interactive controls are disabled
  3. Each phase section header shows task completion progress (e.g., "3/5 tasks complete")
**Plans**: TBD

Plans:
- [ ] 02-01: Phase section lock UI and interaction blocking
- [ ] 02-02: Phase completion progress display

### Phase 3: Unlock Notifications
**Goal**: Users are notified the moment a phase completes and the next phase becomes available
**Depends on**: Phase 2
**Requirements**: NOTF-01, NOTF-02, NOTF-03
**Success Criteria** (what must be TRUE):
  1. When a phase completes and the next phase unlocks, a Toast notification appears on screen
  2. The Toast message includes the name of the completed phase and the name of the newly unlocked phase
  3. The Toast auto-dismisses after 5 seconds and can be manually closed before that
**Plans**: TBD

Plans:
- [ ] 03-01: Toast component and phase unlock notification

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Phase Lock Logic | 0/1 | Not started | - |
| 2. Lock Enforcement UI | 0/2 | Not started | - |
| 3. Unlock Notifications | 0/1 | Not started | - |
