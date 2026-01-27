'use client'

import { useState } from 'react'
import type { Project, ProjectPhase, Task, Dependency, TeamMember } from '@/types/entities'

// Helper to format dates for display
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—'
  if (date instanceof Date) return date.toLocaleDateString()
  return date
}

// Demo data
const demoProject: Project = {
  id: 'proj-1',
  organization_id: 'org-1',
  name: 'Annual Financial Audit 2026',
  description: 'Comprehensive annual financial audit for Q1 2026',
  status: 'active',
  methodology: 'waterfall',
  start_date: new Date('2026-01-15'),
  end_date: new Date('2026-03-31'),
  target_end_date: new Date('2026-03-31'),
  actual_end_date: null,
  budget_amount: 150000,
  budget_currency: 'ILS',
  owner_id: 'user-1',
  created_by: 'user-1',
  working_days: [0, 1, 2, 3, 4],
  default_work_hours: 9,
  created_at: new Date('2026-01-10T00:00:00Z'),
  updated_at: new Date('2026-01-20T00:00:00Z'),
}

const demoPhases: ProjectPhase[] = [
  {
    id: 'phase-1',
    project_id: 'proj-1',
    name: 'Planning',
    description: 'Initial planning and scoping',
    phase_order: 0,
    order_index: 0,
    status: 'completed',
    start_date: '2026-01-15',
    end_date: '2026-01-25',
    total_tasks: 3,
    completed_tasks: 3,
    task_count: 3,
    completed_task_count: 3,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-25T00:00:00Z',
  },
  {
    id: 'phase-2',
    project_id: 'proj-1',
    name: 'Fieldwork',
    description: 'Conducting audit procedures',
    phase_order: 1,
    order_index: 1,
    status: 'active',
    start_date: '2026-01-26',
    end_date: '2026-02-28',
    total_tasks: 5,
    completed_tasks: 2,
    task_count: 5,
    completed_task_count: 2,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-27T00:00:00Z',
  },
  {
    id: 'phase-3',
    project_id: 'proj-1',
    name: 'Reporting',
    description: 'Final report preparation',
    phase_order: 2,
    order_index: 2,
    status: 'pending',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    total_tasks: 4,
    completed_tasks: 0,
    task_count: 4,
    completed_task_count: 0,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-10T00:00:00Z',
  },
]

const demoTasks: Task[] = [
  {
    id: 'task-1', project_id: 'proj-1', phase_id: 'phase-1',
    title: 'Define audit scope', description: 'Determine scope and objectives',
    task_type: 'task', status: 'done', priority: 'high',
    assignee_id: 'user-1', duration: 2,
    start_date: '2026-01-15', end_date: '2026-01-17', due_date: '2026-01-17',
    estimated_hours: 8, actual_hours: 10, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '1.1', order_index: 0,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-17T00:00:00Z'),
  },
  {
    id: 'task-2', project_id: 'proj-1', phase_id: 'phase-1',
    title: 'Risk assessment', description: 'Identify key risk areas',
    task_type: 'task', status: 'done', priority: 'critical',
    assignee_id: 'user-1', duration: 3,
    start_date: '2026-01-19', end_date: '2026-01-22', due_date: '2026-01-22',
    estimated_hours: 16, actual_hours: 14, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '1.2', order_index: 1,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-22T00:00:00Z'),
  },
  {
    id: 'task-3', project_id: 'proj-1', phase_id: 'phase-1',
    title: 'Planning complete', description: 'Planning milestone',
    task_type: 'milestone', status: 'done', priority: 'high',
    assignee_id: null, duration: 0,
    start_date: '2026-01-25', end_date: '2026-01-25', due_date: '2026-01-25',
    estimated_hours: 0, actual_hours: 0, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '1.3', order_index: 2,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-25T00:00:00Z'),
  },
  {
    id: 'task-4', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'Document review', description: 'Review financial documents',
    task_type: 'task', status: 'done', priority: 'high',
    assignee_id: 'user-2', duration: 4,
    start_date: '2026-01-26', end_date: '2026-01-30', due_date: '2026-01-30',
    estimated_hours: 20, actual_hours: 22, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.1', order_index: 0,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-30T00:00:00Z'),
  },
  {
    id: 'task-5', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'Controls testing', description: 'Test internal controls',
    task_type: 'task', status: 'done', priority: 'critical',
    assignee_id: 'user-2', duration: 4,
    start_date: '2026-02-01', end_date: '2026-02-07', due_date: '2026-02-07',
    estimated_hours: 32, actual_hours: 30, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.2', order_index: 1,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-02-07T00:00:00Z'),
  },
  {
    id: 'task-6', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'Substantive testing', description: 'Perform substantive audit procedures',
    task_type: 'task', status: 'in_progress', priority: 'critical',
    assignee_id: 'user-3', duration: 8,
    start_date: '2026-02-09', end_date: '2026-02-20', due_date: '2026-02-20',
    estimated_hours: 48, actual_hours: 20, progress_percent: 40,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.3', order_index: 2,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-02-15T00:00:00Z'),
  },
  {
    id: 'task-7', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'Sample verification', description: 'Verify sample transactions',
    task_type: 'task', status: 'pending', priority: 'medium',
    assignee_id: null, duration: 4,
    start_date: '2026-02-16', end_date: '2026-02-22', due_date: '2026-02-22',
    estimated_hours: 24, actual_hours: 0, progress_percent: 0,
    es: null, ef: null, ls: null, lf: null, slack: 2, is_critical: false,
    wbs_number: '2.4', order_index: 3,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-10T00:00:00Z'),
  },
  {
    id: 'task-8', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'Fieldwork complete', description: 'Fieldwork milestone',
    task_type: 'milestone', status: 'pending', priority: 'high',
    assignee_id: null, duration: 0,
    start_date: '2026-02-28', end_date: '2026-02-28', due_date: '2026-02-28',
    estimated_hours: 0, actual_hours: 0, progress_percent: 0,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.5', order_index: 4,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-10T00:00:00Z'),
  },
]

const demoTeamMembers: Record<string, { name: string; avatar: string; role: string }> = {
  'task-1': { name: 'David Cohen', avatar: 'DC', role: 'Lead Auditor' },
  'task-2': { name: 'David Cohen', avatar: 'DC', role: 'Lead Auditor' },
  'task-4': { name: 'Sarah Levi', avatar: 'SL', role: 'Senior Auditor' },
  'task-5': { name: 'Sarah Levi', avatar: 'SL', role: 'Senior Auditor' },
  'task-6': { name: 'Michael Ben', avatar: 'MB', role: 'Auditor' },
}

const criticalPathTaskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-8']

type ViewMode = 'phases' | 'timeline'

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('phases')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(new Set(['phase-2']))

  const totalTasks = demoTasks.length
  const completedTasks = demoTasks.filter((t) => t.status === 'done').length
  const inProgressTasks = demoTasks.filter((t) => t.status === 'in_progress').length
  const progressPercent = Math.round((completedTasks / totalTasks) * 100)

  const togglePhase = (phaseId: string) => {
    setExpandedPhases(prev => {
      const next = new Set(prev)
      if (next.has(phaseId)) {
        next.delete(phaseId)
      } else {
        next.add(phaseId)
      }
      return next
    })
  }

  return (
    <div className="max-w-[1400px] mx-auto px-6 py-8">
      {/* Project Header */}
      <div className="mb-8 fp-animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold" style={{ color: 'var(--fp-text-primary)' }}>
                {demoProject.name}
              </h1>
              <span className="fp-badge fp-badge--success">
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                Active
              </span>
            </div>
            <p className="text-sm" style={{ color: 'var(--fp-text-secondary)' }}>
              {demoProject.description}
            </p>
          </div>
          <button
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: 'var(--fp-brand-primary)',
              color: 'white',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New Task
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 fp-stagger">
        <StatCard
          label="Overall Progress"
          value={`${progressPercent}%`}
          subtext={`${completedTasks} of ${totalTasks} tasks complete`}
          progress={progressPercent}
          progressVariant="default"
        />
        <StatCard
          label="Days Remaining"
          value="64"
          subtext="Target: Mar 31, 2026"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          }
        />
        <StatCard
          label="In Progress"
          value={String(inProgressTasks)}
          subtext={`${demoTasks.filter(t => t.status === 'pending').length} pending`}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          iconColor="var(--fp-status-warning)"
        />
        <StatCard
          label="Critical Path"
          value={String(criticalPathTaskIds.length)}
          subtext="Tasks on critical path"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          }
          iconColor="var(--fp-critical)"
          variant="critical"
        />
      </div>

      {/* View Toggle & Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2 p-1 rounded-lg" style={{ background: 'var(--fp-bg-tertiary)' }}>
          <ViewToggleButton
            active={viewMode === 'phases'}
            onClick={() => setViewMode('phases')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
            </svg>
            Phases
          </ViewToggleButton>
          <ViewToggleButton
            active={viewMode === 'timeline'}
            onClick={() => setViewMode('timeline')}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
            </svg>
            Timeline
          </ViewToggleButton>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--fp-border-light)',
              color: 'var(--fp-text-secondary)',
              background: 'var(--fp-bg-secondary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
            </svg>
            Filter
          </button>
          <button
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--fp-border-light)',
              color: 'var(--fp-text-secondary)',
              background: 'var(--fp-bg-secondary)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="21" y1="10" x2="3" y2="10" />
              <line x1="21" y1="6" x2="3" y2="6" />
              <line x1="21" y1="14" x2="3" y2="14" />
              <line x1="21" y1="18" x2="3" y2="18" />
            </svg>
            Sort
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex gap-6">
        {/* Phases/Tasks List */}
        <div className="flex-1 space-y-4 fp-stagger">
          {demoPhases.map((phase) => (
            <PhaseCard
              key={phase.id}
              phase={phase}
              tasks={demoTasks.filter(t => t.phase_id === phase.id)}
              expanded={expandedPhases.has(phase.id)}
              onToggle={() => togglePhase(phase.id)}
              onTaskClick={setSelectedTask}
              criticalPathTaskIds={criticalPathTaskIds}
              teamMembers={demoTeamMembers}
            />
          ))}
        </div>

        {/* Right Sidebar - Quick Info */}
        <div className="w-80 space-y-4 hidden xl:block">
          {/* Team Members */}
          <div className="fp-card p-4">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fp-text-primary)' }}>
              Team Members
            </h3>
            <div className="space-y-3">
              {[
                { name: 'David Cohen', role: 'Lead Auditor', avatar: 'DC', color: '#10b981' },
                { name: 'Sarah Levi', role: 'Senior Auditor', avatar: 'SL', color: '#3b82f6' },
                { name: 'Michael Ben', role: 'Auditor', avatar: 'MB', color: '#f59e0b' },
              ].map((member) => (
                <div key={member.name} className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-semibold text-white"
                    style={{ background: member.color }}
                  >
                    {member.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                      {member.name}
                    </div>
                    <div className="text-xs" style={{ color: 'var(--fp-text-tertiary)' }}>
                      {member.role}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Upcoming Deadlines */}
          <div className="fp-card p-4">
            <h3 className="text-sm font-semibold mb-4" style={{ color: 'var(--fp-text-primary)' }}>
              Upcoming Deadlines
            </h3>
            <div className="space-y-3">
              {demoTasks
                .filter(t => t.status !== 'done')
                .slice(0, 3)
                .map((task) => (
                  <div key={task.id} className="flex items-center gap-3">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: criticalPathTaskIds.includes(task.id)
                          ? 'var(--fp-critical)'
                          : 'var(--fp-status-warning)'
                      }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate" style={{ color: 'var(--fp-text-primary)' }}>
                        {task.title}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--fp-text-tertiary)' }}>
                        Due: {task.due_date instanceof Date ? task.due_date.toLocaleDateString() : task.due_date}
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Task Detail Sidebar */}
      {selectedTask && (
        <TaskDetailSidebar
          task={selectedTask}
          isCritical={criticalPathTaskIds.includes(selectedTask.id)}
          assignee={demoTeamMembers[selectedTask.id]}
          onClose={() => setSelectedTask(null)}
        />
      )}
    </div>
  )
}

// Components

function StatCard({
  label,
  value,
  subtext,
  progress,
  progressVariant,
  icon,
  iconColor,
  variant,
}: {
  label: string
  value: string
  subtext: string
  progress?: number
  progressVariant?: 'default' | 'success' | 'warning' | 'critical'
  icon?: React.ReactNode
  iconColor?: string
  variant?: 'critical'
}) {
  return (
    <div
      className="fp-card p-5 transition-all hover:shadow-md"
      style={{
        borderColor: variant === 'critical' ? 'var(--fp-critical)' : undefined,
        borderWidth: variant === 'critical' ? '1px' : undefined,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <span
          className="text-xs font-medium uppercase tracking-wide"
          style={{ color: 'var(--fp-text-tertiary)' }}
        >
          {label}
        </span>
        {icon && (
          <span style={{ color: iconColor || 'var(--fp-text-tertiary)' }}>{icon}</span>
        )}
      </div>
      <div
        className="text-3xl font-bold mb-1"
        style={{ color: variant === 'critical' ? 'var(--fp-critical)' : 'var(--fp-text-primary)' }}
      >
        {value}
      </div>
      <div className="text-sm" style={{ color: 'var(--fp-text-secondary)' }}>
        {subtext}
      </div>
      {progress !== undefined && (
        <div className="mt-3 fp-progress">
          <div
            className={`fp-progress__fill fp-progress__fill--${progressVariant || 'default'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

function ViewToggleButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all"
      style={{
        background: active ? 'var(--fp-bg-secondary)' : 'transparent',
        color: active ? 'var(--fp-text-primary)' : 'var(--fp-text-secondary)',
        boxShadow: active ? 'var(--fp-shadow-sm)' : 'none',
      }}
    >
      {children}
    </button>
  )
}

function PhaseCard({
  phase,
  tasks,
  expanded,
  onToggle,
  onTaskClick,
  criticalPathTaskIds,
  teamMembers,
}: {
  phase: ProjectPhase
  tasks: Task[]
  expanded: boolean
  onToggle: () => void
  onTaskClick: (task: Task) => void
  criticalPathTaskIds: string[]
  teamMembers: Record<string, { name: string; avatar: string; role: string }>
}) {
  const progressPercent = phase.task_count > 0
    ? Math.round((phase.completed_task_count / phase.task_count) * 100)
    : 0

  const statusConfig = {
    completed: { badge: 'fp-badge--success', label: 'Completed' },
    active: { badge: 'fp-badge--info', label: 'In Progress' },
    pending: { badge: 'fp-badge--neutral', label: 'Pending' },
  }

  const status = statusConfig[phase.status as keyof typeof statusConfig] || statusConfig.pending

  return (
    <div className="fp-card overflow-hidden">
      {/* Phase Header */}
      <button
        onClick={onToggle}
        className="w-full px-5 py-4 flex items-center gap-4 transition-colors hover:bg-[var(--fp-bg-tertiary)]"
        style={{ textAlign: 'start' }}
      >
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-transform"
          style={{
            background: 'var(--fp-bg-tertiary)',
            transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)',
          }}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            style={{ color: 'var(--fp-text-secondary)' }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="font-semibold" style={{ color: 'var(--fp-text-primary)' }}>
              {phase.name}
            </span>
            <span className={`fp-badge ${status.badge}`}>
              {status.label}
            </span>
          </div>
          <div className="text-sm" style={{ color: 'var(--fp-text-tertiary)' }}>
            {phase.completed_task_count} of {phase.task_count} tasks • {formatDate(phase.start_date)} - {formatDate(phase.end_date)}
          </div>
        </div>

        {/* Progress Ring */}
        <div className="relative w-12 h-12">
          <svg className="w-12 h-12 -rotate-90">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="var(--fp-bg-tertiary)"
              strokeWidth="4"
              fill="none"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke={phase.status === 'completed' ? 'var(--fp-status-success)' : 'var(--fp-brand-primary)'}
              strokeWidth="4"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={`${progressPercent * 1.26} 126`}
            />
          </svg>
          <span
            className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
            style={{ color: 'var(--fp-text-primary)' }}
          >
            {progressPercent}%
          </span>
        </div>
      </button>

      {/* Tasks List */}
      {expanded && tasks.length > 0 && (
        <div className="border-t" style={{ borderColor: 'var(--fp-border-light)' }}>
          {tasks.map((task, index) => (
            <TaskRow
              key={task.id}
              task={task}
              onClick={() => onTaskClick(task)}
              isCritical={criticalPathTaskIds.includes(task.id)}
              assignee={teamMembers[task.id]}
              isLast={index === tasks.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskRow({
  task,
  onClick,
  isCritical,
  assignee,
  isLast,
}: {
  task: Task
  onClick: () => void
  isCritical: boolean
  assignee?: { name: string; avatar: string; role: string }
  isLast: boolean
}) {
  const priorityColors = {
    critical: { bg: 'var(--fp-status-error-bg)', text: '#dc2626' },
    high: { bg: 'var(--fp-status-warning-bg)', text: '#d97706' },
    medium: { bg: 'var(--fp-status-info-bg)', text: '#2563eb' },
    low: { bg: 'var(--fp-bg-tertiary)', text: 'var(--fp-text-secondary)' },
  }

  const priority = priorityColors[task.priority as keyof typeof priorityColors] || priorityColors.medium

  const statusIcons = {
    completed: (
      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'var(--fp-status-success)' }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    ),
    in_progress: (
      <div className="w-5 h-5 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: 'var(--fp-brand-primary)', borderTopColor: 'transparent' }} />
    ),
    pending: (
      <div className="w-5 h-5 rounded-full border-2" style={{ borderColor: 'var(--fp-border-medium)' }} />
    ),
  }

  return (
    <button
      onClick={onClick}
      className="w-full px-5 py-3 flex items-center gap-4 transition-colors hover:bg-[var(--fp-bg-tertiary)]"
      style={{
        textAlign: 'start',
        borderBottom: isLast ? 'none' : '1px solid var(--fp-border-light)',
      }}
    >
      {/* Status Icon */}
      {statusIcons[task.status as keyof typeof statusIcons] || statusIcons.pending}

      {/* Task Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="font-medium truncate"
            style={{
              color: 'var(--fp-text-primary)',
              textDecoration: task.status === 'done' ? 'line-through' : 'none',
            }}
          >
            {task.title}
          </span>
          {task.task_type === 'milestone' && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="var(--fp-brand-accent)" stroke="none">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          )}
          {isCritical && (
            <span
              className="px-1.5 py-0.5 text-[10px] font-semibold rounded"
              style={{ background: 'var(--fp-critical-bg)', color: 'var(--fp-critical)' }}
            >
              CRITICAL
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--fp-text-tertiary)' }}>
          <span>{task.wbs_number}</span>
          <span>•</span>
          <span>Due: {formatDate(task.due_date)}</span>
          {task.progress_percent > 0 && task.progress_percent < 100 && (
            <>
              <span>•</span>
              <span>{task.progress_percent}%</span>
            </>
          )}
        </div>
      </div>

      {/* Priority Badge */}
      <span
        className="px-2 py-1 text-[10px] font-semibold uppercase rounded"
        style={{ background: priority.bg, color: priority.text }}
      >
        {task.priority}
      </span>

      {/* Assignee */}
      {assignee && (
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-semibold text-white"
          title={assignee.name}
          style={{ background: '#6366f1' }}
        >
          {assignee.avatar}
        </div>
      )}
    </button>
  )
}

function TaskDetailSidebar({
  task,
  isCritical,
  assignee,
  onClose,
}: {
  task: Task
  isCritical: boolean
  assignee?: { name: string; avatar: string; role: string }
  onClose: () => void
}) {
  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/20 z-40 fp-animate-fade-in"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div
        className="fixed inset-y-0 right-0 w-[420px] z-50 fp-animate-slide-in overflow-y-auto"
        style={{
          background: 'var(--fp-bg-secondary)',
          boxShadow: 'var(--fp-shadow-lg)',
        }}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between border-b"
          style={{
            background: 'var(--fp-bg-secondary)',
            borderColor: 'var(--fp-border-light)',
          }}
        >
          <h2 className="text-lg font-semibold" style={{ color: 'var(--fp-text-primary)' }}>
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--fp-bg-tertiary)]"
            style={{ color: 'var(--fp-text-secondary)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Title & Type */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              {task.task_type === 'milestone' && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="var(--fp-brand-accent)">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
              )}
              <span className="text-xs font-medium" style={{ color: 'var(--fp-text-tertiary)' }}>
                {task.wbs_number} • {task.task_type === 'milestone' ? 'Milestone' : 'Task'}
              </span>
            </div>
            <h3 className="text-xl font-semibold" style={{ color: 'var(--fp-text-primary)' }}>
              {task.title}
            </h3>
            {task.description && (
              <p className="mt-2 text-sm" style={{ color: 'var(--fp-text-secondary)' }}>
                {task.description}
              </p>
            )}
          </div>

          {/* Critical Path Warning */}
          {isCritical && (
            <div
              className="flex items-start gap-3 p-4 rounded-lg"
              style={{ background: 'var(--fp-critical-bg)' }}
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--fp-critical)"
                strokeWidth="2"
                className="flex-shrink-0 mt-0.5"
              >
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <div>
                <div className="font-semibold text-sm" style={{ color: 'var(--fp-critical)' }}>
                  Critical Path Task
                </div>
                <div className="text-sm mt-0.5" style={{ color: '#991b1b' }}>
                  Any delay will directly impact the project end date.
                </div>
              </div>
            </div>
          )}

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Status
              </label>
              <div className="mt-1.5">
                <span className={`fp-badge ${task.status === 'done' ? 'fp-badge--success' : task.status === 'in_progress' ? 'fp-badge--info' : 'fp-badge--neutral'}`}>
                  {task.status.replace('_', ' ')}
                </span>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Priority
              </label>
              <div className="mt-1.5">
                <span className={`fp-badge ${task.priority === 'critical' ? 'fp-badge--error' : task.priority === 'high' ? 'fp-badge--warning' : 'fp-badge--neutral'}`}>
                  {task.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Progress */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Progress
              </label>
              <span className="text-sm font-semibold" style={{ color: 'var(--fp-text-primary)' }}>
                {task.progress_percent}%
              </span>
            </div>
            <div className="fp-progress" style={{ height: '8px' }}>
              <div
                className="fp-progress__fill fp-progress__fill--default"
                style={{ width: `${task.progress_percent}%` }}
              />
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Start Date
              </label>
              <div className="mt-1.5 text-sm font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                {formatDate(task.start_date)}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Due Date
              </label>
              <div className="mt-1.5 text-sm font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                {formatDate(task.due_date)}
              </div>
            </div>
          </div>

          {/* Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Estimated Hours
              </label>
              <div className="mt-1.5 text-sm font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                {task.estimated_hours}h
              </div>
            </div>
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Actual Hours
              </label>
              <div className="mt-1.5 text-sm font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                {task.actual_hours}h
              </div>
            </div>
          </div>

          {/* Assignee */}
          {assignee && (
            <div>
              <label className="text-xs font-medium uppercase tracking-wide" style={{ color: 'var(--fp-text-tertiary)' }}>
                Assigned To
              </label>
              <div className="mt-2 flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center text-sm font-semibold text-white"
                  style={{ background: '#6366f1' }}
                >
                  {assignee.avatar}
                </div>
                <div>
                  <div className="font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                    {assignee.name}
                  </div>
                  <div className="text-sm" style={{ color: 'var(--fp-text-tertiary)' }}>
                    {assignee.role}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div
          className="sticky bottom-0 px-6 py-4 border-t flex gap-3"
          style={{
            background: 'var(--fp-bg-secondary)',
            borderColor: 'var(--fp-border-light)',
          }}
        >
          <button
            className="flex-1 py-2.5 text-sm font-medium rounded-lg border transition-colors"
            style={{
              borderColor: 'var(--fp-border-medium)',
              color: 'var(--fp-text-primary)',
            }}
          >
            Edit Task
          </button>
          <button
            className="flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors"
            style={{
              background: 'var(--fp-brand-primary)',
              color: 'white',
            }}
          >
            {task.status === 'done' ? 'Reopen' : 'Mark Complete'}
          </button>
        </div>
      </div>
    </>
  )
}
