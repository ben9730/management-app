'use client'

import { useState } from 'react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { PhaseSection } from '@/components/phases/PhaseSection'
import { GanttChart } from '@/components/gantt/GanttChart'
import type { Project, ProjectPhase, Task, Dependency, TeamMember } from '@/types/entities'

// Demo data for showcase
const demoProject: Project = {
  id: 'proj-1',
  organization_id: 'org-1',
  name: 'Annual Audit 2026',
  description: 'Comprehensive annual financial audit for Q1 2026',
  status: 'active',
  methodology: 'waterfall',
  start_date: '2026-01-15',
  target_end_date: '2026-03-31',
  actual_end_date: null,
  budget_amount: 150000,
  budget_currency: 'ILS',
  owner_id: 'user-1',
  working_days: [0, 1, 2, 3, 4],
  default_work_hours: 9,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-20T00:00:00Z',
}

const demoPhases: ProjectPhase[] = [
  {
    id: 'phase-1',
    project_id: 'proj-1',
    name: 'Planning',
    description: 'Initial planning and scoping',
    order_index: 0,
    status: 'completed',
    start_date: '2026-01-15',
    end_date: '2026-01-25',
    task_count: 3,
    completed_task_count: 3,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-25T00:00:00Z',
  },
  {
    id: 'phase-2',
    project_id: 'proj-1',
    name: 'Fieldwork',
    description: 'Conducting audit procedures',
    order_index: 1,
    status: 'active',
    start_date: '2026-01-26',
    end_date: '2026-02-28',
    task_count: 5,
    completed_task_count: 2,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-27T00:00:00Z',
  },
  {
    id: 'phase-3',
    project_id: 'proj-1',
    name: 'Reporting',
    description: 'Final report preparation',
    order_index: 2,
    status: 'pending',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    task_count: 4,
    completed_task_count: 0,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
]

const demoTasks: Task[] = [
  // Planning phase tasks
  {
    id: 'task-1',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Define audit scope',
    description: 'Determine scope and objectives',
    task_type: 'task',
    status: 'completed',
    priority: 'high',
    start_date: '2026-01-15',
    due_date: '2026-01-17',
    estimated_hours: 8,
    actual_hours: 10,
    progress_percent: 100,
    wbs_number: '1.1',
    order_index: 0,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-17T00:00:00Z',
  },
  {
    id: 'task-2',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Risk assessment',
    description: 'Identify key risk areas',
    task_type: 'task',
    status: 'completed',
    priority: 'critical',
    start_date: '2026-01-19',
    due_date: '2026-01-22',
    estimated_hours: 16,
    actual_hours: 14,
    progress_percent: 100,
    wbs_number: '1.2',
    order_index: 1,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-22T00:00:00Z',
  },
  {
    id: 'task-3',
    project_id: 'proj-1',
    phase_id: 'phase-1',
    title: 'Planning complete',
    description: 'Planning milestone',
    task_type: 'milestone',
    status: 'completed',
    priority: 'high',
    start_date: '2026-01-25',
    due_date: '2026-01-25',
    estimated_hours: 0,
    actual_hours: 0,
    progress_percent: 100,
    wbs_number: '1.3',
    order_index: 2,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-25T00:00:00Z',
  },
  // Fieldwork phase tasks
  {
    id: 'task-4',
    project_id: 'proj-1',
    phase_id: 'phase-2',
    title: 'Document review',
    description: 'Review financial documents',
    task_type: 'task',
    status: 'completed',
    priority: 'high',
    start_date: '2026-01-26',
    due_date: '2026-01-30',
    estimated_hours: 20,
    actual_hours: 22,
    progress_percent: 100,
    wbs_number: '2.1',
    order_index: 0,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-30T00:00:00Z',
  },
  {
    id: 'task-5',
    project_id: 'proj-1',
    phase_id: 'phase-2',
    title: 'Controls testing',
    description: 'Test internal controls',
    task_type: 'task',
    status: 'completed',
    priority: 'critical',
    start_date: '2026-02-01',
    due_date: '2026-02-07',
    estimated_hours: 32,
    actual_hours: 30,
    progress_percent: 100,
    wbs_number: '2.2',
    order_index: 1,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-02-07T00:00:00Z',
  },
  {
    id: 'task-6',
    project_id: 'proj-1',
    phase_id: 'phase-2',
    title: 'Substantive testing',
    description: 'Perform substantive audit procedures',
    task_type: 'task',
    status: 'in_progress',
    priority: 'critical',
    start_date: '2026-02-09',
    due_date: '2026-02-20',
    estimated_hours: 48,
    actual_hours: 20,
    progress_percent: 40,
    wbs_number: '2.3',
    order_index: 2,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-02-15T00:00:00Z',
  },
  {
    id: 'task-7',
    project_id: 'proj-1',
    phase_id: 'phase-2',
    title: 'Sample verification',
    description: 'Verify sample transactions',
    task_type: 'task',
    status: 'pending',
    priority: 'medium',
    start_date: '2026-02-16',
    due_date: '2026-02-22',
    estimated_hours: 24,
    actual_hours: 0,
    progress_percent: 0,
    wbs_number: '2.4',
    order_index: 3,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
  {
    id: 'task-8',
    project_id: 'proj-1',
    phase_id: 'phase-2',
    title: 'Fieldwork complete',
    description: 'Fieldwork milestone',
    task_type: 'milestone',
    status: 'pending',
    priority: 'high',
    start_date: '2026-02-28',
    due_date: '2026-02-28',
    estimated_hours: 0,
    actual_hours: 0,
    progress_percent: 0,
    wbs_number: '2.5',
    order_index: 4,
    created_at: '2026-01-10T00:00:00Z',
    updated_at: '2026-01-10T00:00:00Z',
  },
]

const demoDependencies: Dependency[] = [
  { id: 'dep-1', predecessor_id: 'task-1', successor_id: 'task-2', dependency_type: 'finish_to_start', lag_days: 1, created_at: '2026-01-10T00:00:00Z' },
  { id: 'dep-2', predecessor_id: 'task-2', successor_id: 'task-3', dependency_type: 'finish_to_start', lag_days: 0, created_at: '2026-01-10T00:00:00Z' },
  { id: 'dep-3', predecessor_id: 'task-3', successor_id: 'task-4', dependency_type: 'finish_to_start', lag_days: 1, created_at: '2026-01-10T00:00:00Z' },
  { id: 'dep-4', predecessor_id: 'task-4', successor_id: 'task-5', dependency_type: 'finish_to_start', lag_days: 1, created_at: '2026-01-10T00:00:00Z' },
  { id: 'dep-5', predecessor_id: 'task-5', successor_id: 'task-6', dependency_type: 'finish_to_start', lag_days: 1, created_at: '2026-01-10T00:00:00Z' },
  { id: 'dep-6', predecessor_id: 'task-6', successor_id: 'task-7', dependency_type: 'start_to_start', lag_days: 5, created_at: '2026-01-10T00:00:00Z' },
  { id: 'dep-7', predecessor_id: 'task-7', successor_id: 'task-8', dependency_type: 'finish_to_start', lag_days: 3, created_at: '2026-01-10T00:00:00Z' },
]

const demoTeamMembers: Record<string, TeamMember> = {
  'task-1': {
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    email: 'david.cohen@example.com',
    first_name: 'David',
    last_name: 'Cohen',
    role: 'lead_auditor',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 150,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  'task-2': {
    id: 'member-1',
    organization_id: 'org-1',
    user_id: 'user-1',
    email: 'david.cohen@example.com',
    first_name: 'David',
    last_name: 'Cohen',
    role: 'lead_auditor',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 150,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  'task-4': {
    id: 'member-2',
    organization_id: 'org-1',
    user_id: 'user-2',
    email: 'sarah.levi@example.com',
    first_name: 'Sarah',
    last_name: 'Levi',
    role: 'auditor',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 100,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  'task-5': {
    id: 'member-2',
    organization_id: 'org-1',
    user_id: 'user-2',
    email: 'sarah.levi@example.com',
    first_name: 'Sarah',
    last_name: 'Levi',
    role: 'auditor',
    employment_type: 'full_time',
    weekly_capacity_hours: 40,
    work_days: [0, 1, 2, 3, 4],
    hourly_rate: 100,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
  'task-6': {
    id: 'member-3',
    organization_id: 'org-1',
    user_id: 'user-3',
    email: 'michael.ben@example.com',
    first_name: 'Michael',
    last_name: 'Ben-David',
    role: 'auditor',
    employment_type: 'part_time',
    weekly_capacity_hours: 24,
    work_days: [0, 1, 2],
    hourly_rate: 90,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
  },
}

// Critical path for demo
const criticalPathTaskIds = ['task-1', 'task-2', 'task-3', 'task-4', 'task-5', 'task-6', 'task-8']

// Slack values for demo
const taskSlackValues: Record<string, number> = {
  'task-1': 0,
  'task-2': 0,
  'task-3': 0,
  'task-4': 0,
  'task-5': 0,
  'task-6': 0,
  'task-7': 3,
  'task-8': 0,
}

type ViewMode = 'phases' | 'gantt'

export default function Dashboard() {
  const [viewMode, setViewMode] = useState<ViewMode>('phases')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)

  const planningTasks = demoTasks.filter((t) => t.phase_id === 'phase-1')
  const fieldworkTasks = demoTasks.filter((t) => t.phase_id === 'phase-2')

  const totalTasks = demoTasks.length
  const completedTasks = demoTasks.filter((t) => t.status === 'completed').length
  const inProgressTasks = demoTasks.filter((t) => t.status === 'in_progress').length
  const progressPercent = Math.round((completedTasks / totalTasks) * 100)

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      {/* Project Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-2">
          <h2 className="text-3xl font-black uppercase tracking-tight">
            {demoProject.name}
          </h2>
          <Badge variant="success">Active</Badge>
        </div>
        <p className="text-gray-600">{demoProject.description}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{progressPercent}%</div>
            <div className="h-2 bg-gray-200 border border-black mt-2">
              <div className="h-full bg-black" style={{ width: `${progressPercent}%` }} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">{completedTasks}/{totalTasks}</div>
            <div className="text-sm text-gray-500 mt-1">
              {inProgressTasks} in progress
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">Days Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black">64</div>
            <div className="text-sm text-gray-500 mt-1">
              Target: Mar 31
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase">Critical Tasks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-black text-red-600">{criticalPathTaskIds.length}</div>
            <div className="text-sm text-gray-500 mt-1">
              On critical path
            </div>
          </CardContent>
        </Card>
      </div>

      {/* View Toggle */}
      <div className="flex items-center gap-4 mb-6">
        <span className="font-bold text-sm uppercase">View:</span>
        <div className="flex border-2 border-black">
          <button
            onClick={() => setViewMode('phases')}
            className={`px-4 py-2 text-sm font-bold uppercase ${
              viewMode === 'phases'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Phases
          </button>
          <button
            onClick={() => setViewMode('gantt')}
            className={`px-4 py-2 text-sm font-bold uppercase border-l-2 border-black ${
              viewMode === 'gantt'
                ? 'bg-black text-white'
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            Gantt
          </button>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'phases' ? (
        <div className="space-y-4">
          <PhaseSection
            phase={demoPhases[0]}
            tasks={planningTasks}
            taskAssignees={demoTeamMembers}
            taskSlackValues={taskSlackValues}
            criticalPathTaskIds={criticalPathTaskIds}
            onTaskClick={setSelectedTask}
            onTaskStatusChange={(taskId, status) => console.log('Status change:', taskId, status)}
          />
          <PhaseSection
            phase={demoPhases[1]}
            tasks={fieldworkTasks}
            taskAssignees={demoTeamMembers}
            taskSlackValues={taskSlackValues}
            criticalPathTaskIds={criticalPathTaskIds}
            onTaskClick={setSelectedTask}
            onTaskStatusChange={(taskId, status) => console.log('Status change:', taskId, status)}
          />
          <PhaseSection
            phase={demoPhases[2]}
            tasks={[]}
            defaultCollapsed
            onAddTask={(phaseId) => console.log('Add task to phase:', phaseId)}
          />
        </div>
      ) : (
        <GanttChart
          tasks={demoTasks}
          dependencies={demoDependencies}
          criticalPathTaskIds={criticalPathTaskIds}
          showDependencies
          showTodayMarker
          showZoomControls
          onTaskClick={setSelectedTask}
          onTaskBarClick={setSelectedTask}
        />
      )}

      {/* Task Detail Sidebar (simplified) */}
      {selectedTask && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white border-l-4 border-black shadow-xl p-6 overflow-y-auto z-50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-black uppercase">Task Details</h3>
            <button
              onClick={() => setSelectedTask(null)}
              className="w-8 h-8 border-2 border-black font-bold hover:bg-black hover:text-white"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <span className="text-xs font-bold uppercase text-gray-500">Title</span>
              <p className="font-bold text-lg">{selectedTask.title}</p>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-gray-500">Description</span>
              <p className="text-sm">{selectedTask.description || 'No description'}</p>
            </div>

            <div className="flex gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">Status</span>
                <p className="capitalize">{selectedTask.status.replace('_', ' ')}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">Priority</span>
                <Badge variant={selectedTask.priority === 'critical' ? 'critical' : selectedTask.priority === 'high' ? 'high' : 'secondary'}>
                  {selectedTask.priority.toUpperCase()}
                </Badge>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-gray-500">Progress</span>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 bg-gray-200 border border-black">
                  <div className="h-full bg-black" style={{ width: `${selectedTask.progress_percent}%` }} />
                </div>
                <span className="font-bold">{selectedTask.progress_percent}%</span>
              </div>
            </div>

            <div className="flex gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">Start</span>
                <p>{selectedTask.start_date || '-'}</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">Due</span>
                <p>{selectedTask.due_date || '-'}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">Estimated</span>
                <p>{selectedTask.estimated_hours}h</p>
              </div>
              <div>
                <span className="text-xs font-bold uppercase text-gray-500">Actual</span>
                <p>{selectedTask.actual_hours}h</p>
              </div>
            </div>

            {criticalPathTaskIds.includes(selectedTask.id) && (
              <div className="bg-red-50 border-2 border-red-500 p-3">
                <span className="text-red-600 font-bold text-sm uppercase">⚠ Critical Path</span>
                <p className="text-sm text-red-700 mt-1">
                  This task is on the critical path. Any delay will impact the project end date.
                </p>
              </div>
            )}

            <div className="pt-4 border-t border-black">
              <Button variant="default" className="w-full">
                Edit Task
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
