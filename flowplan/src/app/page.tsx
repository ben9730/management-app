'use client'

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { Project, ProjectPhase, Task, TeamMember } from '@/types/entities'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { PhaseSection } from '@/components/phases/PhaseSection'
import { GanttChart } from '@/components/gantt/GanttChart'
import { TaskForm } from '@/components/forms/TaskForm'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { Plus, Settings, LayoutDashboard, GanttChartIcon, Calendar, CheckCircle2, AlertTriangle, TrendingUp, Clock, Target, User } from 'lucide-react'

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
    <div className="min-h-screen bg-background font-display" dir="rtl">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              onClick={() => handleAddTask(phases[0]?.id || '')}
            >
              <span className="material-icons text-lg">add</span>
              משימה חדשה
            </Button>
            <Button
              variant="outline"
              className="bg-surface border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              onClick={() => setIsProjectModalOpen(true)}
            >
              <span className="material-icons text-lg">settings</span>
              הגדרות פרויקט
            </Button>
          </div>
          <div className="flex items-center gap-2 bg-slate-200/50 dark:bg-slate-800 p-1 rounded-xl">
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'phases' ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
              )}
              onClick={() => setViewMode('phases')}
            >
              תצוגת רשימה
            </button>
            <button
              className={cn(
                "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                viewMode === 'gantt' ? "bg-white dark:bg-slate-700 shadow-sm" : "text-slate-500 dark:text-slate-400 hover:bg-white/50 dark:hover:bg-slate-700/50"
              )}
              onClick={() => setViewMode('gantt')}
            >
              תרשים גאנט
            </button>
          </div>
        </div>

        {/* Project Hero Area */}
        <div className="bg-surface rounded-2xl p-8 mb-8 border border-slate-200 dark:border-slate-800 custom-shadow overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl"></div>

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <span className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-1 rounded-md text-xs font-bold uppercase tracking-wider">
                  {project.status === 'active' ? 'פעיל' : 'הושלם'}
                </span>
                <span className="text-slate-400 text-sm">פרויקט #F-2026</span>
              </div>
              <h1 className="text-3xl font-extrabold mb-2 text-foreground">{project.name}</h1>
              <p className="text-slate-500 dark:text-slate-400 max-w-xl">{project.description}</p>
            </div>
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
              <div className="text-right">
                <p>התחלה: <span className="font-semibold text-foreground">{formatDate(project.start_date)}</span></p>
                <p>סיום משוער: <span className="font-semibold text-foreground">{formatDate(project.end_date)}</span></p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-10 relative">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-white dark:hover:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">נתיב קריטי</span>
                <span className="material-icons text-red-500">priority_high</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-red-500">{criticalTasks}</span>
                <span className="text-xs text-slate-400">משימות קריטיות</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-white dark:hover:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">ימים נותרים</span>
                <span className="material-icons text-blue-500">schedule</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{daysRemaining}</span>
                <span className="text-xs text-slate-400">עד לסיום</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-white dark:hover:bg-slate-800">
              <div className="flex items-center justify-between mb-2">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">התקדמות משימות</span>
                <span className="material-icons text-amber-500">fact_check</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-foreground">{completedTasks}/{totalTasks}</span>
                <span className="text-xs text-slate-400">הושלמו</span>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-100 dark:border-slate-700/50 transition-all hover:bg-white dark:hover:bg-slate-800">
              <div className="flex items-center justify-between mb-4">
                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">אחוז ביצוע</span>
                <span className="text-primary font-bold">{progressPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${progressPercent}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex gap-6">
          <div className="flex-1">
            {viewMode === 'phases' ? (
              <div className="space-y-4 fp-stagger">
                {phases.map(phase => (
                  <PhaseSection key={phase.id} phase={phase} tasks={getTasksForPhase(phase.id)}
                    taskAssignees={taskAssignees} onTaskClick={setSelectedTask}
                    onTaskStatusChange={handleTaskStatusChange} onAddTask={() => handleAddTask(phase.id)} />
                ))}
              </div>
            ) : (
              <div className="fp-card p-4">
                <GanttChart tasks={tasks} dependencies={[]} onTaskClick={setSelectedTask} showTodayMarker />
              </div>
            )}
          </div>

          {/* Task Detail Sidebar */}
          {selectedTask && (
            <div className="w-[450px] flex-shrink-0 fp-animate-slide-in sticky top-24 self-start">
              <div className="bg-surface text-foreground shadow-2xl rounded-2xl overflow-hidden flex flex-col min-h-[600px] border border-slate-200 dark:border-slate-800">
                <div className="p-8 flex-1">
                  <div className="flex items-center justify-between mb-8">
                    <Badge className={cn(
                      "rounded-full px-4 py-1.5 text-[10px] font-bold border-0 uppercase tracking-widest",
                      selectedTask.priority === 'critical' ? 'bg-red-500/20 text-red-100' :
                        selectedTask.priority === 'high' ? 'bg-orange-500/20 text-orange-100' :
                          'bg-blue-500/20 text-blue-100'
                    )}>
                      {selectedTask.priority === 'critical' ? 'עדיפות קריטית' : 'עדיפות רגילה'}
                    </Badge>
                    <button onClick={() => setSelectedTask(null)} className="text-slate-400 hover:text-white transition-colors">
                      <Plus className="w-8 h-8 rotate-45" />
                    </button>
                  </div>

                  <h2 className="text-3xl font-black mb-8 leading-tight">{selectedTask.title}</h2>

                  <div className="space-y-6 mb-10">
                    <div className="flex items-center gap-4 text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">זמן מוערך</div>
                        <div className="text-sm font-bold">{selectedTask.duration} ימים</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-slate-300">
                      <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">לוח זמנים</div>
                        <div className="text-sm font-bold">{formatDate(selectedTask.start_date)} - {formatDate(selectedTask.due_date)}</div>
                      </div>
                    </div>
                    {selectedTask.assignee_id && (
                      <div className="flex items-center gap-4 text-slate-300">
                        <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-slate-400">
                          <User className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">אחראי</div>
                          <div className="text-sm font-bold">{getTeamMemberName(selectedTask.assignee_id)}</div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mb-8">
                    <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-3">תיאור המשימה</div>
                    <p className="text-slate-400 leading-relaxed font-medium">
                      {selectedTask.description || 'אין תיאור זמין למשימה זו.'}
                    </p>
                  </div>

                  {/* Critical Path Alert */}
                  {selectedTask.priority === 'critical' && (
                    <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20 flex gap-4">
                      <AlertTriangle className="w-6 h-6 text-red-400 shrink-0" />
                      <div>
                        <div className="text-sm font-bold text-red-100 mb-1">משימה בנתיב הקריטי</div>
                        <div className="text-xs text-red-200/60 font-medium leading-relaxed">עיכוב במשימה זו ישפיע ישירות על תאריך סיום הפרויקט.</div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-8 bg-slate-800/30 flex gap-4">
                  <Button className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0 h-12 shadow-lg shadow-red-500/20 rounded-xl font-bold" onClick={() => handleDeleteTask(selectedTask.id)}>
                    מחק משימה
                  </Button>
                  <Button className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white border-0 h-12 rounded-xl font-bold" onClick={() => handleEditTask(selectedTask)}>
                    עריכת משימה
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Task Modal */}
      <Modal
        isOpen={isTaskModalOpen}
        onClose={() => { setIsTaskModalOpen(false); setEditingTask(null); setSelectedPhaseId(null) }}
        title={editingTask ? 'עריכת משימה' : 'משימה חדשה'}
        size="md"
      >
        <TaskForm
          mode={editingTask ? 'edit' : 'create'}
          initialValues={editingTask ? {
            title: editingTask.title,
            description: editingTask.description || undefined,
            priority: editingTask.priority,
            duration: editingTask.duration,
            estimated_hours: editingTask.estimated_hours || undefined,
            start_date: typeof editingTask.start_date === 'string' ? editingTask.start_date : undefined
          } : undefined}
          onSubmit={handleTaskFormSubmit}
          onCancel={() => { setIsTaskModalOpen(false); setEditingTask(null); setSelectedPhaseId(null) }}
        />
      </Modal>

      {/* Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        title="הגדרות פרויקט"
        size="md"
      >
        <ProjectForm
          mode="edit"
          initialValues={{
            name: project.name,
            description: project.description || undefined,
            status: project.status,
            start_date: project.start_date instanceof Date ? project.start_date.toISOString().split('T')[0] : project.start_date || undefined,
            end_date: project.end_date instanceof Date ? project.end_date.toISOString().split('T')[0] : project.end_date || undefined
          }}
          onSubmit={handleProjectFormSubmit}
          onCancel={() => setIsProjectModalOpen(false)}
        />
      </Modal>
    </div>
  )
}
