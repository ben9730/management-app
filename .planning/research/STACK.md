# Technology Stack

**Project:** FlowPlan MS Project-style Scheduling Features
**Researched:** 2026-02-16

## Decision: Extend Existing CPM Engine (Zero New Dependencies)

The existing `SchedulingService` (682 lines) is the right foundation. **Do not adopt an external scheduling library.** Here is why:

### Why NOT Use External Scheduling Libraries

| Library | Why Not |
|---------|---------|
| **Bryntum Gantt** | Commercial license ($3K+/dev), includes its own UI (we have ours), massive bundle size (~2MB), would replace rather than extend existing Gantt |
| **dhtmlx-gantt** | GPL or commercial ($999+), tightly couples scheduling engine to its DOM rendering, cannot extract just the scheduling logic cleanly |
| **MPXJ** (Java/.NET) | Wrong platform entirely. Java/C# library. Would require server-side component, contradicts client-side scheduling decision |
| **ProjectLibre / GanttProject** | Desktop Java apps, not usable as libraries |
| **gantt-task-react** | UI-only library (renders bars), no scheduling engine at all |
| **frappe-gantt** | UI-only, no CPM/scheduling logic, no constraint types |

**Confidence: MEDIUM** (based on training data knowledge of these libraries; unable to verify current versions via WebSearch/WebFetch due to tool restrictions)

### Why Extend the Existing Engine

1. **Already 80% there**: Forward/backward pass, topological sort, calendar awareness, resource scheduling -- all working and tested
2. **Clean architecture**: Stateless service class, immutable patterns (`...spread`), pure functions -- easy to extend
3. **Known codebase**: Team already owns and understands the code
4. **Specific gaps are small**: The missing features (constraint types, negative lag, SS/FF/SF in forward pass, manual mode, progress tracking) are algorithmic additions, not rewrites
5. **Zero new runtime dependencies**: All features can be built with TypeScript alone
6. **Bundle size**: Adding a scheduling library would dwarf the existing ~700 lines of pure logic

## Recommended Stack (Changes Only)

### No New Runtime Dependencies Needed

The existing stack already has everything required:

| Technology | Already Installed | Purpose for New Features |
|------------|------------------|--------------------------|
| TypeScript 5 | Yes (`^5`) | Type-safe constraint types, scheduling mode enums |
| date-fns 4 | Yes (`^4.1.0`) | Date arithmetic helpers (already used for Gantt) |
| TanStack Query 5 | Yes (`^5.90.20`) | Mutation `onSuccess` hooks to trigger recalculation |
| Zod 4 | Yes (`^4.3.6`) | Validation for constraint type inputs, lag/lead values |
| Vitest 4 | Yes (dev, `^4.0.18`) | TDD for scheduling algorithm extensions |

### What Changes in Existing Code

| Component | Change Type | Rationale |
|-----------|-------------|-----------|
| `entities.ts` | **Extend** | Add constraint types, scheduling mode, percent_complete to Task type |
| `scheduling.ts` | **Extend** | Add constraint-aware scheduling, negative lag, SS/FF/SF forward pass |
| `use-tasks.ts` | **Extend** | Wire mutation `onSuccess` to trigger recalculation cascade |
| `dependencies` table | **Migrate** | Allow negative `lag_days` (lead time) |
| `tasks` table | **Migrate** | Add `constraint_type`, `constraint_date`, `scheduling_mode`, `percent_complete` columns |

### New Files to Create

| File | Purpose |
|------|---------|
| `services/scheduling-constraints.ts` | Constraint type resolution logic (ASAP, ALAP, MSO, MFO, SNET, SNLT, FNET, FNLT) |
| `services/scheduling-cascade.ts` | Auto-cascading recalculation orchestrator |
| `hooks/use-scheduling.ts` | Hook that wires TanStack Query mutations to scheduling recalculation |

## Detailed Technical Decisions

### 1. Constraint Types (No Library Needed)

**Confidence: HIGH** (well-documented MS Project scheduling theory, algorithmic implementation)

MS Project defines 8 constraint types. These are pure date-math operations that modify how the forward/backward pass calculates ES/LS:

```typescript
// New type in entities.ts
export type TaskConstraintType =
  | 'ASAP'  // As Soon As Possible (default for auto-forward scheduling)
  | 'ALAP'  // As Late As Possible (default for auto-backward scheduling)
  | 'MSO'   // Must Start On (hard constraint)
  | 'MFO'   // Must Finish On (hard constraint)
  | 'SNET'  // Start No Earlier Than (soft constraint)
  | 'SNLT'  // Start No Later Than (soft constraint)
  | 'FNET'  // Finish No Earlier Than (soft constraint)
  | 'FNLT'  // Finish No Later Than (soft constraint)

export type TaskSchedulingMode = 'auto' | 'manual'
```

Implementation in the forward pass is a matter of clamping/overriding the calculated ES/EF based on the constraint. This is ~50-80 lines of logic added to the existing `forwardPass` method.

### 2. Lead/Lag (Schema Change Only)

**Confidence: HIGH** (existing code already handles positive lag)

The existing `lag_days` column is `INTEGER DEFAULT 0`. The current code already handles `lag_days > 0` correctly in both forward and backward pass. For lead time (negative lag):

- **Schema**: Remove the implicit non-negative assumption. The `INTEGER` type already supports negative values -- no column change needed, just validation change.
- **Code**: Existing `addWorkingDays` with negative lag effectively becomes `subtractWorkingDays`. One conditional branch addition (~10 lines).
- **Validation**: Update Zod schema to allow negative values with clear UI labeling ("Lead" for negative, "Lag" for positive).

### 3. SS/FF/SF Dependency Types in Forward Pass

**Confidence: HIGH** (the schema and types already define these; only the algorithm needs updating)

The existing forward pass only implements FS (Finish-to-Start) logic:

```typescript
// Current: Only FS logic
let candidateDate = this.addDays(predTask.ef, 1)  // Always uses EF
```

For SS/FF/SF, the forward pass needs to compute the candidate date differently:

| Type | Candidate ES for Successor |
|------|---------------------------|
| FS | predecessor.EF + 1 + lag |
| SS | predecessor.ES + lag |
| FF | predecessor.EF + lag - successor.duration + 1 |
| SF | predecessor.ES + lag - successor.duration + 1 |

This is a `switch` statement replacing the single-line FS logic. ~30 lines of new code in `forwardPass`, ~30 in `backwardPass`.

### 4. Manual Scheduling Mode

**Confidence: HIGH** (straightforward skip-logic)

Tasks with `scheduling_mode = 'manual'` are excluded from auto-scheduling:
- They keep their user-set `start_date` and `end_date`
- They are still included in the dependency graph (successors of manual tasks use the manual task's dates)
- They do NOT get their ES/EF/LS/LF overwritten by the scheduling engine
- ~15 lines: a conditional `continue` in the forward/backward pass loops

### 5. Percent Complete / Progress Tracking

**Confidence: HIGH** (simple data field + display logic)

- Add `percent_complete INTEGER DEFAULT 0 CHECK (percent_complete BETWEEN 0 AND 100)` to tasks table
- Display as a progress fill inside the Gantt bar (CSS width percentage)
- Calculate remaining duration: `remaining_duration = duration * (1 - percent_complete / 100)`
- For recalculation of in-progress tasks: use `remaining_duration` from current date forward

### 6. Auto-Cascading via TanStack Query (Key Integration Pattern)

**Confidence: HIGH** (uses existing TanStack Query patterns already in the codebase)

The critical missing piece is wiring the scheduling engine to React Query mutations. The pattern:

```typescript
// hooks/use-scheduling.ts
export function useSchedulingCascade(projectId: string) {
  const queryClient = useQueryClient()
  const { data: tasks } = useTasks(projectId)
  const { data: dependencies } = useDependencies(projectId)
  const { data: project } = useProject(projectId)

  const recalculate = useCallback(() => {
    if (!tasks || !dependencies || !project) return

    const autoTasks = tasks.filter(t => t.scheduling_mode !== 'manual')
    const result = schedulingService.calculateCriticalPath(
      tasks, dependencies, projectStart, workDays, holidays
    )

    // Batch update the cache optimistically
    queryClient.setQueryData(taskKeys.list(projectId), result.tasks)

    // Persist to Supabase (debounced batch update)
    persistSchedulingResults(result.tasks)
  }, [tasks, dependencies, project])

  return { recalculate }
}
```

Then in existing mutation hooks:

```typescript
// In useUpdateTask, useCreateDependency, etc.
onSuccess: (data) => {
  // ...existing cache invalidation...
  // Trigger recalculation
  recalculate()
}
```

**Key design choice**: Optimistic cache update first (instant UI), then async Supabase persist. This keeps the UI responsive.

## Database Migration Required

```sql
-- Migration: 007_add_scheduling_features.sql

-- Add constraint and scheduling fields to tasks
ALTER TABLE tasks
  ADD COLUMN constraint_type TEXT DEFAULT 'ASAP'
    CHECK (constraint_type IN ('ASAP', 'ALAP', 'MSO', 'MFO', 'SNET', 'SNLT', 'FNET', 'FNLT')),
  ADD COLUMN constraint_date DATE,
  ADD COLUMN scheduling_mode TEXT DEFAULT 'auto'
    CHECK (scheduling_mode IN ('auto', 'manual')),
  ADD COLUMN percent_complete INTEGER DEFAULT 0
    CHECK (percent_complete >= 0 AND percent_complete <= 100);

-- Create indexes for new fields
CREATE INDEX IF NOT EXISTS idx_tasks_scheduling_mode ON tasks(scheduling_mode);
CREATE INDEX IF NOT EXISTS idx_tasks_constraint_type ON tasks(constraint_type);

-- Note: lag_days column already supports negative values (INTEGER type)
-- Just need to update application-level validation to allow negative
```

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Scheduling engine | Extend existing `SchedulingService` | Bryntum Gantt engine | Commercial license ($3K+/dev), massive bundle, replaces our custom Gantt UI |
| Scheduling engine | Extend existing `SchedulingService` | dhtmlx-gantt | GPL/commercial, tightly couples engine to its own DOM rendering |
| Scheduling engine | Extend existing `SchedulingService` | Build from scratch | Wasteful -- existing engine is solid, well-tested, and 80% complete |
| Cascade trigger | TanStack Query `onSuccess` | Supabase Edge Function | Contradicts client-side scheduling decision; adds latency; harder to debug |
| Cascade trigger | TanStack Query `onSuccess` | Supabase DB trigger | Can't run CPM algorithm in PostgreSQL PL/pgSQL; wrong layer for complex scheduling logic |
| Progress display | CSS width% in existing Gantt bar | New progress overlay library | Over-engineering; 3 lines of CSS |
| Date math | Extend existing methods + date-fns | Luxon / Moment.js | date-fns already installed, tree-shakeable, lighter |

## What NOT to Add

| Library/Tool | Why Skip |
|--------------|----------|
| **Any Gantt UI library** | We have a working custom Gantt component. MS Project scheduling features are engine-level, not UI-level |
| **Web Workers for scheduling** | Premature optimization. CPM on 500 tasks takes <10ms. Only consider if projects exceed 5,000+ tasks |
| **Event bus / pub-sub library** | TanStack Query's cache invalidation already serves as the reactive layer |
| **State management (Zustand/Jotai)** | TanStack Query is already the state layer. Adding another creates confusion |
| **Server-side scheduling** | Decision already made for client-side. Don't reverse it |

## Installation

```bash
# No new packages to install.
# All features build on the existing stack.
```

## Estimated Code Changes

| File | Lines Added | Lines Modified | Complexity |
|------|-------------|----------------|------------|
| `entities.ts` | ~20 | ~5 | Low |
| `scheduling.ts` | ~200 | ~60 | Medium-High |
| `scheduling-constraints.ts` (new) | ~120 | 0 | Medium |
| `scheduling-cascade.ts` (new) | ~80 | 0 | Medium |
| `hooks/use-scheduling.ts` (new) | ~100 | 0 | Medium |
| `hooks/use-tasks.ts` | ~5 | ~10 | Low |
| `hooks/use-dependencies.ts` | ~5 | ~10 | Low |
| `007_migration.sql` (new) | ~15 | 0 | Low |
| Tests | ~400 | ~50 | Medium |
| **Total** | **~945** | **~135** | |

## Sources

- Existing codebase analysis (HIGH confidence -- direct code examination)
- MS Project scheduling algorithm theory: well-documented CPM/constraint type semantics (HIGH confidence -- established project management theory)
- Library ecosystem assessment (MEDIUM confidence -- based on training data, could not verify current versions/features via web search)

## Confidence Assessment

| Decision | Confidence | Reason |
|----------|------------|--------|
| Extend existing engine (don't adopt library) | HIGH | Codebase analysis shows engine is 80% complete; gaps are algorithmic, not architectural |
| Constraint type implementation approach | HIGH | Standard CPM theory; well-documented algorithm |
| TanStack Query cascade pattern | HIGH | Consistent with existing codebase patterns; verified in use-tasks.ts and use-dependencies.ts |
| No new runtime dependencies | HIGH | All features are pure TypeScript scheduling logic |
| Library alternatives assessment | MEDIUM | Based on training data; unable to verify current pricing/features of Bryntum, dhtmlx |
| Database migration approach | HIGH | Direct schema examination confirms compatibility |
