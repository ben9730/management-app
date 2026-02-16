# Feature Landscape

**Domain:** MS Project-style task scheduling for a CPM-based project management app
**Researched:** 2026-02-16
**Confidence:** HIGH (MS Project scheduling behavior is a stable, well-documented domain unchanged since the early 2000s. Codebase directly examined.)

---

## Table Stakes

Features users expect from any scheduling tool that claims MS Project parity. Missing = product feels broken to experienced PMs.

### 1. Auto-Cascading Dependency Scheduling

| Aspect | Detail |
|--------|--------|
| **Feature** | When a predecessor task's dates change (duration, start, finish), all successor tasks automatically recalculate their dates through the entire dependency chain |
| **Why Expected** | This IS scheduling. Without it, dependencies are decorative arrows. Users from MS Project expect that changing Task A's duration immediately moves Task B, C, D downstream |
| **Complexity** | Medium |
| **Existing Code** | `SchedulingService.calculateCriticalPath()` already does the full forward/backward pass with topological sort. The gap is that it is NEVER called from UI mutations. `updateTask()` in `tasks.ts` writes to DB but does NOT trigger recalculation |

**Expected MS Project Behavior:**
- User changes Task A duration from 5 to 8 days
- Task A's EF moves 3 days later
- Task B (successor via FS dependency) ES moves 3 days later
- Task C (successor of B) also moves 3 days
- All slack values and critical path re-evaluated
- Gantt chart updates immediately
- This happens for ANY change: duration, start_date, end_date, dependency added/removed, lag changed, assignee changed (if resource-aware)

**Implementation Notes:**
- Wire `calculateCriticalPath()` to fire after every task mutation, dependency mutation, calendar change, and resource change
- Use React Query's `onSuccess` callback in mutation hooks to trigger recalc
- Recalc should be project-wide (not incremental) for correctness -- the full CPM pass is O(V+E) on the dependency DAG, fast enough for projects with hundreds of tasks
- Write recalculated dates back to all affected tasks in a single batch update
- Consider debouncing rapid edits (e.g., user typing duration) to avoid excessive recalcs

**Dependency on Existing Code:**
- `SchedulingService.forwardPass()` -- exists, correct for FS type
- `SchedulingService.backwardPass()` -- exists, correct for FS type
- `SchedulingService.calculateCriticalPath()` -- exists, correct
- `SchedulingService.topologicalSort()` -- exists, uses Kahn's algorithm with cycle detection
- `updateTask()` in `tasks.ts` -- needs post-mutation recalc trigger
- `createDependency()`, `updateDependency()`, `deleteDependency()` in `dependencies.ts` -- all need post-mutation recalc trigger
- React Query mutation hooks in `hooks/` directory -- need `onSuccess` wiring

**Critical observation:** The forward pass (lines 236-273 of `scheduling.ts`) currently only handles FS (Finish-to-Start) dependency type. The code computes `candidateDate = this.addDays(predTask.ef, 1)` for ALL dependency types. SS, FF, and SF are NOT correctly handled despite being valid in the schema. This must be fixed as part of wiring the engine.

---

### 2. SS/FF/SF Dependency Type Scheduling (Engine Fix)

| Aspect | Detail |
|--------|--------|
| **Feature** | All four dependency types (FS, SS, FF, SF) must compute dates correctly in forward and backward passes |
| **Why Expected** | The schema accepts SS/FF/SF but the engine treats them all as FS. Users who create SS/FF/SF dependencies get wrong results |
| **Complexity** | Medium |
| **Existing Code** | `forwardPass()` lines 248-255 treat ALL dependency types as FS. `backwardPass()` has the same issue |

**MS Project Dependency Type Definitions:**

| Type | Meaning | Forward Pass (successor ES) | Example |
|------|---------|----------------------------|---------|
| **FS** | Finish-to-Start | Successor ES = Predecessor EF + 1 + lag | "Can't test until coding finishes" |
| **SS** | Start-to-Start | Successor ES = Predecessor ES + lag | "Start testing when coding starts (+ 2 day lag)" |
| **FF** | Finish-to-Finish | Successor EF = Predecessor EF + lag, then compute ES = EF - duration | "Testing must finish when coding finishes" |
| **SF** | Start-to-Finish | Successor EF = Predecessor ES + lag, then compute ES = EF - duration | Rare. "Successor finishes when predecessor starts" |

**Forward Pass Fix:**
```typescript
for (const dep of predecessors) {
  const predTask = taskMap.get(dep.predecessor_id)
  if (!predTask) continue

  let candidateDate: Date

  switch (dep.type) {
    case 'FS':
      // Successor starts after predecessor finishes
      candidateDate = this.addDays(predTask.ef!, 1)
      break
    case 'SS':
      // Successor starts when predecessor starts
      candidateDate = new Date(predTask.es!)
      break
    case 'FF':
      // Successor finishes when predecessor finishes
      // ES = EF_pred - successor_duration + 1
      candidateDate = this.subtractWorkingDays(predTask.ef!, task.duration, workDays, holidays)
      break
    case 'SF':
      // Successor finishes when predecessor starts
      // ES = ES_pred - successor_duration + 1
      candidateDate = this.subtractWorkingDays(predTask.es!, task.duration, workDays, holidays)
      break
  }

  // Apply lag (positive or negative)
  if (dep.lag_days !== 0) { ... }
}
```

**Backward Pass Fix:** Analogous corrections needed for LS/LF computation with each dependency type.

**Dependency on Existing Code:**
- `SchedulingService.forwardPass()` -- needs type-aware logic
- `SchedulingService.backwardPass()` -- needs type-aware logic
- `SchedulingService.calculateWithResources()` -- has duplicate forward pass code that also needs fixing

---

### 3. Lead and Lag Time on Dependencies

| Aspect | Detail |
|--------|--------|
| **Feature** | Dependencies support both positive lag (delay) and negative lag (lead/overlap). Lag = "wait N days after predecessor". Lead = "start N days before predecessor finishes" |
| **Why Expected** | Real schedules need overlap (lead) and waiting periods (lag). "Start painting 2 days before drywall finishes" or "wait 3 days for concrete to cure" |
| **Complexity** | Low |
| **Existing Code** | `dependencies` table has `lag_days INTEGER DEFAULT 0`. `forwardPass()` handles positive lag. The INTEGER type does NOT prevent negative values, but the code only acts on `lag_days > 0` |

**Expected MS Project Behavior:**
- **Lag (positive):** FS + 3d lag means successor starts 3 working days after predecessor finishes. Already works.
- **Lead (negative):** FS - 2d lead means successor starts 2 working days BEFORE predecessor finishes. In MS Project, this is entered as negative lag (e.g., lag = -2d).
- Applies to ALL dependency types (FS, SS, FF, SF)
- Lead/lag is in working days (calendar-aware), not calendar days

**Implementation Notes:**
- No schema change needed -- `lag_days INTEGER` already supports negatives
- `forwardPass()` condition `if (dep.lag_days > 0)` must change to handle negative values:
  ```typescript
  // Current: only adds positive lag
  if (dep.lag_days > 0) {
    candidateDate = this.addWorkingDays(candidateDate, dep.lag_days, ...)
  }
  // New: handle both directions
  if (dep.lag_days > 0) {
    candidateDate = this.addWorkingDays(candidateDate, dep.lag_days, ...)
  } else if (dep.lag_days < 0) {
    candidateDate = this.subtractWorkingDays(candidateDate, Math.abs(dep.lag_days), ...)
  }
  ```
- Same fix needed in `backwardPass()` (lines 319-321) and `calculateWithResources()` (lines 592-594)
- UI: dependency editor needs to accept negative numbers in the lag field
- Validation: lead cannot exceed predecessor duration for FS (would create successor starting before predecessor starts)

**Dependency on Existing Code:**
- `SchedulingService.forwardPass()` lines 253-255 -- conditional needs update
- `SchedulingService.backwardPass()` lines 319-321 -- conditional needs update
- `SchedulingService.calculateWithResources()` lines 592-594 -- conditional needs update
- `dependencies` table `lag_days` column -- already supports negatives, no schema change
- Dependency form UI -- needs to accept negative values with clear labeling ("lag" vs "lead")

---

### 4. Percent Complete and Progress Tracking

| Aspect | Detail |
|--------|--------|
| **Feature** | Tasks have a percent_complete field (0-100). When percent_complete > 0, actual_start is recorded. When percent_complete = 100, actual_finish is recorded. Remaining duration is calculated from percent_complete |
| **Why Expected** | Every PM tool has progress tracking. Users need "how far along is each task?" and the schedule should reflect actual progress |
| **Complexity** | Medium |
| **Existing Code** | Tasks have `status` (pending/in_progress/done) but no numeric progress. No actual_start/actual_finish. No remaining_duration concept |

**Expected MS Project Behavior:**

1. **Percent Complete:**
   - 0% = not started (status: pending)
   - 1-99% = in progress (status: in_progress)
   - 100% = complete (status: done)
   - Bidirectional sync with status:
     - Setting status to "in_progress" and percent_complete is 0 --> set to 50%
     - Setting status to "done" --> set percent_complete to 100%
     - Setting percent_complete to 0 --> set status to "pending"
     - Setting percent_complete to 100 --> set status to "done"
     - Setting percent_complete to 1-99 --> set status to "in_progress"

2. **Remaining Duration:**
   - `remaining_duration = duration * (1 - percent_complete / 100)`
   - Example: 10-day task at 60% complete has 4 days remaining
   - The remaining duration is what the scheduler uses for computing EF from the status date (today)

3. **Actual Start / Actual Finish:**
   - `actual_start`: Auto-set when percent_complete first goes above 0 (or manually set)
   - `actual_finish`: Auto-set when percent_complete reaches 100 (or manually set)
   - Once actual_start is set, the scheduling engine uses it (not the planned ES)
   - MS Project does NOT move actual_start backward if predecessors change

4. **Scheduling Interaction:**
   - A task with actual_start is "anchored" -- predecessors moving earlier do NOT move it backward
   - For in-progress tasks, remaining work schedules forward from today (or status date)
   - Completed tasks (100%) are completely frozen -- they do not move when predecessors change
   - This is CRITICAL: without freezing completed tasks, rescheduling would retroactively change history

**Implementation Notes:**
- New columns on `tasks` table:
  ```sql
  percent_complete INTEGER DEFAULT 0 CHECK (percent_complete >= 0 AND percent_complete <= 100),
  actual_start DATE,
  actual_finish DATE
  ```
- Status/percent_complete sync logic in the service layer (NOT DB trigger -- keep logic in TypeScript for testability)
- Modify `forwardPass()`: if task has actual_start, use it instead of computed ES; if task is 100% complete, skip rescheduling entirely
- Gantt bar visual: overlay a darker portion covering `percent_complete%` of the bar width
- Progress input in task detail sidebar: slider or numeric input (0-100)

**Dependency on Existing Code:**
- `tasks` table -- needs 3 new columns via migration
- `Task` type in `entities.ts` -- needs `percent_complete`, `actual_start`, `actual_finish`
- `CreateTaskInput` / `UpdateTaskInput` in `tasks.ts` -- need new fields
- `updateTask()` -- needs status/percent sync logic
- `SchedulingService.forwardPass()` -- needs actual_start and completion awareness
- `GanttChart.tsx` -- needs progress bar overlay on task bars
- Task detail sidebar -- needs percent_complete input

---

### 5. Constraint Types (ASAP, SNET, MSO, FNLT)

| Aspect | Detail |
|--------|--------|
| **Feature** | Each task can have a scheduling constraint that limits when the CPM engine can place it |
| **Why Expected** | Real projects have external deadlines and fixed milestones. Without constraints, the schedule only reflects internal dependency logic |
| **Complexity** | High |
| **Existing Code** | No constraint support. Tasks have `start_date` and `end_date` but these are output fields, not constraint inputs |

**MS Project Has 8 Constraint Types -- 4 Recommended for MVP:**

| Constraint | Abbreviation | Behavior | Priority |
|------------|--------------|----------|----------|
| As Soon As Possible | ASAP | Default. Task scheduled at earliest date from dependencies. No constraint date needed. | **MVP** |
| Must Start On | MSO | Task MUST start on exact date. Overrides dependency-driven dates. Conflict shown if dependency disagrees. | **MVP** |
| Start No Earlier Than | SNET | Task cannot start before given date but can start later. `actual_start = max(dependency_es, constraint_date)` | **MVP** |
| Finish No Later Than | FNLT | Task cannot finish after given date. Warning shown if schedule violates. Used for deadlines. | **MVP** |
| As Late As Possible | ALAP | Task at latest possible date without delaying project. Uses LS/LF. | Defer |
| Must Finish On | MFO | Task MUST finish on exact date. | Defer |
| Start No Later Than | SNLT | Task cannot start after given date. Rarely used with forward scheduling. | Defer |
| Finish No Earlier Than | FNET | Task cannot finish before given date. | Defer |

**Expected MS Project Behavior:**

1. **ASAP (default):** Pure CPM forward scheduling. ES comes from predecessors. This is what FlowPlan does today.

2. **MSO (Must Start On):**
   - User sets constraint_date = March 10
   - CPM says ES = March 5 (from predecessors) --> Task starts March 10 anyway
   - If predecessor EF is March 12 --> SCHEDULING CONFLICT shown, but constraint honored
   - Successors cascade from the constrained date, not the dependency-driven date

3. **SNET (Start No Earlier Than):**
   - `actual_start = max(dependency_es, constraint_date)`
   - If CPM says ES = March 5, constraint says March 10 --> starts March 10
   - If CPM says ES = March 15, constraint says March 10 --> starts March 15
   - No conflict possible -- it is a soft floor constraint

4. **FNLT (Finish No Later Than):**
   - Task scheduled by dependencies normally
   - If EF would exceed constraint_date --> DEADLINE VIOLATION warning shown
   - Task NOT automatically moved earlier (that would violate predecessors)
   - This is a monitoring constraint, not a scheduling override

**Important MS Project UX detail:** When a user manually types a start date for an auto-scheduled task, MS Project silently applies a SNET constraint with that date. This is the most common way constraints are created -- users do not realize they are adding constraints.

**Implementation Notes:**
- New columns on `tasks` table:
  ```sql
  constraint_type TEXT DEFAULT 'ASAP' CHECK (constraint_type IN ('ASAP', 'MSO', 'SNET', 'FNLT')),
  constraint_date DATE
  ```
- Modify `forwardPass()` to apply constraint after computing dependency-driven ES:
  ```typescript
  // After computing ES from predecessors:
  if (task.constraint_type === 'SNET' && task.constraint_date) {
    const cd = new Date(task.constraint_date)
    if (cd > task.es!) task.es = cd
  } else if (task.constraint_type === 'MSO' && task.constraint_date) {
    task.es = new Date(task.constraint_date)
  }
  // Recalculate EF from (possibly adjusted) ES
  ```
- FNLT is checked post-calculation (does not modify dates, only flags violations)
- UI: constraint picker dropdown + date input (only shown when constraint is not ASAP)
- Gantt: show constraint indicators (pin icon for MSO, right bracket for FNLT)

**Dependency on Existing Code:**
- `tasks` table -- needs 2 new columns via migration
- `Task` type in `entities.ts` -- needs `constraint_type` and `constraint_date`
- `SchedulingService.forwardPass()` -- needs constraint logic after ES computation
- `CreateTaskInput` / `UpdateTaskInput` -- need constraint fields
- `GanttChart.tsx` -- needs constraint visual indicators
- Task detail sidebar -- needs constraint picker UI

---

### 6. Manual vs Auto Scheduling Mode

| Aspect | Detail |
|--------|--------|
| **Feature** | Each task can be "Auto" (default) or "Manual" scheduling. Auto-scheduled tasks follow CPM. Manually-scheduled tasks have user-set dates the engine does NOT move |
| **Why Expected** | Users need escape hatches. Some tasks have externally fixed dates. MS Project made this first-class in Project 2010+ |
| **Complexity** | Low-Medium |
| **Existing Code** | No scheduling mode concept. All tasks are implicitly auto-scheduled but the engine is not wired, so in practice all tasks are effectively manual |

**Expected MS Project Behavior:**

1. **Auto Mode (default):**
   - Scheduling engine controls start_date and end_date
   - User changes to start_date silently create SNET constraint (MS Project behavior)
   - Duration changes trigger recalculation
   - ES/EF/LS/LF/slack/is_critical are computed

2. **Manual Mode:**
   - User directly sets start_date, end_date, and duration independently
   - Scheduling engine skips this task for date computation
   - Dependencies still drawn as arrows but do NOT enforce dates
   - Manual tasks still drive successors: Task A (manual) with dates set --> Task B (auto) uses Task A's end_date as predecessor finish
   - ES/EF/LS/LF/slack/is_critical are null/not computed
   - Gantt bar has different visual (striped/hatched in MS Project)
   - Can switch between modes at any time

3. **Key nuance:** Manual tasks are "schedule-neutral" for themselves but "schedule-active" for successors. They anchor the dependency chain.

**Implementation Notes:**
- New column on `tasks` table:
  ```sql
  scheduling_mode TEXT DEFAULT 'auto' CHECK (scheduling_mode IN ('auto', 'manual'))
  ```
- `forwardPass()` modification: skip manual tasks for ES/EF computation but include their dates in predecessor calculations
- `backwardPass()`: skip manual tasks for LS/LF computation
- `calculateSlack()`: skip manual tasks
- UI: toggle in task detail panel ("תזמון אוטומטי / תזמון ידני")
- Gantt: different bar style for manual tasks (e.g., subtle stripe pattern or different border)

**Dependency on Existing Code:**
- `tasks` table -- needs 1 new column via migration
- `Task` type in `entities.ts` -- needs `scheduling_mode`
- `SchedulingService.forwardPass()` -- needs manual mode skip
- `SchedulingService.backwardPass()` -- needs manual mode skip
- `SchedulingService.calculateSlack()` -- needs manual mode skip
- Task detail sidebar -- needs mode toggle
- `GanttChart.tsx` -- needs distinct visual for manual tasks

---

## Differentiators

Features that set FlowPlan apart. Not expected by all users, but valued when present.

### 7. Scheduling Conflict Detection and Warnings

| Aspect | Detail |
|--------|--------|
| **Feature** | Visual warnings when constraints create impossible or violated schedules |
| **Complexity** | Medium |
| **Notes** | Natural extension of constraint types. Without it, constraints silently break schedules |

**Expected Behavior:**
- After each recalculation, compare constraint dates against dependency-driven dates
- MSO date before predecessor's EF: scheduling conflict warning
- FNLT date before computed EF: deadline violation warning
- Warning icon on task row and Gantt bar with explanatory tooltip
- Do NOT prevent users from creating conflicts -- just warn

**Implementation Notes:**
- Post-processing step after `calculateCriticalPath()`:
  ```typescript
  interface SchedulingConflict {
    taskId: string
    type: 'constraint_conflict' | 'deadline_violation'
    message: string
    constraintDate: Date
    computedDate: Date
  }
  ```
- Return conflicts as part of `SchedulingResult`

---

### 8. Gantt Progress Visualization

| Aspect | Detail |
|--------|--------|
| **Feature** | Gantt bars show a progress fill (darker shade covering completed portion) |
| **Complexity** | Low |
| **Notes** | Direct visual extension of percent_complete. Low effort, high UX value |

**Expected Behavior:**
- Each Gantt bar has two layers: full bar (planned) and progress fill (completed)
- Progress fill width = `percent_complete / 100 * bar_width` from left edge
- Same hue but darker/more saturated for completed portion
- Current GanttChart.tsx already has task-status-based coloring; add inner progress bar

---

### 9. Dependency-Driven Status Suggestions

| Aspect | Detail |
|--------|--------|
| **Feature** | When all predecessors are complete, suggest starting the successor. Overdue highlighting |
| **Complexity** | Low |
| **Notes** | Lightweight intelligence leveraging the dependency graph |

**Expected Behavior:**
- Task with all predecessors at 100%: "ready to start" indicator
- Task past its LF date and not complete: "overdue" indicator
- Task on critical path with low progress near LF: "at risk" indicator

---

### 10. Cascade Preview (Dry Run)

| Aspect | Detail |
|--------|--------|
| **Feature** | Before saving a change, show which tasks will be affected and how their dates will shift |
| **Complexity** | High |
| **Notes** | Prevents surprise rescheduling. Valuable for project managers who need to understand impact before committing |

**Expected Behavior:**
- User changes Task A duration
- Modal or sidebar shows: "This will move 12 tasks. Task B: March 5 -> March 8, Task C: March 10 -> March 13, ..."
- User confirms or cancels
- Requires running the engine without persisting, diffing with current state

---

## Anti-Features

Features to explicitly NOT build in this milestone.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| **Resource leveling** | Extremely complex (heuristic, NP-hard). MS Project's resource leveler is notorious for unexpected results. Would triple engine complexity | Keep resource-aware scheduling (per-resource work days/time-off) but do NOT auto-resolve over-allocation. Show over-allocation warnings instead |
| **Effort-driven scheduling** | MS Project's effort-driven mode (adding resources reduces duration) is confusing even to experts and rarely useful in audit management | Keep fixed-duration tasks. Manual duration adjustment only |
| **Multiple baselines** | MS Project supports up to 11 baselines. Overkill | Defer entirely. Single baseline later if needed |
| **Task splitting** | Splitting a task across non-contiguous periods. Rarely used, complex to visualize | Tasks are contiguous blocks |
| **Recurring tasks** | Repeating tasks on a schedule. Complex interaction with dependencies | Do not support. Users create individual tasks |
| **ALAP scheduling** | Requires backward-scheduled projects (from end date). Confusing, rarely used | Support only forward scheduling from project start date |
| **WBS numbering** | Work Breakdown Structure auto-numbering (1.1, 1.2, 1.2.1). Unrelated to scheduling | Defer. Phase/task hierarchy provides sufficient structure |
| **Earned Value Analysis** | BCWS, BCWP, BAC, EAC. Requires cost data and baselines | Defer to future cost-tracking milestone |
| **Calendar-day lag (elapsed days)** | MS Project supports "elapsed days" (ed) for lag that ignores calendar | Support only working-day lag. Simpler, consistent with existing engine |
| **Gantt drag-to-reschedule** | Interactive bar dragging. Massive UI effort with RTL, snapping, constraint interaction | Form-based editing with auto-cascading. Defer drag to future milestone |
| **Sub-tasks / WBS hierarchy** | Task nesting beyond phases. Would require restructuring the data model | Use existing phase structure for grouping |
| **Cost tracking** | Financial management. Separate domain | Defer to future milestone |

---

## Feature Dependencies

```
                    SS/FF/SF Fix (2)
                         |
                         v
              Lead/Lag support (3)
                         |
                         v
              Auto-Cascading (1)  <--- FOUNDATION
              /        |         \
             /         |          \
   Constraints (5)  Percent       Manual Mode (6)
        |          Complete (4)
        v               |
   Conflict              v
   Detection (7)   Gantt Progress
                   Viz (8)
                        |
                        v
                Status Suggestions (9)
```

**Critical dependency chain:**
1. **SS/FF/SF engine fix (2)** first -- the engine must handle all dependency types before being wired to UI
2. **Lead/lag (3)** next -- small change, ensures the engine is complete before wiring
3. **Auto-cascading (1)** is the FOUNDATION -- everything above depends on the engine being wired to mutations
4. **Percent complete (4)**, **Constraints (5)**, and **Manual mode (6)** can proceed in parallel after auto-cascading works
5. **Conflict detection (7)** depends on constraints
6. **Gantt progress (8)** depends on percent complete
7. **Status suggestions (9)** depends on percent complete and dependency awareness

---

## MVP Recommendation

### Phase 1 -- Engine Foundation (Must Have)

1. **SS/FF/SF dependency types** in forward/backward pass -- currently broken despite schema support
2. **Lead time** (negative lag) -- minor code change, already supported by schema
3. **Auto-cascading** wired to TanStack Query mutations -- THE key deliverable

**Rationale:** Without a correctly functioning, UI-wired scheduling engine, no other feature matters.

### Phase 2 -- Progress Tracking (Must Have)

4. **Percent complete** with status sync and remaining duration
5. **Gantt progress visualization** (progress fill on bars)
6. **Actual start/finish** auto-recording

**Rationale:** Progress tracking is the second most impactful user-facing feature after cascading. Users need to see and report progress. The Gantt progress bar is low-effort once percent_complete exists.

### Phase 3 -- Scheduling Intelligence (Should Have)

7. **Constraint types** (ASAP, SNET, MSO, FNLT) with UI
8. **Manual scheduling mode** with toggle
9. **Scheduling conflict detection** and warnings

**Rationale:** Constraints and manual mode are power features. They require understanding the engine well (established in Phase 1-2). Conflict detection is a natural extension of constraints.

### Defer to v1.2+

- ALAP, SNLT, FNET, MFO constraints (less common, incremental additions)
- Cascade preview / dry run (requires diff logic)
- Drag-to-reschedule on Gantt (massive UI effort)
- Dependency-driven status suggestions (nice-to-have)
- Undo/redo for scheduling changes (complex with offline sync)

---

## Schema Changes Summary

All new columns needed for this milestone:

```sql
-- Migration: add scheduling features to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS percent_complete INTEGER DEFAULT 0
  CHECK (percent_complete >= 0 AND percent_complete <= 100);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_start DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS actual_finish DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS constraint_type TEXT DEFAULT 'ASAP'
  CHECK (constraint_type IN ('ASAP', 'MSO', 'SNET', 'FNLT'));
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS constraint_date DATE;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS scheduling_mode TEXT DEFAULT 'auto'
  CHECK (scheduling_mode IN ('auto', 'manual'));
```

**Total: 6 new columns on `tasks`, 0 new tables, 0 changes to `dependencies`** (lag_days INTEGER already supports negative values -- no CHECK constraint blocking them).

---

## UX Behaviors That MS Project Users Expect

Not features per se, but behavioral expectations that will feel "wrong" if missing:

| Behavior | What Users Expect | Current State |
|----------|-------------------|---------------|
| **Immediate recalc** | Changing any scheduling input triggers instant visual update in Gantt and task list | Engine completely disconnected from UI |
| **Duration = working days** | Duration of 5 means 5 work days, not 5 calendar days | Correct in engine |
| **Calendar awareness** | Weekend/holiday skipping in all calculations | Correct in engine |
| **FS as default** | New dependencies default to Finish-to-Start | Correct (defaults to 'FS') |
| **Critical path live** | Critical path updates in real-time as schedule changes | Engine correct but not triggered from UI |
| **Slack display** | Users expect to see float/slack value per task | Computed but may not be displayed in UI |
| **Typing start date = SNET** | In auto mode, if user types a start date, it becomes a SNET constraint | Not implemented |
| **Completed tasks frozen** | Tasks at 100% do not move when predecessors change | Not implemented |
| **In-progress anchored** | Tasks with actual_start do not move backward | Not implemented |
| **Progress bar on Gantt** | Dark fill showing completion percentage on each bar | Not implemented (current bars are solid color) |
| **Constraint indicator** | Visual marker on constrained tasks in Gantt | Not implemented |
| **Manual task visual** | Different bar appearance for manually-scheduled tasks | Not implemented |
| **SS/FF/SF correct dates** | Non-FS dependency types should compute dates correctly | BROKEN -- engine treats all types as FS |

---

## Sources

- MS Project scheduling engine behavior: Training data (HIGH confidence -- MS Project scheduling rules have been stable and well-documented since Project 2003, with manual scheduling added in Project 2010. Core CPM/constraint model unchanged for 20+ years)
- Existing FlowPlan codebase: Direct code review of `scheduling.ts` (682 lines), `entities.ts`, `dependencies.ts`, `tasks.ts`, `GanttChart.tsx` (613 lines), and full DB schema (HIGH confidence)
- Constraint type definitions: Standard CPM/project scheduling theory (HIGH confidence -- textbook definitions identical across MS Project, Primavera P6, and every CPM implementation)
- SS/FF/SF bug: Confirmed by reading `forwardPass()` lines 246-255 which use `predTask.ef` and `addDays(predTask.ef, 1)` for ALL dependency types regardless of type field (HIGH confidence -- direct code observation)
