# Phase 4: Scheduling Engine Foundation - Research

**Researched:** 2026-02-16
**Domain:** CPM scheduling engine (forward/backward pass for all dependency types), UI wiring, batch persistence
**Confidence:** HIGH

## Summary

Phase 4 requires three distinct workstreams: (1) fixing the CPM engine to correctly compute dates for SS/FF/SF dependency types with lead/lag support (including negative lag), (2) wiring the scheduling engine to the UI so that task or dependency mutations trigger automatic recalculation and Gantt refresh, and (3) batch-persisting changed CPM fields to the database.

The existing `SchedulingService` class handles FS dependencies correctly but treats ALL dependency types as FS -- the `forwardPass` and `backwardPass` methods only use predecessor EF to compute successor ES. The formulas for SS, FF, and SF are well-established in project management literature and require different anchor points (start-to-start, finish-to-finish, start-to-finish). The Gantt chart currently receives `dependencies={[]}` (hardcoded empty array in page.tsx line 933), meaning it never renders dependency lines. The main page.tsx is 1,258 lines and needs extraction of scheduling logic into a dedicated hook.

**Primary recommendation:** Fix the scheduling engine formulas first (pure algorithmic work with excellent testability), then wire it to UI mutations via a `useScheduling` hook that calls the engine and batch-persists results, and finally update the Gantt chart to consume real dependency data with hover tooltips.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Dependency type display
- All dependency types (FS, SS, FF, SF) use the same line style in the Gantt chart -- no color or dash differentiation
- Dependency type is shown on hover only (tooltip), not as a permanent label on the chart
- Lead/lag values shown in the same hover tooltip alongside the type (e.g., "FS +2d")

#### Cascade behavior
- Auto-cascading triggers immediately on change -- no save/confirm step required
- Dates update instantly and silently -- no animation or toast notifications
- Cascading is deterministic; reversing the input change reverses the cascade

### Claude's Discretion
- Lead/lag display approach (whether to show inline on lines or only in tooltip -- leaning tooltip to match type display)
- Critical path visual treatment (color, outline, toggle mode)
- Undo mechanism after cascade (if any)
- Conflict/warning presentation when cascading produces issues (inline, banner, or both)

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SchedulingService (custom) | existing | CPM forward/backward pass | Already in codebase, needs algorithm fixes not replacement |
| TanStack Query | v5 (already installed) | Mutation + cache invalidation for cascade | Already used throughout app for all data fetching |
| Supabase JS | v2 (already installed) | Batch persist CPM fields via upsert | Already used for all CRUD operations |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | existing | Unit testing of CPM formulas | Testing all 4 dependency types with edge cases |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom SchedulingService | External CPM library | No well-maintained JS CPM library exists; custom is correct here because the formulas are well-defined and domain-specific |
| Supabase upsert for batch persist | Individual row updates | Upsert is dramatically more efficient for batch operations |
| TanStack Query invalidation | Manual state management | TanStack Query already manages all data; fighting it would create inconsistencies |

**Installation:**
No new dependencies needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── services/
│   └── scheduling.ts          # Fixed CPM engine (all 4 dependency types + lead/lag)
├── hooks/
│   └── use-scheduling.ts      # NEW: orchestrates engine + persistence + cache invalidation
├── components/
│   └── gantt/
│       └── GanttChart.tsx      # Updated: dependency line rendering + hover tooltips
└── app/
    └── page.tsx                # Trimmed: uses useScheduling hook instead of inline logic
```

### Pattern 1: Synchronous Engine, Async Persistence
**What:** The scheduling engine computes synchronously (pure function on in-memory data). Only the database persistence is async. The UI updates from the computed result immediately via React Query cache, and the DB write happens in the background.
**When to use:** Every time a scheduling-relevant mutation occurs (task duration change, dependency add/remove/modify).
**Example:**
```typescript
// In useScheduling hook
async function recalculateAndPersist(
  tasks: Task[],
  dependencies: Dependency[],
  projectStart: Date,
  workDays: number[],
  holidays: Date[]
) {
  // 1. Compute synchronously (fast, deterministic)
  const result = schedulingService.calculateCriticalPath(
    tasks, dependencies, projectStart, workDays, holidays
  )

  // 2. Optimistically update React Query cache (instant UI update)
  queryClient.setQueryData(taskKeys.list(projectId), result.tasks)

  // 3. Batch persist to DB (background, async)
  await batchUpdateTaskCPMFields(result.tasks)
}
```

### Pattern 2: Mutation Wrapper Hook
**What:** A custom hook that wraps existing mutation hooks (useUpdateTask, useCreateDependency, etc.) and injects scheduling recalculation into their onSuccess callbacks.
**When to use:** To avoid scattering scheduling logic across every mutation call site.
**Example:**
```typescript
// useScheduling hook provides wrapped mutations
export function useScheduling(projectId: string) {
  const updateTask = useUpdateTask()
  const { tasks, dependencies, project } = useProjectSchedulingData(projectId)

  const updateTaskWithReschedule = useMutation({
    mutationFn: async ({ id, updates }) => {
      // 1. Perform the actual task update
      const result = await updateTask.mutateAsync({ id, updates })
      return result
    },
    onSuccess: () => {
      // 2. Recalculate entire schedule
      recalculateAndPersist(tasks, dependencies, ...)
    }
  })

  return { updateTaskWithReschedule }
}
```

### Pattern 3: One-Shot Mutation, Not Reactive useEffect
**What:** Scheduling recalculation happens as a direct consequence of a mutation, NOT as a side effect of data changing. This prevents infinite loops.
**When to use:** Always. This is the ONLY safe pattern.
**Why critical:** If scheduling recalculation runs in a useEffect watching task data, the recalculation itself changes task data, which triggers another recalculation, creating an infinite loop.
**Anti-pattern:**
```typescript
// WRONG: Will cause infinite loop
useEffect(() => {
  if (tasks.length > 0 && dependencies.length > 0) {
    recalculate(tasks, dependencies)  // Updates tasks -> triggers useEffect -> recalculates -> ...
  }
}, [tasks, dependencies])
```
**Correct pattern:**
```typescript
// RIGHT: One-shot recalculation triggered by explicit user action
const handleDurationChange = async (taskId: string, newDuration: number) => {
  await updateTask({ id: taskId, updates: { duration: newDuration } })
  await recalculateSchedule()  // Explicit, one-shot, not reactive
}
```

### Pattern 4: Dependency-Aware Connection Points in Gantt
**What:** Each dependency type determines which anchor points on the task bars the SVG line connects. FS connects predecessor END to successor START. SS connects START to START. FF connects END to END. SF connects START to END.
**When to use:** When rendering dependency lines in the Gantt chart SVG.
**Example:**
```typescript
function getDependencyEndpoints(dep: Dependency, predPos: TaskPosition, succPos: TaskPosition) {
  switch (dep.type) {
    case 'FS':
      return { startX: predPos.left + predPos.width, startY: ..., endX: succPos.left, endY: ... }
    case 'SS':
      return { startX: predPos.left, startY: ..., endX: succPos.left, endY: ... }
    case 'FF':
      return { startX: predPos.left + predPos.width, startY: ..., endX: succPos.left + succPos.width, endY: ... }
    case 'SF':
      return { startX: predPos.left, startY: ..., endX: succPos.left + succPos.width, endY: ... }
  }
}
```

### Anti-Patterns to Avoid
- **Reactive scheduling in useEffect:** Will cause infinite loops. Scheduling must be triggered by explicit mutations only.
- **Individual row updates for CPM fields:** Use batch upsert, not N individual update calls.
- **Scheduling in the component:** Extract to a hook/service. The 1,258-line page.tsx must not grow further.
- **Animating cascade results:** User explicitly decided against animations/toasts for cascade updates.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Topological sort | Custom sort algorithm | Existing `topologicalSort()` in SchedulingService | Already implemented correctly with cycle detection |
| Circular dependency detection | Manual graph traversal | Existing cycle detection in `topologicalSort()` | Throws on circular deps, already tested |
| Query cache management | Manual state synchronization | TanStack Query `setQueryData` + `invalidateQueries` | Fighting React Query's cache is a losing battle |
| Batch DB updates | Loop of individual updates | Supabase `upsert()` with array of records | Single network call vs N calls; dramatically faster |
| Date arithmetic with calendars | Raw Date math | Existing `addWorkingDays`, `subtractWorkingDays` | Calendar-aware helpers already handle weekends/holidays |

**Key insight:** The scheduling engine itself IS the custom solution -- CPM with all 4 dependency types is the core domain logic. But everything around it (persistence, caching, UI reactivity) should use existing infrastructure.

## Common Pitfalls

### Pitfall 1: Infinite Cascade Loop
**What goes wrong:** Scheduling recalculation is triggered reactively (via useEffect on task data), causing an infinite loop: task data changes -> recalculate -> task data changes -> recalculate -> ...
**Why it happens:** Natural instinct is to "watch for changes and recalculate." This works in imperative code but not in React's declarative model.
**How to avoid:** Trigger recalculation as a one-shot consequence of an explicit user action (mutation onSuccess), never as a reaction to data changes.
**Warning signs:** Page freezes, browser tab crashes, infinite re-renders in React DevTools.

### Pitfall 2: Stale Data in Recalculation
**What goes wrong:** The recalculation uses stale task data from a closure instead of fresh data including the mutation that just happened.
**Why it happens:** React Query's cache update hasn't propagated yet when the onSuccess handler runs.
**How to avoid:** Either (a) optimistically merge the mutation into the current data before recalculating, or (b) await the query invalidation and use the fresh data. Option (a) is preferred for instant feel.
**Warning signs:** Schedule appears correct after refresh but not after the initial mutation.

### Pitfall 3: SS/FF/SF Formula Errors
**What goes wrong:** Successor dates are wrong because the formulas confuse which anchor (start vs finish) to use for which dependency type.
**Why it happens:** The literature is clear on FS but often unclear on the other types. Developers guess instead of using the precise formulas.
**How to avoid:** Use the exact formulas documented in the Code Examples section below. Test each type independently with known-good test cases.
**Warning signs:** SS dependency doesn't align starts, FF doesn't align finishes.

### Pitfall 4: Negative Lag Producing Invalid Dates
**What goes wrong:** Negative lag (lead time) causes a successor to start before the project start date, or produces a negative duration situation.
**Why it happens:** Subtracting lag from a date without bounds checking.
**How to avoid:** After applying negative lag, clamp the result: successor ES cannot be before project start. Also handle the case where negative lag is larger than the predecessor's duration.
**Warning signs:** Tasks appearing before the project start date on the Gantt chart.

### Pitfall 5: Batch Persistence Race Condition
**What goes wrong:** Two rapid changes trigger two recalculations. The second batch write completes before the first, but then the first write overwrites with stale data.
**Why it happens:** No debouncing or serialization of batch writes.
**How to avoid:** Either debounce the recalculation (e.g., 100ms) so rapid changes are batched, or use a serial queue for batch writes. Given the user decision for instant cascading, use a serial queue approach (cancel previous pending write if a new one starts).
**Warning signs:** Gantt shows correct dates momentarily, then reverts.

### Pitfall 6: GanttChart Not Re-rendering
**What goes wrong:** Task dates change in the cache but the Gantt chart doesn't re-render because React.memo prevents it.
**Why it happens:** The GanttChart is wrapped in React.memo. If the tasks array reference doesn't change (e.g., if using setQueryData with the same array identity), memo prevents re-render.
**How to avoid:** Ensure recalculated tasks produce a new array reference. The spread operator in `calculateCriticalPath` already creates new task objects, so this should work -- but verify.
**Warning signs:** Gantt chart appears stuck after a scheduling change.

## Code Examples

### CPM Forward Pass Formulas for All Dependency Types

The forward pass computes Early Start (ES) and Early Finish (EF). For each dependency from predecessor (P) to successor (S) with lag L:

```typescript
// Source: Standard CPM/PDM scheduling theory (PMI, PMBOK)
// Verified against multiple project management references

function computeSuccessorESFromDependency(
  dep: Dependency,
  predES: Date,   // Predecessor Early Start
  predEF: Date,   // Predecessor Early Finish
  workDays: number[],
  holidays: Date[]
): Date {
  const service = new SchedulingService()
  const lag = dep.lag_days // Can be negative (lead time)

  switch (dep.type) {
    case 'FS':
      // Finish-to-Start: Successor starts after predecessor finishes + lag
      // Successor ES = Predecessor EF + 1 + lag
      let fsDate = service.addDays(predEF, 1)
      if (lag > 0) fsDate = service.addWorkingDays(fsDate, lag, workDays, holidays)
      if (lag < 0) fsDate = service.subtractWorkingDays(fsDate, Math.abs(lag), workDays, holidays)
      return fsDate

    case 'SS':
      // Start-to-Start: Successor starts when predecessor starts + lag
      // Successor ES = Predecessor ES + lag
      let ssDate = new Date(predES)
      if (lag > 0) ssDate = service.addWorkingDays(ssDate, lag, workDays, holidays)
      if (lag < 0) ssDate = service.subtractWorkingDays(ssDate, Math.abs(lag), workDays, holidays)
      return ssDate

    case 'FF':
      // Finish-to-Finish: Successor finishes when predecessor finishes + lag
      // This constrains successor EF, not ES directly.
      // Successor EF >= Predecessor EF + lag
      // Therefore: Successor ES = Predecessor EF + lag - Successor Duration + 1
      // (This is computed at the call site because it needs successor duration)
      // Return the implied EF constraint; caller subtracts duration.
      let ffDate = new Date(predEF)
      if (lag > 0) ffDate = service.addWorkingDays(ffDate, lag, workDays, holidays)
      if (lag < 0) ffDate = service.subtractWorkingDays(ffDate, Math.abs(lag), workDays, holidays)
      return ffDate  // This is the EF constraint; ES = subtractWorkingDays(this, duration)

    case 'SF':
      // Start-to-Finish: Predecessor start constrains successor finish + lag
      // Successor EF >= Predecessor ES + lag
      // Therefore: Successor ES = Predecessor ES + lag - Successor Duration + 1
      // (This is computed at the call site because it needs successor duration)
      let sfDate = new Date(predES)
      if (lag > 0) sfDate = service.addWorkingDays(sfDate, lag, workDays, holidays)
      if (lag < 0) sfDate = service.subtractWorkingDays(sfDate, Math.abs(lag), workDays, holidays)
      return sfDate  // This is the EF constraint; ES = subtractWorkingDays(this, duration)
  }
}
```

### Key Insight: FF and SF Constrain EF, Not ES

```typescript
// For FS and SS: the dependency constrains the successor's START date
// For FF and SF: the dependency constrains the successor's FINISH date
//
// Forward Pass Algorithm for a successor with multiple predecessors:
//
// 1. For each predecessor dependency, compute the implied constraint:
//    - FS/SS: computes a candidate ES
//    - FF/SF: computes a candidate EF
//
// 2. For ES candidates: successor ES = max(all candidate ES values)
// 3. For EF candidates: convert to ES by subtracting duration
//    candidate_ES_from_EF = subtractWorkingDays(candidate_EF, duration)
//
// 4. Final successor ES = max(all ES candidates from steps 2 and 3)
// 5. Successor EF = addWorkingDays(ES, duration)

function computeForwardPassForTask(
  task: Task,
  predecessorDeps: Dependency[],
  taskMap: Map<string, Task>,
  projectStart: Date,
  workDays: number[],
  holidays: Date[]
): { es: Date; ef: Date } {
  const service = new SchedulingService()

  if (predecessorDeps.length === 0) {
    const es = service.findNextWorkingDay(projectStart, workDays, holidays)
    const ef = service.addWorkingDays(es, task.duration, workDays, holidays)
    return { es, ef }
  }

  let maxES: Date | null = null

  for (const dep of predecessorDeps) {
    const pred = taskMap.get(dep.predecessor_id)
    if (!pred || !pred.es || !pred.ef) continue

    const predES = pred.es instanceof Date ? pred.es : new Date(pred.es)
    const predEF = pred.ef instanceof Date ? pred.ef : new Date(pred.ef)

    let candidateES: Date

    switch (dep.type) {
      case 'FS': {
        // Successor ES = day after Predecessor EF + lag
        candidateES = service.addDays(predEF, 1)
        if (dep.lag_days > 0) candidateES = service.addWorkingDays(candidateES, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) candidateES = service.subtractWorkingDays(candidateES, Math.abs(dep.lag_days), workDays, holidays)
        break
      }
      case 'SS': {
        // Successor ES = Predecessor ES + lag
        candidateES = new Date(predES)
        if (dep.lag_days > 0) candidateES = service.addWorkingDays(candidateES, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) candidateES = service.subtractWorkingDays(candidateES, Math.abs(dep.lag_days), workDays, holidays)
        break
      }
      case 'FF': {
        // Successor EF = Predecessor EF + lag
        // Therefore: Successor ES = (Predecessor EF + lag) - duration + 1
        let constrainedEF = new Date(predEF)
        if (dep.lag_days > 0) constrainedEF = service.addWorkingDays(constrainedEF, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) constrainedEF = service.subtractWorkingDays(constrainedEF, Math.abs(dep.lag_days), workDays, holidays)
        candidateES = service.subtractWorkingDays(constrainedEF, task.duration, workDays, holidays)
        break
      }
      case 'SF': {
        // Successor EF = Predecessor ES + lag
        // Therefore: Successor ES = (Predecessor ES + lag) - duration + 1
        let constrainedEF = new Date(predES)
        if (dep.lag_days > 0) constrainedEF = service.addWorkingDays(constrainedEF, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) constrainedEF = service.subtractWorkingDays(constrainedEF, Math.abs(dep.lag_days), workDays, holidays)
        candidateES = service.subtractWorkingDays(constrainedEF, task.duration, workDays, holidays)
        break
      }
    }

    candidateES = service.findNextWorkingDay(candidateES, workDays, holidays)

    if (!maxES || candidateES > maxES) {
      maxES = candidateES
    }
  }

  const es = maxES || service.findNextWorkingDay(projectStart, workDays, holidays)
  const ef = service.addWorkingDays(es, task.duration, workDays, holidays)
  return { es, ef }
}
```

### Backward Pass Formulas for All Dependency Types

```typescript
// Backward pass: compute Latest Finish (LF) and Latest Start (LS)
// Mirror of forward pass but in reverse direction
//
// For FS: Predecessor LF = Successor LS - 1 - lag
// For SS: Predecessor LS = Successor LS - lag  (constrains LS directly)
//         Therefore: Predecessor LF = Predecessor LS + duration
// For FF: Predecessor LF = Successor LF - lag  (constrains LF directly)
// For SF: Predecessor LS = Successor LF - lag  (constrains LS)
//         Therefore: Predecessor LF = Predecessor LS + duration

function computeBackwardPassForTask(
  task: Task,
  successorDeps: Dependency[],
  taskMap: Map<string, Task>,
  projectEnd: Date,
  workDays: number[],
  holidays: Date[]
): { ls: Date; lf: Date } {
  const service = new SchedulingService()

  if (successorDeps.length === 0) {
    const lf = new Date(projectEnd)
    const ls = service.subtractWorkingDays(lf, task.duration, workDays, holidays)
    return { ls, lf }
  }

  let minLF: Date | null = null

  for (const dep of successorDeps) {
    const succ = taskMap.get(dep.successor_id)
    if (!succ || !succ.ls || !succ.lf) continue

    const succLS = succ.ls instanceof Date ? succ.ls : new Date(succ.ls)
    const succLF = succ.lf instanceof Date ? succ.lf : new Date(succ.lf)

    let candidateLF: Date

    switch (dep.type) {
      case 'FS': {
        // Predecessor LF = Successor LS - 1 - lag
        candidateLF = service.addDays(succLS, -1)
        if (dep.lag_days > 0) candidateLF = service.subtractWorkingDays(candidateLF, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) candidateLF = service.addWorkingDays(candidateLF, Math.abs(dep.lag_days), workDays, holidays)
        break
      }
      case 'SS': {
        // SS constrains successor LS, so predecessor LS = successor LS - lag
        // Predecessor LF = (Successor LS - lag) + duration - 1
        let constrainedLS = new Date(succLS)
        if (dep.lag_days > 0) constrainedLS = service.subtractWorkingDays(constrainedLS, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) constrainedLS = service.addWorkingDays(constrainedLS, Math.abs(dep.lag_days), workDays, holidays)
        candidateLF = service.addWorkingDays(constrainedLS, task.duration, workDays, holidays)
        break
      }
      case 'FF': {
        // FF constrains successor LF, so predecessor LF = successor LF - lag
        candidateLF = new Date(succLF)
        if (dep.lag_days > 0) candidateLF = service.subtractWorkingDays(candidateLF, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) candidateLF = service.addWorkingDays(candidateLF, Math.abs(dep.lag_days), workDays, holidays)
        break
      }
      case 'SF': {
        // SF: Successor EF constrained by predecessor ES
        // Backward: predecessor LS = successor LF - lag
        // Predecessor LF = (Successor LF - lag) + duration - 1
        let constrainedLS = new Date(succLF)
        if (dep.lag_days > 0) constrainedLS = service.subtractWorkingDays(constrainedLS, dep.lag_days, workDays, holidays)
        if (dep.lag_days < 0) constrainedLS = service.addWorkingDays(constrainedLS, Math.abs(dep.lag_days), workDays, holidays)
        candidateLF = service.addWorkingDays(constrainedLS, task.duration, workDays, holidays)
        break
      }
    }

    candidateLF = service.findPreviousWorkingDay(candidateLF, workDays, holidays)

    if (!minLF || candidateLF < minLF) {
      minLF = candidateLF
    }
  }

  const lf = minLF || new Date(projectEnd)
  const ls = service.subtractWorkingDays(lf, task.duration, workDays, holidays)
  return { ls, lf }
}
```

### Batch Persist CPM Fields via Supabase Upsert

```typescript
// Source: Supabase JS docs - upsert with primary key matching
// https://supabase.com/docs/reference/javascript/upsert

async function batchUpdateTaskCPMFields(
  tasks: Task[]
): Promise<void> {
  // Only include fields that the scheduling engine changes
  const updates = tasks.map(task => ({
    id: task.id,
    es: task.es ? (task.es instanceof Date ? task.es.toISOString().split('T')[0] : task.es) : null,
    ef: task.ef ? (task.ef instanceof Date ? task.ef.toISOString().split('T')[0] : task.ef) : null,
    ls: task.ls ? (task.ls instanceof Date ? task.ls.toISOString().split('T')[0] : task.ls) : null,
    lf: task.lf ? (task.lf instanceof Date ? task.lf.toISOString().split('T')[0] : task.lf) : null,
    slack: task.slack,
    is_critical: task.is_critical,
    start_date: task.es ? (task.es instanceof Date ? task.es.toISOString().split('T')[0] : task.es) : null,
    end_date: task.ef ? (task.ef instanceof Date ? task.ef.toISOString().split('T')[0] : task.ef) : null,
  }))

  const { error } = await supabase
    .from('tasks')
    .upsert(updates, { onConflict: 'id' })

  if (error) {
    console.error('Failed to batch update CPM fields:', error)
    throw new Error(`Batch CPM update failed: ${error.message}`)
  }
}
```

### useScheduling Hook Pattern

```typescript
// The orchestration hook that ties engine + persistence + cache together

export function useScheduling(projectId: string) {
  const queryClient = useQueryClient()
  const { data: tasks = [] } = useTasks(projectId)
  const { data: dependencies = [] } = useDependencies(projectId)
  const { data: project } = useProject(projectId)
  const { data: calendarExceptions = [] } = useCalendarExceptions(projectId)

  const workDays = [0, 1, 2, 3, 4] // Sun-Thu (Israeli calendar)
  const holidays = calendarExceptions
    .filter(e => e.type === 'holiday' || e.type === 'non_working')
    .map(e => new Date(e.date))

  const recalculate = useCallback(async (
    updatedTasks?: Task[]  // Pass mutated tasks to avoid stale data
  ) => {
    const currentTasks = updatedTasks || tasks
    if (currentTasks.length === 0 || !project?.start_date) return

    const projectStart = new Date(project.start_date)
    const result = schedulingService.calculateCriticalPath(
      currentTasks, dependencies, projectStart, workDays, holidays
    )

    // Optimistic update: put recalculated tasks into cache immediately
    queryClient.setQueryData(taskKeys.list(projectId), result.tasks)

    // Persist to DB in background
    await batchUpdateTaskCPMFields(result.tasks)
  }, [tasks, dependencies, project, calendarExceptions, projectId, queryClient])

  return {
    tasks,
    dependencies,
    criticalPath: tasks.filter(t => t.is_critical).map(t => t.id),
    recalculate,
  }
}
```

### Gantt Dependency Hover Tooltip

```typescript
// Tooltip content for dependency lines (per user decision: type + lag in tooltip only)
function getDependencyTooltipContent(dep: Dependency): string {
  const typeLabels: Record<DependencyType, string> = {
    'FS': 'Finish-to-Start',
    'SS': 'Start-to-Start',
    'FF': 'Finish-to-Finish',
    'SF': 'Start-to-Finish',
  }
  const lagStr = dep.lag_days !== 0
    ? ` ${dep.lag_days > 0 ? '+' : ''}${dep.lag_days}d`
    : ''
  return `${dep.type}${lagStr}`  // e.g., "FS +2d" or "SS" or "FF -1d"
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| All deps treated as FS | Each type uses its own formula | Phase 4 (this work) | SS/FF/SF produce correct dates |
| No UI wiring | Mutations trigger recalculation | Phase 4 (this work) | Dates cascade automatically |
| Individual task updates | Batch upsert for CPM fields | Phase 4 (this work) | Dramatically fewer DB calls |
| Gantt ignores dependencies | Gantt renders dependency lines | Phase 4 (this work) | Visual feedback of relationships |

**Deprecated/outdated:**
- The current forward/backward pass code that treats all deps as FS: must be replaced, not patched

## Discretion Recommendations

### Lead/lag display
**Recommendation:** Tooltip only, matching the type display decision. User expressed preference for this ("leaning tooltip to match type display"). Show "FS +2d" or "SS -1d" in the same tooltip as the dependency type when hovering over dependency lines.

### Critical path visual treatment
**Recommendation:** Use the existing red ring treatment (already in GanttChart.tsx: `ring-2 ring-[var(--fp-critical)]`) and the existing "!" badge. Add a toggle button in the Gantt controls bar to show/hide critical path highlighting. No new colors needed -- the existing critical path visual is clear and consistent.

### Undo mechanism after cascade
**Recommendation:** No undo mechanism in Phase 4. The user's decision states "cascading is deterministic; reversing the input change reverses the cascade." This means the user can manually reverse their change. Full undo/redo is complex and not in the requirements. Defer to a future phase if needed.

### Conflict/warning presentation
**Recommendation:** Inline warning only -- show a small warning icon on the task bar in the Gantt chart when a cascade produces issues (e.g., negative lag pushes a task before project start, or circular dependency is detected). No banner -- the issues are task-specific. Use the existing `AlertTriangle` icon from lucide-react already imported in page.tsx.

## Open Questions

1. **Negative lag producing dates before project start**
   - What we know: Negative lag (lead time) can push a successor's start date before the project start date.
   - What's unclear: Should we clamp to project start, or allow it (MS Project allows it)?
   - Recommendation: Clamp to project start and show a warning. This is simpler and prevents confusing Gantt displays. Can be relaxed later if users request it.

2. **Calendar exceptions currently stored as single dates**
   - What we know: The `calendar_exceptions` table has a `date` column and an `end_date` column (added later). The scheduling engine receives holidays as `Date[]`.
   - What's unclear: Do multi-day exceptions expand into individual dates correctly? The CalendarExceptionForm supports `end_date` but the scheduling engine might not expand ranges.
   - Recommendation: Verify that multi-day calendar exceptions are correctly expanded into individual dates before passing to the scheduling engine. Add a utility function if needed.

3. **start_date and end_date vs es/ef synchronization**
   - What we know: Tasks have both `start_date`/`end_date` (user-set) and `es`/`ef` (CPM-computed). Currently they're independent. Phase 5 introduces manual mode where `start_date`/`end_date` override `es`/`ef`.
   - What's unclear: In Phase 4, should auto-scheduled tasks have their `start_date`/`end_date` set to `es`/`ef`? The Gantt chart reads `start_date`/`end_date`, not `es`/`ef`.
   - Recommendation: Yes, for auto-scheduled tasks, set `start_date = es` and `end_date = ef` during batch persist. This ensures the Gantt chart shows the correct dates. Phase 5 can change this behavior for manual tasks.

## Sources

### Primary (HIGH confidence)
- Existing codebase: `scheduling.ts`, `entities.ts`, `GanttChart.tsx`, `page.tsx`, `use-tasks.ts`, `use-dependencies.ts`, `dependencies.ts`, `tasks.ts` -- full source code analysis
- Database schema: `001_initial_schema.sql` -- verified CPM field types and dependency table structure
- CPM/PDM scheduling theory -- well-established formulas from PMBOK/PMI for FS/SS/FF/SF dependency calculations

### Secondary (MEDIUM confidence)
- [Supabase upsert documentation](https://supabase.com/docs/reference/javascript/upsert) -- batch persistence pattern
- [TanStack Query mutations documentation](https://tanstack.com/query/latest/docs/framework/react/guides/mutations) -- onSuccess invalidation patterns
- [PMI CPM calculations](https://www.pmi.org/learning/library/critical-path-method-calculations-scheduling-8040) -- forward/backward pass formulas
- [TkDodo's blog on automatic query invalidation](https://tkdodo.eu/blog/automatic-query-invalidation-after-mutations) -- mutation cache patterns

### Tertiary (LOW confidence)
- None -- all critical findings verified against codebase or official documentation

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all libraries already in codebase, no new dependencies
- Architecture: HIGH -- patterns derived from existing codebase structure and well-known React Query patterns
- CPM formulas: HIGH -- standard project management theory, well-established, cross-verified
- Pitfalls: HIGH -- infinite loop risk explicitly called out in phase blockers/concerns, stale data is a known React Query pattern
- Gantt integration: HIGH -- full source code of GanttChart.tsx analyzed, clear where changes needed

**Research date:** 2026-02-16
**Valid until:** 2026-03-16 (stable domain -- CPM formulas don't change, codebase is under our control)
