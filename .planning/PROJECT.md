# FlowPlan — Phase Dependencies & Notifications

## What This Is

FlowPlan is an AI-native audit management system for Hebrew-speaking users with CPM scheduling, Gantt charts, and offline-first capabilities. This milestone adds phase-level dependency enforcement and completion notifications — phases lock until the previous phase's tasks are all complete, and a Toast notification fires when a phase unlocks.

## Core Value

Phases execute in order — users cannot start work on Phase N+1 until Phase N is fully complete. This ensures sequential discipline in project execution.

## Requirements

### Validated

<!-- Existing capabilities confirmed from codebase -->

- ✓ Project CRUD (create, read, update, delete) — existing
- ✓ Phase CRUD with auto-created "כללי" default phase — existing
- ✓ Task CRUD with multi-assignee support — existing
- ✓ CPM scheduling (forward/backward pass, critical path, slack) — existing
- ✓ Gantt chart visualization — existing
- ✓ Task dependencies (FS/SS/FF/SF) — existing
- ✓ Calendar exceptions and working day management — existing
- ✓ Supabase auth (login, register, session) — existing
- ✓ Offline-first sync with Yjs CRDT — existing
- ✓ Team member management with work hours/days — existing
- ✓ Task detail sidebar — existing
- ✓ Hebrew RTL dark-mode UI — existing

### Active

<!-- Current scope for this milestone -->

- [ ] Phase dependency enforcement — locked phases block task editing
- [ ] Phase completion detection — automatic check when all tasks done
- [ ] Phase unlock mechanism — next phase opens when previous completes
- [ ] Toast notification on phase completion/unlock
- [ ] Visual lock indicator on phase sections

### Out of Scope

- Partial phase unlocking (e.g., unlock after 80%) — keep it strict: 100% completion required
- Email/push notifications — in-app Toast only for now
- Notification history panel — just ephemeral Toast
- Custom phase ordering (non-sequential) — phases follow phase_order
- Phase-level dependencies beyond sequential (e.g., Phase 3 depends on Phase 1 but not 2) — sequential only

## Context

The existing codebase uses `project_phases` with a `phase_order` column and `status` field. Tasks belong to phases via `phase_id`. The PhaseSection component renders tasks grouped by phase as accordion sections. The main dashboard (`src/app/page.tsx`) is 1,238 lines and manages all state — new features need to integrate carefully.

Key existing patterns:
- ServiceResult<T> pattern for service returns
- React Query for state/cache management
- Immutable state updates (spread operator)
- Zod validation for inputs

## Constraints

- **Tech stack**: Must use existing stack (Next.js 16, React 19, Supabase, TanStack Query)
- **UI language**: Hebrew RTL, dark mode
- **File size**: Keep page.tsx from growing further — extract into hooks/components
- **No new dependencies**: Toast can be built with existing UI primitives or minimal addition

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Restricted access (not just warning) for locked phases | User explicitly chose hard blocking over soft warnings | — Pending |
| Toast notification (not notification panel) | Lightweight, user's choice — ephemeral is enough for v1 | — Pending |
| Sequential phase order only | Simplest model, matches phase_order column | — Pending |

---
*Last updated: 2026-02-12 after initialization*
