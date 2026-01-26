-- FlowPlan Initial Schema
-- Based on PRD v2.1 - Lean MVP + Resource-Aware
-- 9 Tables: projects, tasks, dependencies, audit_findings, calendar_exceptions,
--           team_members, employee_time_off, project_phases, task_assignments

-- ============================================
-- 1. Projects
-- ============================================
CREATE TABLE IF NOT EXISTS projects (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name          TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date    DATE,
  end_date      DATE,
  created_by    UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);

-- ============================================
-- 2. Project Phases (must be before tasks due to FK)
-- ============================================
CREATE TABLE IF NOT EXISTS project_phases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  description     TEXT,
  phase_order     INTEGER NOT NULL,
  status          TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  start_date      DATE,
  end_date        DATE,
  total_tasks     INTEGER DEFAULT 0,
  completed_tasks INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(project_id, phase_order)
);

CREATE INDEX IF NOT EXISTS idx_project_phases_project ON project_phases(project_id);

-- ============================================
-- 3. Tasks
-- ============================================
CREATE TABLE IF NOT EXISTS tasks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  phase_id      UUID REFERENCES project_phases(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'done')),
  priority      TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  assignee_id   UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Scheduling fields (CPM)
  duration        INTEGER DEFAULT 1,      -- Duration in working days
  estimated_hours DECIMAL(6,2),           -- Total hours needed (for resource planning)
  start_date      DATE,
  end_date        DATE,
  es              DATE,                   -- Early Start
  ef              DATE,                   -- Early Finish
  ls              DATE,                   -- Late Start
  lf              DATE,                   -- Late Finish
  slack           INTEGER DEFAULT 0,      -- Slack = LS - ES (in working days)
  is_critical     BOOLEAN DEFAULT false,  -- On Critical Path?

  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_phase ON tasks(phase_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_is_critical ON tasks(is_critical);

-- ============================================
-- 4. Dependencies
-- ============================================
CREATE TABLE IF NOT EXISTS dependencies (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  predecessor_id  UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  successor_id    UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  type            TEXT DEFAULT 'FS' CHECK (type IN ('FS', 'SS', 'FF', 'SF')),
  lag_days        INTEGER DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(predecessor_id, successor_id),
  CHECK (predecessor_id != successor_id) -- Prevent self-dependency
);

CREATE INDEX IF NOT EXISTS idx_dependencies_predecessor ON dependencies(predecessor_id);
CREATE INDEX IF NOT EXISTS idx_dependencies_successor ON dependencies(successor_id);

-- ============================================
-- 5. Audit Findings
-- ============================================
CREATE TABLE IF NOT EXISTS audit_findings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id       UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  severity      TEXT NOT NULL CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  finding       TEXT NOT NULL,
  root_cause    TEXT,
  capa          TEXT,         -- Corrective Action / Preventive Action
  due_date      DATE,
  status        TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'closed')),
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_findings_task ON audit_findings(task_id);
CREATE INDEX IF NOT EXISTS idx_audit_findings_severity ON audit_findings(severity);
CREATE INDEX IF NOT EXISTS idx_audit_findings_status ON audit_findings(status);

-- ============================================
-- 6. Calendar Exceptions
-- ============================================
CREATE TABLE IF NOT EXISTS calendar_exceptions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id    UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  date          DATE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('holiday', 'non_working')),
  name          TEXT,         -- e.g., "יום כיפור"
  created_at    TIMESTAMPTZ DEFAULT now(),

  UNIQUE(project_id, date)
);

CREATE INDEX IF NOT EXISTS idx_calendar_exceptions_project ON calendar_exceptions(project_id);
CREATE INDEX IF NOT EXISTS idx_calendar_exceptions_date ON calendar_exceptions(date);

-- ============================================
-- 7. Team Members
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id          UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  employment_type     TEXT DEFAULT 'full_time' CHECK (employment_type IN ('full_time', 'part_time', 'contractor')),
  work_hours_per_day  DECIMAL(4,2) DEFAULT 8.0,
  work_days           INTEGER[] DEFAULT '{0,1,2,3,4}', -- Days of week (0=Sunday, 6=Saturday)
  role                TEXT DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  hourly_rate         DECIMAL(10,2),
  created_at          TIMESTAMPTZ DEFAULT now(),

  UNIQUE(user_id, project_id)
);

CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_project ON team_members(project_id);

-- ============================================
-- 8. Employee Time Off
-- ============================================
CREATE TABLE IF NOT EXISTS employee_time_off (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_date    DATE NOT NULL,
  end_date      DATE NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('vacation', 'sick', 'personal', 'other')),
  status        TEXT DEFAULT 'approved' CHECK (status IN ('pending', 'approved', 'rejected')),
  notes         TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_employee_time_off_user ON employee_time_off(user_id);
CREATE INDEX IF NOT EXISTS idx_employee_time_off_dates ON employee_time_off(start_date, end_date);

-- ============================================
-- 9. Task Assignments
-- ============================================
CREATE TABLE IF NOT EXISTS task_assignments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allocated_hours DECIMAL(6,2) NOT NULL,
  actual_hours    DECIMAL(6,2) DEFAULT 0,
  start_date      DATE,
  end_date        DATE,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE(task_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_task_assignments_task ON task_assignments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_assignments_user ON task_assignments(user_id);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_findings ENABLE ROW LEVEL SECURITY;
ALTER TABLE calendar_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- Projects: Users can see projects they are members of
CREATE POLICY "Users can view projects they are members of"
  ON projects FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = projects.id
      AND team_members.user_id = auth.uid()
    )
    OR created_by = auth.uid()
  );

-- Projects: Only admins can insert/update/delete
CREATE POLICY "Admins can manage projects"
  ON projects FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = projects.id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
    OR created_by = auth.uid()
  );

-- Tasks: Members can view tasks in their projects
CREATE POLICY "Members can view tasks in their projects"
  ON tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = tasks.project_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Tasks: Members can create/update tasks
CREATE POLICY "Members can manage tasks"
  ON tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = tasks.project_id
      AND team_members.user_id = auth.uid()
    )
  );

-- Similar policies for other tables (simplified for MVP)
CREATE POLICY "Members can view phases"
  ON project_phases FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = project_phases.project_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage phases"
  ON project_phases FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = project_phases.project_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

CREATE POLICY "Members can view dependencies"
  ON dependencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN team_members ON team_members.project_id = tasks.project_id
      WHERE (tasks.id = dependencies.predecessor_id OR tasks.id = dependencies.successor_id)
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage dependencies"
  ON dependencies FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN team_members ON team_members.project_id = tasks.project_id
      WHERE (tasks.id = dependencies.predecessor_id OR tasks.id = dependencies.successor_id)
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view audit findings"
  ON audit_findings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN team_members ON team_members.project_id = tasks.project_id
      WHERE tasks.id = audit_findings.task_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage audit findings"
  ON audit_findings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN team_members ON team_members.project_id = tasks.project_id
      WHERE tasks.id = audit_findings.task_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can view calendar exceptions"
  ON calendar_exceptions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = calendar_exceptions.project_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage calendar exceptions"
  ON calendar_exceptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.project_id = calendar_exceptions.project_id
      AND team_members.user_id = auth.uid()
      AND team_members.role = 'admin'
    )
  );

CREATE POLICY "Members can view team members"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.project_id = team_members.project_id
      AND tm.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage team members"
  ON team_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.project_id = team_members.project_id
      AND tm.user_id = auth.uid()
      AND tm.role = 'admin'
    )
    OR team_members.user_id = auth.uid() -- Users can update their own membership
  );

CREATE POLICY "Users can view their own time off"
  ON employee_time_off FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can manage their own time off"
  ON employee_time_off FOR ALL
  USING (user_id = auth.uid());

CREATE POLICY "Members can view task assignments"
  ON task_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN team_members ON team_members.project_id = tasks.project_id
      WHERE tasks.id = task_assignments.task_id
      AND team_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can manage task assignments"
  ON task_assignments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM tasks
      JOIN team_members ON team_members.project_id = tasks.project_id
      WHERE tasks.id = task_assignments.task_id
      AND team_members.user_id = auth.uid()
    )
  );

-- ============================================
-- Functions & Triggers
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at
    BEFORE UPDATE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to update phase task counts
CREATE OR REPLACE FUNCTION update_phase_task_counts()
RETURNS TRIGGER AS $$
BEGIN
    -- Update counts for old phase (if changing phase)
    IF TG_OP = 'UPDATE' AND OLD.phase_id IS NOT NULL AND OLD.phase_id != NEW.phase_id THEN
        UPDATE project_phases SET
            total_tasks = (SELECT COUNT(*) FROM tasks WHERE phase_id = OLD.phase_id),
            completed_tasks = (SELECT COUNT(*) FROM tasks WHERE phase_id = OLD.phase_id AND status = 'done')
        WHERE id = OLD.phase_id;
    END IF;

    -- Update counts for new/current phase
    IF NEW.phase_id IS NOT NULL THEN
        UPDATE project_phases SET
            total_tasks = (SELECT COUNT(*) FROM tasks WHERE phase_id = NEW.phase_id),
            completed_tasks = (SELECT COUNT(*) FROM tasks WHERE phase_id = NEW.phase_id AND status = 'done')
        WHERE id = NEW.phase_id;
    END IF;

    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to update phase counts on task changes
CREATE TRIGGER update_phase_counts_on_task_change
    AFTER INSERT OR UPDATE OF phase_id, status ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_task_counts();

-- Function to update phase counts on task delete
CREATE OR REPLACE FUNCTION update_phase_counts_on_delete()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.phase_id IS NOT NULL THEN
        UPDATE project_phases SET
            total_tasks = (SELECT COUNT(*) FROM tasks WHERE phase_id = OLD.phase_id),
            completed_tasks = (SELECT COUNT(*) FROM tasks WHERE phase_id = OLD.phase_id AND status = 'done')
        WHERE id = OLD.phase_id;
    END IF;
    RETURN OLD;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_phase_counts_on_task_delete
    AFTER DELETE ON tasks
    FOR EACH ROW
    EXECUTE FUNCTION update_phase_counts_on_delete();
