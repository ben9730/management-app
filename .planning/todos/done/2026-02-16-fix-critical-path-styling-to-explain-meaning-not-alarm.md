---
created: 2026-02-16T11:54:42.428Z
title: Fix critical path styling to explain meaning not alarm
area: ui
files:
  - src/components/gantt/GanttChart.tsx
---

## Problem

During UAT (Test 10), critical path styling was flagged as looking like an error/alarm state rather than explaining what "critical" means in scheduling context. Users may confuse critical path highlighting with an error indicator. The styling should convey that "critical" means zero slack (no room for delay), not that something is wrong.

## Solution

- Adjust critical path visual styling (color, opacity, or pattern) to feel informational rather than alarming
- Consider adding a tooltip or legend explaining "Critical path = zero slack, any delay affects project end date"
- Use a distinct but non-alarming color (e.g., bold blue or gold instead of red)
