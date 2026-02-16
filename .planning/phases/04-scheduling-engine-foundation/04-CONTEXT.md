# Phase 4: Scheduling Engine Foundation - Context

**Gathered:** 2026-02-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix all dependency types (FS/SS/FF/SF), add lead/lag support, and wire the CPM engine to the UI so task dates cascade automatically through dependency chains when any task or dependency changes. The Gantt chart reflects new dates and critical path without manual refresh.

</domain>

<decisions>
## Implementation Decisions

### Dependency type display
- All dependency types (FS, SS, FF, SF) use the same line style in the Gantt chart -- no color or dash differentiation
- Dependency type is shown on hover only (tooltip), not as a permanent label on the chart
- Lead/lag values shown in the same hover tooltip alongside the type (e.g., "FS +2d")

### Cascade behavior
- Auto-cascading triggers immediately on change -- no save/confirm step required
- Dates update instantly and silently -- no animation or toast notifications
- Cascading is deterministic; reversing the input change reverses the cascade

### Claude's Discretion
- Lead/lag display approach (whether to show inline on lines or only in tooltip -- leaning tooltip to match type display)
- Critical path visual treatment (color, outline, toggle mode)
- Undo mechanism after cascade (if any)
- Conflict/warning presentation when cascading produces issues (inline, banner, or both)

</decisions>

<specifics>
## Specific Ideas

No specific requirements -- open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 04-scheduling-engine-foundation*
*Context gathered: 2026-02-16*
