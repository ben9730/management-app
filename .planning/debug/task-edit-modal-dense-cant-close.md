---
status: diagnosed
trigger: "The task edit modal is too dense and can't close normally"
created: 2026-02-17T00:00:00Z
updated: 2026-02-17T00:00:00Z
---

## Current Focus

hypothesis: Modal has no scrollable content area; content overflows past viewport, obscuring close button and backdrop
test: Read Modal.tsx content div and TaskForm structure
expecting: Missing overflow-y-auto and max-height on content container
next_action: Report diagnosis

## Symptoms

expected: Task edit modal should be scrollable and closable (X button, backdrop click, Escape key)
actual: Modal is too dense, all fields stack vertically, overflows viewport, can't close normally
errors: No console errors - purely a layout/UX issue
reproduction: Open task edit modal on a task with dependencies
started: Got worse with Phase 5 additions (constraint type, manual mode, etc.)

## Eliminated

(none - root causes identified on first pass)

## Evidence

- timestamp: 2026-02-17
  checked: Modal.tsx content div (line 176)
  found: Content wrapper is `<div className="p-6">{children}</div>` with NO overflow-y-auto, NO max-height
  implication: Content can grow unbounded and push the modal dialog box beyond viewport height

- timestamp: 2026-02-17
  checked: Modal.tsx dialog container (lines 138-142)
  found: Dialog has `overflow-visible` class explicitly set
  implication: Content is intentionally allowed to overflow the dialog box (likely for dropdowns) but this prevents scroll containment

- timestamp: 2026-02-17
  checked: Modal.tsx overlay click handler (lines 115-119, 124-131)
  found: Overlay uses `items-center justify-center` with `p-4` padding. Click handler checks `e.target === e.currentTarget`. When modal overflows viewport, the overlay div is behind the modal content, so clicking at edges hits the modal, not the overlay.
  implication: Backdrop click-to-close is obstructed when modal content overflows

- timestamp: 2026-02-17
  checked: Modal.tsx close button position (lines 145-173)
  found: Close button (X) is in the header div with `p-6 pb-2`. No sticky positioning. If user scrolls down in the overflowing content, the X button scrolls away.
  implication: Close button becomes unreachable when content pushes it off screen

- timestamp: 2026-02-17
  checked: Modal.tsx escape key handler (lines 54-65)
  found: Escape key handler IS properly implemented and should still work
  implication: Escape key should close the modal even when visually broken - but user may not know this

- timestamp: 2026-02-17
  checked: Modal.tsx sizes config (lines 46-51)
  found: Task modal uses `size="md"` which maps to `max-w-md` (28rem/448px). No max-height constraint.
  implication: Width is constrained but height is completely unconstrained

- timestamp: 2026-02-17
  checked: page.tsx task modal (lines 1083-1145)
  found: Modal contains TaskForm PLUS DependencyManager when editing. DependencyManager has `isAdding` default to `true` (line 48), so the add-dependency form is always visible.
  implication: In edit mode, the modal contains the full TaskForm + a divider + DependencyManager with its always-open form, making it extremely tall

- timestamp: 2026-02-17
  checked: TaskForm.tsx total field count (lines 497-710)
  found: Form contains 11 distinct sections stacked vertically with space-y-6 spacing - title, description (3 rows textarea), priority+date grid, duration+hours grid, advanced scheduling section (toggle + constraint fields), multi-assignee selector, vacation warning, holiday warning, action buttons
  implication: Even without DependencyManager, the form itself is already very tall

- timestamp: 2026-02-17
  checked: DependencyManager default state (line 48)
  found: `const [isAdding, setIsAdding] = React.useState(true)` - the add form is ALWAYS open by default
  implication: Every time the edit modal opens, the dependency add form is expanded, adding ~200px of height

## Resolution

root_cause: |
  TWO compounding issues cause the modal to be too dense and unclosable:

  **Issue A: No scroll containment in Modal.tsx**
  - The content div (`<div className="p-6">{children}</div>` at line 176) has NO `overflow-y-auto` and NO `max-height`
  - The dialog container has `overflow-visible` explicitly (line 139), which prevents any scroll containment
  - There is no `max-h-[90vh]` or similar viewport constraint on the dialog
  - Result: Content pushes the dialog past the viewport bottom, making lower form fields and the close button unreachable

  **Issue B: Modal content is extremely tall in edit mode**
  - TaskForm has 11 field sections with `space-y-6` spacing (~700px minimum)
  - In edit mode, DependencyManager is appended below TaskForm (page.tsx line 1136-1143), adding another ~300px
  - DependencyManager's add form defaults to open (`isAdding = true`), adding ~200px unnecessarily
  - Total estimated content height: 900-1200px+ (well beyond most viewports)

  **Why it "can't close normally":**
  - The X close button scrolls off screen (not sticky)
  - The backdrop/overlay is obscured by the overflowing modal content, so backdrop clicks hit the modal instead
  - Escape key DOES work but user may not know this
  - The cancel button at the bottom of the form is pushed below the viewport fold

fix: (not applied - research only)
verification: (not applied - research only)
files_changed: []
