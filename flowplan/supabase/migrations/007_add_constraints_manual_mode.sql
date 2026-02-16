-- Phase 5: Add constraint types and manual scheduling mode to tasks
-- Constraint types: ASAP (explicit), MSO (Must Start On), SNET (Start No Earlier Than), FNLT (Finish No Later Than)
-- Scheduling mode: auto (CPM-driven) or manual (user-set dates preserved)

ALTER TABLE tasks
  ADD COLUMN constraint_type TEXT DEFAULT NULL
    CHECK (constraint_type IN ('ASAP', 'MSO', 'SNET', 'FNLT')),
  ADD COLUMN constraint_date DATE DEFAULT NULL,
  ADD COLUMN scheduling_mode TEXT DEFAULT 'auto' NOT NULL
    CHECK (scheduling_mode IN ('auto', 'manual'));
