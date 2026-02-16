# Project Research Summary

**Project:** FlowPlan MS Project-Style Scheduling Features (v1.1 milestone)
**Domain:** Auto-cascading CPM scheduling for Hebrew-language project management web app
**Researched:** 2026-02-16
**Confidence:** HIGH

## Executive Summary

FlowPlan already has a fully functional CPM scheduling engine (SchedulingService, 682 lines) that is **completely disconnected from the UI**. The engine calculates forward/backward passes, critical path, and slack correctly for Finish-to-Start (FS) dependencies, but it is never called from UI mutations. The fundamental challenge of this milestone is not building a scheduler — it's wiring the existing one to React Query mutations and extending it to handle all dependency types (SS/FF/SF currently broken), constraint types, and progress tracking.

The research identifies **zero new runtime dependencies needed**. All features build on the existing Next.js 16, React 19, TanStack Query 5, TypeScript 5 stack. The recommended approach is to create a `useScheduling` hook that orchestrates the scheduling pipeline: trigger on mutations → fetch fresh data → run CPM → batch-update changed tasks → invalidate cache. The most critical risk is **infinite cascade loops** (scheduling updates tasks → invalidates cache → triggers re-render → triggers scheduling again). This is prevented through deliberate one-shot scheduling mutations, batched writes, and single invalidation after completion.

The second major risk is performance: the naive approach writes ALL tasks after every schedule (200 DB writes for a 200-task project), when only 5-15 tasks actually changed. The solution is diffing scheduled results against current state and only persisting changes. With these patterns, the existing engine extends cleanly to support MS Project-style auto-cascading, constraints (ASAP/SNET/MSO/FNLT), manual scheduling mode, and percent-complete progress tracking.

## Key Findings

### Recommended Stack

**No new dependencies required.** The existing stack provides everything needed:

**Core technologies:**
- **TypeScript 5** — Type-safe constraint types (ASAP/SNET/MSO/FNLT), scheduling mode enums (auto/manual), percent_complete validation
- **TanStack Query 5** — Already installed. Mutation `onSuccess` hooks trigger recalculation. Optimistic updates for hybrid responsiveness (single-task immediate, full CPM on success)
- **date-fns 4** — Already installed. Used for calendar-aware date arithmetic in existing scheduling engine
- **Existing SchedulingService** — 80% complete. Extend with constraint types, SS/FF/SF dependency logic, negative lag support. Do NOT adopt external library (Bryntum/dhtmlx are $3K+, massive bundle size, replace rather than extend)

**What changes:**
- `scheduling.ts` — Extend forward/backward pass for all dependency types, add constraint application post-CPM (~200 lines added, ~60 modified)
- `entities.ts` — Add constraint_type, constraint_date, scheduling_mode, percent_complete, actual_start, actual_finish to Task type
- Database — 6 new columns on tasks table (no new tables)

**Estimated total code:** ~945 lines added, ~135 modified across 8 files + tests.

### Expected Features

**Must have (table stakes):**
- **Auto-cascading scheduling** — When predecessor dates change, all successors recalculate instantly. Without this, dependencies are decorative arrows. THE key deliverable.
- **SS/FF/SF dependency types** — Schema allows these but engine treats all as FS (broken). Must fix before cascading is useful.
- **Lead time (negative lag)** — Real schedules need overlap. Current `addWorkingDays` silently blocks negative values.
- **Percent complete + progress tracking** — Every PM tool has this. 0-100%, auto-record actual_start/actual_finish, calculate remaining duration.

**Should have (competitive):**
- **Constraint types** (ASAP, SNET, MSO, FNLT) — MS Project-style scheduling constraints for fixed dates and deadlines. Power feature that sets FlowPlan apart.
- **Manual scheduling mode** — Per-task toggle: auto (CPM-driven) vs manual (user-pinned dates). Escape hatch for tasks with external dependencies.
- **Scheduling conflict detection** — Visual warnings when constraints create impossible schedules (MSO before predecessor finishes). Prevents silent data loss.
- **Gantt progress visualization** — Progress bar overlay on task bars showing completed portion. Low effort, high UX value.

**Defer (v2+):**
- Resource leveling (heuristic, NP-hard, confusing even in MS Project)
- Effort-driven scheduling (adding resources reduces duration — rarely useful)
- ALAP constraints (requires backward-scheduled projects from end date)
- Gantt drag-to-reschedule (massive UI effort with RTL, constraints)
- Cascade preview / dry run (high complexity, nice-to-have)

### Architecture Approach

**Pattern: Composition over modification.** Create scheduling-aware mutation wrappers (`useScheduledUpdateTask`) that compose on top of existing hooks (`useUpdateTask`). This preserves backward compatibility for non-scheduling consumers.

**Major components:**
1. **SchedulingService (existing)** — Pure CPM calculation. Extend with `applyConstraints()` method, SS/FF/SF support in forward/backward pass, negative lag handling. Keep stateless/pure.
2. **useScheduling hook (new)** — Orchestrates scheduling pipeline: fetch fresh tasks/dependencies → filter manual tasks → run CPM → apply constraints → diff results → batch-update changed tasks → invalidate cache. Returns `recalculate()` function.
3. **useScheduledUpdateTask / useScheduledCreateDependency (new)** — Mutation wrappers that trigger `recalculate()` in `onSuccess`. Optimistic update for single edited task in `onMutate`, full scheduled results on success.
4. **Batch update RPC (new)** — Supabase function for writing N scheduled tasks in one transaction. Prevents the "write-all-tasks" performance trap (200 individual UPDATEs → 1 RPC call).

**Data flow:**
```
User edits task → Optimistic cache update (immediate UI)
                → Supabase UPDATE (persist edit)
                → onSuccess callback
                → useScheduling.recalculate()
                    → Fetch fresh tasks/deps
                    → Run CPM (forward + backward pass)
                    → Apply constraints
                    → Diff results (only changed tasks)
                    → Batch update DB (5-15 writes, not 200)
                    → Invalidate cache
                → React Query re-fetches
                → Gantt re-renders with cascaded dates
```

**Hybrid optimistic updates:** Single-task optimistic (instant feedback) + full CPM asynchronous (100-300ms for typical projects). Avoids race conditions from running full scheduling in `onMutate`.

**Constraint application is post-CPM:** Run standard forward/backward pass first (dependency-based dates), then apply constraints as a second pass. Constraints shift dates, conflicts surfaced as warnings (not silently resolved).

### Critical Pitfalls

1. **Infinite cascade loop** — Scheduling updates tasks → triggers invalidation → triggers re-render → triggers scheduling again → browser freezes. **Avoid:** Deliberate one-shot scheduling mutations (not reactive `useEffect`). Batch ALL writes, single invalidation after completion. Never schedule inside an effect watching task data.

2. **Write-all-tasks performance trap** — Changing 1 task duration recalculates entire project (all 200 tasks), then writes all 200 to DB even though only 5 successors changed. **Avoid:** Diff scheduled results against current state, only persist tasks where es/ef/ls/lf/slack/is_critical actually changed. Use Supabase RPC for batch writes (1 call, not 200).

3. **Negative lag silently ignored** — Existing `addWorkingDays()` has guard `if (daysToAdd <= 0) return startDate`. Lead time (negative lag) requires `subtractWorkingDays()` logic. **Avoid:** Extend forward/backward pass to handle `lag_days < 0` explicitly with date subtraction.

4. **SS/FF/SF treated as FS** — Current forward pass line 248-255 uses `predTask.ef` for ALL dependency types. SS should use `predTask.es`, FF/SF need backward calculation from EF. **Avoid:** Add `switch(dep.type)` logic to compute correct reference date per type. Test all 8 combinations (4 types × pos/neg lag).

5. **Manual mode overwrites user dates** — Without `scheduling_mode` column, CPM overwrites user-pinned dates. **Avoid:** Add `scheduling_mode` to schema, skip manual tasks in forward/backward pass (but include their dates as facts for successors).

## Implications for Roadmap

Based on research, recommended 4-phase build order:

### Phase 1: Wire Existing CPM to UI (Foundation)
**Rationale:** The engine works but is completely disconnected from mutations. Everything else builds on this. Without auto-cascading working, constraints and progress tracking are meaningless.

**Delivers:**
- `useScheduling` hook that orchestrates the scheduling pipeline
- `useScheduledUpdateTask` / `useScheduledCreateDependency` wrappers
- CPM fields (es, ef, ls, lf, slack, is_critical) written by scheduler after every mutation
- Dependencies rendered on GanttChart (currently rendered with `dependencies={[]}`)
- Batch update RPC for performance
- Diff logic (only write changed tasks)

**Addresses features:**
- Auto-cascading (table stakes #1)

**Avoids pitfalls:**
- Infinite cascade loop (pitfall #1) — solved via architecture
- Write-all-tasks trap (pitfall #2) — solved via diff + batch RPC
- Optimistic update races (pitfall #2) — solved via hybrid strategy

**Research needed:** No — integration pattern is clear from codebase analysis.

---

### Phase 2: Fix Dependency Types + Lead/Lag
**Rationale:** Dependencies are fundamental to scheduling. SS/FF/SF are currently broken (engine treats all as FS). Must be correct before building constraints on top. Lead time is a minor extension but critical for real-world schedules.

**Delivers:**
- Extended `forwardPass` to handle SS/FF/SF correctly (`switch` on dep.type)
- Extended `backwardPass` symmetrically
- Negative lag (lead time) support in both passes
- GanttChart renders different dependency arrow types visually
- Comprehensive tests for all 8 combinations (4 types × pos/neg lag)

**Addresses features:**
- SS/FF/SF dependency types (table stakes #2)
- Lead time / negative lag (table stakes #3)

**Avoids pitfalls:**
- SS/FF/SF treated as FS (pitfall #4) — direct fix
- Negative lag silently ignored (pitfall #3) — direct fix
- SS/FF/SF with lag edge cases (pitfall #8) — comprehensive testing

**Research needed:** No — CPM theory for dependency types is well-established.

---

### Phase 3: Constraints + Manual Mode
**Rationale:** Constraints refine scheduling behavior (power features). They require the foundation (Phase 1) and correct dependencies (Phase 2) to work properly. Manual mode is an escape hatch for tasks with external dependencies.

**Delivers:**
- Schema migration: constraint_type, constraint_date, scheduling_mode columns
- TypeScript types: ConstraintType, SchedulingMode enums
- `applyConstraints()` method in SchedulingService (post-CPM pass)
- Constraint picker + date input in TaskForm
- Scheduling mode toggle in TaskForm
- Manual tasks filtered out of CPM (but dates used as facts for successors)
- Conflict detection: constraints vs dependency-driven dates
- Gantt constraint indicators (pin icon for MSO, bracket for FNLT)

**Addresses features:**
- Constraint types (competitive #1) — ASAP, SNET, MSO, FNLT for MVP
- Manual scheduling mode (competitive #2)
- Scheduling conflict detection (competitive #3)

**Avoids pitfalls:**
- Constraint conflicts without feedback (pitfall #3) — conflicts returned with results, UI shows warnings
- Manual mode overwrites user dates (pitfall #6) — scheduling_mode column + skip logic

**Research needed:** Minimal — MS Project constraint semantics are well-documented.

---

### Phase 4: Progress Tracking
**Rationale:** Pure visual/tracking feature with no impact on CPM calculation. Can be built independently after core scheduling works. Second most impactful user-facing feature after auto-cascading.

**Delivers:**
- Schema migration: percent_complete, actual_start, actual_finish columns
- Progress side effects (auto-status sync: 100% → done, >0% → in_progress)
- Remaining duration calculation for in-progress tasks
- Gantt progress bar overlay (darker fill showing completed %)
- Percent complete input in TaskForm (0-100 slider/numeric)
- Frozen scheduling for completed tasks (100% tasks don't move when predecessors change)

**Addresses features:**
- Percent complete + progress tracking (table stakes #4)
- Gantt progress visualization (competitive #4)

**Avoids pitfalls:**
- Percent complete rounding errors (pitfall #7) — always round UP remaining duration, define "effectively complete" threshold

**Research needed:** No — straightforward data tracking + visualization.

---

### Phase Ordering Rationale

**Dependency chain:**
1. **Foundation first** — Wiring CPM to UI is the prerequisite for everything. Without cascade working, nothing else matters.
2. **Fix engine bugs before features** — SS/FF/SF broken, negative lag blocked. Must be correct before constraints rely on them.
3. **Constraints after foundation + correct dependencies** — Constraints modify CPM results. Need working cascade and correct dependency math.
4. **Progress tracking last** — Independent feature, no architectural dependencies. Visual/tracking only.

**Risk mitigation:**
- Phase 1 addresses the 2 most critical pitfalls (infinite loop, performance trap) via architecture
- Phase 2 fixes engine correctness bugs before building on top
- Phase 3 adds power features once foundation is proven
- Phase 4 is pure enhancement, low risk

**Incremental value:**
- After Phase 1: Auto-cascading works (FS dependencies only) — already valuable
- After Phase 2: All dependency types work correctly — complete CPM engine
- After Phase 3: Constraints + manual mode — MS Project feature parity
- After Phase 4: Progress tracking — complete v1.1 milestone

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1** — Integration pattern clear from codebase analysis. TanStack Query mutation hooks well-documented.
- **Phase 2** — CPM dependency type math is textbook scheduling theory.
- **Phase 3** — MS Project constraint semantics stable since 2003, well-documented.
- **Phase 4** — Data tracking + visualization, no complex domain logic.

**No phases require deeper research.** All architectural decisions made during project research.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Direct codebase analysis confirms existing stack is complete. Zero new dependencies needed. |
| Features | HIGH | MS Project scheduling rules unchanged for 20+ years. Feature expectations clear from established PM tools. |
| Architecture | HIGH | Integration pattern derived from existing React Query usage in codebase. SchedulingService architecture is clean, extensible. |
| Pitfalls | HIGH | Infinite loop and performance traps identified via direct code analysis (scheduling never called from UI, mutation hooks only invalidate). SS/FF/SF bug confirmed by reading forwardPass lines 246-255. |

**Overall confidence:** HIGH

### Gaps to Address

**Date serialization:** Task type allows `Date | string | null` for date fields. Scheduling engine produces `Date`, DB stores `timestamptz`, cache could contain either. Decision needed: normalize to midnight UTC before writing? Use `date` column type instead of `timestamptz`? (Minor, resolved in Phase 1)

**Milestone handling (duration 0):** Current forward pass makes successor start 1 day after milestone for FS (correct), but for SS it should start on same day as milestone (wrong). Edge case, handle in Phase 2 with dependency types.

**Topological sort instability:** Kahn's algorithm is not stable — same tasks can appear in different order between runs, causing phantom scheduling changes. Add secondary sort key (created_at) for determinism. (Minor, resolved in Phase 1)

**Multi-user race conditions:** Long scheduling operations (1-3s for 500+ tasks) could conflict with concurrent edits. For MVP, single-user usage is primary scenario — accept the race. Add optimistic locking in future multi-user phase. (Low priority, defer)

## Sources

### Primary (HIGH confidence)
- Direct codebase analysis of `scheduling.ts` (682 lines), `use-tasks.ts`, `use-dependencies.ts`, `entities.ts`, `GanttChart.tsx` (613 lines), `page.tsx`, full database schema
- Existing test suite `scheduling.test.ts` (50+ test cases) — confirms forward/backward pass, topological sort, calendar awareness work correctly
- MS Project scheduling theory — CPM algorithm, constraint types (ASAP/ALAP/SNET/SNLT/FNET/FNLT/MSO/MFO), dependency types (FS/SS/FF/SF) stable since Project 2003

### Secondary (MEDIUM confidence)
- External library assessment (Bryntum Gantt, dhtmlx-gantt, MPXJ, ProjectLibre) — based on training data knowledge; unable to verify current pricing/versions via web tools
- React Query mutation patterns (onMutate/onSuccess/onError optimistic updates) — documented in TanStack Query v5 guides

### Tertiary (LOW confidence)
- Specific Supabase RPC performance characteristics — batch update speed estimates based on general PostgreSQL knowledge, would need benchmarking for 500+ task projects

---
*Research completed: 2026-02-16*
*Ready for roadmap: yes*
