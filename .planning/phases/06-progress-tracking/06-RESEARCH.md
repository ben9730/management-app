# Phase 6: Progress Tracking - Research

**Researched:** 2026-02-17
**Domain:** Task progress tracking (percent complete, actual dates, frozen task scheduling, Gantt progress bars)
**Confidence:** HIGH

## Summary

Phase 6 adds progress tracking to the existing CPM scheduling system. The core concept is that tasks gain a `percent_complete` field (0-100) that bidirectionally syncs with `status`, auto-records `actual_start_date` and `actual_finish_date`, and triggers "freezing" behavior in the scheduling engine for completed/in-progress tasks. The Gantt chart gains a visual progress overlay showing a darker fill proportional to percent complete.

The implementation is architecturally clean because Phase 5 already established the "skip" pattern in the scheduling engine for manual tasks. Completed tasks (100%) use an identical pattern: the forward pass skips them and preserves their actual dates. In-progress tasks use a variant: their `actual_start_date` acts as a floor (cannot move backward, but can move forward). The database changes are minimal -- three new columns on the `tasks` table (`percent_complete`, `actual_start_date`, `actual_finish_date`). The service layer needs a progress update function that handles the bidirectional sync logic. The UI needs a percent complete slider/input on the TaskForm and task detail sidebar, plus a Gantt bar progress overlay.

**Primary recommendation:** Add database columns first, then implement the bidirectional sync logic in a service-level helper function that all task update paths call, then modify the scheduling engine's forward/backward pass to handle frozen/in-progress tasks, and finally add the Gantt progress bar overlay and UI controls.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| PROG-01 | User can set percent complete (0-100) on a task | New `percent_complete` column (INTEGER DEFAULT 0), slider/number input on TaskForm and detail sidebar |
| PROG-02 | Percent complete syncs bidirectionally with task status (0%=pending, 1-99%=in_progress, 100%=done) | Service-layer sync function applied on every task update path; bidirectional means status changes also update percent (done->100%, pending->0%) |
| PROG-03 | Actual start date auto-records when percent complete first goes above 0 | New `actual_start_date` column (DATE), set to current date on first transition from 0 to >0; never overwritten once set |
| PROG-04 | Actual finish date auto-records when percent complete reaches 100 | New `actual_finish_date` column (DATE), set to current date on transition to 100%; cleared if percent drops below 100 |
| PROG-05 | Completed tasks (100%) are frozen -- they do not move when predecessors change | Forward pass skip pattern (identical to manual task skip in Phase 5); use actual_start_date/actual_finish_date as ES/EF |
| PROG-06 | In-progress tasks with actual_start do not move backward | Forward pass clamp: computed ES cannot be earlier than actual_start_date |
| PROG-07 | Gantt bars show progress fill (darker portion covering completed percentage) | Inner div overlay with `width: percent_complete%` and darker/semi-transparent fill |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SchedulingService (custom) | existing | CPM engine with frozen task logic | Already implements manual-task skip pattern in forwardPass/backwardPass; extend for completed/in-progress tasks |
| Supabase | v2 (installed) | Database persistence of new progress columns | Already used for all CRUD; migration pattern established (007_add_constraints_manual_mode.sql) |
| TanStack Query | v5 (installed) | Cache management for optimistic progress updates | Already manages all data flow; recalculate() pattern handles cache updates |
| Tailwind CSS 4 | installed | Gantt progress bar styling | Already used for all visual styling in GanttChart.tsx |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Sonner | v2.0.7 (installed) | Toast notifications for progress milestones | Optional: notify when task reaches 100% and gets frozen |
| Zod | v4 (installed) | Validation of percent_complete range | Validate 0-100 integer constraint on input |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Integer percent (0-100) | Decimal (0.0-1.0) | Integer is simpler, matches MS Project UX, avoids floating-point display issues |
| Service-layer sync | Database trigger for status/percent sync | DB trigger would enforce consistency but hides logic, harder to test, and the codebase pattern is service-layer logic |
| CSS `clip-path` for progress | Inner div with width percentage | Inner div is simpler, works in all browsers, easier to reason about |

**Installation:** No new packages needed. All dependencies already installed.

## Architecture Patterns

### Recommended Changes

```
flowplan/src/
├── types/entities.ts            # Add percent_complete, actual_start_date, actual_finish_date to Task
├── types/database.ts            # Add new columns to tasks Row/Insert/Update types
├── services/tasks.ts            # Add progress sync logic, update batchUpdateTaskCPMFields
├── services/scheduling.ts       # Add frozen/in-progress skip logic in forwardPass/backwardPass
├── hooks/use-tasks.ts           # No changes needed (existing useUpdateTask works)
├── hooks/use-scheduling.ts      # May need progress-aware recalculate (likely no changes)
├── components/forms/TaskForm.tsx # Add percent_complete slider/input
├── components/gantt/GanttChart.tsx # Add progress bar overlay inside task bars
├── app/page.tsx                 # Add percent control to task detail sidebar, wire progress updates
└── supabase/migrations/
    └── 008_add_progress_tracking.sql  # New columns: percent_complete, actual_start_date, actual_finish_date
```

### Pattern 1: Bidirectional Percent-Status Sync

**What:** A pure function that, given a task's current state and a proposed change (either percent or status), returns the synchronized updates object containing both percent_complete and status.

**When to use:** Called by every task update path -- handleTaskFormSubmit, handleTaskStatusChange, and any future inline editing.

**Example:**
```typescript
// Source: codebase analysis + MS Project behavior
interface ProgressSyncResult {
  percent_complete: number
  status: TaskStatus
  actual_start_date?: string | null  // set only on first > 0%
  actual_finish_date?: string | null // set on 100%, cleared on < 100%
}

function syncProgressAndStatus(
  currentTask: { percent_complete: number; status: TaskStatus; actual_start_date: string | null },
  change: { percent_complete?: number; status?: TaskStatus }
): ProgressSyncResult {
  // If percent changed, derive status
  if (change.percent_complete !== undefined) {
    const pct = change.percent_complete
    const status = pct === 0 ? 'pending' : pct === 100 ? 'done' : 'in_progress'
    const result: ProgressSyncResult = { percent_complete: pct, status }

    // Auto-record actual_start_date on first > 0%
    if (pct > 0 && !currentTask.actual_start_date) {
      result.actual_start_date = new Date().toISOString().split('T')[0]
    }

    // Auto-record actual_finish_date at 100%
    if (pct === 100) {
      result.actual_finish_date = new Date().toISOString().split('T')[0]
    } else {
      result.actual_finish_date = null  // clear if not 100%
    }

    return result
  }

  // If status changed, derive percent
  if (change.status !== undefined) {
    const status = change.status
    if (status === 'done') {
      return {
        percent_complete: 100,
        status: 'done',
        actual_finish_date: new Date().toISOString().split('T')[0],
        actual_start_date: currentTask.actual_start_date || new Date().toISOString().split('T')[0],
      }
    }
    if (status === 'pending') {
      return {
        percent_complete: 0,
        status: 'pending',
        actual_finish_date: null,
        // Note: do NOT clear actual_start_date on revert to pending
        // (MS Project behavior: actual dates are historical records)
      }
    }
    // in_progress -- keep percent as-is but ensure > 0
    return {
      percent_complete: Math.max(currentTask.percent_complete, 1),
      status: 'in_progress',
      actual_start_date: currentTask.actual_start_date || new Date().toISOString().split('T')[0],
    }
  }

  // No change
  return {
    percent_complete: currentTask.percent_complete,
    status: currentTask.status,
  }
}
```

### Pattern 2: Frozen Task Skip in Forward Pass

**What:** During CPM forward pass, completed tasks (percent_complete === 100) are skipped entirely -- their ES/EF are set from actual_start_date/actual_finish_date. In-progress tasks use actual_start_date as a floor.

**When to use:** In `SchedulingService.forwardPass()`, immediately after the existing manual-task skip.

**Example:**
```typescript
// Source: MS Project behavior + existing manual task skip pattern
for (const task of resultTasks) {
  // Step A: Manual task skip (existing Phase 5 logic)
  if (task.scheduling_mode === 'manual') { ... continue }

  // Step B: Completed task freeze (NEW - Phase 6)
  if (task.percent_complete === 100 && task.actual_start_date && task.actual_finish_date) {
    task.es = this.toDate(task.actual_start_date)
    task.ef = this.toDate(task.actual_finish_date)
    continue  // frozen, do not compute from dependencies
  }

  // Step C: Dependency resolution (existing logic)
  // ... compute ES from predecessors ...

  // Step D: In-progress floor clamp (NEW - Phase 6)
  if (task.percent_complete > 0 && task.actual_start_date) {
    const actualStart = this.toDate(task.actual_start_date)
    if (actualStart && (task.es as Date) < actualStart) {
      task.es = actualStart  // cannot move backward past actual start
    }
  }

  // Step E: Constraint logic (existing Phase 5 logic)
  // ... MSO, SNET constraints ...

  // Calculate EF (existing)
  task.ef = this.addWorkingDays(task.es!, task.duration, workDays, holidays)
}
```

### Pattern 3: Gantt Progress Bar Overlay

**What:** An inner div inside each Gantt task bar that covers `percent_complete%` width with a darker fill.

**When to use:** In GanttChart.tsx, inside the task bar rendering section.

**Example:**
```typescript
// Source: Standard Gantt chart pattern
// Inside the task bar div, add a progress overlay
{task.percent_complete > 0 && task.percent_complete < 100 && (
  <div
    className="absolute inset-y-0 left-0 bg-black/25 rounded-l-lg"
    style={{ width: `${task.percent_complete}%` }}
  />
)}
```

### Anti-Patterns to Avoid

- **Reactive useEffect for sync:** Do NOT use useEffect watching percent_complete to update status. Use the one-shot mutation pattern established in Phase 4. The sync function is called explicitly during the update path, not reactively.
- **Database trigger for sync:** Do NOT add a PostgreSQL trigger for percent/status sync. The codebase pattern is service-layer logic. Triggers hide behavior and make testing harder.
- **Clearing actual_start_date on revert:** Do NOT clear actual_start_date when a task goes back to 0% or 'pending'. Actual dates are historical facts (MS Project preserves them). This avoids data loss when users briefly toggle status.
- **Mutating task objects:** Always use the immutable spread pattern established across the codebase: `{ ...task, percent_complete: newValue }`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Date formatting for actual dates | Custom date formatter | Existing `formatDateDisplay()` from `@/lib/utils` | Already handles Date/string/null, RTL-safe |
| Input range slider | Custom range input | Native HTML `<input type="range">` with Tailwind styling | Simple, accessible, no extra dependencies |
| Toast for progress milestones | Custom notification system | Sonner `toast()` already imported and configured | Already used for constraint violations |
| Gantt bar dimensions/positioning | New calculation logic | Existing `taskPositions` computation in GanttChart.tsx | Already accounts for dayWidth, dateRange, ROW_HEIGHT |

**Key insight:** This phase requires no new libraries. Every piece of infrastructure (scheduling engine skip pattern, batch persist, Gantt rendering, form controls, toast system) already exists from Phases 4-5. The work is extending existing patterns, not building new ones.

## Common Pitfalls

### Pitfall 1: Race Condition Between Percent Update and CPM Recalculation

**What goes wrong:** User changes percent_complete, which triggers a status change and a CPM recalculation. If the status update and CPM update race, the optimistic cache can have stale percent/status.

**Why it happens:** The `handleTaskStatusChange` in page.tsx does `updateTaskMutation.mutateAsync` then `recalculate()`. If percent_complete triggers both a status update AND a CPM recalc, the sequence must be correct.

**How to avoid:** The sync function produces a single updates object containing BOTH percent_complete and status. Pass this single object to `updateTaskMutation.mutateAsync`, then call `recalculate()` once with the merged result. Never fire two separate mutations.

**Warning signs:** Status flickering in the UI, Gantt bar positions jumping, console errors about stale cache.

### Pitfall 2: Backward Pass Not Handling Frozen Tasks

**What goes wrong:** Forward pass correctly freezes completed tasks, but backward pass doesn't. This causes incorrect slack calculations -- a frozen task shows slack > 0 or negative slack.

**Why it happens:** The backward pass needs the same skip pattern as the forward pass. Without it, LS/LF are computed from successors and won't match the frozen ES/EF.

**How to avoid:** Add the same frozen-task skip in `backwardPass()`: if percent_complete === 100, set LS=ES, LF=EF, continue. Follow the existing manual task pattern in backward pass (line 495 of scheduling.ts).

**Warning signs:** Completed tasks showing non-zero slack, completed tasks appearing on/off critical path incorrectly.

### Pitfall 3: batchUpdateTaskCPMFields Overwriting Progress Data

**What goes wrong:** After CPM recalculation, `batchUpdateTaskCPMFields` persists ES/EF/LS/LF and syncs start_date/end_date. For frozen tasks, this must NOT overwrite actual_start_date/actual_finish_date with CPM-computed values.

**Why it happens:** The batch persist currently syncs `start_date = es` and `end_date = ef` for auto tasks. Frozen tasks should use their actual dates.

**How to avoid:** In `batchUpdateTaskCPMFields`, add a third branch for completed tasks (percent_complete === 100): skip start_date/end_date sync, only persist the CPM fields. The existing manual-task branch (line 239 of tasks.ts) is the template.

**Warning signs:** Frozen task dates changing in the database after recalculation, Gantt bars for completed tasks shifting position.

### Pitfall 4: Bidirectional Sync Infinite Loop

**What goes wrong:** Changing percent updates status, which triggers another percent update, creating a loop.

**Why it happens:** If the sync logic is placed in a reactive useEffect or database trigger.

**How to avoid:** Use the explicit one-shot pattern: the sync function is pure and returns the final state. It is called once during mutation, not reactively. This is the same design decision from Phase 4 (decision [04-02]: explicit mutation trigger, not reactive useEffect).

**Warning signs:** Rapid re-renders, React dev tools showing cascading state updates, "Maximum update depth exceeded" errors.

### Pitfall 5: Existing Status Toggle Breaking

**What goes wrong:** The TaskCard has a status checkbox that toggles between 'done' and 'pending'. After Phase 6, this toggle must also update percent_complete (done->100%, pending->0%) and actual dates.

**Why it happens:** The `handleTaskStatusChange` in page.tsx currently only updates status. It needs to call the sync function.

**How to avoid:** Modify `handleTaskStatusChange` to apply `syncProgressAndStatus()` before calling `updateTaskMutation`. This ensures clicking the checkbox on a TaskCard correctly syncs percent and actual dates.

**Warning signs:** Checking a task as "done" doesn't set percent to 100%, unchecking doesn't clear percent, actual dates not recorded.

### Pitfall 6: page.tsx Bloat (1300+ Lines)

**What goes wrong:** Adding progress UI controls (slider, actual dates display) directly to page.tsx increases its size further.

**Why it happens:** Prior decision notes that "page.tsx is ~1,300 lines -- new UI work should extract into hooks/components."

**How to avoid:** Extract the task detail sidebar into its own component (e.g., `components/tasks/TaskDetailSidebar.tsx`). The progress slider and percent display go into this extracted component. This is the right time to do this refactoring since we're adding new UI to the sidebar.

**Warning signs:** page.tsx exceeding 1500 lines, increasingly complex prop drilling, slow IDE performance.

## Code Examples

Verified patterns from the existing codebase:

### Database Migration (008_add_progress_tracking.sql)

```sql
-- Phase 6: Add progress tracking fields to tasks
-- percent_complete: 0-100 integer
-- actual_start_date: auto-recorded when work begins
-- actual_finish_date: auto-recorded when work completes

ALTER TABLE tasks
  ADD COLUMN percent_complete INTEGER DEFAULT 0 NOT NULL
    CHECK (percent_complete >= 0 AND percent_complete <= 100),
  ADD COLUMN actual_start_date DATE DEFAULT NULL,
  ADD COLUMN actual_finish_date DATE DEFAULT NULL;

-- Constraint: actual_finish_date >= actual_start_date when both set
ALTER TABLE tasks
  ADD CONSTRAINT valid_actual_dates
    CHECK (actual_finish_date IS NULL OR actual_start_date IS NULL
           OR actual_finish_date >= actual_start_date);
```

### UpdateTaskInput Extension (services/tasks.ts)

```typescript
// Add to existing UpdateTaskInput interface
export interface UpdateTaskInput {
  // ... existing fields ...
  percent_complete?: number
  actual_start_date?: string | null
  actual_finish_date?: string | null
}
```

### Task Type Extension (types/entities.ts)

```typescript
export interface Task extends BaseEntity {
  // ... existing fields ...

  // Progress tracking fields (Phase 6)
  percent_complete: number          // 0-100
  actual_start_date: Date | string | null  // Set when work begins
  actual_finish_date: Date | string | null // Set when work completes
}
```

### batchUpdateTaskCPMFields Extension (services/tasks.ts)

```typescript
// Source: Existing manual task pattern at line 239 of tasks.ts
tasks.map(task => {
  // Completed task freeze: don't overwrite actual dates
  if (task.percent_complete === 100) {
    return supabase
      .from('tasks')
      .update({
        es: toDateStr(task.es),
        ef: toDateStr(task.ef),
        ls: toDateStr(task.ls),
        lf: toDateStr(task.lf),
        slack: task.slack ?? 0,
        is_critical: task.is_critical ?? false,
        // Do NOT sync start_date/end_date -- frozen task uses actual dates
      } as never)
      .eq('id', task.id)
  }

  if (task.scheduling_mode === 'manual') {
    // ... existing manual task branch ...
  }

  // Auto tasks: existing sync logic
  // ...
})
```

### Gantt Progress Bar (components/gantt/GanttChart.tsx)

```typescript
// Source: Existing task bar rendering pattern at line 541 of GanttChart.tsx
// Add inside the task bar div, after the existing overlays

{/* Progress fill overlay */}
{(task as any).percent_complete > 0 && (task as any).percent_complete < 100 && (
  <div
    className="absolute inset-y-0 left-0 bg-black/20 rounded-l-lg pointer-events-none"
    style={{ width: `${(task as any).percent_complete}%` }}
    data-testid={`progress-fill-${task.id}`}
  />
)}
```

### Percent Complete Slider (UI Component)

```typescript
// Source: Standard HTML range input, styled with Tailwind
<div className="space-y-1">
  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">
    אחוז השלמה
  </label>
  <div className="flex items-center gap-3">
    <input
      type="range"
      min={0}
      max={100}
      step={5}
      value={percentComplete}
      onChange={(e) => handlePercentChange(Number(e.target.value))}
      className="flex-1 accent-[var(--fp-brand-primary)]"
      data-testid="percent-complete-slider"
    />
    <span className="text-sm font-bold w-10 text-left">{percentComplete}%</span>
  </div>
</div>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Binary done/not-done | Percent complete (0-100) | Standard since MS Project 95 | Enables progress visualization and earned value tracking |
| Manual actual date entry | Auto-record on percent change | MS Project 2010+ | Eliminates data entry errors, ensures consistency |
| All tasks reschedule | Completed tasks freeze | Standard CPM since inception | Prevents schedule chaos when updating in-progress projects |

**Deprecated/outdated:**
- Physical percent vs. duration percent: Physical percent complete (MS Project concept) is out of scope. We implement duration percent which is the simpler, more common model.

## Open Questions

1. **Should actual_start_date be clearable?**
   - What we know: MS Project does NOT clear actual_start_date when percent returns to 0. It treats actual dates as historical facts.
   - What's unclear: Users might expect "undo" behavior when resetting a task.
   - Recommendation: Follow MS Project -- do NOT clear actual_start_date. Document this in UI (show actual dates as read-only in the sidebar). If a task is incorrectly started, the user can manually override via the edit form.

2. **Step size for percent_complete slider**
   - What we know: MS Project uses 5% increments by default but allows any integer. Oracle P6 uses 1% or custom increments.
   - What's unclear: Whether 5% steps are granular enough for this user base.
   - Recommendation: Use step=5 on the slider for quick input, but also show a number input that accepts any integer 0-100. This gives both convenience and precision.

3. **Should the TaskCard checkbox still toggle done/pending?**
   - What we know: Currently the checkbox toggles status directly. After Phase 6, status changes should go through the sync function.
   - What's unclear: Whether users expect checking the box to set 100% or just mark done.
   - Recommendation: Keep the checkbox but wire it through the sync function. Checking = 100%, unchecking = 0%. The percent slider provides finer control.

4. **Extract TaskDetailSidebar component?**
   - What we know: page.tsx is 1300+ lines and the prior decision explicitly says to extract.
   - What's unclear: Whether to do this as part of Phase 6 or as a separate refactoring task.
   - Recommendation: Extract as part of Phase 6. Adding the progress slider to the sidebar is the natural trigger. The extracted component receives task + handlers via props.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Read and analyzed all relevant source files:
  - `scheduling.ts` (868 lines) - CPM engine with manual task skip pattern
  - `tasks.ts` (278 lines) - Task CRUD, batchUpdateTaskCPMFields with manual branch
  - `entities.ts` (334 lines) - Task type definition, no progress fields yet
  - `database.ts` - Generated types, no progress columns yet
  - `GanttChart.tsx` (770 lines) - Rendering, task bar patterns, overlay system
  - `TaskForm.tsx` (720 lines) - Form with constraint/manual fields
  - `TaskCard.tsx` (219 lines) - Status checkbox toggle
  - `use-scheduling.ts` (163 lines) - One-shot recalculate pattern
  - `use-tasks.ts` (145 lines) - React Query hooks
  - `page.tsx` (1300+ lines) - All task update handlers
  - `001_initial_schema.sql` - Original task table definition
  - `007_add_constraints_manual_mode.sql` - Migration pattern reference

### Secondary (MEDIUM confidence)
- **MS Project behavior** - Percent complete, actual dates, frozen task scheduling behavior based on established project management software patterns. Standard CPM scheduling theory supports frozen-task behavior for completed activities.
- **Prior phase decisions** - Phase 4 and 5 decisions documented in planning files, establishing patterns this phase follows.

### Tertiary (LOW confidence)
- None. All findings are based on codebase analysis and established project management principles.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries, all infrastructure exists
- Architecture: HIGH - Extends proven patterns (manual task skip, batch persist branches, Gantt overlays)
- Pitfalls: HIGH - Based on direct codebase analysis of race conditions and mutation patterns
- Database migration: HIGH - Simple ALTER TABLE following established migration pattern

**Research date:** 2026-02-17
**Valid until:** 2026-03-17 (stable -- no external dependencies changing)
