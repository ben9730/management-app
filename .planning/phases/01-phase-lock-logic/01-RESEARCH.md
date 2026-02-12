# Phase 1: Phase Lock Logic - Research

**Researched:** 2026-02-12
**Domain:** Phase dependency logic, derived state computation, TanStack Query reactive patterns
**Confidence:** HIGH

## Summary

Phase 1 requires building a pure-logic service that computes lock/unlock status for project phases, plus a React hook that exposes this derived state reactively. The core algorithm is straightforward: a phase is locked if any task in the previous phase (by `phase_order`) is not `'done'`. The first phase is always unlocked. No database schema changes are needed -- all required data (`phases` with `phase_order`, `total_tasks`, `completed_tasks` and `tasks` with `status`) already exists.

The main technical challenge is ensuring reactivity: when a task status changes (especially the last task in a phase completing), the lock status must update immediately without a page reload. The existing codebase already has the right plumbing for this -- `useUpdateTask` invalidates both `taskKeys.lists()` and `phaseKeys.lists()`, which means the phases query re-fetches with updated `completed_tasks`/`total_tasks` counts (maintained by a PostgreSQL trigger). A custom `usePhaseLockStatus` hook that derives lock status from the existing `usePhases` and `useTasks` data will automatically re-compute when those queries refetch.

**Primary recommendation:** Create a pure `PhaseLockService` with no dependencies on React or Supabase (pure functions operating on `ProjectPhase[]` and `Task[]`), plus a `usePhaseLockStatus` hook that combines `usePhases` + `useTasks` data through this service. The service is easily unit-testable; the hook integrates with existing TanStack Query cache invalidation.

## Standard Stack

### Core (Already in Project)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | ^5 | Type-safe service layer | Already in project |
| TanStack Query | ^5.90.20 | Reactive data layer, cache invalidation | Already used for all data hooks |
| Vitest | ^4.0.18 | Unit testing | Already configured with 80% coverage |
| @testing-library/react | ^16.3.2 | Hook testing via `renderHook` | Already used in existing hook tests |

### Supporting (Already in Project)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | ^4.3.6 | Input validation if needed | Validating phase arrays |

### No New Dependencies Needed
This phase requires zero new npm packages. All logic is derived computation over existing data structures.

## Architecture Patterns

### Recommended File Structure
```
src/
├── services/
│   ├── phase-lock.ts           # Pure logic: computePhaseLockStatus()
│   └── phase-lock.test.ts      # Unit tests for the service
├── hooks/
│   ├── use-phase-lock-status.ts      # React hook wrapping the service
│   └── use-phase-lock-status.test.ts # Hook tests
└── types/
    └── entities.ts             # Add PhaseLockStatus interface (extend existing)
```

### Pattern 1: Pure Service Function (No Side Effects)
**What:** A stateless function that takes phases and tasks, returns a `Map<string, PhaseLockInfo>`.
**When to use:** Always -- this is the core of Phase 1.
**Why:** Pure functions are trivially testable, composable, and have no hidden dependencies.

```typescript
// src/services/phase-lock.ts

import type { ProjectPhase, Task } from '@/types/entities'

export interface PhaseLockInfo {
  phaseId: string
  isLocked: boolean
  reason: 'first_phase' | 'previous_phase_complete' | 'previous_phase_incomplete'
  /** ID of the blocking phase (if locked) */
  blockedByPhaseId: string | null
  /** Name of the blocking phase (if locked) */
  blockedByPhaseName: string | null
}

/**
 * Compute lock status for all phases in a project.
 *
 * Rules:
 * 1. First phase (lowest phase_order) is ALWAYS unlocked
 * 2. A phase is locked if any task in the previous phase is not 'done'
 * 3. Phases are ordered by phase_order (ascending)
 */
export function computePhaseLockStatus(
  phases: ProjectPhase[],
  tasks: Task[]
): Map<string, PhaseLockInfo> {
  const result = new Map<string, PhaseLockInfo>()

  // Sort phases by phase_order (ascending) -- do NOT mutate input
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order)

  if (sortedPhases.length === 0) return result

  // First phase is always unlocked
  result.set(sortedPhases[0].id, {
    phaseId: sortedPhases[0].id,
    isLocked: false,
    reason: 'first_phase',
    blockedByPhaseId: null,
    blockedByPhaseName: null,
  })

  // For each subsequent phase, check if previous phase is complete
  for (let i = 1; i < sortedPhases.length; i++) {
    const currentPhase = sortedPhases[i]
    const previousPhase = sortedPhases[i - 1]

    const previousPhaseTasks = tasks.filter(t => t.phase_id === previousPhase.id)
    const allPreviousComplete = previousPhaseTasks.length > 0
      && previousPhaseTasks.every(t => t.status === 'done')

    // Empty previous phase: treat as complete (no blocking tasks)
    const previousPhaseComplete = previousPhaseTasks.length === 0 || allPreviousComplete

    result.set(currentPhase.id, {
      phaseId: currentPhase.id,
      isLocked: !previousPhaseComplete,
      reason: previousPhaseComplete ? 'previous_phase_complete' : 'previous_phase_incomplete',
      blockedByPhaseId: previousPhaseComplete ? null : previousPhase.id,
      blockedByPhaseName: previousPhaseComplete ? null : previousPhase.name,
    })
  }

  return result
}

/** Convenience: check if a specific phase is locked */
export function isPhaseLocked(
  phaseId: string,
  phases: ProjectPhase[],
  tasks: Task[]
): boolean {
  const lockMap = computePhaseLockStatus(phases, tasks)
  return lockMap.get(phaseId)?.isLocked ?? false
}
```

### Pattern 2: Derived React Hook (useMemo over TanStack Query data)
**What:** A hook that consumes `usePhases` + `useTasks` and derives lock status via `useMemo`.
**When to use:** In any component that needs to know phase lock state.
**Why:** Automatically reactive -- when task mutations invalidate queries, this hook recomputes.

```typescript
// src/hooks/use-phase-lock-status.ts

import { useMemo } from 'react'
import { usePhases } from '@/hooks/use-phases'
import { useTasks } from '@/hooks/use-tasks'
import { computePhaseLockStatus, type PhaseLockInfo } from '@/services/phase-lock'

export function usePhaseLockStatus(projectId: string) {
  const { data: phases = [], isLoading: isLoadingPhases } = usePhases(projectId)
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks(projectId)

  const lockStatus = useMemo(() => {
    if (phases.length === 0) return new Map<string, PhaseLockInfo>()
    return computePhaseLockStatus(phases, tasks)
  }, [phases, tasks])

  return {
    lockStatus,
    isLoading: isLoadingPhases || isLoadingTasks,
    /** Convenience: check single phase */
    isLocked: (phaseId: string) => lockStatus.get(phaseId)?.isLocked ?? false,
    /** Get lock info for a phase */
    getLockInfo: (phaseId: string) => lockStatus.get(phaseId) ?? null,
  }
}
```

### Pattern 3: Existing Reactivity Chain (Already Wired)
**What:** Task status change triggers automatic refresh of lock status.
**How it works (already in codebase):**
1. User marks task as done -> `useUpdateTask.mutate()` (line 345-355 of page.tsx)
2. `onSuccess` in `useUpdateTask` invalidates `taskKeys.lists()` AND `phaseKeys.lists()` (line 113-115 of use-tasks.ts)
3. Both `usePhases` and `useTasks` re-fetch fresh data
4. `usePhaseLockStatus` hook re-computes via `useMemo` dependency on `[phases, tasks]`
5. Components re-render with updated lock status

**No additional wiring needed.** The existing mutation -> invalidation -> re-fetch chain handles reactivity.

### Anti-Patterns to Avoid
- **Storing lock status in database:** Lock status is derived from task completion. Storing it creates a sync problem. Compute it client-side from existing data.
- **Custom event system for unlock detection:** The TanStack Query invalidation chain already handles this. Adding a custom event bus adds complexity with no benefit.
- **Checking lock status on the server/API level only:** Client-side computation is needed for immediate UI reactivity. Server-side enforcement can be added later (Phase 2's interaction blocking).
- **Mutating the phases array in the service:** Always `[...phases].sort()` -- never `phases.sort()` which mutates. The codebase enforces immutability.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Cache invalidation | Custom event bus / state sync | TanStack Query `invalidateQueries` | Already wired in `useUpdateTask.onSuccess` |
| Reactive derived state | Redux/Zustand store for lock status | `useMemo` over TanStack Query data | Simpler, already reactive, zero new deps |
| Phase ordering | Custom sort with edge cases | `[...phases].sort((a,b) => a.phase_order - b.phase_order)` | `phase_order` is maintained by existing service, has UNIQUE constraint |
| Task completion check | Raw SQL query for counting | Existing `tasks` array filtered by `phase_id` + `.every(t => t.status === 'done')` | Data already loaded by `useTasks(projectId)` |

**Key insight:** All the data needed (phases with `phase_order`, tasks with `status` and `phase_id`) is already fetched by existing hooks. Phase lock logic is pure computation over already-cached data. The PostgreSQL trigger `update_phase_task_counts` keeps `total_tasks`/`completed_tasks` in sync, but we should derive from actual tasks array for immediate client-side accuracy rather than relying on stale DB counts.

## Common Pitfalls

### Pitfall 1: Empty Phase Blocks Everything
**What goes wrong:** If a phase has zero tasks, and we require "all tasks done" to unlock the next phase, `Array.every()` on an empty array returns `true` (vacuous truth). This is actually correct behavior but could be confusing.
**Why it happens:** JavaScript `[].every(fn)` returns `true` by specification.
**How to avoid:** Document the decision: empty phases are treated as complete (non-blocking). This is the correct behavior -- you shouldn't be blocked by an empty phase.
**Warning signs:** A user creates phases first, then adds tasks. The second phase should not be locked while the first has no tasks.

### Pitfall 2: Using DB `completed_tasks`/`total_tasks` Instead of Task Array
**What goes wrong:** The `project_phases` table has `total_tasks` and `completed_tasks` columns maintained by a DB trigger. These may be stale after an optimistic update or during the brief window between a task mutation and the phases query refetch.
**Why it happens:** The DB trigger fires on task insert/update/delete, but the client-side `phases` data may not have refetched yet.
**How to avoid:** Derive lock status from the actual `tasks` array (which updates first via `taskKeys.lists()` invalidation), not from `phases.completed_tasks`. Both data sources eventually converge, but tasks update first.
**Warning signs:** Lock status flickers or shows stale data after marking a task done.

### Pitfall 3: Race Condition on Multiple Rapid Task Completions
**What goes wrong:** User rapidly marks multiple tasks as done. Each mutation fires `invalidateQueries`, potentially causing multiple re-fetches that overlap.
**Why it happens:** TanStack Query handles this gracefully -- it deduplicates concurrent fetches for the same query key and always returns the latest data.
**How to avoid:** No special handling needed. TanStack Query's built-in deduplication handles this. Just verify in tests that rapid status changes produce correct final state.
**Warning signs:** None expected -- this is a non-issue with TanStack Query, but worth testing.

### Pitfall 4: Phase Order Gaps or Duplicates
**What goes wrong:** If `phase_order` has gaps (e.g., 1, 3, 5) or if the DB UNIQUE constraint is violated somehow, the "previous phase" lookup could break.
**Why it happens:** Phases could be deleted without re-indexing, or reordering could leave gaps.
**How to avoid:** Sort by `phase_order` and iterate sequentially (index-based, not value-based). Previous phase is `sortedPhases[i-1]`, not "the phase with `phase_order = current.phase_order - 1`".
**Warning signs:** Tests with non-contiguous `phase_order` values fail.

### Pitfall 5: Forgetting `phase_id` Can Be Null
**What goes wrong:** Tasks can exist without a `phase_id` (the field is nullable in the schema: `phase_id UUID REFERENCES project_phases(id) ON DELETE SET NULL`). These orphan tasks would not count toward any phase's completion.
**Why it happens:** Tasks created without a phase assignment, or whose phase was deleted.
**How to avoid:** Only count tasks where `phase_id` matches the phase being checked. Orphan tasks (null `phase_id`) are irrelevant to phase lock logic.
**Warning signs:** Lock status incorrect when some tasks have no phase.

## Code Examples

### Example 1: Testing the Pure Service (TDD Pattern)
```typescript
// src/services/phase-lock.test.ts
import { describe, it, expect } from 'vitest'
import { computePhaseLockStatus, isPhaseLocked } from './phase-lock'
import type { ProjectPhase, Task } from '@/types/entities'

// Factory helpers matching existing test patterns
const makePhase = (overrides: Partial<ProjectPhase> = {}): ProjectPhase => ({
  id: 'phase-1',
  project_id: 'proj-1',
  name: 'Test Phase',
  description: null,
  phase_order: 1,
  order_index: 0,
  status: 'pending',
  start_date: null,
  end_date: null,
  total_tasks: 0,
  completed_tasks: 0,
  task_count: 0,
  completed_task_count: 0,
  created_at: new Date(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

const makeTask = (overrides: Partial<Task> = {}): Task => ({
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Test Task',
  description: null,
  status: 'pending',
  priority: 'medium',
  assignee_id: null,
  duration: 1,
  estimated_hours: null,
  start_date: null,
  end_date: null,
  es: null, ef: null, ls: null, lf: null,
  slack: 0,
  is_critical: false,
  created_at: new Date(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

describe('computePhaseLockStatus', () => {
  it('returns empty map for no phases', () => {
    const result = computePhaseLockStatus([], [])
    expect(result.size).toBe(0)
  })

  it('first phase is always unlocked', () => {
    const phases = [makePhase({ id: 'p1', phase_order: 1 })]
    const result = computePhaseLockStatus(phases, [])
    expect(result.get('p1')?.isLocked).toBe(false)
    expect(result.get('p1')?.reason).toBe('first_phase')
  })

  it('second phase locked when first has incomplete tasks', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'pending' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p2')?.isLocked).toBe(true)
    expect(result.get('p2')?.blockedByPhaseId).toBe('p1')
  })

  it('second phase unlocked when first has all tasks done', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 2 }),
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p1', status: 'done' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p2')?.isLocked).toBe(false)
  })

  it('handles non-contiguous phase_order values', () => {
    const phases = [
      makePhase({ id: 'p1', phase_order: 1 }),
      makePhase({ id: 'p2', phase_order: 5 }), // gap
      makePhase({ id: 'p3', phase_order: 10 }), // bigger gap
    ]
    const tasks = [
      makeTask({ id: 't1', phase_id: 'p1', status: 'done' }),
      makeTask({ id: 't2', phase_id: 'p2', status: 'pending' }),
    ]
    const result = computePhaseLockStatus(phases, tasks)
    expect(result.get('p1')?.isLocked).toBe(false)
    expect(result.get('p2')?.isLocked).toBe(false) // p1 all done
    expect(result.get('p3')?.isLocked).toBe(true)  // p2 has pending
  })
})
```

### Example 2: Testing the Hook (Existing Pattern)
```typescript
// src/hooks/use-phase-lock-status.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { usePhaseLockStatus } from './use-phase-lock-status'
import * as phasesService from '@/services/phases'
import * as tasksService from '@/services/tasks'

vi.mock('@/lib/supabase', () => ({ supabase: {} }))
vi.mock('@/services/phases')
vi.mock('@/services/tasks')

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('usePhaseLockStatus', () => {
  beforeEach(() => vi.clearAllMocks())

  it('returns lock status derived from phases and tasks', async () => {
    vi.mocked(phasesService.getPhases).mockResolvedValueOnce({
      data: [/* phases */], error: null,
    })
    vi.mocked(tasksService.getTasks).mockResolvedValueOnce({
      data: [/* tasks */], error: null,
    })

    const { result } = renderHook(
      () => usePhaseLockStatus('proj-1'),
      { wrapper: createWrapper() }
    )

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    // Assert lock status...
  })
})
```

## Existing Codebase Integration Points

### Data Already Fetched (No New Queries Needed)
- `usePhases(projectId)` -- returns phases sorted by `phase_order` (line 138-157 of phases.ts)
- `useTasks(projectId)` -- returns all tasks for the project (line 140-165 of tasks.ts)
- Both are already called in `page.tsx` (lines 171-172)

### Existing Reactivity Chain
1. `handleTaskStatusChange` (page.tsx line 345) calls `updateTaskMutation.mutate()`
2. `useUpdateTask.onSuccess` (use-tasks.ts line 109-115) calls:
   - `queryClient.invalidateQueries({ queryKey: taskKeys.lists() })`
   - `queryClient.invalidateQueries({ queryKey: phaseKeys.lists() })`
3. Both `useTasks` and `usePhases` re-fetch automatically
4. Any hook using `useMemo([phases, tasks])` recomputes

### DB Trigger Already Maintains Counts
The PostgreSQL trigger `update_phase_task_counts` (migration 001, lines 446-492) automatically updates `project_phases.total_tasks` and `completed_tasks` when tasks are inserted, updated, or deleted. This provides a secondary data source, though the primary computation should use the tasks array directly for immediate accuracy.

### Integration with page.tsx
The existing `page.tsx` already has a `calculatePhaseStatus` function (lines 280-290) and `getPhaseWithCalculatedStatus` (lines 293-297). The new `usePhaseLockStatus` hook would be consumed in the same area, and Phase 2 would wire it into `PhaseSection` props.

### Entity Type Considerations
The `ProjectPhase` interface has both `phase_order` and `order_index` fields, plus duplicate count fields (`total_tasks`/`task_count` and `completed_tasks`/`completed_task_count`). The service should use `phase_order` for ordering (this is the DB column used in the UNIQUE constraint and the service's ORDER BY).

## Edge Cases to Test

1. **Single phase project** -- always unlocked (it's the first phase)
2. **Empty phases** -- a phase with 0 tasks is treated as complete (non-blocking)
3. **All tasks done in all phases** -- every phase unlocked
4. **No tasks in any phase** -- every phase unlocked (empty = complete)
5. **Tasks with null phase_id** -- ignored (orphan tasks don't affect phase locks)
6. **Phase order gaps** (1, 5, 10) -- works because we sort and iterate by index
7. **Mixed task statuses** -- `pending`, `in_progress` both count as incomplete
8. **Chain unlocking** -- completing phase 1 unlocks phase 2, but phase 3 stays locked if phase 2 has incomplete tasks
9. **Phase with only one task** -- completing that task unlocks the next phase

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Store lock status in DB | Derive from task completion client-side | N/A (greenfield) | Simpler, no sync issues |
| Custom state management | useMemo over TanStack Query cache | TanStack Query v5 | Automatic reactivity |
| Manual refetch after mutation | Automatic invalidation via onSuccess | Already in codebase | Zero additional wiring |

## Open Questions

1. **Empty phase: complete or locked?**
   - What we know: JavaScript `[].every()` returns `true`, so empty phases would be treated as complete
   - Recommendation: Treat empty phases as complete (non-blocking). A phase with no tasks shouldn't block progress. This is the natural behavior and the most user-friendly default.

2. **Should we also check `phase.status` or purely derive from tasks?**
   - What we know: `page.tsx` already has `calculatePhaseStatus` that derives status from tasks (lines 280-290). The `project_phases.status` column exists but is not the source of truth.
   - Recommendation: Derive purely from task completion. Don't use `phase.status` column -- it's currently set at phase creation and not reliably maintained. Phase lock is about task completion, not phase metadata.

3. **Should the lock service also detect "phase just completed" events?**
   - What we know: Phase 3 (Unlock Notifications) needs to know when a phase transitions from incomplete to complete. This could be computed in the lock service now.
   - Recommendation: Yes, add a `wasJustCompleted` detection by comparing previous lock state. But keep it simple for Phase 1 -- just expose the current lock status. Phase 3 can add transition detection later. Keep scope tight.

## Sources

### Primary (HIGH confidence)
- Codebase analysis of `src/types/entities.ts` -- ProjectPhase, Task type definitions
- Codebase analysis of `src/services/phases.ts` -- CRUD operations, phase_order ordering
- Codebase analysis of `src/services/tasks.ts` -- Task CRUD, status field
- Codebase analysis of `src/hooks/use-tasks.ts` -- Cache invalidation pattern (lines 109-115)
- Codebase analysis of `src/hooks/use-phases.ts` -- Phase query keys and hooks
- Codebase analysis of `src/app/page.tsx` -- Current integration, handleTaskStatusChange, calculatePhaseStatus
- Codebase analysis of `supabase/migrations/001_initial_schema.sql` -- DB schema, triggers for task counts
- Codebase analysis of `src/services/phases.test.ts` -- Test patterns (Supabase mocking)
- Codebase analysis of `src/hooks/use-phases.test.ts` -- Hook test patterns (renderHook, createWrapper)

### Secondary (MEDIUM confidence)
- [TanStack Query v5 Query Invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation) -- invalidation triggers re-fetch
- [TanStack Query v5 Invalidation from Mutations](https://tanstack.com/query/v4/docs/framework/react/guides/invalidations-from-mutations) -- onSuccess pattern

### Tertiary (LOW confidence)
- [TanStack Derived Query Discussion](https://github.com/TanStack/query/discussions/3961) -- community patterns for derived state (not needed; useMemo is sufficient)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- zero new dependencies, all libraries already in project
- Architecture: HIGH -- pattern is well-established (pure service + derived hook), verified by codebase analysis
- Pitfalls: HIGH -- identified from direct codebase analysis of real data flow
- Code examples: HIGH -- based on actual codebase types and patterns

**Research date:** 2026-02-12
**Valid until:** 2026-03-15 (stable domain, no external dependency changes expected)
