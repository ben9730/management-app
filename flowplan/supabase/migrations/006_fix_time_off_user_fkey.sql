-- Migration: Fix employee_time_off.user_id foreign key to reference team_members
--
-- Issue: "insert or update on table employee_time_off violates foreign key constraint employee_time_off_user_id_fkey"
--
-- Root Cause: The user_id column was set to reference auth.users(id), but the application
-- sends team_members.id values. Team members can exist without being linked to auth.users.
--
-- Solution: Change the foreign key to reference team_members(id) instead.
-- Also rename column to team_member_id for clarity.

-- ============================================
-- 1. Drop the existing foreign key constraint
-- ============================================

ALTER TABLE employee_time_off DROP CONSTRAINT IF EXISTS employee_time_off_user_id_fkey;

-- ============================================
-- 2. Rename column for clarity (optional but recommended)
-- ============================================

-- First check if column already renamed
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name = 'employee_time_off' AND column_name = 'user_id') THEN
    ALTER TABLE employee_time_off RENAME COLUMN user_id TO team_member_id;
  END IF;
END $$;

-- ============================================
-- 3. Make column nullable for flexibility
-- ============================================

ALTER TABLE employee_time_off ALTER COLUMN team_member_id DROP NOT NULL;

-- ============================================
-- 4. Add new foreign key referencing team_members
-- ============================================

ALTER TABLE employee_time_off
  ADD CONSTRAINT employee_time_off_team_member_fkey
  FOREIGN KEY (team_member_id)
  REFERENCES team_members(id)
  ON DELETE CASCADE;

-- ============================================
-- 5. Update index
-- ============================================

DROP INDEX IF EXISTS idx_employee_time_off_user;
CREATE INDEX IF NOT EXISTS idx_employee_time_off_team_member ON employee_time_off(team_member_id);
