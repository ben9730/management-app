# Architecture Patterns: MS Project-Style Scheduling Integration

**Domain:** Auto-cascading CPM scheduling for project management
**Researched:** 2026-02-16
**Overall Confidence:** HIGH (based on direct codebase analysis + established CPM/scheduling patterns)

## Current State Analysis

### What Exists

The codebase has a fully functional CPM engine (`SchedulingService`, 682 lines) that is **completely disconnected** from the UI mutation flow. Key evidence:

1. **`schedulingService` is never imported** outside its own test file
2. **GanttChart renders with `dependencies={[]}`** (line 933 of `page.tsx`) -- dependencies are never fetched for display
3. **`useDependencies` hook exists but is never used** in `page.tsx`
4. **Mutation hooks use simple invalidation** -- `onSuccess` callbacks only invalidate query caches, never trigger scheduling recalculation
5. **Task CPM fields (es, ef, ls, lf, slack, is_critical) are stored in DB** but never written to by the application -- they remain at defaults (null/0/false)

### Current Data Flow (No Scheduling)

```
User edits task -> useUpdateTask mutation -> Supabase UPDATE -> onSuccess -> invalidateQueries -> re-fetch
```

No scheduling happens. CPM fields are dead columns.

### What Needs to Change

```
User edits task -> useUpdateTask mutation -> Supabase UPDATE -> onSuccess ->
  1. Fetch all tasks + dependencies for project
  2. Run SchedulingService.calculateCriticalPath()
  3. Batch-update all affected tasks with new CPM fields
  4. Invalidate queries -> re-render with scheduled dates
```

---

## Recommended Architecture

### Component Boundaries

| Component | Responsibility | Communicates With | Status |
|-----------|---------------|-------------------|--------|
| `SchedulingService` | Pure CPM calculation (forward/backward pass, critical path) | Called by `useScheduling` hook | EXISTS (modify) |
| `useScheduling` hook | Orchestrates scheduling after mutations; coordinates data fetching + recalculation + batch writes | `SchedulingService`, `useUpdateTask`, `useDependencies`, `useTasks` | NEW |
| `useScheduledUpdateTask` hook | Wraps `useUpdateTask` to trigger scheduling after task changes | `useScheduling`, `useUpdateTask` | NEW |
| `useScheduledCreateDependency` hook | Wraps `useCreateDependency` to trigger scheduling after dependency changes | `useScheduling`, `useCreateDependency` | NEW |
| Task service (`tasks.ts`) | CRUD with new fields (constraint_type, scheduling_mode, percent_complete) | Supabase | MODIFY |
| Dependency service (`dependencies.ts`) | CRUD with lead/lag support (already has lag_days) | Supabase | MINIMAL CHANGES |
| GanttChart component | Renders with real dependency data + progress bars | Receives scheduled tasks, dependencies | MODIFY |
| `page.tsx` | Wires hooks together, passes dependencies to GanttChart | All hooks | MODIFY |

### New File: `src/hooks/use-scheduling.ts`

This is the **central integration point**. It owns the scheduling orchestration.

```typescript
// src/hooks/use-scheduling.ts

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { schedulingService } from '@/services/scheduling'
import { taskKeys } from '@/hooks/use-tasks'
import { dependencyKeys } from '@/hooks/use-dependencies'
import { getTasks } from '@/services/tasks'
import { getDependencies } from '@/services/dependencies'
import { getProject } from '@/services/projects'
import { updateTask } from '@/services/tasks'
import type { Task, SchedulingResult } from '@/types/entities'

interface UseSchedulingOptions {
  projectId: string
  workDays?: number[]
  holidays?: Date[]
}

export function useScheduling({ projectId, workDays = [0, 1, 2, 3, 4], holidays = [] }: UseSchedulingOptions) {
  const queryClient = useQueryClient()

  /**
   * Recalculate CPM for the entire project and persist results.
   * Called after any mutation that affects scheduling:
   * - Task create/update/delete (duration, dates, assignee)
   * - Dependency create/update/delete
   * - Calendar exception changes
   */
  const recalculate = useCallback(async (): Promise<SchedulingResult | null> => {
    // 1. Fetch current state (fresh from DB, not cache)
    const [tasksResult, depsResult, projectResult] = await Promise.all([
      getTasks(projectId),
      getDependencies(projectId),
      getProject(projectId),
    ])

    if (tasksResult.error || !tasksResult.data) return null
    if (depsResult.error || !depsResult.data) return null

    const tasks = tasksResult.data
    const dependencies = depsResult.data
    const projectStart = projectResult.data?.start_date
      ? new Date(projectResult.data.start_date as string)
      : new Date()

    if (tasks.length === 0) return null

    // 2. Filter: only schedule auto-scheduled tasks
    const autoTasks = tasks.filter(t => t.scheduling_mode !== 'manual')
    const manualTasks = tasks.filter(t => t.scheduling_mode === 'manual')

    // 3. Run CPM on auto-scheduled tasks
    const result = schedulingService.calculateCriticalPath(
      autoTasks,
      dependencies,
      projectStart,
      workDays,
      holidays,
    )

    // 4. Apply constraint adjustments post-CPM
    const constrainedTasks = applyConstraints(result.tasks, dependencies)

    // 5. Batch-update changed tasks in DB
    const allScheduled = [...constrainedTasks, ...manualTasks]
    const updatePromises = allScheduled
      .filter(scheduledTask => {
        const original = tasks.find(t => t.id === scheduledTask.id)
        return hasSchedulingChanged(original, scheduledTask)
      })
      .map(task => updateTask(task.id, {
        es: task.es ? toISODate(task.es) : null,
        ef: task.ef ? toISODate(task.ef) : null,
        ls: task.ls ? toISODate(task.ls) : null,
        lf: task.lf ? toISODate(task.lf) : null,
        start_date: task.es ? toISODate(task.es) : null,
        end_date: task.ef ? toISODate(task.ef) : null,
        slack: task.slack,
        is_critical: task.is_critical,
      }))

    await Promise.all(updatePromises)

    // 6. Invalidate caches to trigger re-render with new data
    queryClient.invalidateQueries({ queryKey: taskKeys.lists() })

    return result
  }, [projectId, workDays, holidays, queryClient])

  return { recalculate }
}
```

### Integration Pattern: Scheduling-Aware Mutations

**Do NOT modify existing hooks.** Create wrapper hooks that compose scheduling on top.

```typescript
// src/hooks/use-scheduled-mutations.ts

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useScheduling } from './use-scheduling'
import { createTask, updateTask, deleteTask } from '@/services/tasks'
import { createDependency, deleteDependency } from '@/services/dependencies'
import { taskKeys } from './use-tasks'
import { dependencyKeys } from './use-dependencies'
import type { Task } from '@/types/entities'

/**
 * Task update that auto-cascades scheduling.
 *
 * Flow:
 *   1. Optimistic cache update (immediate UI feedback)
 *   2. Persist to Supabase
 *   3. Recalculate CPM for project
 *   4. Persist scheduling results
 *   5. Invalidate caches (authoritative data replaces optimistic)
 */
export function useScheduledUpdateTask(projectId: string, schedulingOptions: SchedulingOptions) {
  const queryClient = useQueryClient()
  const { recalculate } = useScheduling(schedulingOptions)

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: UpdateTaskInput }) => {
      const result = await updateTask(id, updates)
      if (result.error) throw new Error(result.error.message)
      return result.data as Task
    },
    onMutate: async ({ id, updates }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: taskKeys.lists() })

      // Snapshot previous value for rollback
      const previousTasks = queryClient.getQueryData(taskKeys.list(projectId))

      // Optimistic update: apply change immediately in UI
      queryClient.setQueryData(taskKeys.list(projectId), (old: Task[] | undefined) => {
        if (!old) return old
        return old.map(t => t.id === id ? { ...t, ...updates } : t)
      })

      return { previousTasks }
    },
    onSuccess: async () => {
      // After DB write succeeds, recalculate scheduling
      await recalculate()
    },
    onError: (_error, _variables, context) => {
      // Rollback optimistic update on failure
      if (context?.previousTasks) {
        queryClient.setQueryData(taskKeys.list(projectId), context.previousTasks)
      }
    },
  })
}
```

### Data Flow: Complete Scheduling Pipeline

```
                       USER ACTION
                           |
                    +------v------+
                    | Optimistic  |  <-- Immediate UI response
                    | Cache Update|
                    +------+------+
                           |
                    +------v------+
                    | Supabase    |  <-- Persist the user's change
                    | UPDATE      |
                    +------+------+
                           |
                    +------v------+
                    | onSuccess   |
                    | callback    |
                    +------+------+
                           |
              +------------v-----------+
              | useScheduling          |
              | .recalculate()         |
              |                        |
              |  1. Fetch fresh tasks  |
              |  2. Fetch fresh deps   |
              |  3. Filter manual tasks|
              |  4. Forward pass       |
              |  5. Backward pass      |
              |  6. Apply constraints  |
              |  7. Calc slack/crit    |
              |  8. Batch update DB    |
              |  9. Invalidate cache   |
              +------------------------+
                           |
                    +------v------+
                    | React Query |  <-- Re-render with authoritative
                    | re-fetches  |      scheduled data
                    +------+------+
                           |
                    +------v------+
                    | Gantt Chart |  <-- Shows cascaded dates,
                    | re-renders  |      dependencies, critical path
                    +-------------+
```

---

## Schema Changes Required

### New Columns on `tasks` Table

```sql
-- Migration: 007_add_scheduling_features.sql

-- 1. Constraint type (MS Project-style)
ALTER TABLE tasks ADD COLUMN constraint_type TEXT DEFAULT 'asap'
  CHECK (constraint_type IN (
    'asap',   -- As Soon As Possible (default, standard CPM)
    'alap',   -- As Late As Possible
    'snet',   -- Start No Earlier Than
    'snlt',   -- Start No Later Than
    'fnet',   -- Finish No Earlier Than
    'fnlt',   -- Finish No Later Than
    'mso',    -- Must Start On
    'mfo'     -- Must Finish On
  ));

-- 2. Constraint date (used by SNET, SNLT, FNET, FNLT, MSO, MFO)
ALTER TABLE tasks ADD COLUMN constraint_date DATE;

-- 3. Scheduling mode: auto vs manual
ALTER TABLE tasks ADD COLUMN scheduling_mode TEXT DEFAULT 'auto'
  CHECK (scheduling_mode IN ('auto', 'manual'));

-- 4. Percent complete (0-100)
ALTER TABLE tasks ADD COLUMN percent_complete INTEGER DEFAULT 0
  CHECK (percent_complete >= 0 AND percent_complete <= 100);

-- 5. Actual start/finish (for progress tracking)
ALTER TABLE tasks ADD COLUMN actual_start DATE;
ALTER TABLE tasks ADD COLUMN actual_finish DATE;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_tasks_constraint_type ON tasks(constraint_type);
CREATE INDEX IF NOT EXISTS idx_tasks_scheduling_mode ON tasks(scheduling_mode);
```

### TypeScript Type Changes

```typescript
// In types/entities.ts

// New types
export type ConstraintType = 'asap' | 'alap' | 'snet' | 'snlt' | 'fnet' | 'fnlt' | 'mso' | 'mfo'
export type SchedulingMode = 'auto' | 'manual'

// Updated Task interface
export interface Task extends BaseEntity {
  // ... existing fields ...

  // NEW scheduling fields
  constraint_type: ConstraintType
  constraint_date: Date | string | null
  scheduling_mode: SchedulingMode
  percent_complete: number
  actual_start: Date | string | null
  actual_finish: Date | string | null
}
```

### UpdateTaskInput Changes

```typescript
// In services/tasks.ts

export interface UpdateTaskInput {
  // ... existing fields ...

  // NEW fields
  constraint_type?: ConstraintType
  constraint_date?: string | null
  scheduling_mode?: SchedulingMode
  percent_complete?: number
  actual_start?: string | null
  actual_finish?: string | null

  // CPM fields (written by scheduler, not user)
  es?: string | null
  ef?: string | null
  ls?: string | null
  lf?: string | null
  slack?: number
  is_critical?: boolean
}
```

---

## SchedulingService Extensions

### Pattern: Extend, Don't Rewrite

The existing `SchedulingService` is well-structured with pure functions. Extend it by adding methods for constraint handling. Do NOT modify `forwardPass` or `backwardPass` signatures -- add a post-processing step.

### Constraint Application (Post-CPM)

Constraints are applied AFTER the standard forward/backward pass, not during. This is how MS Project works: CPM calculates the unconstrained schedule, then constraints shift dates.

```typescript
// Add to SchedulingService class

/**
 * Apply constraint types to CPM-calculated dates.
 * Called AFTER forwardPass and backwardPass.
 *
 * Constraint logic:
 * - ASAP: No change (default CPM behavior)
 * - ALAP: Use LS/LF instead of ES/EF for start/end dates
 * - SNET: ES = max(CPM_ES, constraint_date)
 * - SNLT: ES = min(CPM_ES, constraint_date)
 * - FNET: EF = max(CPM_EF, constraint_date), recalc ES
 * - FNLT: EF = min(CPM_EF, constraint_date), recalc ES
 * - MSO:  ES = constraint_date (override)
 * - MFO:  EF = constraint_date (override), recalc ES
 */
applyConstraints(
  tasks: Task[],
  workDays: number[],
  holidays: Date[]
): Task[] {
  return tasks.map(task => {
    const constrained = { ...task }
    const constraintDate = task.constraint_date ? this.toDate(task.constraint_date) : null

    if (!constraintDate || task.constraint_type === 'asap') {
      return constrained
    }

    switch (task.constraint_type) {
      case 'alap':
        constrained.es = task.ls
        constrained.ef = task.lf
        break

      case 'snet':
        if (constrained.es && constraintDate > new Date(constrained.es as string)) {
          constrained.es = constraintDate
          constrained.ef = this.addWorkingDays(constraintDate, task.duration, workDays, holidays)
        }
        break

      case 'snlt':
        if (constrained.es && constraintDate < new Date(constrained.es as string)) {
          constrained.es = constraintDate
          constrained.ef = this.addWorkingDays(constraintDate, task.duration, workDays, holidays)
        }
        break

      case 'fnet':
        if (constrained.ef && constraintDate > new Date(constrained.ef as string)) {
          constrained.ef = constraintDate
          constrained.es = this.subtractWorkingDays(constraintDate, task.duration, workDays, holidays)
        }
        break

      case 'fnlt':
        if (constrained.ef && constraintDate < new Date(constrained.ef as string)) {
          constrained.ef = constraintDate
          constrained.es = this.subtractWorkingDays(constraintDate, task.duration, workDays, holidays)
        }
        break

      case 'mso':
        constrained.es = constraintDate
        constrained.ef = this.addWorkingDays(constraintDate, task.duration, workDays, holidays)
        break

      case 'mfo':
        constrained.ef = constraintDate
        constrained.es = this.subtractWorkingDays(constraintDate, task.duration, workDays, holidays)
        break
    }

    return constrained
  })
}
```

### Extending forwardPass for All Dependency Types

The current `forwardPass` handles only **Finish-to-Start (FS)** correctly. The `type` field on `Dependency` allows FS/SS/FF/SF, but the algorithm ignores it. Here is how to extend:

```typescript
// Replace the inner loop in forwardPass where predecessors are processed

for (const dep of predecessors) {
  const predTask = taskMap.get(dep.predecessor_id)
  if (!predTask) continue

  let candidateDate: Date

  switch (dep.type) {
    case 'FS': // Finish-to-Start (default)
      // Successor starts after predecessor finishes
      candidateDate = predTask.ef
        ? this.addDays(predTask.ef, 1)
        : this.findNextWorkingDay(projectStart, workDays, holidays)
      break

    case 'SS': // Start-to-Start
      // Successor starts when predecessor starts
      candidateDate = predTask.es
        ? new Date(predTask.es as Date)
        : this.findNextWorkingDay(projectStart, workDays, holidays)
      break

    case 'FF': // Finish-to-Finish
      // Successor finishes when predecessor finishes
      // So successor ES = predecessor EF - successor duration
      if (predTask.ef) {
        const predEf = new Date(predTask.ef as Date)
        candidateDate = this.subtractWorkingDays(predEf, task.duration - 1, workDays, holidays)
      } else {
        candidateDate = this.findNextWorkingDay(projectStart, workDays, holidays)
      }
      break

    case 'SF': // Start-to-Finish
      // Successor finishes when predecessor starts
      // So successor ES = predecessor ES - successor duration
      if (predTask.es) {
        const predEs = new Date(predTask.es as Date)
        candidateDate = this.subtractWorkingDays(predEs, task.duration - 1, workDays, holidays)
      } else {
        candidateDate = this.findNextWorkingDay(projectStart, workDays, holidays)
      }
      break

    default:
      candidateDate = this.findNextWorkingDay(projectStart, workDays, holidays)
  }

  // Apply lag (positive = delay, negative = lead)
  if (dep.lag_days > 0) {
    candidateDate = this.addWorkingDays(candidateDate, dep.lag_days, workDays, holidays)
  } else if (dep.lag_days < 0) {
    candidateDate = this.subtractWorkingDays(candidateDate, Math.abs(dep.lag_days), workDays, holidays)
  }

  candidateDate = this.findNextWorkingDay(candidateDate, workDays, holidays)

  if (!maxDate || candidateDate > maxDate) {
    maxDate = candidateDate
  }
}
```

Note: The existing code already supports `lag_days > 0` but does NOT handle **negative lag (lead time)**. The extension above adds this.

### Similar changes needed in `backwardPass`

The backward pass needs symmetric changes for all four dependency types.

---

## Optimistic Updates Strategy

### Why Not Full Optimistic Scheduling

Running CPM calculation optimistically (in `onMutate`) is tempting but problematic:

1. **CPM needs ALL tasks and dependencies** -- the query cache may not have them all
2. **Batch DB writes from optimistic context would race** with the actual mutation
3. **Rollback complexity**: undoing scheduling changes across N tasks is fragile

### Recommended: Hybrid Approach

Use optimistic updates for the **single changed task** only. Run full scheduling asynchronously in `onSuccess`.

```
onMutate: Optimistically update the changed task (immediate feedback)
onSuccess: Run full CPM recalculation (100-300ms for typical project sizes)
onSettled: Invalidate caches (authoritative data replaces optimistic)
```

This gives the user immediate visual feedback ("my change took effect") while the scheduling cascade happens in the background. The Gantt chart will show cascaded changes ~300ms later when React Query re-fetches.

### Performance Budget

| Project Size | Tasks | Deps | CPM Time | DB Writes | Total |
|-------------|-------|------|----------|-----------|-------|
| Small | 20 | 15 | <10ms | ~5 | ~200ms |
| Medium | 100 | 80 | <50ms | ~20 | ~500ms |
| Large | 500 | 400 | <200ms | ~100 | ~2s |

For projects with 500+ tasks, consider:
1. **Dirty tracking**: only recalculate the subgraph downstream of the changed task
2. **Debounced scheduling**: batch rapid edits (e.g., 500ms debounce)
3. **Background scheduling**: show "Recalculating..." indicator

### Debounced Scheduling Hook Pattern

```typescript
// For drag-and-drop scenarios or rapid edits
export function useScheduling({ projectId, ...opts }: UseSchedulingOptions) {
  const debouncedRecalculate = useMemo(
    () => debounce(async () => {
      // ... full recalculation
    }, 500),
    [projectId]
  )

  // Immediate recalculate for single mutations
  const recalculate = useCallback(async () => { /* ... */ }, [projectId])

  // Debounced recalculate for drag operations
  const scheduleRecalculate = useCallback(() => {
    debouncedRecalculate()
  }, [debouncedRecalculate])

  return { recalculate, scheduleRecalculate }
}
```

---

## Integration Points: Exact Files and Functions

### Files to MODIFY

| File | What Changes | Why |
|------|-------------|-----|
| `src/types/entities.ts` | Add `ConstraintType`, `SchedulingMode` types. Add new fields to `Task` interface. | Schema alignment |
| `src/services/tasks.ts` | Add new fields to `CreateTaskInput`, `UpdateTaskInput`. Add CPM fields to `UpdateTaskInput` (es, ef, ls, lf, slack, is_critical). | Allow scheduler to write CPM results |
| `src/services/scheduling.ts` | Add `applyConstraints()` method. Extend `forwardPass` to handle SS/FF/SF dependency types. Support negative lag (lead). | Feature completeness |
| `src/services/scheduling.test.ts` | Add tests for constraints, dependency types, negative lag | Test coverage |
| `src/components/gantt/GanttChart.tsx` | Add progress bar overlay. Accept constraint indicators. | Visual feedback |
| `src/app/page.tsx` | Import `useDependencies`, pass to GanttChart. Wire scheduling hooks. Use `useScheduledUpdateTask` instead of `useUpdateTask`. | Integration |
| `src/components/forms/TaskForm.tsx` | Add constraint_type, scheduling_mode, percent_complete fields | User input |
| `supabase/migrations/` | New migration for schema changes | Database |

### Files to CREATE

| File | Purpose |
|------|---------|
| `src/hooks/use-scheduling.ts` | Central scheduling orchestration hook |
| `src/hooks/use-scheduled-mutations.ts` | Mutation hooks that trigger scheduling |
| `src/hooks/use-scheduling.test.ts` | Tests for scheduling integration |
| `supabase/migrations/007_add_scheduling_features.sql` | Schema migration |

### Files NOT to Change

| File | Why Leave Alone |
|------|----------------|
| `src/hooks/use-tasks.ts` | Keep as-is. Scheduling-aware versions are separate hooks. Consumers that don't need scheduling (e.g., simple list views) keep using the simpler hooks. |
| `src/hooks/use-dependencies.ts` | No changes needed. The `useScheduledCreateDependency` wrapper composes on top. |
| `src/services/dependencies.ts` | Already supports all 4 dependency types and lag_days. No changes needed. |

---

## Patterns to Follow

### Pattern 1: Composition Over Modification

Wrap existing hooks rather than modifying them. This preserves backward compatibility and lets non-scheduling consumers stay simple.

```typescript
// GOOD: Composition
export function useScheduledUpdateTask(projectId, schedulingOpts) {
  const baseMutation = useUpdateTask()
  const { recalculate } = useScheduling(schedulingOpts)
  // ... compose
}

// BAD: Modifying existing hook
export function useUpdateTask() {
  // ... now has scheduling concerns mixed in
}
```

### Pattern 2: Scheduler Writes CPM Fields, Users Never Do

CPM fields (es, ef, ls, lf, slack, is_critical) should ONLY be written by the scheduling engine, never by user input. The `UpdateTaskInput` should include them for the scheduler's use, but forms should not expose them.

```typescript
// Scheduler writes:
await updateTask(task.id, {
  es: '2026-03-01', ef: '2026-03-05',
  ls: '2026-03-03', lf: '2026-03-07',
  slack: 2, is_critical: false,
})

// User writes (through form):
await updateTask(task.id, {
  duration: 5, constraint_type: 'snet', constraint_date: '2026-03-01',
})
// Then scheduler recalculates CPM fields automatically
```

### Pattern 3: Manual Mode Bypass

Tasks in `scheduling_mode: 'manual'` skip CPM entirely. Their dates are set by the user and never overwritten by the scheduler. This is essential for tasks with external dependencies or fixed deadlines.

```typescript
// In useScheduling.recalculate():
const autoTasks = tasks.filter(t => t.scheduling_mode !== 'manual')

// Only auto-scheduled tasks go through CPM
const result = schedulingService.calculateCriticalPath(autoTasks, dependencies, ...)

// Manual tasks are included in dependency graph for OTHER tasks' calculations
// but their own dates are not modified
```

**Important subtlety**: Manual tasks must still participate as predecessors/successors in the dependency graph. A manual task's dates constrain its successors. The scheduler just does not overwrite the manual task's own dates.

### Pattern 4: Progress Tracking Side Effects

When `percent_complete` reaches 100, auto-set `status: 'done'` and `actual_finish: today`. When `percent_complete` moves from 0 to >0, auto-set `status: 'in_progress'` and `actual_start: today` (if not already set).

```typescript
// In task update logic (service or hook layer)
function applyProgressSideEffects(updates: UpdateTaskInput): UpdateTaskInput {
  const enriched = { ...updates }

  if (updates.percent_complete === 100) {
    enriched.status = 'done'
    if (!updates.actual_finish) {
      enriched.actual_finish = new Date().toISOString().split('T')[0]
    }
  } else if (updates.percent_complete !== undefined && updates.percent_complete > 0) {
    if (!updates.status || updates.status === 'pending') {
      enriched.status = 'in_progress'
    }
    if (!updates.actual_start) {
      enriched.actual_start = new Date().toISOString().split('T')[0]
    }
  }

  return enriched
}
```

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Server-Side Scheduling via Supabase Functions

**What:** Running CPM calculation in PostgreSQL functions or Edge Functions triggered by database writes.

**Why bad:**
- CPM algorithm is complex (~300 lines) and hard to debug in PL/pgSQL
- The existing `SchedulingService` is well-tested TypeScript -- duplicating it server-side creates maintenance burden
- Client-side scheduling was an explicit architectural decision for this project
- Supabase Edge Functions have cold-start latency

**Instead:** Keep scheduling client-side in the React hooks layer. The `useScheduling` hook calls the existing `SchedulingService`.

### Anti-Pattern 2: Scheduling in onMutate (Full Optimistic)

**What:** Running the full CPM recalculation in `onMutate` before the server confirms the write.

**Why bad:**
- The query cache may not contain all tasks/dependencies (stale data, pagination)
- If the server rejects the mutation, rolling back N scheduled tasks is fragile
- CPM needs fresh data -- using potentially stale cache data produces wrong schedules

**Instead:** Optimistically update only the single changed task. Run full CPM in `onSuccess` with fresh data.

### Anti-Pattern 3: Modifying SchedulingService to Fetch Its Own Data

**What:** Making `SchedulingService` call Supabase directly to fetch tasks/dependencies.

**Why bad:**
- Violates the current pure-function architecture (no side effects)
- Makes the service untestable without mocking Supabase
- Mixes data fetching concerns with calculation

**Instead:** Keep `SchedulingService` pure. The `useScheduling` hook fetches data and passes it in.

### Anti-Pattern 4: Scheduling on Every Re-render

**What:** Computing CPM in a `useMemo` that depends on `tasks` or `dependencies`.

**Why bad:**
- Creates infinite loops: scheduling changes tasks, which triggers useMemo, which runs scheduling again
- Unnecessary CPU usage on re-renders that don't involve scheduling-relevant changes

**Instead:** Trigger scheduling explicitly via mutation callbacks only. Use the `recalculate` function from `useScheduling`.

---

## Triggers That Should Invoke Scheduling

| Action | Triggers Recalculation? | Why |
|--------|------------------------|-----|
| Create task | YES | New task may affect dependency chain |
| Update task duration | YES | Changes EF of task and all successors |
| Update task constraint_type/date | YES | Shifts task dates, cascades to successors |
| Change task scheduling_mode | YES | Moving to/from manual mode changes the schedule |
| Update task status (to done) | MAYBE | If `percent_complete` auto-updates, may trigger recalc |
| Update task percent_complete | NO | Progress tracking only, no date changes |
| Update task title/description/priority | NO | Non-scheduling fields |
| Create dependency | YES | New constraint in the graph |
| Delete dependency | YES | Removed constraint may change dates |
| Update dependency type/lag | YES | Changes timing relationship |
| Create calendar exception | YES | New holiday may shift dates |
| Delete calendar exception | YES | Removed holiday may shift dates |
| Change task assignee | YES (if resource-aware) | Different work schedule may change dates |

---

## Build Order (Minimize Rework)

### Phase 1: Wire Existing CPM to Mutations (Foundation)

**Goal:** Get the existing CPM engine actually running. No new features.

1. Add CPM fields to `UpdateTaskInput` (es, ef, ls, lf, slack, is_critical)
2. Create `useScheduling` hook with `recalculate()`
3. Create `useScheduledUpdateTask` / `useScheduledCreateDependency`
4. Wire `useDependencies` into `page.tsx`, pass to GanttChart
5. Call `recalculate()` on task/dependency mutations

**Why first:** Everything else builds on this. Without this, adding constraints or progress tracking has no effect on the UI.

### Phase 2: All Dependency Types + Lead/Lag

**Goal:** Make SS/FF/SF work correctly. Support negative lag (lead time).

1. Extend `forwardPass` to handle all four dependency types
2. Extend `backwardPass` symmetrically
3. Allow negative `lag_days` (lead time) in dependency input
4. Update GanttChart to render different dependency types visually

**Why second:** Dependencies are fundamental to scheduling. Constraints and progress tracking are meaningless if the dependency graph is wrong.

### Phase 3: Constraint Types + Manual Mode

**Goal:** MS Project-style scheduling constraints.

1. Add schema migration for constraint_type, constraint_date, scheduling_mode
2. Update TypeScript types
3. Add `applyConstraints()` to SchedulingService
4. Add constraint/mode fields to TaskForm
5. Filter manual tasks out of CPM in `useScheduling`

**Why third:** Constraints refine scheduling behavior. They require the foundation (Phase 1) and correct dependencies (Phase 2) to work properly.

### Phase 4: Progress Tracking

**Goal:** Percent complete, actual dates, progress bars on Gantt.

1. Add schema migration for percent_complete, actual_start, actual_finish
2. Add progress side effects (auto-status changes)
3. Add progress bar to GanttChart task bars
4. Add percent_complete input to TaskForm

**Why last:** Pure visual/tracking feature. No impact on CPM calculation. Can be built independently.

---

## Scalability Considerations

| Concern | At 20 tasks | At 200 tasks | At 1000+ tasks |
|---------|-------------|--------------|----------------|
| CPM calculation | Instant (<10ms) | Fast (<100ms) | Consider subgraph scheduling |
| DB writes after recalc | Negligible (~5 writes) | Noticeable (~50 writes, batch) | Must optimize: only write changed tasks |
| React re-renders | No concern | Memoize GanttChart positions | Virtualize task list, lazy-render Gantt rows |
| Optimistic updates | Simple | Simple | Need dirty-tracking to avoid full recalc |

### Optimization: Subgraph Scheduling

For large projects, instead of recalculating the entire CPM:

1. Find the changed task in the topological order
2. Only recalculate tasks downstream (successors) of the change
3. Keep upstream tasks unchanged

This requires maintaining a dependency graph in memory, which is straightforward with the existing `topologicalSort` and adjacency list code.

---

## Sources

- **Direct codebase analysis** (HIGH confidence): All architectural recommendations based on reading actual source files
- **CPM scheduling theory** (HIGH confidence): Forward/backward pass, constraint types are well-established scheduling theory from PMI/PMBOK
- **MS Project constraint model** (MEDIUM confidence): ASAP/ALAP/SNET/SNLT/FNET/FNLT/MSO/MFO constraint types based on established MS Project documentation patterns; specific implementation details should be verified against current MS Project behavior
- **TanStack Query patterns** (HIGH confidence): onMutate/onSuccess/onError optimistic update pattern is documented in TanStack Query v5 guides
- **Negative lag / lead time** (HIGH confidence): Standard scheduling concept, well-documented in PMI literature
