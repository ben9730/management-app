# Phase 5: Constraints & Manual Mode - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can pin tasks to specific dates using constraint types and toggle individual tasks to manual scheduling mode that the engine respects but does not move. Available constraint types: ASAP, MSO (Must Start On), SNET (Start No Earlier Than), FNLT (Finish No Later Than). Manual tasks keep their dates fixed when predecessors change, but their successors still cascade from manual task dates.

</domain>

<decisions>
## Implementation Decisions

### Constraint setup UX
- Claude's discretion on placement (task edit form vs inline) -- pick what fits current UI patterns
- 4 constraint types: ASAP (as soon as possible), MSO (Must Start On), SNET (Start No Earlier Than), FNLT (Finish No Later Than)
- Default for new tasks: **no constraint** (not ASAP) -- tasks have no constraint until user explicitly sets one
- Claude's discretion on Gantt bar visual treatment for constrained tasks (icon, tooltip, or both)

### Deadline warnings
- Claude's discretion on FNLT violation visual treatment on the Gantt bar (warning icon, red tint, or both)
- Claude's discretion on whether FNLT deadline date gets a diamond marker on the timeline
- Claude's discretion on whether non-FNLT constraints (MSO/SNET actively pushing dates) get a subtle info indicator
- When a scheduling change causes a deadline violation: **show a toast notification** in addition to Gantt visuals

### Conflict behavior
- **Dependencies win over constraints** -- if a predecessor finishes later than a MSO date, the dependency takes priority and the constraint is effectively a soft preference
- SNET behavior: Claude's discretion on implementation (standard approach: use whichever is later -- dependency date or SNET date)
- Scheduling driver explanation: Claude's discretion on whether to show what's driving each task's date on hover
- When a user sets a MSO date that conflicts with dependencies: **show a toast with explanation** (e.g., "Constraint adjusted -- dependency on [Task X] requires starting no earlier than [date]")

### Manual mode experience
- Not discussed in detail -- Claude has full discretion on:
  - Toggle UX for switching tasks to manual mode
  - Visual distinction for manual tasks in Gantt chart
  - Manual date interaction with successor cascading

### Claude's Discretion
- Constraint setup placement (form vs inline vs sidebar)
- Gantt bar visual treatment for constraints and deadline violations
- SNET enforcement behavior (standard: max of dependency date and SNET date)
- Whether to show scheduling driver tooltips
- Deadline marker on timeline (diamond or none)
- Info indicators for active non-FNLT constraints
- All manual mode UX and visuals

</decisions>

<specifics>
## Specific Ideas

- User wants dependencies to always win over constraints -- constraints are preferences, not overrides
- Toast notifications are the preferred feedback mechanism for constraint conflicts and deadline violations
- "No constraint" as default rather than ASAP -- simpler mental model for users

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 05-constraints-manual-mode*
*Context gathered: 2026-02-16*
