# FlowPlan — MS Project-Style Scheduling

## What This Is

FlowPlan is an AI-native audit management system for Hebrew-speaking users with CPM scheduling, Gantt charts, and offline-first capabilities. It includes sequential phase enforcement and is now adding MS Project-style scheduling — automatic date cascading through dependency chains, constraint types, lead/lag time, manual vs auto scheduling, and progress tracking.

## Core Value

Task dependencies drive the schedule automatically — when a predecessor changes, all successors cascade their dates like Microsoft Project. This is the foundation that makes FlowPlan a real scheduling tool.

## Current Milestone: v1.1 MS Project-Style Scheduling

**Goal:** Bring task dependency scheduling to MS Project parity — auto-cascading dates, constraint types, lead/lag, manual scheduling mode, and progress tracking.

**Target features:**
- Auto-rescheduling: CPM engine wired to UI, cascading successor dates on any change
- Lead/lag time: Negative lag (lead) support on dependencies
- Constraint types: ASAP, Must Start On, Start No Earlier Than, Finish No Later Than
- Manual vs auto scheduling: Per-task toggle to skip CPM
- Progress tracking: Percent complete, actual start/finish, remaining duration

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

- [ ] Auto-rescheduling — CPM recalc cascades when task/dependency changes
- [ ] Lead/lag time — negative lag (lead) on dependencies
- [ ] Constraint types — ASAP, MSO, SNET, FNLT
- [ ] Manual vs auto scheduling — per-task toggle
- [ ] Percent complete — drives remaining duration and actual dates

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

Current scheduling state (v1.1 starting point):
- SchedulingService class (682 lines) with full CPM: forwardPass, backwardPass, calculateCriticalPath
- Calendar-aware (holidays, workdays, per-resource time-off)
- Topological sort via Kahn's algorithm with cycle detection
- Dependencies table has FS/SS/FF/SF + lag_days (positive only)
- **NOT wired to UI** — scheduling service exists but never triggered by task/dependency mutations
- Gantt chart is read-only (no drag-to-reschedule)

Known concerns:
- page.tsx is ~1,300 lines — future work should extract into hooks/components
- Scheduling engine disconnected from UI mutation flow

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
*Last updated: 2026-02-16 after v1.1 milestone start*
