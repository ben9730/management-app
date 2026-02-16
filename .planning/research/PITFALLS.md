# Domain Pitfalls: MS Project-Style Auto-Cascading Scheduling

**Domain:** Adding auto-cascading scheduling to an existing React Query + CPM web app
**Researched:** 2026-02-16
**Confidence:** HIGH (based on codebase analysis + scheduling engine implementation patterns)

---

## Critical Pitfalls

Mistakes that cause infinite loops, data corruption, or require architecture rewrites.

---

### Pitfall 1: Infinite Cascade Loop — Scheduling Triggers Invalidation Triggers Scheduling

**What goes wrong:** When a task mutation (e.g., changing duration) triggers `calculateCriticalPath()`, the results update multiple tasks' `es/ef/ls/lf/slack/is_critical` fields in the database. Each of those updates triggers React Query's `onSuccess` handler, which calls `queryClient.invalidateQueries({ queryKey: taskKeys.lists() })`. The invalidation refetches tasks, the component re-renders, and if scheduling runs on data change (e.g., in a `useEffect` watching task data), it triggers another round of scheduling, creating an infinite loop.

**Why it happens:** The existing `useUpdateTask` hook (line 109 in `use-tasks.ts`) invalidates `taskKeys.lists()` on every successful mutation. When auto-scheduling writes back N updated tasks, that's N invalidations. If scheduling logic reacts to the "tasks changed" signal, the loop begins.

**Consequences:**
- Browser tab freezes or crashes
- Supabase rate limits hit (hundreds of updates per second)
- React Query cache thrashes between stale and fresh data
- Users see flickering dates on every task interaction

**Prevention:**
```typescript
// WRONG: Scheduling inside useEffect watching task data
useEffect(() => {
  if (tasks.length > 0) {
    const result = schedulingService.calculateCriticalPath(tasks, deps, ...)
    // This writes back to DB, which triggers refetch, which triggers this effect...
    result.tasks.forEach(t => updateTask({ id: t.id, updates: { es: t.es, ef: t.ef } }))
  }
}, [tasks]) // <-- INFINITE LOOP

// CORRECT: Scheduling as a deliberate, one-shot operation
function useScheduleProject() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ projectId }: { projectId: string }) => {
      // 1. Read current state ONCE
      const tasks = queryClient.getQueryData<Task[]>(taskKeys.list(projectId))
      const deps = queryClient.getQueryData<Dependency[]>(dependencyKeys.list(projectId))

      // 2. Calculate ALL scheduling results in one pass
      const result = schedulingService.calculateCriticalPath(tasks, deps, ...)

      // 3. Batch-write ALL results to DB in one operation
      await batchUpdateTaskScheduling(result.tasks)

      return result
    },
    onSuccess: () => {
      // 4. ONE invalidation after ALL writes complete
      queryClient.invalidateQueries({ queryKey: taskKeys.lists() })
    }
  })
}
```

**Detection:** If you see `[React Query] Query refetched` appearing more than 3 times in quick succession after a single task edit, you have a cascade loop. Add a counter or timestamp guard in development.

**Phase to address:** Phase 1 (Core Integration). This is the foundational architecture decision -- get it wrong and everything built on top breaks.

---

### Pitfall 2: Optimistic Updates Racing Against Scheduling Calculations

**What goes wrong:** User drags a task bar on the Gantt chart to change its start date. The optimistic update immediately shows the new position. Meanwhile, the scheduling engine recalculates and determines the task cannot start there (predecessor hasn't finished). The optimistic update gets rolled back, causing the task to "snap back" to its original position -- but only after a visible delay. If the user has already started another drag, the rollback corrupts their second action.

**Why it happens:** The current hook pattern uses `onSuccess` (not `onMutate`) for cache updates. Adding optimistic updates for scheduling is tempting but dangerous because scheduling results depend on the entire task graph, not just the single task being edited.

**Consequences:**
- Tasks visually jump between positions (user confusion)
- If two rapid edits overlap, the second edit uses stale predecessor data
- Gantt chart becomes "jittery" and unusable
- Race condition between optimistic cache and server response

**Prevention:**
```typescript
// WRONG: Optimistic update for individual task scheduling fields
onMutate: async (variables) => {
  await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
  const previous = queryClient.getQueryData(taskKeys.list(projectId))
  // Optimistically set new ES/EF... but we don't know the cascaded results yet!
  queryClient.setQueryData(taskKeys.list(projectId), (old) =>
    old.map(t => t.id === variables.id ? { ...t, ...variables.updates } : t)
  )
  return { previous }
}

// CORRECT: Optimistic update ONLY for the edited field, schedule eagerly on client
onMutate: async (variables) => {
  await queryClient.cancelQueries({ queryKey: taskKeys.lists() })
  const previousTasks = queryClient.getQueryData<Task[]>(taskKeys.list(projectId))
  const previousDeps = queryClient.getQueryData<Dependency[]>(dependencyKeys.list(projectId))

  if (previousTasks && previousDeps) {
    // Apply the user's edit to a COPY of the task list
    const editedTasks = previousTasks.map(t =>
      t.id === variables.id ? { ...t, ...variables.updates } : t
    )
    // Run scheduling on the client immediately (synchronous, pure function)
    const scheduled = schedulingService.calculateCriticalPath(editedTasks, previousDeps, ...)
    // Show the FULL cascaded result optimistically
    queryClient.setQueryData(taskKeys.list(projectId), scheduled.tasks)
  }

  return { previousTasks }
},
onError: (err, variables, context) => {
  // Roll back to pre-edit state
  queryClient.setQueryData(taskKeys.list(projectId), context.previousTasks)
}
```

**Detection:** Open browser DevTools Network tab, make a quick edit, and watch for the mutation response arriving after the next user action has already started.

**Phase to address:** Phase 1 (Core Integration). Must be solved together with the cascade architecture.

---

### Pitfall 3: Constraint Conflict Resolution Without User Feedback

**What goes wrong:** A task has a "Must Start On" (MSO) constraint set to March 1, but its predecessor doesn't finish until March 5. The scheduling engine either: (a) silently ignores the constraint and schedules for March 5, losing the user's intent, or (b) honors the constraint and creates a negative-slack "impossible" schedule that confuses everyone, or (c) throws an error that crashes the scheduling run for the entire project.

**Why it happens:** MS Project has a complex constraint resolution system with "planning wizard" dialogs that ask the user what to do. Web apps often skip this and pick one behavior, leading to silent data loss or confusing results.

**Consequences:**
- Users set MSO constraints and wonder why they're ignored
- Negative slack values appear in the UI with no explanation
- Critical path calculation becomes meaningless (everything looks critical)
- Users lose trust in the scheduling engine

**Prevention:**
```typescript
// Define constraint types with clear conflict resolution rules
type ConstraintType = 'ASAP' | 'ALAP' | 'MSO' | 'MFO' | 'SNET' | 'SNLT' | 'FNET' | 'FNLT'

interface ConstraintConflict {
  taskId: string
  taskTitle: string
  constraintType: ConstraintType
  constraintDate: Date
  calculatedDate: Date
  resolution: 'honor_constraint' | 'honor_dependency' | 'needs_user_decision'
  message: string // Human-readable explanation
}

interface SchedulingResultWithConflicts extends SchedulingResult {
  conflicts: ConstraintConflict[]
  warnings: string[]
}

// In the scheduling engine:
// 1. Run forward pass normally (dependency-based dates)
// 2. Apply constraints as a SECOND pass
// 3. Detect conflicts between passes
// 4. Return conflicts alongside results -- let the UI handle them
```

The key design decision: **constraints are soft by default** (dependency wins), and conflicts are **surfaced to the user**, not silently resolved. This matches how most modern web scheduling tools work and avoids the "planning wizard" complexity of MS Project.

**Detection:** Create a test case where MSO constraint conflicts with a predecessor. If the test doesn't produce a conflict warning, the engine is silently swallowing the problem.

**Phase to address:** Phase 2 (Constraint Types). Must be designed as a separate pass after the forward/backward pass, not interleaved with it.

---

### Pitfall 4: The "One Task Changes, Write All Tasks" Performance Trap

**What goes wrong:** User changes a single task's duration. The scheduling engine recalculates the entire project (all tasks, full forward + backward pass), then writes all N tasks back to the database, even though only the changed task's successors were actually affected. For a 200-task project, this means 200 Supabase updates instead of the 5-15 that actually changed.

**Why it happens:** The current `calculateCriticalPath()` method returns ALL tasks with recalculated fields. The naive integration writes them all back. The backward pass changes LS/LF for ALL tasks even when the forward pass only affected a chain of 3 tasks.

**Consequences:**
- 200-task project: ~400ms scheduling + 200 individual Supabase UPDATE calls = 3-5 seconds of lag
- Supabase rate limits (especially on free tier)
- Unnecessary database writes trigger unnecessary RLS checks
- `updated_at` timestamps change for tasks that didn't actually change

**Prevention:**
```typescript
// After scheduling, diff to find what actually changed
function diffSchedulingResults(
  before: Task[],
  after: Task[]
): Task[] {
  const beforeMap = new Map(before.map(t => [t.id, t]))

  return after.filter(task => {
    const prev = beforeMap.get(task.id)
    if (!prev) return true

    // Only include tasks where scheduling fields actually changed
    return (
      toDateStr(prev.es) !== toDateStr(task.es) ||
      toDateStr(prev.ef) !== toDateStr(task.ef) ||
      toDateStr(prev.ls) !== toDateStr(task.ls) ||
      toDateStr(prev.lf) !== toDateStr(task.lf) ||
      prev.slack !== task.slack ||
      prev.is_critical !== task.is_critical
    )
  })
}

// Then batch-update ONLY changed tasks
const changedTasks = diffSchedulingResults(currentTasks, scheduledTasks)
if (changedTasks.length > 0) {
  await batchUpdateTaskScheduling(changedTasks) // Not ALL tasks
}
```

Also consider: the existing Supabase service does individual `UPDATE` calls. For batch scheduling writes, use a single RPC call or transaction:

```sql
-- Supabase RPC function for batch scheduling update
CREATE OR REPLACE FUNCTION batch_update_task_scheduling(
  task_updates jsonb[]
) RETURNS void AS $$
BEGIN
  FOR i IN 1..array_length(task_updates, 1) LOOP
    UPDATE tasks SET
      es = (task_updates[i]->>'es')::timestamptz,
      ef = (task_updates[i]->>'ef')::timestamptz,
      ls = (task_updates[i]->>'ls')::timestamptz,
      lf = (task_updates[i]->>'lf')::timestamptz,
      slack = (task_updates[i]->>'slack')::integer,
      is_critical = (task_updates[i]->>'is_critical')::boolean,
      updated_at = now()
    WHERE id = (task_updates[i]->>'id')::uuid;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

**Detection:** After any single-task edit, log how many tasks the scheduling write-back actually updates. If it equals the total task count, you're in the trap.

**Phase to address:** Phase 1 (Core Integration). The diff logic must be part of the initial integration, not retrofitted.

---

### Pitfall 5: Negative Lag (Lead Time) Creates Overlapping or Impossible Schedules

**What goes wrong:** The existing scheduling engine only handles positive lag (`if (dep.lag_days > 0)` on lines 253 and 590 of `scheduling.ts`). When lead time (negative lag) is introduced, the successor's Early Start can be BEFORE the predecessor's Early Finish, creating task overlap. This is intentional for lead time (e.g., "start painting 2 days before plastering finishes") but the engine's date arithmetic breaks:

1. `addWorkingDays()` with negative values calls `addDays(currentDate, 1)` in its loop, never terminating for negative input
2. The backward pass subtracts negative lag, which effectively ADDS time, producing wrong Late Finish dates
3. The Gantt chart can't render tasks that overlap on the timeline (bars stack instead of overlapping)

**Why it happens:** The `addWorkingDays()` method has a guard `if (daysToAdd <= 0) return new Date(startDate)` which silently returns the same date for zero or negative values. Negative lag requires subtracting working days from the successor's ES calculation, not adding.

**Consequences:**
- Lead time dependencies behave identically to zero-lag dependencies (silent failure)
- Slack calculations become wrong (negative slack where it shouldn't be)
- Critical path identification breaks for chains with lead time
- Users add lead time in the UI but see no effect on the schedule

**Prevention:**
```typescript
// In forwardPass, handle negative lag (lead time) explicitly:
for (const dep of predecessors) {
  const predTask = taskMap.get(dep.predecessor_id)
  if (!predTask?.ef) continue

  let candidateDate: Date

  if (dep.lag_days > 0) {
    // Positive lag: successor starts AFTER predecessor + lag
    candidateDate = this.addDays(predTask.ef, 1)
    candidateDate = this.addWorkingDays(candidateDate, dep.lag_days, workDays, holidays)
  } else if (dep.lag_days < 0) {
    // Negative lag (lead time): successor can start BEFORE predecessor finishes
    // For FS with -2 lead: successor starts 2 working days BEFORE predecessor EF
    candidateDate = this.subtractWorkingDays(predTask.ef, Math.abs(dep.lag_days), workDays, holidays)
    // Important: candidateDate can now be BEFORE predTask.ef -- that's correct!
  } else {
    // Zero lag: successor starts day after predecessor
    candidateDate = this.addDays(predTask.ef, 1)
  }

  candidateDate = this.findNextWorkingDay(candidateDate, workDays, holidays)

  if (!maxDate || candidateDate > maxDate) {
    maxDate = candidateDate
  }
}
```

**Edge case to test:** Negative lag larger than the predecessor's duration. If Task A has duration 3 and the FS dependency has lag -5, the successor would start 2 days before Task A even starts. MS Project handles this by clamping to the predecessor's ES. Decide this behavior explicitly and document it.

**Detection:** Write a test with `lag_days: -2` and verify the successor's ES is 2 working days before the predecessor's EF, not equal to it.

**Phase to address:** Phase 2 (Lead Time). This requires modifying `scheduling.ts` directly -- the existing `addWorkingDays()` guard on line 54 (`if (daysToAdd <= 0)`) must be changed.

---

### Pitfall 6: Manual Scheduling Mode Leaks Into CPM Calculations

**What goes wrong:** Some tasks are set to "manually scheduled" (user-pinned dates), but the CPM engine treats all tasks equally. The forward pass overwrites the user's manually set dates with calculated dates. Or worse: a manually scheduled task is used as a predecessor, and its pinned dates push successors to wrong positions because the engine doesn't distinguish between "calculated ES" and "user-set ES."

**Why it happens:** The current `Task` type has `start_date` and `end_date` fields (user-set) alongside `es/ef/ls/lf` (calculated). But there's no `scheduling_mode` field to tell the engine which tasks to skip. When integrating the scheduling engine, developers often assume all tasks participate in CPM.

**Consequences:**
- User manually sets a task to start on a specific date; scheduling overwrites it
- Manually scheduled tasks create phantom dependencies (they appear to constrain successors but shouldn't follow normal CPM rules)
- Backward pass produces wrong results because manually scheduled tasks have artificial slack values
- "Mixed mode" projects (some manual, some auto) produce unpredictable schedules

**Prevention:**
```typescript
// Add scheduling_mode to the Task type
type SchedulingMode = 'auto' | 'manual'

interface Task extends BaseEntity {
  // ... existing fields
  scheduling_mode: SchedulingMode  // NEW
}

// In the scheduling engine:
forwardPass(tasks, dependencies, projectStart, workDays, holidays) {
  const sortedTasks = this.topologicalSort(tasks, dependencies)

  for (const task of sortedTasks) {
    if (task.scheduling_mode === 'manual') {
      // Use the user-set dates as-is; DO NOT overwrite
      task.es = task.start_date ? new Date(task.start_date) : projectStart
      task.ef = task.end_date ? new Date(task.end_date) :
        this.addWorkingDays(task.es, task.duration, workDays, holidays)
      continue // Skip CPM calculation for this task
    }

    // Normal CPM calculation for auto-scheduled tasks
    // ... existing forward pass logic
  }
}
```

**Critical subtlety:** Manually scheduled tasks should still participate in the dependency graph as predecessors/successors. If Task A (manual, ends March 5) has a successor Task B (auto), Task B's ES should be March 6. The manual task's dates are "facts" that the engine uses but doesn't modify.

**Detection:** Set a task's `start_date` manually, run scheduling, and check whether `es` matches `start_date` or was overwritten.

**Phase to address:** Phase 3 (Manual vs Auto Mode). Requires schema migration to add `scheduling_mode` column.

---

## Moderate Pitfalls

Mistakes that cause bugs or poor UX but don't require architectural rewrites.

---

### Pitfall 7: Percent Complete Driving Remaining Duration -- Rounding Errors Accumulate

**What goes wrong:** When a task is 60% complete, the remaining duration should be 40% of the original. But `duration * (1 - percentComplete / 100)` produces floating-point results (e.g., 3 * 0.4 = 1.2 days). Since the scheduling engine works in whole working days, this gets rounded. Each time the user updates percent complete, the rounding error shifts the schedule by a day. Over multiple updates, tasks drift forward or backward unpredictably.

**Prevention:**
```typescript
// Calculate remaining duration with consistent rounding
function remainingDuration(originalDuration: number, percentComplete: number): number {
  if (percentComplete >= 100) return 0
  if (percentComplete <= 0) return originalDuration

  const remaining = originalDuration * (1 - percentComplete / 100)
  // Always round UP -- better to overestimate than underestimate remaining work
  return Math.max(1, Math.ceil(remaining))
}

// Use remaining duration in forward pass for in-progress tasks
if (task.status === 'in_progress' && task.percent_complete > 0) {
  // ES is "now" (or actual start), EF is based on remaining duration
  const remaining = remainingDuration(task.duration, task.percent_complete)
  task.ef = this.addWorkingDays(today, remaining, workDays, holidays)
}
```

**Edge case:** A task at 99% complete with original duration 1 day. `1 * 0.01 = 0.01`, which rounds up to 1 day. The task appears to have a full day remaining at 99% -- this is surprising. Consider a threshold: if remaining < 0.1 days, treat as complete.

**Phase to address:** Phase 3 (Percent Complete). Design the rounding strategy explicitly before implementation.

---

### Pitfall 8: SS/FF/SF Dependencies with Lag Produce Counter-Intuitive Results

**What goes wrong:** The existing scheduling engine currently only implements Finish-to-Start (FS) logic in the forward pass (lines 247-262 of `scheduling.ts`). When Start-to-Start (SS), Finish-to-Finish (FF), or Start-to-Finish (SF) dependencies are added, the date arithmetic is different for each type, and combining them with lag days creates 8 distinct behaviors (4 types x positive/negative lag) that are easy to get wrong.

**Prevention:** Each dependency type changes WHICH dates are compared:

```typescript
function getSuccessorEarliestDate(
  predTask: Task,
  dep: Dependency,
  workDays: number[],
  holidays: Date[]
): Date {
  let referenceDate: Date

  switch (dep.type) {
    case 'FS': // Finish-to-Start: successor starts after predecessor finishes
      referenceDate = addDays(predTask.ef!, 1)
      break
    case 'SS': // Start-to-Start: successor starts when predecessor starts
      referenceDate = new Date(predTask.es!)
      break
    case 'FF': // Finish-to-Finish: successor finishes when predecessor finishes
      // Work backward: successor EF = pred EF, so successor ES = EF - duration
      referenceDate = subtractWorkingDays(predTask.ef!, successorDuration, workDays, holidays)
      break
    case 'SF': // Start-to-Finish: successor finishes when predecessor starts (rare)
      referenceDate = subtractWorkingDays(predTask.es!, successorDuration, workDays, holidays)
      break
  }

  // Apply lag (positive = delay, negative = lead)
  if (dep.lag_days > 0) {
    referenceDate = addWorkingDays(referenceDate, dep.lag_days, workDays, holidays)
  } else if (dep.lag_days < 0) {
    referenceDate = subtractWorkingDays(referenceDate, Math.abs(dep.lag_days), workDays, holidays)
  }

  return findNextWorkingDay(referenceDate, workDays, holidays)
}
```

**The FF trap specifically:** For Finish-to-Finish dependencies, the successor's ES depends on both the predecessor's EF AND the successor's own duration. This creates a circular-looking dependency in the calculation (you need the successor's duration to calculate its ES, but duration should already be known). Make sure duration is read from the task, not recalculated.

**Phase to address:** Phase 2 (Dependency Types Enhancement). The existing `DependencyType = 'FS' | 'SS' | 'FF' | 'SF'` type is already defined but the engine only implements FS logic.

---

### Pitfall 9: React Query Cache Staleness During Long Scheduling Operations

**What goes wrong:** For large projects (100+ tasks), the scheduling calculation + batch database writes take 1-3 seconds. During this time, another user (or a Yjs sync event) could update a task. The scheduling write-back overwrites the other user's changes because it's working with stale data from when the calculation started.

**Prevention:**
```typescript
// Use optimistic locking with updated_at timestamps
async function batchUpdateTaskScheduling(tasks: Task[]): Promise<void> {
  const updates = tasks.map(task => ({
    id: task.id,
    es: task.es,
    ef: task.ef,
    ls: task.ls,
    lf: task.lf,
    slack: task.slack,
    is_critical: task.is_critical,
    expected_updated_at: task.updated_at, // Optimistic lock
  }))

  // Supabase RPC that checks updated_at before writing
  const { data, error } = await supabase.rpc('batch_update_scheduling_with_lock', {
    updates: JSON.stringify(updates)
  })

  if (data?.conflicts?.length > 0) {
    // Some tasks were modified during scheduling -- re-fetch and re-schedule
    throw new SchedulingConflictError(data.conflicts)
  }
}
```

**Simpler alternative for MVP:** Since FlowPlan is primarily single-user (audit management), accept the race condition for now but add a "scheduling in progress" flag that blocks other mutations during the scheduling operation. This is simpler and works for 90% of use cases.

**Phase to address:** Phase 4 (Polish/Multi-User). Not critical for MVP if single-user usage is the primary scenario.

---

### Pitfall 10: Gantt Chart Re-Render Storm on Scheduling Updates

**What goes wrong:** The current `GanttChart` component (line 610) uses `React.memo` to prevent unnecessary re-renders. But when scheduling updates change `es/ef/start_date/end_date` on multiple tasks, React's shallow comparison of the `tasks` array reference detects a change and re-renders the entire chart. For 100+ tasks with SVG dependency arrows, this causes visible jank.

**Why it happens:** The `GanttChart` receives `tasks: Task[]` as a prop. After scheduling, a new array reference is created (even if only 3 out of 100 tasks actually changed). `React.memo`'s shallow comparison sees `prevTasks !== nextTasks` and re-renders everything, including the expensive SVG dependency rendering.

**Prevention:**
```typescript
// 1. Stabilize the tasks array reference when scheduling-only fields change
const scheduledTasks = useMemo(() => {
  if (!rawTasks || !schedulingResult) return rawTasks

  // Merge scheduling fields into task objects
  return rawTasks.map(task => {
    const scheduled = schedulingResult.tasks.find(t => t.id === task.id)
    if (!scheduled) return task

    return {
      ...task,
      es: scheduled.es,
      ef: scheduled.ef,
      // ... etc
    }
  })
}, [rawTasks, schedulingResult])

// 2. In GanttChart, separate position calculation from rendering
// Use useMemo for taskPositions (already done -- good!)
// But also virtualize: only render task bars visible in the viewport
```

**Detection:** Use React DevTools Profiler. After a single task edit + scheduling, check how many GanttChart child components re-rendered. If it's ALL of them (not just the changed ones), you need virtualization or more granular memo boundaries.

**Phase to address:** Phase 1 (Core Integration). Design the data flow so scheduling results don't trigger full Gantt re-renders.

---

## Minor Pitfalls

Issues that cause subtle bugs or confusion but don't break the system.

---

### Pitfall 11: Date Serialization Mismatch Between Scheduling Engine and Database

**What goes wrong:** The `SchedulingService` works with JavaScript `Date` objects internally. The database stores `timestamptz`. The `Task` type declares `es: Date | string | null`. When the scheduling engine produces a `Date` object and the service writes it to Supabase, the timezone information can shift the date by a day (e.g., `2026-03-01T00:00:00.000Z` becomes `2026-02-28` in UTC-offset timezones). The existing `toDate()` helper (line 646-649) doesn't handle timezone normalization.

**Prevention:** Normalize all scheduling dates to midnight UTC before writing:
```typescript
function toSchedulingDate(date: Date): string {
  // Strip time component -- scheduling works in whole days
  return date.toISOString().split('T')[0] + 'T00:00:00.000Z'
}
```

And in the database, store scheduling dates as `date` type (not `timestamptz`) since they represent calendar days, not moments in time.

**Phase to address:** Phase 1 (Core Integration). Must be decided before the first scheduling write-back.

---

### Pitfall 12: Topological Sort Instability Across Scheduling Runs

**What goes wrong:** Kahn's algorithm (existing implementation, line 153-207) is not stable -- tasks with the same topological level can appear in any order between runs. If the forward pass processes Task A before Task B in one run, but Task B before Task A in the next run (both are valid topological orderings), the scheduling results can differ slightly. This causes "phantom changes" where tasks appear to have been rescheduled even though nothing meaningful changed.

**Prevention:** Add a secondary sort key (e.g., `created_at` or `phase_order`) to the topological sort to make it deterministic:
```typescript
// In topologicalSort, when adding to queue, sort by created_at
const queue: string[] = []
for (const [taskId, degree] of inDegree) {
  if (degree === 0) {
    queue.push(taskId)
  }
}
// Sort initial queue by created_at for deterministic ordering
queue.sort((a, b) => {
  const taskA = taskMap.get(a)!
  const taskB = taskMap.get(b)!
  return new Date(taskA.created_at).getTime() - new Date(taskB.created_at).getTime()
})
```

**Phase to address:** Phase 1 (Core Integration). Simple fix but important for the diff mechanism (Pitfall 4).

---

### Pitfall 13: Calendar Changes Requiring Full Reschedule Without Warning

**What goes wrong:** User adds a new holiday to the project calendar. This should trigger a full reschedule of all tasks (because working day calculations change). But the current `useCalendarExceptions` hook only invalidates `calendarExceptionKeys.lists()` -- it doesn't trigger a reschedule. Tasks display stale scheduling dates that don't account for the new holiday.

**Prevention:** Calendar mutations should trigger the scheduling pipeline:
```typescript
// In useCreateCalendarException onSuccess:
onSuccess: () => {
  queryClient.invalidateQueries({ queryKey: calendarExceptionKeys.lists() })
  // Trigger reschedule for the affected project
  scheduleProjectMutation.mutate({ projectId })
}
```

**Phase to address:** Phase 1 (Core Integration). Part of the "what triggers scheduling" design.

---

### Pitfall 14: Duration Zero (Milestones) Break the Forward Pass

**What goes wrong:** The existing engine handles duration 0 by making `addWorkingDays(startDate, 0, ...)` return the same date (line 53-55). But in the forward pass, a milestone's EF equals its ES, and the successor calculation does `addDays(predTask.ef, 1)` -- adding one day. This means a successor of a milestone starts one day AFTER the milestone, which is correct for FS but wrong for SS (where the successor should start on the SAME day as the milestone).

**Prevention:** Treat milestones (duration 0) as special cases in the dependency type calculations. For FS, the successor starts on the milestone's date (not the day after), because there's no "finish day" to wait for.

**Phase to address:** Phase 2 (Dependency Types Enhancement). Milestone handling interacts with dependency type logic.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Core integration (wiring CPM to mutations) | Infinite cascade loop (Pitfall 1) | Use deliberate one-shot scheduling mutation, not reactive useEffect. Batch all writes. Single invalidation. |
| Core integration (optimistic updates) | Race conditions (Pitfall 2) | Run scheduling synchronously on client in `onMutate`, use cached data, not fetched data |
| Core integration (performance) | Write-all-tasks trap (Pitfall 4) | Diff before and after, only write changed tasks. Use Supabase RPC for batch updates. |
| Core integration (Gantt rendering) | Re-render storm (Pitfall 10) | Separate scheduling data flow from task list data flow. Consider virtualization. |
| Core integration (dates) | Timezone serialization (Pitfall 11) | Normalize to midnight UTC. Consider `date` column type instead of `timestamptz`. |
| Core integration (determinism) | Topological sort instability (Pitfall 12) | Add secondary sort key to Kahn's algorithm. |
| Core integration (triggers) | Calendar changes don't reschedule (Pitfall 13) | Map ALL scheduling-relevant mutations to the scheduling pipeline. |
| Constraint types | Silent conflict resolution (Pitfall 3) | Return conflicts alongside results. Constraints are soft by default. UI shows warnings. |
| Lead time / negative lag | Engine ignores negative values (Pitfall 5) | Fix `addWorkingDays` guard. Handle negative lag with `subtractWorkingDays`. Test edge cases. |
| Dependency type enhancement | SS/FF/SF with lag edge cases (Pitfall 8) | Implement reference date per type. Test all 8 combinations (4 types x pos/neg lag). |
| Milestone handling | Duration 0 + dependency types (Pitfall 14) | Special-case milestones in each dependency type calculation. |
| Manual vs auto mode | CPM overwrites user dates (Pitfall 6) | Add `scheduling_mode` column. Engine skips manual tasks but uses their dates as facts. |
| Percent complete | Rounding error accumulation (Pitfall 7) | Always round UP remaining duration. Define threshold for "effectively complete." |
| Multi-user / concurrent edits | Stale data during scheduling (Pitfall 9) | Optimistic locking or scheduling lock flag. Less critical for single-user MVP. |

---

## Codebase-Specific Risk Assessment

### Highest Risk: The Scheduling-UI Gap

The **single most dangerous aspect** of this project is that `SchedulingService` has never been called from any UI code. The service is thoroughly tested (50+ test cases) but entirely isolated. The integration point -- where a task mutation triggers scheduling and scheduling results flow back to the UI -- does not exist yet.

Evidence from codebase:
- `scheduling.ts` is imported by `scheduling.test.ts` and nothing else
- No hook imports `SchedulingService` or `schedulingService`
- `page.tsx` never references scheduling
- `useUpdateTask.onSuccess` only invalidates caches; it doesn't trigger scheduling

This gap means the first integration attempt will surface dozens of assumptions that were never tested:
1. How do `Date` objects from the engine serialize through Supabase?
2. How does the React Query cache handle 50+ tasks being updated at once?
3. What happens when `invalidateQueries` fires during a scheduling write-back?
4. Does the Gantt chart handle rapidly changing task positions?

**Recommendation:** Phase 1 should be ONLY about wiring the scheduling engine to a single mutation path (e.g., "update task duration"), proving the full round-trip works, and solving the cascade/performance issues BEFORE adding any new scheduling features.

### Medium Risk: Existing Type Flexibility

The `Task` type allows `Date | string | null` for all date fields. The scheduling engine works with `Date` objects. Services write strings. The cache could contain either. This type looseness will cause subtle bugs when comparing dates (e.g., `new Date('2026-03-01') !== '2026-03-01'` but they represent the same day).

### Lower Risk: Existing Test Coverage

The scheduling engine has excellent test coverage for its current capabilities. New features (constraints, lead time, manual mode) should follow the same TDD pattern already established in `scheduling.test.ts`.

---

## Sources

- **HIGH confidence:** Direct codebase analysis of `scheduling.ts`, `use-tasks.ts`, `use-dependencies.ts`, `entities.ts`, `GanttChart.tsx`, `page.tsx`, and all hook files
- **HIGH confidence:** Analysis of existing test suite in `scheduling.test.ts` covering forward/backward pass, topological sort, and calendar awareness
- **MEDIUM confidence:** Scheduling engine implementation patterns from training data (MS Project behavior, CPM algorithm conventions, React Query mutation patterns)
- **LOW confidence:** Specific Supabase RPC performance characteristics and rate limits (would need benchmarking)
