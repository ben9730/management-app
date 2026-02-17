# FlowPlan — AI-Native Audit Management

## What This Is

FlowPlan is an AI-native audit management system for Hebrew-speaking users with MS Project-style CPM scheduling, Gantt charts, and offline-first capabilities. It features automatic date cascading through dependency chains, constraint types, lead/lag time, manual vs auto scheduling, progress tracking, and sequential phase enforcement.

## Core Value

Task dependencies drive the schedule automatically — when a predecessor changes, all successors cascade their dates like Microsoft Project. This is the foundation that makes FlowPlan a real scheduling tool.

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
- ✓ Auto-rescheduling — CPM recalc cascades when task/dependency changes — v1.1
- ✓ Lead/lag time — negative lag (lead) on dependencies — v1.1
- ✓ Constraint types — MSO, SNET, FNLT with violation detection — v1.1
- ✓ Manual vs auto scheduling — per-task toggle preserving user dates — v1.1
- ✓ Percent complete — bidirectional sync with status, actual dates, frozen tasks — v1.1
- ✓ Gantt progress bars — filled portion showing completion percentage — v1.1
- ✓ Dependency line visualization — type-aware rendering with tooltips — v1.1

### Active

(No active requirements — next milestone not yet defined)

### Out of Scope

- Partial phase unlocking (e.g., unlock after 80%) — keep it strict: 100% completion required
- Email/push notifications — in-app Toast only for now
- Notification history panel — just ephemeral Toast
- Custom phase ordering (non-sequential) — phases follow phase_order
- Phase-level dependencies beyond sequential — sequential only
- Resource leveling — NP-hard, massive complexity
- Effort-driven scheduling — confusing even to experts
- Multiple baselines — defer to future if needed
- ALAP scheduling — requires backward-scheduled projects
- Drag-to-reschedule on Gantt — read-only for now

## Context

Shipped v1.0 (Phase Dependencies & Notifications) in 3 days, v1.1 (MS Project-Style Scheduling) in 2 days.
Codebase: ~14,000 LOC TypeScript across 86 modified files.
Tech stack: Next.js 16, React 19, Supabase, TanStack Query, Sonner (toast), Yjs (CRDT).

Key patterns established:
- ServiceResult<T> pattern for service returns
- React Query for state/cache management
- Immutable state updates (spread operator)
- Zod validation for inputs
- Pure service + derived hook pattern (computePhaseLockStatus + usePhaseLockStatus)
- useRef-based previous-value comparison for transition detection
- CSS-level blocking (pointer-events-none + opacity) for locked UI
- One-shot recalculate pattern (explicit mutation trigger, not reactive useEffect)
- AbortController serial queue for newest-wins recalculation
- syncProgressAndStatus pure function with injectable today for deterministic testing
- Three-branch batch persist: completed (frozen) → manual (end_date) → auto (both dates)

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
| One-shot recalculate pattern | Explicit mutation trigger prevents infinite cascade loops vs reactive useEffect | ✓ Good — stable, predictable |
| Dependencies always win over constraints | max(dependency ES, constraint date) — consistent, predictable | ✓ Good — no surprising overrides |
| constraint_type default is null, not ASAP | Explicit user decision required — locked by user preference | ✓ Good — clearer UX intent |
| FNLT violations are transient (not persisted) | Computed inline from ef vs constraint_date — always fresh | ✓ Good — no stale flags |
| Manual task skip before dependency resolution | Manual tasks skip entire forward/backward pass computation | ✓ Good — clean separation |
| Completed task freeze before all other checks | frozen > manual > auto priority chain in batch persist | ✓ Good — clear precedence |
| actual_start_date never cleared on revert to 0% | MS Project convention — historical record preserved | ✓ Good — matches industry standard |
| Critical path styled as informational blue, not alarming red | Users confused critical path with errors — blue conveys information | ✓ Good — clearer UX |
| batchUpdateTaskCPMFields uses individual .update() not .upsert() | PostgreSQL NOT NULL constraint on INSERT payload prevents upsert | ✓ Good — workaround for Supabase limitation |

---
*Last updated: 2026-02-17 after v1.1 milestone completion*
