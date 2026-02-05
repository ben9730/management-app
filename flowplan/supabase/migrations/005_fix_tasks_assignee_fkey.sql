-- Migration: Fix tasks.assignee_id foreign key to reference team_members instead of auth.users
--
-- Issue: "insert or update on table tasks violates foreign key constraint tasks_assignee_id_fkey"
--
-- Root Cause: The assignee_id column was set to reference auth.users(id), but the application
-- sends team_members.id values. Team members can exist without being linked to auth.users.
--
-- Solution: Change the foreign key to reference team_members(id) instead.

-- ============================================
-- 1. Drop the existing foreign key constraint
-- ============================================

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;

-- ============================================
-- 2. Add new foreign key referencing team_members
-- ============================================

ALTER TABLE tasks
  ADD CONSTRAINT tasks_assignee_id_fkey
  FOREIGN KEY (assignee_id)
  REFERENCES team_members(id)
  ON DELETE SET NULL;

-- ============================================
-- 3. Recreate the index (should already exist but ensure it does)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
