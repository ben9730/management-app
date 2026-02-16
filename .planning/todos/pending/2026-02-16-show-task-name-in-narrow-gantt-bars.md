---
created: 2026-02-16T11:54:42.428Z
title: Show task name in narrow Gantt bars
area: ui
files:
  - src/components/gantt/GanttChart.tsx
---

## Problem

Feature request from UAT: When a Gantt bar is too narrow (short duration tasks), the task name gets hidden/clipped. Users lose context about which task the bar represents.

## Solution

- Show task name outside the bar (to the right) when bar width is below a threshold
- Or show task name on hover tooltip
- Or use text truncation with ellipsis and full name on hover
- Out of scope for v1.1 -- capture for future milestone
