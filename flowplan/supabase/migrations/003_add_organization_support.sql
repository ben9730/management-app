-- Migration: Add organization_id support to team_members
-- This migration adds organization-level team member support while maintaining
-- backward compatibility with project-level team members.
--
-- The service now expects organization_id for organization-level team members.
-- project_id becomes optional for organization-level members.

-- ============================================
-- 1. Add organization_id column
-- ============================================

-- Add organization_id column (nullable for existing records)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS organization_id TEXT;

-- Add display_name column (replaces first_name/last_name for organization-level)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add avatar_url column
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Add weekly_capacity_hours column
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS weekly_capacity_hours INTEGER DEFAULT 40;

-- Add skills column (array of skill tags)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS skills TEXT[] DEFAULT '{}';

-- Add is_active column for soft delete
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Add updated_at column
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Make project_id nullable for organization-level members
ALTER TABLE team_members ALTER COLUMN project_id DROP NOT NULL;

-- Make user_id nullable (for team members not yet linked to auth users)
ALTER TABLE team_members ALTER COLUMN user_id DROP NOT NULL;

-- Add first_name and last_name if they don't exist (for compatibility)
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS last_name TEXT;

-- Add email column if not exists
ALTER TABLE team_members ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================
-- 2. Add indexes for organization-level queries
-- ============================================

CREATE INDEX IF NOT EXISTS idx_team_members_organization ON team_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON team_members(is_active);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON team_members(email);

-- ============================================
-- 3. Update role constraint to support more roles
-- ============================================

-- Drop old constraint if exists
ALTER TABLE team_members DROP CONSTRAINT IF EXISTS team_members_role_check;

-- Add new constraint with expanded roles
ALTER TABLE team_members ADD CONSTRAINT team_members_role_check
  CHECK (role IN ('admin', 'manager', 'member', 'viewer'));

-- ============================================
-- 4. Add trigger for updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_team_members_updated_at ON team_members;

CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON team_members
    FOR EACH ROW
    EXECUTE FUNCTION update_team_members_updated_at();

-- ============================================
-- 5. Update RLS policies for organization-level access
-- ============================================

-- Drop existing restrictive policy
DROP POLICY IF EXISTS "Members can view team members" ON team_members;

-- Add policy for organization-level team members (dev/demo mode)
CREATE POLICY "Anyone can view org team members (dev)"
  ON team_members FOR SELECT
  TO anon, authenticated
  USING (true);

-- Update the management policy for org-level members
DROP POLICY IF EXISTS "Admins can manage team members" ON team_members;

CREATE POLICY "Anyone can manage org team members (dev)"
  ON team_members FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ============================================
-- 6. Create project_members junction table
-- ============================================

-- This table allows team members to be assigned to multiple projects
CREATE TABLE IF NOT EXISTS project_members (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  team_member_id UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
  role          TEXT DEFAULT 'member' CHECK (role IN ('admin', 'manager', 'member', 'viewer')),
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(project_id, team_member_id)
);

CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_team_member ON project_members(team_member_id);

-- Enable RLS on project_members
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- Add dev/demo policies
CREATE POLICY "Anyone can view project members (dev)"
  ON project_members FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can manage project members (dev)"
  ON project_members FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);
