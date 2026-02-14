# Phase 2: Lock Enforcement UI - Research

**Researched:** 2026-02-14
**Domain:** React component UI patterns -- visual lock indicators, interaction blocking, progress display
**Confidence:** HIGH

## Summary

Phase 2 is a UI-only phase that wires Phase 1's `computePhaseLockStatus` service and `usePhaseLockStatus` hook into the existing `PhaseSection` and `TaskCard` components. The work involves three concerns: (1) showing a lock icon on locked phases, (2) disabling all interactive controls within locked phases, and (3) displaying task completion progress as "X/Y tasks complete" in each phase header.

The entire implementation stays within the existing stack (React 19, Tailwind CSS 4, lucide-react icons). No new dependencies are needed. The existing `PhaseSection` component already has a progress bar using `total_tasks`/`completed_tasks` from the database, but the prior decision says to **derive counts from the tasks array** for immediate accuracy. The `page.tsx` is 1,238 lines, so new logic should be extracted into composable hooks/components rather than added inline.

**Primary recommendation:** Add `isLocked` and `lockInfo` props to `PhaseSection`, conditionally render a `Lock` icon and apply `pointer-events-none` + `aria-disabled` overlay on locked phase content, and derive progress counts from the `tasks` prop array instead of database columns.

## Standard Stack

### Core (already installed -- no new packages)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19.2.3 | UI framework | Project standard |
| lucide-react | ^0.563.0 | Icon library (Lock, LockOpen, CheckCircle2 icons) | Already used throughout codebase |
| Tailwind CSS | ^4 | Styling (opacity, pointer-events, cursor classes) | Project standard |
| Vitest | ^4.0.18 | Unit/component testing | Project standard |
| @testing-library/react | ^16.3.2 | Component test rendering | Project standard |

### Supporting (already installed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| clsx + tailwind-merge | 2.1.1 / 3.4.0 | Conditional class composition via `cn()` | All conditional styling |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| CSS pointer-events-none | JavaScript event.preventDefault() in every handler | pointer-events-none is simpler, covers all interactions, no handler changes needed |
| Inline lock logic in page.tsx | New props on PhaseSection | Props keep page.tsx cleaner, aligns with prior decision to extract |
| Lock overlay div | Per-button disabled states | Overlay is simpler and catches all interactive elements uniformly |

**Installation:**
```bash
# No new packages needed -- everything is already installed
```

## Architecture Patterns

### Recommended Component Changes
```
src/
  components/
    phases/
      PhaseSection.tsx     # ADD: isLocked, lockInfo props; Lock icon; disabled overlay
      PhaseSection.test.tsx # ADD: locked state tests
    tasks/
      TaskCard.tsx          # ADD: disabled prop; visual disabled state
      TaskCard.test.tsx     # ADD: disabled state tests (NEW FILE)
  hooks/
    use-phase-lock-status.ts  # EXISTS: no changes needed
  app/
    page.tsx               # MODIFY: wire usePhaseLockStatus into PhaseSection rendering
```

### Pattern 1: Prop-Driven Lock State
**What:** Pass `isLocked` boolean and optional `lockInfo` to PhaseSection, let it handle all visual/interaction changes internally.
**When to use:** When parent has computed lock state and child renders accordingly.
**Example:**
```typescript
// In page.tsx -- wire lock status to PhaseSection
import { usePhaseLockStatus } from '@/hooks/use-phase-lock-status'

// Inside DashboardContent:
const { isLocked, getLockInfo } = usePhaseLockStatus(projectId)

// In the phases.map():
<PhaseSection
  key={phase.id}
  phase={phaseWithStatus}
  tasks={getTasksForPhase(phase.id)}
  isLocked={isLocked(phase.id)}
  lockInfo={getLockInfo(phase.id)}
  // ... other existing props
/>
```

### Pattern 2: CSS-Based Interaction Blocking
**What:** Use a combination of `pointer-events-none`, `opacity`, and `aria-disabled` to block interaction on locked phases.
**When to use:** When you need to disable an entire section of interactive elements without modifying each child.
**Example:**
```typescript
// In PhaseSection.tsx -- content area wrapper
<div
  className={cn(
    'divide-y divide-slate-100 dark:divide-slate-800',
    isLocked && 'pointer-events-none opacity-50'
  )}
  aria-disabled={isLocked}
>
  {/* TaskCards rendered here -- all interactions blocked */}
</div>
```

### Pattern 3: Derived Progress from Tasks Array
**What:** Compute completed/total from the `tasks` prop, not from database columns (`total_tasks`/`completed_tasks`).
**When to use:** Always for Phase 2 -- prior decision says to derive from tasks array for immediate accuracy.
**Example:**
```typescript
// In PhaseSection.tsx
const totalTasks = tasks.length
const completedTasks = tasks.filter(t => t.status === 'done').length
```

### Pattern 4: Guard Interactive Callbacks in page.tsx
**What:** In addition to CSS blocking, guard the `onAddTask`, `onTaskClick`, `onEditPhase`, and `onTaskStatusChange` callbacks in page.tsx to not open modals for locked phases.
**When to use:** As a defense-in-depth measure. CSS pointer-events-none handles 99% of cases, but programmatic guards prevent edge cases (keyboard navigation, screen readers).
**Example:**
```typescript
// In page.tsx
onAddTask={() => {
  if (!isLocked(phase.id)) {
    handleAddTask(phase.id)
  }
}}
onTaskStatusChange={(taskId, newStatus) => {
  if (!isLocked(phase.id)) {
    handleTaskStatusChange(taskId, newStatus)
  }
}}
```

### Anti-Patterns to Avoid
- **Modifying every individual handler:** Do NOT add `if (isLocked) return` to each handler in TaskCard. Use CSS-level blocking on the parent instead.
- **Storing lock state in component state:** Do NOT `useState(false)` for lock status. It's already derived via `usePhaseLockStatus` which uses `useMemo` over React Query data.
- **Adding lock status to the database:** Do NOT create a `is_locked` column. Lock status is a derived computation, not persisted state.
- **Hiding locked phases entirely:** Do NOT hide locked phases. Users need to see what's coming. Show them but disable interaction.
- **Blocking the header accordion toggle:** Do NOT prevent expanding/collapsing locked phases. Users should still be able to view tasks, just not interact with them.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Lock icon | Custom SVG | `Lock` from lucide-react | Already in the icon library the project uses |
| Unlock icon | Custom SVG | `LockOpen` from lucide-react | Consistent with project icon usage |
| Disabled state styling | Custom CSS classes | Tailwind `pointer-events-none opacity-50 cursor-not-allowed` | Standard Tailwind utilities |
| Progress calculation | Database-computed columns | `tasks.filter(t => t.status === 'done').length` | Prior decision: derive from tasks array |
| Lock status computation | New service | `usePhaseLockStatus` hook from Phase 1 | Already built and tested |
| Tooltip for lock reason | Custom tooltip component | HTML `title` attribute | Simple, accessible, no extra library needed for v1 |

**Key insight:** Phase 1 already built all the logic. Phase 2 is purely about wiring that logic into the visual layer. No new services, hooks, or libraries are needed.

## Common Pitfalls

### Pitfall 1: Forgetting to Block the "Add Task" Button in Phase Header
**What goes wrong:** The "Add Task" (+) button in the PhaseSection header sits OUTSIDE the collapsible content area. If you only apply `pointer-events-none` to the task list, the header buttons remain clickable.
**Why it happens:** The header and content are sibling divs in PhaseSection.
**How to avoid:** Either (a) pass `isLocked` and conditionally disable header buttons individually, or (b) apply `pointer-events-none` to the add-task and edit-phase buttons when locked while keeping the accordion toggle clickable.
**Warning signs:** User can click "+" to add a task to a locked phase.

### Pitfall 2: PhaseSection Test Expectations vs Actual Implementation
**What goes wrong:** The existing `PhaseSection.test.tsx` has expectations that DON'T match the current `PhaseSection.tsx` implementation. For example, tests expect `data-testid="phase-progress-bar"`, `data-testid="add-task-button"`, `data-testid="collapse-indicator"`, `role="region"`, `aria-expanded`, Hebrew status text like `'Active'` vs `'פעיל'`, and class names like `'bg-gray-100'` and `'text-gray-900'`. The actual component uses different markup.
**Why it happens:** Tests were written TDD-first but the component implementation diverged.
**How to avoid:** When modifying PhaseSection, update tests to match the ACTUAL component structure. Run tests to confirm current pass/fail state BEFORE making changes.
**Warning signs:** Tests fail before you've even changed anything.

### Pitfall 3: Progress Display Dual Source
**What goes wrong:** PhaseSection currently reads progress from `phase.total_tasks`/`phase.completed_tasks` (database columns). Phase 2 needs to derive from the `tasks` array prop. If both are used simultaneously, progress numbers can be inconsistent.
**Why it happens:** The existing implementation uses database-sourced counts; the new requirement uses task-array-derived counts.
**How to avoid:** Replace the database-column progress calculation with task-array-based calculation. Remove or ignore `total_tasks`/`completed_tasks` from the progress display logic.
**Warning signs:** Progress shows "3/5" but only 2 out of 4 tasks are actually visible and done.

### Pitfall 4: Keyboard Navigation Bypassing pointer-events-none
**What goes wrong:** `pointer-events-none` only blocks mouse/touch events. Users who Tab-navigate can still focus and activate buttons inside a locked phase.
**Why it happens:** CSS pointer-events doesn't affect keyboard focus.
**How to avoid:** Add `tabIndex={-1}` to the locked content wrapper, or set `aria-disabled="true"` combined with `tabIndex={-1}` on interactive elements. Alternatively, pass a `disabled` prop to TaskCard to set `tabIndex={-1}` on its interactive elements.
**Warning signs:** Screen reader users or keyboard-only users can still toggle task status in locked phases.

### Pitfall 5: page.tsx Bloat
**What goes wrong:** Adding lock-related logic directly to page.tsx (already 1,238 lines) makes it even harder to maintain.
**Why it happens:** The natural place to add `usePhaseLockStatus` call is in DashboardContent.
**How to avoid:** The hook call itself is small (1 line + destructuring). Keep it in page.tsx but ensure all visual logic stays in PhaseSection. Do NOT add conditional rendering logic for locks in page.tsx beyond passing props.
**Warning signs:** Adding more than ~10 lines to page.tsx for lock enforcement.

### Pitfall 6: RTL Layout and Lock Icon Placement
**What goes wrong:** The app is RTL (Hebrew). Icons placed at "left" in code appear on the right visually. A lock icon positioned with wrong directional assumptions looks misplaced.
**Why it happens:** RTL flips horizontal positioning.
**How to avoid:** Use `gap` and `flex` instead of directional margins. Place the lock icon adjacent to the phase name using `flex items-center gap-2`, which works correctly in both LTR and RTL.
**Warning signs:** Lock icon appears on the wrong side of the phase name, or overlaps other elements.

## Code Examples

Verified patterns from the existing codebase:

### Lock Icon Import and Usage
```typescript
// Import from lucide-react (already a project dependency)
import { Lock, LockOpen } from 'lucide-react'

// Usage in phase header, next to phase name
<h3 className="font-bold text-lg flex items-center gap-3 text-foreground">
  {isLocked && (
    <Lock className="w-4 h-4 text-slate-400" aria-hidden="true" />
  )}
  {(phase.phase_order ?? 0) + 1}. {phase.name}
  {/* existing badge */}
</h3>
```

### PhaseSection Props Extension
```typescript
// New props to add to PhaseSectionProps interface
export interface PhaseSectionProps {
  // ... existing props ...
  /** Whether this phase is locked (blocked by incomplete previous phase) */
  isLocked?: boolean
  /** Lock info with blocking reason -- for tooltip */
  lockInfo?: PhaseLockInfo | null
}
```

### Disabled Header Buttons Pattern
```typescript
// In PhaseSection header -- disable add task and edit phase when locked
<button
  onClick={handleEditPhase}
  disabled={isLocked}
  className={cn(
    "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2 rounded-lg transition-colors",
    isLocked && "opacity-50 cursor-not-allowed"
  )}
  title={isLocked ? `חסום - יש להשלים את "${lockInfo?.blockedByPhaseName}" קודם` : "ערוך שלב"}
>
  <Edit2 className="w-4 h-4" />
</button>
```

### Task Completion Progress Display
```typescript
// Derive from tasks array, display as "X/Y complete"
const completedCount = tasks.filter(t => t.status === 'done').length
const totalCount = tasks.length

// In the header, replace or augment the existing progress bar
<div className="flex items-center gap-2">
  <span className="text-xs font-bold text-foreground">
    {completedCount}/{totalCount}
  </span>
  <span className="text-[10px] text-slate-400">משימות הושלמו</span>
</div>
```

### Wiring in page.tsx (Minimal Change)
```typescript
// Add import
import { usePhaseLockStatus } from '@/hooks/use-phase-lock-status'

// Inside DashboardContent, after existing hooks:
const { isLocked, getLockInfo } = usePhaseLockStatus(projectId)

// In phases.map() -- add 2 props:
<PhaseSection
  key={phase.id}
  phase={phaseWithStatus}
  tasks={getTasksForPhase(phase.id)}
  isLocked={isLocked(phase.id)}
  lockInfo={getLockInfo(phase.id)}
  taskAssignees={taskAssignees}
  onTaskClick={setSelectedTask}
  onTaskStatusChange={handleTaskStatusChange}
  onAddTask={() => handleAddTask(phase.id)}
  onEditPhase={handleEditPhase}
/>
```

### Test Pattern for Locked Phase
```typescript
// Using existing test infrastructure
import { Lock } from 'lucide-react'

it('shows lock icon when phase is locked', () => {
  render(
    <PhaseSection
      phase={mockPhase}
      tasks={mockTasks}
      isLocked={true}
      lockInfo={{
        phaseId: mockPhase.id,
        isLocked: true,
        reason: 'previous_phase_incomplete',
        blockedByPhaseId: 'prev-phase-id',
        blockedByPhaseName: 'Previous Phase',
      }}
    />
  )
  expect(screen.getByTestId('lock-indicator')).toBeInTheDocument()
})

it('disables add task button when locked', () => {
  const handleAddTask = vi.fn()
  render(
    <PhaseSection
      phase={mockPhase}
      tasks={mockTasks}
      isLocked={true}
      onAddTask={handleAddTask}
    />
  )
  const addButton = screen.getByTestId('add-task-button')
  expect(addButton).toBeDisabled()
  fireEvent.click(addButton)
  expect(handleAddTask).not.toHaveBeenCalled()
})

it('prevents task status changes when locked', () => {
  const handleStatusChange = vi.fn()
  render(
    <PhaseSection
      phase={mockPhase}
      tasks={mockTasks}
      isLocked={true}
      onTaskStatusChange={handleStatusChange}
    />
  )
  // Content area should have pointer-events-none
  const content = screen.getByTestId('phase-content')
  expect(content).toHaveClass('pointer-events-none')
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Database-stored lock status | Derived from task completion state | Phase 1 (2026-02-12) | Lock status always accurate, no stale data |
| Phase progress from DB columns | Phase progress from tasks array | Phase 2 (this phase) | Consistent with lock computation source |

**Deprecated/outdated:**
- `phase.total_tasks` / `phase.completed_tasks` for progress display: These database columns may be stale. Use `tasks.filter()` instead, per prior decision.

## Open Questions

1. **Should the task detail sidebar also block editing for locked phase tasks?**
   - What we know: The sidebar (`selectedTask` in page.tsx) shows "Edit Task" and "Delete Task" buttons. If a user clicked a task in a locked phase BEFORE it became locked (or if sidebar was already open), these buttons would still be active.
   - What's unclear: Whether to also disable sidebar actions for locked-phase tasks.
   - Recommendation: YES -- add lock check to sidebar edit/delete buttons. This is a 2-line change in page.tsx and prevents an edge case. Include in Plan 02-01.

2. **Should the "New Task" button in the main toolbar be aware of lock status?**
   - What we know: The top-level "New Task" button defaults to adding tasks to the first phase (`phases[0]?.id`). If phases[0] is locked (shouldn't happen -- first is always unlocked), this could be an issue.
   - What's unclear: Whether this button should check if the target phase is locked.
   - Recommendation: LOW PRIORITY -- first phase is always unlocked by definition. Skip for Phase 2.

## Sources

### Primary (HIGH confidence)
- **Existing codebase** -- `src/services/phase-lock.ts`, `src/hooks/use-phase-lock-status.ts`, `src/components/phases/PhaseSection.tsx`, `src/components/tasks/TaskCard.tsx`, `src/app/page.tsx` -- direct code review
- **Existing types** -- `src/types/entities.ts` (PhaseLockInfo interface) -- direct code review
- **lucide-react icons** -- [Lock icon](https://lucide.dev/icons/lock), [LockOpen icon](https://lucide.dev/icons/lock-open) -- verified available in lucide-react

### Secondary (MEDIUM confidence)
- **Tailwind CSS pointer-events-none** -- standard utility, verified in Tailwind CSS 4 docs
- **aria-disabled pattern** -- WAI-ARIA standard for indicating disabled state on non-form elements

### Tertiary (LOW confidence)
- None -- all findings verified against codebase or official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- everything is already installed, no new packages
- Architecture: HIGH -- based on direct code review of existing component structure
- Pitfalls: HIGH -- identified through direct comparison of test expectations vs actual implementation
- Code examples: HIGH -- patterns derived from actual codebase code

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days -- stable domain, no external dependencies changing)
