---
created: 2026-02-16T11:54:42.428Z
title: Add task status change from Gantt view
area: ui
files:
  - src/components/gantt/GanttChart.tsx
---

## Problem

Feature request from UAT: Users want to change task status directly from the Gantt chart view without opening the task detail sidebar. Currently, status changes require navigating to the task card or sidebar.

## Solution

- Add right-click context menu or inline status toggle on Gantt bars
- Or add a small status indicator icon on Gantt bars that's clickable
- Out of scope for v1.1 -- capture for future milestone
