# FlowPlan — Phase Dependencies & Notifications

## What This Is

FlowPlan is an AI-native audit management system for Hebrew-speaking users with CPM scheduling, Gantt charts, and offline-first capabilities. It now includes sequential phase enforcement — phases lock until the previous phase's tasks are all complete, with visual lock indicators, interaction blocking, progress tracking, and Toast notifications on phase unlock.

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
- ✓ Phase dependency enforcement — locked phases block task editing — v1.0
- ✓ Phase completion detection — automatic check when all tasks done — v1.0
- ✓ Phase unlock mechanism — next phase opens when previous completes — v1.0
- ✓ Toast notification on phase completion/unlock — v1.0
- ✓ Visual lock indicator on phase sections — v1.0

### Active

(None — next milestone requirements TBD)

### Out of Scope

- Partial phase unlocking (e.g., unlock after 80%) — keep it strict: 100% completion required
- Email/push notifications — in-app Toast only for now
- Notification history panel — just ephemeral Toast
- Custom phase ordering (non-sequential) — phases follow phase_order
- Phase-level dependencies beyond sequential (e.g., Phase 3 depends on Phase 1 but not 2) — sequential only

## Context

Shipped v1.0 with 3 phases (Phase Dependencies & Notifications) in 3 days.
Codebase: ~5,000 LOC TypeScript across 34 modified files.
Tech stack: Next.js 16, React 19, Supabase, TanStack Query, Sonner (toast).

Key patterns established:
- ServiceResult<T> pattern for service returns
- React Query for state/cache management
- Immutable state updates (spread operator)
- Zod validation for inputs
- Pure service + derived hook pattern (computePhaseLockStatus + usePhaseLockStatus)
- useRef-based previous-value comparison for transition detection
- CSS-level blocking (pointer-events-none + opacity) for locked UI

Known concerns:
- page.tsx is ~1,300 lines — future work should extract into hooks/components

## Constraints

- **Tech stack**: Must use existing stack (Next.js 16, React 19, Supabase, TanStack Query)
- **UI language**: Hebrew RTL, dark mode
- **File size**: Keep page.tsx from growing further — extract into hooks/components

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Restricted access (not just warning) for locked phases | User explicitly chose hard blocking over soft warnings | ✓ Good — clean UX, no confusion |
| Toast notification (not notification panel) | Lightweight, user's choice — ephemeral is enough for v1 | ✓ Good — Sonner handles RTL, ARIA, auto-dismiss |
| Sequential phase order only | Simplest model, matches phase_order column | ✓ Good — sufficient for current needs |
| Derive lock status from tasks array, not DB columns | Immediate accuracy over stale DB counts | ✓ Good — instant client-side reactivity |
| Empty phases treated as complete (non-blocking) | Vacuous truth of [].every() is correct UX | ✓ Good — no edge-case blocking |
| Sonner over custom toast component | Handles RTL, animations, ARIA, auto-dismiss, SSR portals | ✓ Good — minimal integration effort |
| useRef for previous-value tracking | Avoids extra re-render cycle vs useState | ✓ Good — efficient transition detection |
| CSS-level blocking for locked phases | pointer-events-none + opacity simpler than per-task disabled props | ✓ Good — fewer prop changes |

---
*Last updated: 2026-02-14 after v1.0 milestone*
