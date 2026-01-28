'use client'

import { useState, useCallback } from 'react'
import type { Project, ProjectPhase, Task, TeamMember } from '@/types/entities'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { PhaseSection } from '@/components/phases/PhaseSection'
import { GanttChart } from '@/components/gantt/GanttChart'
import { TaskForm } from '@/components/forms/TaskForm'
import { ProjectForm } from '@/components/forms/ProjectForm'

// Helper to format dates for display
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—'
  if (date instanceof Date) return date.toLocaleDateString('he-IL')
  return new Date(date).toLocaleDateString('he-IL')
}

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

// Initial demo data
const createInitialProject = (): Project => ({
  id: 'proj-1',
  organization_id: 'org-1',
  name: 'ביקורת פיננסית שנתית 2026',
  description: 'ביקורת פיננסית מקיפה לרבעון הראשון של 2026',
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
})

const createInitialPhases = (): ProjectPhase[] => [
  {
    id: 'phase-1',
    project_id: 'proj-1',
    name: 'הכנה ותכנון',
    description: 'תכנון ראשוני והגדרת היקף',
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
    name: 'ביצוע ביקורת',
    description: 'ביצוע נהלי ביקורת',
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
    name: 'סיכום ודיווח',
    description: 'הכנת דוח סופי',
    phase_order: 2,
    order_index: 2,
    status: 'pending',
    start_date: '2026-03-01',
    end_date: '2026-03-31',
    total_tasks: 2,
    completed_tasks: 0,
    task_count: 2,
    completed_task_count: 0,
    created_at: new Date('2026-01-10T00:00:00Z'),
    updated_at: '2026-01-10T00:00:00Z',
  },
]

const createInitialTasks = (): Task[] => [
  {
    id: 'task-1', project_id: 'proj-1', phase_id: 'phase-1',
    title: 'הגדרת היקף הביקורת', description: 'קביעת יעדים והיקף',
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
    title: 'איסוף מסמכים', description: 'איסוף כל המסמכים הנדרשים',
    task_type: 'task', status: 'done', priority: 'medium',
    assignee_id: 'user-2', duration: 3,
    start_date: '2026-01-18', end_date: '2026-01-21', due_date: '2026-01-21',
    estimated_hours: 12, actual_hours: 14, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 2, is_critical: false,
    wbs_number: '1.2', order_index: 1,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-21T00:00:00Z'),
  },
  {
    id: 'task-3', project_id: 'proj-1', phase_id: 'phase-1',
    title: 'הכנת תוכנית ביקורת', description: 'תכנון מפורט של הביקורת',
    task_type: 'task', status: 'done', priority: 'high',
    assignee_id: 'user-1', duration: 2,
    start_date: '2026-01-22', end_date: '2026-01-24', due_date: '2026-01-24',
    estimated_hours: 16, actual_hours: 15, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '1.3', order_index: 2,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-24T00:00:00Z'),
  },
  {
    id: 'task-4', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'בדיקת מערכת כיבוי אש', description: 'ביקורת מערכת כיבוי האש',
    task_type: 'task', status: 'done', priority: 'critical',
    assignee_id: 'user-1', duration: 4,
    start_date: '2026-01-26', end_date: '2026-01-30', due_date: '2026-01-30',
    estimated_hours: 32, actual_hours: 28, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.1', order_index: 0,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-30T00:00:00Z'),
  },
  {
    id: 'task-5', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'בדיקת נהלי בטיחות', description: 'סקירת נהלי בטיחות',
    task_type: 'task', status: 'done', priority: 'high',
    assignee_id: 'user-2', duration: 5,
    start_date: '2026-01-31', end_date: '2026-02-05', due_date: '2026-02-05',
    estimated_hours: 40, actual_hours: 38, progress_percent: 100,
    es: null, ef: null, ls: null, lf: null, slack: 3, is_critical: false,
    wbs_number: '2.2', order_index: 1,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-02-05T00:00:00Z'),
  },
  {
    id: 'task-6', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'ראיון עובדים', description: 'ראיונות עם עובדי הארגון',
    task_type: 'task', status: 'in_progress', priority: 'high',
    assignee_id: 'user-3', duration: 6,
    start_date: '2026-02-06', end_date: '2026-02-13', due_date: '2026-02-13',
    estimated_hours: 48, actual_hours: 20, progress_percent: 40,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.3', order_index: 2,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-02-08T00:00:00Z'),
  },
  {
    id: 'task-7', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'תיעוד ממצאים', description: 'תיעוד כל הממצאים',
    task_type: 'task', status: 'pending', priority: 'medium',
    assignee_id: 'user-1', duration: 4,
    start_date: '2026-02-14', end_date: '2026-02-19', due_date: '2026-02-19',
    estimated_hours: 32, actual_hours: 0, progress_percent: 0,
    es: null, ef: null, ls: null, lf: null, slack: 2, is_critical: false,
    wbs_number: '2.4', order_index: 3,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-10T00:00:00Z'),
  },
  {
    id: 'task-8', project_id: 'proj-1', phase_id: 'phase-2',
    title: 'סיום שלב ביקורת', description: 'אבן דרך - סיום שלב הביקורת',
    task_type: 'milestone', status: 'pending', priority: 'critical',
    assignee_id: null, duration: 0,
    start_date: '2026-02-28', end_date: '2026-02-28', due_date: '2026-02-28',
    estimated_hours: 0, actual_hours: 0, progress_percent: 0,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '2.5', order_index: 4,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-10T00:00:00Z'),
  },
  {
    id: 'task-9', project_id: 'proj-1', phase_id: 'phase-3',
    title: 'הכנת דוח סופי', description: 'כתיבת הדוח הסופי',
    task_type: 'task', status: 'pending', priority: 'high',
    assignee_id: 'user-1', duration: 10,
    start_date: '2026-03-01', end_date: '2026-03-14', due_date: '2026-03-14',
    estimated_hours: 80, actual_hours: 0, progress_percent: 0,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '3.1', order_index: 0,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-10T00:00:00Z'),
  },
  {
    id: 'task-10', project_id: 'proj-1', phase_id: 'phase-3',
    title: 'הצגה להנהלה', description: 'הצגת ממצאים להנהלה',
    task_type: 'milestone', status: 'pending', priority: 'critical',
    assignee_id: 'user-1', duration: 0,
    start_date: '2026-03-31', end_date: '2026-03-31', due_date: '2026-03-31',
    estimated_hours: 4, actual_hours: 0, progress_percent: 0,
    es: null, ef: null, ls: null, lf: null, slack: 0, is_critical: true,
    wbs_number: '3.2', order_index: 1,
    created_at: new Date('2026-01-10T00:00:00Z'), updated_at: new Date('2026-01-10T00:00:00Z'),
  },
]

const createInitialTeamMembers = (): TeamMember[] => [
  {
    id: 'user-1', user_id: 'auth-user-1', project_id: 'proj-1',
    first_name: 'דני', last_name: 'כהן', email: 'dani@example.com',
    role: 'admin', employment_type: 'full_time', work_hours_per_day: 9,
    work_days: [0, 1, 2, 3, 4], hourly_rate: null,
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'user-2', user_id: 'auth-user-2', project_id: 'proj-1',
    first_name: 'מיכל', last_name: 'לוי', email: 'michal@example.com',
    role: 'member', employment_type: 'part_time', work_hours_per_day: 4,
    work_days: [0, 1, 2, 3], hourly_rate: 150,
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: 'user-3', user_id: 'auth-user-3', project_id: 'proj-1',
    first_name: 'יוסי', last_name: 'אברהם', email: 'yossi@example.com',
    role: 'member', employment_type: 'contractor', work_hours_per_day: 6,
    work_days: [0, 1, 2, 3, 4], hourly_rate: 200,
    created_at: new Date('2026-01-01T00:00:00Z'),
  },
]

type ViewMode = 'phases' | 'gantt'

export default function DashboardPage() {
  // State
  const [project, setProject] = useState<Project>(createInitialProject)
  const [phases, setPhases] = useState<ProjectPhase[]>(createInitialPhases)
  const [tasks, setTasks] = useState<Task[]>(createInitialTasks)
  const [teamMembers] = useState<TeamMember[]>(createInitialTeamMembers)

  const [viewMode, setViewMode] = useState<ViewMode>('phases')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)

  // Calculate stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const criticalTasks = tasks.filter(t => t.is_critical && t.status !== 'done').length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate days remaining
  const today = new Date()
  const endDate = project.end_date instanceof Date ? project.end_date : new Date(project.end_date || today)
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  // Get tasks for a phase
  const getTasksForPhase = useCallback((phaseId: string) => {
    return tasks.filter(t => t.phase_id === phaseId).sort((a, b) => (a.order_index || 0) - (b.order_index || 0))
  }, [tasks])

  // Get team member name
  const getTeamMemberName = useCallback((userId: string | null) => {
    if (!userId) return undefined
    const member = teamMembers.find(m => m.id === userId)
    return member ? `${member.first_name} ${member.last_name}` : undefined
  }, [teamMembers])

  // Build taskAssignees map for PhaseSection
  const taskAssignees = tasks.reduce((acc, task) => {
    if (task.assignee_id) {
      const member = teamMembers.find(m => m.id === task.assignee_id)
      if (member) acc[task.id] = member
    }
    return acc
  }, {} as Record<string, TeamMember>)

  // Handle task status change
  const handleTaskStatusChange = useCallback((taskId: string, newStatus: Task['status']) => {
    setTasks(prev => prev.map(task => {
      if (task.id === taskId) {
        const updated = { ...task, status: newStatus, updated_at: new Date() }
        if (newStatus === 'done') updated.progress_percent = 100
        return updated
      }
      return task
    }))
    // Update phase counts
    setPhases(prev => prev.map(phase => {
      const phaseTasks = tasks.filter(t => t.phase_id === phase.id)
      const completed = phaseTasks.filter(t =>
        t.id === taskId ? newStatus === 'done' : t.status === 'done'
      ).length
      return { ...phase, completed_tasks: completed, completed_task_count: completed }
    }))
  }, [tasks])

  // Handle add task
  const handleAddTask = useCallback((phaseId: string) => {
    setSelectedPhaseId(phaseId)
    setEditingTask(null)
    setIsTaskModalOpen(true)
  }, [])

  // Handle edit task
  const handleEditTask = useCallback((task: Task) => {
    setEditingTask(task)
    setSelectedPhaseId(task.phase_id)
    setIsTaskModalOpen(true)
  }, [])

  // Handle delete task
  const handleDeleteTask = useCallback((taskId: string) => {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }, [selectedTask])

  // Handle task form submit
  const handleTaskFormSubmit = useCallback((data: {
    title: string; description?: string; priority: Task['priority']
    duration: number; estimated_hours?: number; start_date?: string
  }) => {
    if (editingTask) {
      setTasks(prev => prev.map(task => task.id === editingTask.id ? { ...task, ...data, updated_at: new Date() } : task))
    } else {
      const newTask: Task = {
        id: generateId(), project_id: project.id, phase_id: selectedPhaseId,
        title: data.title, description: data.description || null, task_type: 'task',
        status: 'pending', priority: data.priority, assignee_id: null,
        duration: data.duration, start_date: data.start_date || null, end_date: null,
        due_date: null, estimated_hours: data.estimated_hours || null, actual_hours: 0,
        progress_percent: 0, es: null, ef: null, ls: null, lf: null, slack: 0,
        is_critical: false, wbs_number: null,
        order_index: tasks.filter(t => t.phase_id === selectedPhaseId).length,
        created_at: new Date(), updated_at: new Date(),
      }
      setTasks(prev => [...prev, newTask])
      setPhases(prev => prev.map(phase => phase.id === selectedPhaseId
        ? { ...phase, total_tasks: phase.total_tasks + 1, task_count: phase.task_count + 1 }
        : phase
      ))
    }
    setIsTaskModalOpen(false)
    setEditingTask(null)
    setSelectedPhaseId(null)
  }, [editingTask, project.id, selectedPhaseId, tasks])

  // Handle project form submit
  const handleProjectFormSubmit = useCallback((data: {
    name: string; description?: string; status: Project['status']
    start_date?: string; end_date?: string
  }) => {
    setProject(prev => ({
      ...prev, name: data.name, description: data.description || null, status: data.status,
      start_date: data.start_date ? new Date(data.start_date) : prev.start_date,
      end_date: data.end_date ? new Date(data.end_date) : prev.end_date,
      updated_at: new Date(),
    }))
    setIsProjectModalOpen(false)
  }, [])

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b-4 border-black">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-black tracking-tight">FLOWPLAN</h1>
              <Badge variant={project.status === 'active' ? 'success' : 'secondary'}>
                {project.status === 'active' ? 'פעיל' : project.status === 'completed' ? 'הושלם' : 'בארכיון'}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setIsProjectModalOpen(true)}>הגדרות פרויקט</Button>
              <Button onClick={() => handleAddTask(phases[0]?.id || '')}>+ משימה חדשה</Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Project Title */}
        <div className="mb-6">
          <h2 className="text-3xl font-bold mb-2">{project.name}</h2>
          {project.description && <p className="text-gray-600">{project.description}</p>}
          <div className="flex gap-4 mt-2 text-sm text-gray-500">
            <span>התחלה: {formatDate(project.start_date)}</span>
            <span>סיום: {formatDate(project.end_date)}</span>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">התקדמות</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black">{progressPercent}%</div>
              <div className="w-full bg-gray-200 h-2 mt-2"><div className="bg-black h-2" style={{ width: `${progressPercent}%` }} /></div>
            </CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">משימות</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black">{completedTasks}/{totalTasks}</div><div className="text-sm text-gray-500">הושלמו</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">ימים נותרים</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black">{daysRemaining}</div><div className="text-sm text-gray-500">עד סיום</div></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium text-gray-500">Critical Path</CardTitle></CardHeader>
            <CardContent><div className="text-3xl font-black text-red-600">{criticalTasks}</div><div className="text-sm text-gray-500">משימות קריטיות</div></CardContent></Card>
        </div>

        {/* View Toggle */}
        <div className="flex gap-2 mb-6">
          <Button variant={viewMode === 'phases' ? 'default' : 'outline'} onClick={() => setViewMode('phases')}>תצוגת שלבים</Button>
          <Button variant={viewMode === 'gantt' ? 'default' : 'outline'} onClick={() => setViewMode('gantt')}>Gantt Chart</Button>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          <div className="flex-1">
            {viewMode === 'phases' ? (
              <div className="space-y-4">
                {phases.map(phase => (
                  <PhaseSection key={phase.id} phase={phase} tasks={getTasksForPhase(phase.id)}
                    taskAssignees={taskAssignees} onTaskClick={setSelectedTask}
                    onTaskStatusChange={handleTaskStatusChange} onAddTask={() => handleAddTask(phase.id)} />
                ))}
              </div>
            ) : (
              <GanttChart tasks={tasks} dependencies={[]} onTaskClick={setSelectedTask} showTodayMarker />
            )}
          </div>

          {/* Task Detail Sidebar */}
          {selectedTask && (
            <div className="w-80 flex-shrink-0">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{selectedTask.title}</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTask(null)}>✕</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div><div className="text-sm font-medium text-gray-500">סטטוס</div>
                    <Badge variant={selectedTask.status === 'done' ? 'success' : selectedTask.status === 'in_progress' ? 'high' : 'secondary'}>
                      {selectedTask.status === 'done' ? 'הושלם' : selectedTask.status === 'in_progress' ? 'בביצוע' : 'ממתין'}
                    </Badge></div>
                  <div><div className="text-sm font-medium text-gray-500">עדיפות</div>
                    <Badge variant={selectedTask.priority as 'critical' | 'high' | 'medium' | 'low'}>
                      {selectedTask.priority === 'critical' ? 'קריטי' : selectedTask.priority === 'high' ? 'גבוה' : selectedTask.priority === 'medium' ? 'בינוני' : 'נמוך'}
                    </Badge></div>
                  {selectedTask.description && <div><div className="text-sm font-medium text-gray-500">תיאור</div><p className="text-sm">{selectedTask.description}</p></div>}
                  <div><div className="text-sm font-medium text-gray-500">משך</div><p className="text-sm">{selectedTask.duration} ימי עבודה</p></div>
                  {selectedTask.assignee_id && <div><div className="text-sm font-medium text-gray-500">אחראי</div><p className="text-sm">{getTeamMemberName(selectedTask.assignee_id)}</p></div>}
                  {selectedTask.is_critical && (
                    <div className="p-2 bg-red-50 border border-red-200 rounded">
                      <div className="text-sm font-medium text-red-700">■ Critical Path</div>
                      <p className="text-xs text-red-600">משימה על הנתיב הקריטי</p>
                    </div>
                  )}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEditTask(selectedTask)}>עריכה</Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteTask(selectedTask.id)}>מחיקה</Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>

      {/* Task Modal */}
      <Modal isOpen={isTaskModalOpen} onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setSelectedPhaseId(null) }}
        title={editingTask ? 'עריכת משימה' : 'משימה חדשה'} size="md">
        <TaskForm mode={editingTask ? 'edit' : 'create'}
          initialValues={editingTask ? { title: editingTask.title, description: editingTask.description || undefined,
            priority: editingTask.priority, duration: editingTask.duration,
            estimated_hours: editingTask.estimated_hours || undefined,
            start_date: typeof editingTask.start_date === 'string' ? editingTask.start_date : undefined } : undefined}
          onSubmit={handleTaskFormSubmit}
          onCancel={() => { setIsTaskModalOpen(false); setEditingTask(null); setSelectedPhaseId(null) }} />
      </Modal>

      {/* Project Modal */}
      <Modal isOpen={isProjectModalOpen} onClose={() => setIsProjectModalOpen(false)} title="הגדרות פרויקט" size="md">
        <ProjectForm mode="edit"
          initialValues={{ name: project.name, description: project.description || undefined, status: project.status,
            start_date: project.start_date instanceof Date ? project.start_date.toISOString().split('T')[0] : project.start_date || undefined,
            end_date: project.end_date instanceof Date ? project.end_date.toISOString().split('T')[0] : project.end_date || undefined }}
          onSubmit={handleProjectFormSubmit} onCancel={() => setIsProjectModalOpen(false)} />
      </Modal>
    </div>
  )
}
