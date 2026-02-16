# Phase 5: Constraints & Manual Mode - Research

**Researched:** 2026-02-16
**Domain:** CPM task constraints (ASAP/MSO/SNET/FNLT), manual scheduling mode, scheduling engine modifications
**Confidence:** HIGH

## Summary

Phase 5 adds constraint types and manual scheduling mode to the existing CPM engine built in Phase 4. The current `SchedulingService.forwardPass()` computes ES for each task purely from predecessor dependencies and the project start date. Constraints introduce a second source of scheduling pressure: user-specified date targets that the engine must respect (or detect violations for). Manual mode introduces tasks that the engine skips entirely during date computation but still treats as valid predecessors for downstream tasks.

The implementation touches four layers: (1) database schema (new columns on `tasks` table for `constraint_type`, `constraint_date`, and `scheduling_mode`), (2) scheduling engine (`forwardPass` and `calculateCriticalPath` must incorporate constraint logic and skip manual tasks), (3) task service (CRUD must handle new fields, `batchUpdateTaskCPMFields` must skip manual tasks and respect constraint-driven dates), and (4) UI (TaskForm gets constraint controls, GanttChart gets visual indicators for constrained/manual tasks, toast notifications for constraint conflicts).

**Primary recommendation:** Modify the scheduling engine first (pure algorithmic work, highly testable), then add database columns via migration, update service/hooks, and finally wire UI controls and visual indicators. The engine changes are the most complex part -- constraint integration into `forwardPass` requires careful ordering of dependency-vs-constraint resolution.

<user_constraints>

## User Constraints (from CONTEXT.md)

### Locked Decisions

#### Constraint types
- 4 constraint types: ASAP (as soon as possible), MSO (Must Start On), SNET (Start No Earlier Than), FNLT (Finish No Later Than)
- Default for new tasks: **no constraint** (not ASAP) -- tasks have no constraint until user explicitly sets one

#### Conflict behavior
- **Dependencies win over constraints** -- if a predecessor finishes later than a MSO date, the dependency takes priority and the constraint is effectively a soft preference
- When a user sets a MSO date that conflicts with dependencies: **show a toast with explanation** (e.g., "Constraint adjusted -- dependency on [Task X] requires starting no earlier than [date]")

#### Deadline warnings
- When a scheduling change causes a deadline violation: **show a toast notification** in addition to Gantt visuals

### Claude's Discretion
- Constraint setup placement (form vs inline vs sidebar)
- Gantt bar visual treatment for constraints and deadline violations
- SNET enforcement behavior (standard: max of dependency date and SNET date)
- Whether to show scheduling driver tooltips
- Deadline marker on timeline (diamond or none)
- Info indicators for active non-FNLT constraints
- All manual mode UX and visuals
- Toggle UX for switching tasks to manual mode
- Visual distinction for manual tasks in Gantt chart
- Manual date interaction with successor cascading

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope

</user_constraints>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| SchedulingService (custom) | existing | CPM engine with constraint integration | Already implements forward/backward pass for all 4 dep types; extend, don't replace |
| Sonner | v2.0.7 (installed) | Toast notifications for constraint conflicts and deadline violations | Already configured in layout.tsx with RTL support, used by phase-unlock-notifier |
| TanStack Query | v5 (installed) | Cache management for task updates with new constraint fields | Already manages all data flow |
| Supabase | v2 (installed) | Database persistence of constraint/manual mode fields | Already used for all CRUD |
| Zod | v4 (installed) | Validation of constraint type + date combinations | Already used for input validation patterns |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | v0.563 (installed) | Icons for constraint indicators and manual mode toggle | Pin icon, lock icon, warning icon |
| date-fns | v4.1 (installed) | Date formatting for constraint dates in UI | Already available, used for date display |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Custom constraint logic in SchedulingService | External scheduling library (e.g., bryntum, dhtmlx) | No maintained open-source JS CPM library with constraint support; our engine is well-tested with 200+ tests |
| Sonner toasts for violations | Inline form errors only | User specifically requested toast notifications for both constraint conflicts and deadline violations |
| New DB columns on tasks | Separate constraints table | Constraints are 1:1 with tasks; separate table adds unnecessary join complexity for no benefit |

**Installation:**
No new dependencies needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
src/
├── types/
│   └── entities.ts              # Add ConstraintType, SchedulingMode to Task
├── services/
│   ├── scheduling.ts            # Modify forwardPass/backwardPass for constraints + manual skip
│   └── tasks.ts                 # Update CRUD inputs for constraint_type, constraint_date, scheduling_mode
├── hooks/
│   └── use-scheduling.ts        # Update recalculate to handle manual tasks and constraint violations
├── components/
│   ├── forms/
│   │   └── TaskForm.tsx         # Add constraint type selector + constraint date picker + manual toggle
│   └── gantt/
│       └── GanttChart.tsx       # Add constraint indicators, manual task styling, deadline markers
└── supabase/
    └── migrations/
        └── 007_add_constraints_manual_mode.sql  # New columns on tasks table
```

### Pattern 1: Constraint Resolution in Forward Pass
**What:** During the forward pass, after computing the dependency-driven ES for a task, apply constraint logic as a second step. For MSO and SNET, the final ES is `max(dependency_ES, constraint_date)`. For FNLT, ES is unchanged but a violation flag is computed after EF is known.
**When to use:** Every forward pass computation.
**Why this order:** User decided "dependencies win over constraints" -- so we compute dependency ES first, then apply constraints as a floor (MSO/SNET) or check (FNLT). This means constraints never push a task earlier than its dependencies allow.

```typescript
// In forwardPass, after computing dependency-driven ES for a task:

// Apply constraint logic (dependencies already resolved)
if (task.constraint_type === 'MSO' && task.constraint_date) {
  const constraintDate = new Date(task.constraint_date)
  const dependencyES = task.es as Date
  // Dependencies win: use the later of dependency ES and MSO date
  task.es = dependencyES > constraintDate ? dependencyES : constraintDate
  // Track if constraint was overridden by dependency
  task._constraintOverridden = dependencyES > constraintDate
}

if (task.constraint_type === 'SNET' && task.constraint_date) {
  const constraintDate = new Date(task.constraint_date)
  const dependencyES = task.es as Date
  // Standard SNET: use whichever is later
  task.es = dependencyES > constraintDate ? dependencyES : constraintDate
}

// Recompute EF after constraint adjustment
task.ef = this.addWorkingDays(task.es, task.duration, workDays, holidays)

// FNLT check (after EF is known)
if (task.constraint_type === 'FNLT' && task.constraint_date) {
  const deadline = new Date(task.constraint_date)
  task._fnltViolation = (task.ef as Date) > deadline
}
```

### Pattern 2: Manual Task Skip in Engine
**What:** Manual tasks (`scheduling_mode === 'manual'`) are excluded from the forward/backward pass date computation but remain in the task set for dependency resolution. Their user-set `start_date`/`end_date` are used as-is for predecessor/successor calculations.
**When to use:** When the engine encounters a manual task during forward or backward pass.

```typescript
// In forwardPass:
for (const task of resultTasks) {
  if (task.scheduling_mode === 'manual') {
    // Manual task: preserve user dates, copy to ES/EF for dependency calculations
    task.es = task.start_date ? new Date(task.start_date as string) : task.es
    task.ef = task.end_date ? new Date(task.end_date as string) : task.ef
    continue // Skip dependency-driven computation
  }
  // ... normal forward pass logic
}
```

### Pattern 3: Constraint Violation Detection and Notification
**What:** After recalculation, compare results to detect constraint violations (MSO overridden by dependency, FNLT deadline exceeded). Fire toast notifications for violations. This runs in the `useScheduling` hook after `calculateCriticalPath()` returns.
**When to use:** Every recalculation that involves constrained tasks.

```typescript
// In useScheduling.recalculate():
const result = schedulingService.calculateCriticalPath(...)

// Detect and notify constraint violations
for (const task of result.tasks) {
  if (task._constraintOverridden) {
    // Find the driving predecessor
    const drivingPred = findDrivingPredecessor(task, currentDeps, result.tasks)
    toast.warning(`אילוץ הותאם`, {
      description: `התלות ב-"${drivingPred?.title}" דוחה את ההתחלה...`,
      duration: 5000,
    })
  }
  if (task._fnltViolation) {
    toast.error(`אזהרת דדליין`, {
      description: `"${task.title}" חורג מהדדליין...`,
      duration: 7000,
    })
  }
}
```

### Pattern 4: batchUpdateTaskCPMFields Must Skip Manual Tasks
**What:** The batch persist function currently overwrites `start_date`/`end_date` with `es`/`ef` for all tasks. For manual tasks, this must NOT happen -- their `start_date`/`end_date` are user-controlled.
**When to use:** During batch persistence after recalculation.

```typescript
// In batchUpdateTaskCPMFields:
const results = await Promise.all(
  tasks.map(task => {
    if (task.scheduling_mode === 'manual') {
      // Manual tasks: only update slack/critical path, NOT dates
      return supabase.from('tasks').update({
        slack: task.slack ?? 0,
        is_critical: task.is_critical ?? false,
        // Do NOT overwrite start_date/end_date -- user controls these
      }).eq('id', task.id)
    }
    // Auto tasks: sync start_date/end_date with es/ef as before
    return supabase.from('tasks').update({
      es: toDateStr(task.es),
      ef: toDateStr(task.ef),
      ls: toDateStr(task.ls),
      lf: toDateStr(task.lf),
      slack: task.slack ?? 0,
      is_critical: task.is_critical ?? false,
      start_date: toDateStr(task.es),
      end_date: toDateStr(task.ef),
    }).eq('id', task.id)
  })
)
```

### Anti-Patterns to Avoid
- **Storing constraint resolution results in the DB:** The `_constraintOverridden` and `_fnltViolation` flags are transient computation results, not persisted state. They exist only during the recalculate cycle to drive toast notifications. Persisting them would create stale data that doesn't reflect current scheduling reality.
- **Mutating manual task dates during recalculation:** If the engine accidentally overwrites manual task dates with computed values, the entire manual mode feature is broken. The skip logic must be bulletproof.
- **Applying constraints in backward pass:** Constraints (MSO, SNET, FNLT) are forward-pass concerns. The backward pass computes LS/LF from the project end; constraints don't modify this. FNLT is a detection check, not a scheduling constraint on LF.
- **Treating "no constraint" as ASAP:** The user explicitly decided that the default is "no constraint" -- tasks have no constraint until one is set. ASAP is a distinct constraint type that means "schedule as early as dependencies allow" (which is functionally identical to no constraint but semantically different in the UI).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom notification system | Sonner (already configured) | RTL-aware, themed, already in layout.tsx with dark theme |
| Date picker for constraints | Custom calendar widget | HTML `<input type="date">` (existing pattern) | TaskForm already uses `<Input type="date">` for start_date; consistent UX |
| Constraint type dropdown | Custom radio/toggle group | `<Select>` component (existing) | Already used for priority, dependency type; consistent UI pattern |
| Manual mode toggle | Custom checkbox component | HTML checkbox with styling (or small toggle) | Simple boolean toggle; no need for complex component |

**Key insight:** Every UI component needed for constraints and manual mode already exists in the codebase (Select, Input[type=date], Button). The work is wiring them together, not building new primitives.

## Common Pitfalls

### Pitfall 1: Constraint Date Without Constraint Type (or Vice Versa)
**What goes wrong:** User sets a constraint date but forgets to select a type, or clears the type but leaves the date. Engine encounters inconsistent state.
**Why it happens:** Two separate form fields that must be synchronized.
**How to avoid:** In the TaskForm, when constraint_type is changed to "none"/empty, auto-clear constraint_date. When constraint_type is set to MSO/SNET/FNLT, require constraint_date (show validation error). Use Zod schema refinement to enforce this at the validation layer.
**Warning signs:** Tasks with constraint_date but no constraint_type (or vice versa) appearing in the database.

### Pitfall 2: Infinite Recalculation Loop from Constraint Toasts
**What goes wrong:** A constraint violation fires a toast. If the toast callback or re-render triggers another recalculation, it causes an infinite loop.
**Why it happens:** The `useScheduling.recalculate()` function is called from mutation callbacks. If detecting violations triggers state changes that re-invoke recalculate, the loop begins.
**How to avoid:** Violation detection and toast firing must be a pure side-effect of recalculation, never triggering another recalculation. The toast calls are fire-and-forget, no state updates from them.
**Warning signs:** Page freezing after setting a constraint on a task with dependencies.

### Pitfall 3: Manual Task With No User Dates
**What goes wrong:** User toggles a task to manual mode but hasn't set start_date/end_date. The engine tries to use null dates as predecessor dates for successors.
**Why it happens:** Manual mode expects user-provided dates, but the user hasn't set them yet.
**How to avoid:** When switching to manual mode, if start_date/end_date are null, auto-fill them from the current ES/EF (or current date if no CPM data). Show a validation message if dates are missing on a manual task.
**Warning signs:** NaN or null propagation in successor task ES/EF calculations after a manual task with no dates.

### Pitfall 4: batchUpdateTaskCPMFields Overwriting Manual Dates
**What goes wrong:** The current `batchUpdateTaskCPMFields` unconditionally sets `start_date = es` and `end_date = ef` for all tasks. For manual tasks, this destroys user-set dates.
**Why it happens:** The function was designed before manual mode existed and treats all tasks identically.
**How to avoid:** Add explicit check for `scheduling_mode === 'manual'` to skip date overwrite. This is the single most critical implementation detail for manual mode correctness.
**Warning signs:** Manual task dates changing after any recalculation event.

### Pitfall 5: Backward Pass Corruption from Manual Tasks
**What goes wrong:** The backward pass uses successor LS/LF to compute predecessor LF. If a manual task has LF that doesn't match its computed position, it could corrupt upstream LF/LS values.
**Why it happens:** Manual tasks don't participate in the forward pass computation, so their LS/LF may not be meaningful in the traditional CPM sense.
**How to avoid:** During backward pass, manual tasks should still contribute their dates (end_date as a constraint on predecessor LF), but the engine should not attempt to modify the manual task's own LS/LF. Use the manual task's end_date as its LF and start_date as its LS for backward pass purposes.
**Warning signs:** Negative slack or incorrect critical path identification when manual tasks are present.

### Pitfall 6: FNLT Constraint on Tasks Without Dependencies
**What goes wrong:** A task with no predecessors and a FNLT constraint. The task schedules at project start, may finish well before the deadline. No violation, but also no useful scheduling pressure.
**Why it happens:** FNLT is a soft deadline check, not a scheduling constraint that pulls tasks earlier.
**How to avoid:** This is actually correct behavior -- FNLT only produces warnings, it doesn't modify scheduling. Document this clearly so users understand FNLT is a monitoring tool, not a scheduling directive.
**Warning signs:** User confusion when FNLT doesn't cause the task to schedule closer to its deadline. Consider a tooltip explaining FNLT behavior.

## Code Examples

### Database Migration for Constraint Fields

```sql
-- Migration: 007_add_constraints_manual_mode.sql

-- Add constraint and scheduling mode columns to tasks
ALTER TABLE tasks
  ADD COLUMN constraint_type TEXT DEFAULT NULL
    CHECK (constraint_type IN ('ASAP', 'MSO', 'SNET', 'FNLT')),
  ADD COLUMN constraint_date DATE DEFAULT NULL,
  ADD COLUMN scheduling_mode TEXT DEFAULT 'auto'
    CHECK (scheduling_mode IN ('auto', 'manual'));

-- Index for queries filtering by scheduling mode
CREATE INDEX IF NOT EXISTS idx_tasks_scheduling_mode ON tasks(scheduling_mode);

-- Constraint: constraint_date required for MSO, SNET, FNLT
-- (Enforced at application level via Zod, not DB constraint,
--  because ASAP and NULL constraint_type don't need a date)
```

### Updated Task Entity Type

```typescript
// In entities.ts
export type ConstraintType = 'ASAP' | 'MSO' | 'SNET' | 'FNLT'
export type SchedulingMode = 'auto' | 'manual'

export interface Task extends BaseEntity {
  // ... existing fields ...

  // Constraint fields (Phase 5)
  constraint_type: ConstraintType | null  // null = no constraint (default)
  constraint_date: Date | string | null   // Required for MSO, SNET, FNLT
  scheduling_mode: SchedulingMode         // 'auto' (default) or 'manual'
}
```

### Forward Pass with Constraint Integration

```typescript
// In SchedulingService.forwardPass():
for (const task of resultTasks) {
  // Skip manual tasks -- use their user-set dates
  if (task.scheduling_mode === 'manual') {
    task.es = this.toDate(task.start_date) || task.es
    task.ef = this.toDate(task.end_date) || task.ef
    continue
  }

  // Normal dependency-driven ES computation (existing logic)
  const predecessors = predecessorMap.get(task.id) || []
  if (predecessors.length === 0) {
    task.es = this.findNextWorkingDay(projectStart, workDays, holidays)
  } else {
    let maxDate: Date | null = null
    for (const dep of predecessors) {
      const predTask = taskMap.get(dep.predecessor_id)
      if (predTask && predTask.ef) {
        const candidateES = this.computeCandidateES(
          dep, predTask, task.duration, projectStart, workDays, holidays
        )
        if (!maxDate || candidateES > maxDate) {
          maxDate = candidateES
        }
      }
    }
    task.es = maxDate || this.findNextWorkingDay(projectStart, workDays, holidays)
  }

  // Apply constraint after dependency resolution
  const constraintDate = this.toDate(task.constraint_date)
  if (constraintDate && (task.constraint_type === 'MSO' || task.constraint_type === 'SNET')) {
    const depES = task.es as Date
    const constraintWorking = this.findNextWorkingDay(constraintDate, workDays, holidays)
    // Dependencies win: take the later date
    if (constraintWorking > depES) {
      task.es = constraintWorking
    }
    // If depES > constraintWorking, the constraint is overridden (track for notification)
  }

  // Compute EF (after any constraint adjustment to ES)
  task.ef = this.addWorkingDays(task.es!, task.duration, workDays, holidays)
}
```

### TaskForm Constraint Section

```typescript
// Recommended placement: after the duration/estimated_hours row, before assignee selection
// This groups all scheduling-related fields together

{/* Constraint & Scheduling Mode */}
<div className="space-y-3 border-t border-[var(--fp-border-light)] pt-4">
  <div className="flex items-center justify-between">
    <span className="text-xs font-bold uppercase text-slate-500">תזמון מתקדם</span>
    {/* Manual mode toggle */}
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <input
        type="checkbox"
        checked={formData.scheduling_mode === 'manual'}
        onChange={(e) => handleSchedulingModeChange(e.target.checked)}
      />
      <span className="text-slate-400">תזמון ידני</span>
    </label>
  </div>

  {formData.scheduling_mode === 'auto' && (
    <div className="grid grid-cols-2 gap-4">
      <Select
        label="סוג אילוץ"
        options={constraintOptions}
        value={formData.constraint_type || ''}
        onChange={handleConstraintTypeChange}
      />
      {(formData.constraint_type === 'MSO' ||
        formData.constraint_type === 'SNET' ||
        formData.constraint_type === 'FNLT') && (
        <Input
          label="תאריך אילוץ"
          type="date"
          value={formData.constraint_date || ''}
          onChange={handleConstraintDateChange}
          required
        />
      )}
    </div>
  )}
</div>
```

### GanttChart Visual Indicators

```typescript
// In GanttChart task bar rendering:

// Constraint indicator (small icon on bar)
{task.constraint_type && task.constraint_type !== 'ASAP' && (
  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center text-[8px] text-white z-10"
    title={`${constraintTypeLabels[task.constraint_type]}: ${formatDateDisplay(task.constraint_date)}`}>
    {task.constraint_type === 'FNLT' ? '!' : '\u{1F4CC}'}
  </span>
)}

// Manual mode visual distinction
{task.scheduling_mode === 'manual' && (
  <div className="absolute inset-0 border-2 border-dashed border-white/40 rounded-lg pointer-events-none" />
)}

// FNLT violation visual (red tint)
{task._fnltViolation && (
  <div className="absolute inset-0 bg-red-500/20 rounded-lg pointer-events-none" />
)}

// FNLT deadline diamond marker on timeline (optional, recommended)
{task.constraint_type === 'FNLT' && task.constraint_date && (
  <div
    className="absolute w-3 h-3 bg-red-500 rotate-45 -top-1.5"
    style={{ left: getDatePosition(task.constraint_date) }}
    title={`דדליין: ${formatDateDisplay(task.constraint_date)}`}
  />
)}
```

## Recommendations for Claude's Discretion Areas

### Constraint setup placement
**Recommendation:** Place in the TaskForm, in a collapsible "Advanced Scheduling" section below duration/hours, above assignees. This keeps scheduling fields grouped and doesn't clutter the basic form. The section title acts as a visual separator.
**Rationale:** The current TaskForm has a clear flow: title > description > priority/date > duration/hours > assignees. Constraints belong with the scheduling group. A collapsible section (default collapsed for new tasks) keeps the form clean for users who don't need constraints.

### Gantt bar visual treatment
**Recommendation:** Small colored dot indicator on the top-right corner of constrained task bars. Blue dot for MSO/SNET (active constraints), red dot with "!" for FNLT. Tooltip on hover shows constraint type and date.
**Rationale:** Keeps the Gantt clean (no text labels on bars), uses the existing hover-tooltip pattern from dependency lines. Color coding matches urgency: blue = informational, red = warning.

### FNLT deadline violations
**Recommendation:** Red tint overlay on the task bar + the red dot indicator. Plus a diamond marker on the timeline at the deadline date position. This creates three visual cues: bar color shift, indicator dot, and timeline marker.
**Rationale:** Deadline violations are critical alerts. Multiple visual cues ensure they're noticed even in dense charts. The diamond marker is standard in project management tools (MS Project uses it).

### SNET enforcement
**Recommendation:** Standard approach: `finalES = max(dependencyES, snetDate)`. This is how MS Project and Primavera handle SNET. If the dependency pushes later than SNET, the dependency wins (per user decision). If SNET pushes later than dependency, SNET wins. No toast for this case because it's working as expected.
**Rationale:** This is the universally accepted SNET behavior in project management. It's simple, predictable, and matches user expectations.

### Scheduling driver tooltips
**Recommendation:** Add a line to the existing task hover tooltip showing what's driving the task's date: "Driven by: dependency on [Task X]" or "Driven by: MSO constraint (Feb 15)" or "Driven by: manual dates". This adds high diagnostic value with minimal UI complexity.
**Rationale:** Users need to understand WHY a task is scheduled when it is, especially when constraints and dependencies interact. This tooltip line answers that question without requiring a click.

### Manual mode visual distinction
**Recommendation:** Dashed border on the Gantt bar (CSS `border-dashed`) plus a small pin/lock icon. The dashed border pattern is universally recognized as "different from normal" and doesn't compete with status colors (pending/progress/done). Add "ידני" label in the task list panel next to the title.
**Rationale:** Dashed borders are the standard visual idiom in project management tools for manual tasks (MS Project, GanttProject). It's immediately recognizable and doesn't require a legend to understand.

### Manual mode toggle UX
**Recommendation:** Checkbox toggle in the TaskForm in the "Advanced Scheduling" section. When toggling to manual, auto-populate start_date/end_date from current ES/EF if available. When toggling back to auto, show a confirmation since dates will be recalculated.
**Rationale:** Simple toggle is sufficient. Auto-populating dates prevents the "manual task with no dates" pitfall. Confirmation on switch-back prevents accidental data loss.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Constraints as separate entities | Constraints as task fields | Standard in modern PM tools | Simpler data model, 1:1 relationship means no join overhead |
| Constraints override dependencies | Dependencies win, constraints are soft preferences | User decision for this project | Simpler conflict resolution, more predictable scheduling |
| Only "auto" scheduling | Auto/manual dual mode | Standard in MS Project since 2010+ | Users can pin milestones and external-dependency tasks |

**Deprecated/outdated:**
- There is no deprecated approach here -- this is new functionality being added to the existing engine.

## Integration Points (Codebase-Specific)

### 1. `entities.ts` -- Type additions
Add `ConstraintType`, `SchedulingMode` union types. Add `constraint_type`, `constraint_date`, `scheduling_mode` to `Task` interface. Add these fields to `CreateTaskInput` and update `TaskFormData`.

### 2. `scheduling.ts` -- Engine modifications
- `forwardPass()`: Add manual task skip, add constraint application after dependency ES resolution.
- `backwardPass()`: Add manual task skip (use user dates as LS/LF).
- `calculateSlack()`: Manual tasks may have unusual slack; consider excluding from critical path or computing slack from user dates vs. dependency-driven dates.
- `calculateCriticalPath()`: Return constraint violation info alongside tasks and critical path.

### 3. `tasks.ts` -- Service updates
- `CreateTaskInput` and `UpdateTaskInput`: Add `constraint_type`, `constraint_date`, `scheduling_mode`.
- `batchUpdateTaskCPMFields()`: Conditional logic to skip date overwrite for manual tasks. Also need to persist constraint_type/constraint_date if they change during scheduling.

### 4. `use-scheduling.ts` -- Hook modifications
- After `calculateCriticalPath()`, detect constraint violations and fire toasts.
- The violation detection needs task titles for toast messages, which are already available in the `currentTasks` array.
- For MSO violation detection: need to compare task.es against task.constraint_date and find the driving predecessor.

### 5. `TaskForm.tsx` -- Form additions
- New fields: constraint_type (Select), constraint_date (Input[date]), scheduling_mode (checkbox/toggle).
- Conditional rendering: constraint_date only shows when constraint_type is MSO/SNET/FNLT. Constraint fields hide when scheduling_mode is manual (manual tasks don't use constraints -- they have fixed dates).
- Validation: if constraint_type is MSO/SNET/FNLT, constraint_date is required.
- On manual mode toggle: auto-fill start_date/end_date from current task ES/EF.

### 6. `GanttChart.tsx` -- Visual updates
- Task bars: add constraint indicator icon, manual mode dashed border, FNLT violation red tint.
- Tooltip: add constraint info and scheduling driver.
- Timeline: optional FNLT deadline diamond marker.
- Legend: add manual and constrained entries.

### 7. `page.tsx` -- Dashboard integration
- `handleTaskFormSubmit`: pass new fields (constraint_type, constraint_date, scheduling_mode) to createTask/updateTask.
- Existing recalculate calls don't need modification -- they already pass full task arrays.

### 8. Database migration
- New migration file `007_add_constraints_manual_mode.sql`.
- Three new columns on `tasks` table: `constraint_type`, `constraint_date`, `scheduling_mode`.

## Open Questions

1. **Should ASAP be functionally distinct from null constraint?**
   - What we know: User decided default is "no constraint" (null), and ASAP is a separate selectable type. Functionally both mean "schedule as early as dependencies allow."
   - What's unclear: Should ASAP display differently in the UI than no constraint? Should it have any engine-level distinction?
   - Recommendation: Treat ASAP and null identically in the engine. In the UI, ASAP shows as a selected option in the constraint dropdown while null shows as placeholder text "ללא אילוץ" (no constraint). This gives users explicit control without engine complexity.

2. **Should manual tasks participate in critical path analysis?**
   - What we know: Manual tasks have fixed dates. Their slack (difference between dependency-driven position and actual position) may be meaningless.
   - What's unclear: Whether manual tasks should appear on the critical path.
   - Recommendation: Include manual tasks in critical path analysis. Their user-set dates become fixed points that affect predecessor/successor slack calculations. A manual task with zero slack relative to its successors IS on the critical path.

3. **What happens when a manual task's start_date is in the past?**
   - What we know: Manual tasks preserve user dates. The engine doesn't move them.
   - What's unclear: Should there be any validation or warning for manual tasks with dates in the past?
   - Recommendation: Allow it without warning. Past dates are valid for tracking completed or in-progress work. The task status (pending/in_progress/done) already communicates timeline adherence.

## Sources

### Primary (HIGH confidence)
- **Codebase analysis** - Direct reading of scheduling.ts (827 lines), entities.ts (324 lines), tasks.ts (253 lines), use-scheduling.ts (130 lines), GanttChart.tsx (700 lines), TaskForm.tsx (616 lines), page.tsx (dashboard), DependencyManager.tsx (301 lines)
- **Database schema** - 001_initial_schema.sql (493 lines) defines current tasks table structure
- **Phase 4 research** - 04-RESEARCH.md documents the engine architecture decisions and patterns

### Secondary (MEDIUM confidence)
- **CPM constraint semantics** - Based on established project management theory (PMBOK). MSO, SNET, FNLT are standard constraint types with well-defined semantics. The "dependencies win" behavior is a project-specific decision, not a universal standard (some tools allow constraints to override dependencies).

### Tertiary (LOW confidence)
- None -- all findings are based on direct codebase analysis and established PM theory.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new libraries needed; all components exist in codebase
- Architecture: HIGH - Clear integration points identified through codebase reading; engine modification patterns are straightforward extensions of existing code
- Pitfalls: HIGH - Identified through analysis of current engine behavior and data flow; each pitfall has a concrete prevention strategy
- UI recommendations: MEDIUM - Based on PM tool conventions and current codebase patterns, but final UX is discretionary

**Research date:** 2026-02-16
**Valid until:** Indefinite (codebase-specific findings don't expire; PM theory is stable)
