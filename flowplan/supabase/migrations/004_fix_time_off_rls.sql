-- Migration: Fix employee_time_off RLS policies for INSERT operations
--
-- Issue: POST request to employee_time_off fails with 403 Forbidden
-- "new row violates row-level security policy for table employee_time_off"
--
-- Root cause: The existing "Anyone can manage time off" policy from migration 002
-- uses FOR ALL which should cover INSERT, but we need to ensure the WITH CHECK
-- clause is properly applied for INSERT operations.
--
-- Solution: Drop existing policies and recreate with explicit INSERT policy

-- ============================================
-- 1. Drop existing employee_time_off policies
-- ============================================

-- Drop policies from migration 001 (if they exist)
DROP POLICY IF EXISTS "Users can view their own time off" ON employee_time_off;
DROP POLICY IF EXISTS "Users can manage their own time off" ON employee_time_off;

-- Drop policies from migration 002 (if they exist)
DROP POLICY IF EXISTS "Anyone can view time off" ON employee_time_off;
DROP POLICY IF EXISTS "Anyone can manage time off" ON employee_time_off;

-- ============================================
-- 2. Create new explicit policies for dev/demo
-- ============================================

-- SELECT policy
CREATE POLICY "employee_time_off_select_dev"
  ON employee_time_off FOR SELECT
  TO anon, authenticated
  USING (true);

-- INSERT policy (explicit for better clarity)
CREATE POLICY "employee_time_off_insert_dev"
  ON employee_time_off FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- UPDATE policy
CREATE POLICY "employee_time_off_update_dev"
  ON employee_time_off FOR UPDATE
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- DELETE policy
CREATE POLICY "employee_time_off_delete_dev"
  ON employee_time_off FOR DELETE
  TO anon, authenticated
  USING (true);

-- ============================================
-- 3. Ensure RLS is enabled
-- ============================================

ALTER TABLE employee_time_off ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. Grant necessary permissions
-- ============================================

-- Ensure anon and authenticated roles have access
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_time_off TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON employee_time_off TO authenticated;
