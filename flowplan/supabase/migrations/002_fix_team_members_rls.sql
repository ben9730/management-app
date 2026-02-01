-- Fix: Infinite recursion in team_members RLS policy
-- Issue: "Admins can manage team members" policy self-references team_members table
-- Solution: Use SECURITY DEFINER helper functions and add dev/demo policies

-- ============================================
-- 1. Fix team_members RLS policies
-- ============================================

-- Drop the problematic policy that causes infinite recursion
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;

-- Create fixed policy using the is_project_admin() function (SECURITY DEFINER bypasses RLS)
CREATE POLICY "Admins can manage team members"
  ON team_members FOR ALL
  USING (
    is_project_admin(project_id)
    OR user_id = auth.uid() -- Users can manage their own membership
  );

-- Add dev/demo policy for anonymous access (like projects table has)
CREATE POLICY "Anyone can view team members (dev)"
  ON team_members FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "Anyone can manage team members (dev)"
  ON team_members FOR ALL
  TO anon
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 2. Fix project_phases RLS policies for dev/demo
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Members can view phases" ON project_phases;
DROP POLICY IF EXISTS "Admins can manage phases" ON project_phases;

-- Add dev/demo policies (matching projects table pattern)
CREATE POLICY "Anyone can view phases"
  ON project_phases FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage phases"
  ON project_phases FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 3. Fix tasks RLS policies for dev/demo
-- ============================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Members can view tasks in their projects" ON tasks;
DROP POLICY IF EXISTS "Members can manage tasks" ON tasks;

-- Add dev/demo policies
CREATE POLICY "Anyone can view tasks"
  ON tasks FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage tasks"
  ON tasks FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 4. Fix dependencies RLS policies for dev/demo
-- ============================================

DROP POLICY IF EXISTS "Members can view dependencies" ON dependencies;
DROP POLICY IF EXISTS "Members can manage dependencies" ON dependencies;

CREATE POLICY "Anyone can view dependencies"
  ON dependencies FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage dependencies"
  ON dependencies FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 5. Fix audit_findings RLS policies for dev/demo
-- ============================================

DROP POLICY IF EXISTS "Members can view audit findings" ON audit_findings;
DROP POLICY IF EXISTS "Members can manage audit findings" ON audit_findings;

CREATE POLICY "Anyone can view audit findings"
  ON audit_findings FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage audit findings"
  ON audit_findings FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. Fix calendar_exceptions RLS policies for dev/demo
-- ============================================

DROP POLICY IF EXISTS "Members can view calendar exceptions" ON calendar_exceptions;
DROP POLICY IF EXISTS "Admins can manage calendar exceptions" ON calendar_exceptions;

CREATE POLICY "Anyone can view calendar exceptions"
  ON calendar_exceptions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage calendar exceptions"
  ON calendar_exceptions FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 7. Fix task_assignments RLS policies for dev/demo
-- ============================================

DROP POLICY IF EXISTS "Members can view task assignments" ON task_assignments;
DROP POLICY IF EXISTS "Members can manage task assignments" ON task_assignments;

CREATE POLICY "Anyone can view task assignments"
  ON task_assignments FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage task assignments"
  ON task_assignments FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 8. Fix employee_time_off RLS policies for dev/demo
-- ============================================

DROP POLICY IF EXISTS "Users can view their own time off" ON employee_time_off;
DROP POLICY IF EXISTS "Users can manage their own time off" ON employee_time_off;

CREATE POLICY "Anyone can view time off"
  ON employee_time_off FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage time off"
  ON employee_time_off FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
