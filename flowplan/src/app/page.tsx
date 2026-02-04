'use client'

import { useState, useCallback, useMemo, useEffect } from 'react'
import { cn, calculateEndDate } from '@/lib/utils'
import type { Project, ProjectPhase, Task, TeamMember } from '@/types/entities'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Modal } from '@/components/ui/modal'
import { PhaseSection } from '@/components/phases/PhaseSection'
import { GanttChart } from '@/components/gantt/GanttChart'
import { TaskForm } from '@/components/forms/TaskForm'
import { ProjectForm } from '@/components/forms/ProjectForm'
import { PhaseForm } from '@/components/forms/PhaseForm'
import { Plus, Clock, Calendar, User, AlertTriangle, Loader2 } from 'lucide-react'

// React Query hooks
import { useProjects, useCreateProject } from '@/hooks/use-projects'
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '@/hooks/use-tasks'
import { usePhases, useCreatePhase } from '@/hooks/use-phases'
import { useTeamMembersByProject, useTeamMembers } from '@/hooks/use-team-members'

// Default organization ID (will be replaced with auth later)
const DEFAULT_ORG_ID = 'org-default'

// Helper to format dates for display
const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return '—'
  if (date instanceof Date) return date.toLocaleDateString('he-IL')
  return new Date(date).toLocaleDateString('he-IL')
}

type ViewMode = 'phases' | 'gantt'

export default function DashboardPage() {
  // Fetch projects for the organization
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(DEFAULT_ORG_ID)

  // Get the first project (or null if none)
  const project = projects[0] || null
  const projectId = project?.id || ''

  // Fetch data for the current project
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks(projectId, undefined)
  const { data: phases = [], isLoading: isLoadingPhases } = usePhases(projectId)

  // Fetch team members: Use organization-level members for task assignment
  // This ensures team members show up in the assignee dropdown even if not yet
  // assigned to the specific project via project_members table
  const { data: projectTeamMembers = [], isLoading: isLoadingProjectTeam } = useTeamMembersByProject(projectId)
  const { data: orgTeamMembers = [], isLoading: isLoadingOrgTeam } = useTeamMembers(DEFAULT_ORG_ID)

  // Combine team members: prefer org-level members, fall back to project members
  // This provides a better UX where users can assign any org member to a task
  const teamMembers = useMemo(() => {
    // If we have org-level members, use them
    if (orgTeamMembers.length > 0) {
      return orgTeamMembers
    }
    // Otherwise fall back to project-assigned members
    return projectTeamMembers
  }, [orgTeamMembers, projectTeamMembers])

  const isLoadingTeam = isLoadingProjectTeam || isLoadingOrgTeam

  // Mutations
  const createProjectMutation = useCreateProject()
  const createTaskMutation = useCreateTask()
  const updateTaskMutation = useUpdateTask()
  const deleteTaskMutation = useDeleteTask()
  const createPhaseMutation = useCreatePhase()

  // UI State
  const [viewMode, setViewMode] = useState<ViewMode>('phases')
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isPhaseModalOpen, setIsPhaseModalOpen] = useState(false)
  const [phaseErrorMessage, setPhaseErrorMessage] = useState<string | null>(null)
  const [taskErrorMessage, setTaskErrorMessage] = useState<string | null>(null)

  // Loading state
  const isLoading = isLoadingProjects || (projectId && (isLoadingTasks || isLoadingPhases || isLoadingTeam))

  // Sync selectedTask with updated tasks from React Query
  // This ensures the sidebar shows fresh data when tasks are updated
  useEffect(() => {
    if (selectedTask) {
      const updatedTask = tasks.find(t => t.id === selectedTask.id)
      if (updatedTask && JSON.stringify(updatedTask) !== JSON.stringify(selectedTask)) {
        setSelectedTask(updatedTask)
      }
    }
  }, [tasks, selectedTask])

  // Calculate stats
  const totalTasks = tasks.length
  const completedTasks = tasks.filter(t => t.status === 'done').length
  const criticalTasks = tasks.filter(t => t.is_critical && t.status !== 'done').length
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Calculate days remaining
  const today = new Date()
  const endDate = project?.end_date
    ? (project.end_date instanceof Date ? project.end_date : new Date(project.end_date))
    : today
  const daysRemaining = Math.max(0, Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)))

  // Get tasks for a phase
  const getTasksForPhase = useCallback((phaseId: string) => {
    return tasks.filter(t => t.phase_id === phaseId)
  }, [tasks])

  // Calculate phase status based on tasks
  const calculatePhaseStatus = useCallback((phaseTasks: Task[]): 'pending' | 'active' | 'completed' => {
    if (phaseTasks.length === 0) return 'pending'

    const allDone = phaseTasks.every(t => t.status === 'done')
    if (allDone) return 'completed'

    const hasActiveOrDone = phaseTasks.some(t => t.status === 'in_progress' || t.status === 'done')
    if (hasActiveOrDone) return 'active'

    return 'pending'
  }, [])

  // Get phase with calculated status
  const getPhaseWithCalculatedStatus = useCallback((phase: ProjectPhase): ProjectPhase => {
    const phaseTasks = getTasksForPhase(phase.id)
    const calculatedStatus = calculatePhaseStatus(phaseTasks)
    return { ...phase, status: calculatedStatus }
  }, [getTasksForPhase, calculatePhaseStatus])

  // Get team member name - supports both display_name and first_name/last_name
  const getTeamMemberName = useCallback((memberId: string | null) => {
    if (!memberId) return undefined
    const member = teamMembers.find(m => m.id === memberId)
    if (!member) return undefined
    // Prefer display_name, fall back to first_name + last_name
    if (member.display_name) return member.display_name
    if (member.first_name || member.last_name) {
      return `${member.first_name || ''} ${member.last_name || ''}`.trim()
    }
    return member.email // Last resort: show email
  }, [teamMembers])

  // Build taskAssignees map for PhaseSection
  const taskAssignees = useMemo(() => {
    return tasks.reduce((acc, task) => {
      if (task.assignee_id) {
        const member = teamMembers.find(m => m.id === task.assignee_id)
        if (member) acc[task.id] = member
      }
      return acc
    }, {} as Record<string, TeamMember>)
  }, [tasks, teamMembers])

  // Handle task status change
  const handleTaskStatusChange = useCallback((taskId: string, newStatus: Task['status']) => {
    const task = tasks.find(t => t.id === taskId)
    if (!task) return

    updateTaskMutation.mutate({
      id: taskId,
      updates: {
        status: newStatus,
      }
    })
  }, [tasks, updateTaskMutation])

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
    deleteTaskMutation.mutate(taskId)
    if (selectedTask?.id === taskId) setSelectedTask(null)
  }, [selectedTask, deleteTaskMutation])

  // Handle task form submit
  const handleTaskFormSubmit = useCallback((data: {
    title: string; description?: string; priority: Task['priority']
    duration: number; estimated_hours?: number; start_date?: string; assignee_id?: string
  }) => {
    setTaskErrorMessage(null) // Clear previous errors
    if (editingTask) {
      // Update existing task
      updateTaskMutation.mutate({
        id: editingTask.id,
        updates: {
          title: data.title,
          description: data.description || null,
          priority: data.priority,
          duration: data.duration,
          estimated_hours: data.estimated_hours || null,
          start_date: data.start_date || null,
          assignee_id: data.assignee_id || null,
        }
      }, {
        onSuccess: () => {
          setIsTaskModalOpen(false)
          setEditingTask(null)
          setSelectedPhaseId(null)
          setTaskErrorMessage(null)
        },
        onError: (error) => {
          console.error('Failed to update task:', error)
          setTaskErrorMessage(error instanceof Error ? error.message : 'שגיאה בעדכון המשימה')
        }
      })
    } else {
      // Create new task
      createTaskMutation.mutate({
        project_id: projectId,
        phase_id: selectedPhaseId,
        title: data.title,
        description: data.description || null,
        priority: data.priority,
        duration: data.duration,
        estimated_hours: data.estimated_hours || null,
        start_date: data.start_date || null,
        assignee_id: data.assignee_id || null,
        status: 'pending',
      }, {
        onSuccess: () => {
          setIsTaskModalOpen(false)
          setEditingTask(null)
          setSelectedPhaseId(null)
          setTaskErrorMessage(null)
        },
        onError: (error) => {
          console.error('Failed to create task:', error)
          setTaskErrorMessage(error instanceof Error ? error.message : 'שגיאה ביצירת המשימה')
        }
      })
    }
  }, [editingTask, projectId, selectedPhaseId, createTaskMutation, updateTaskMutation])

  // Handle project form submit (for creating first project)
  const handleProjectFormSubmit = useCallback((data: {
    name: string; description?: string; status: Project['status']
    start_date?: string; end_date?: string
  }) => {
    setErrorMessage(null) // Clear previous errors
    createProjectMutation.mutate({
      name: data.name,
      description: data.description || null,
      status: data.status,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    }, {
      onSuccess: () => {
        setIsProjectModalOpen(false)
        setErrorMessage(null)
      },
      onError: (error) => {
        console.error('Failed to create project:', error)
        setErrorMessage(error instanceof Error ? error.message : 'שגיאה ביצירת הפרויקט')
      }
    })
  }, [createProjectMutation])

  // Handle phase form submit (for creating new phases)
  const handlePhaseFormSubmit = useCallback((data: {
    name: string; description?: string; start_date?: string; end_date?: string
  }) => {
    setPhaseErrorMessage(null) // Clear previous errors
    createPhaseMutation.mutate({
      project_id: projectId,
      name: data.name,
      description: data.description || null,
      phase_order: phases.length + 1,
      start_date: data.start_date || null,
      end_date: data.end_date || null,
    }, {
      onSuccess: () => {
        setIsPhaseModalOpen(false)
        setPhaseErrorMessage(null)
      },
      onError: (error) => {
        console.error('Failed to create phase:', error)
        setPhaseErrorMessage(error instanceof Error ? error.message : 'שגיאה ביצירת השלב')
      }
    })
  }, [projectId, phases.length, createPhaseMutation])

  // Loading UI
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-lg">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // No project - show create project UI
  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <div className="text-center max-w-md">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Plus className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">ברוכים הבאים ל-FlowPlan</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-8">
            צור את הפרויקט הראשון שלך כדי להתחיל לנהל משימות וביקורות
          </p>
          <Button
            className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold"
            onClick={() => setIsProjectModalOpen(true)}
          >
            צור פרויקט חדש
          </Button>
        </div>

        {/* Create Project Modal */}
        <Modal
          isOpen={isProjectModalOpen}
          onClose={() => !createProjectMutation.isPending && setIsProjectModalOpen(false)}
          title="פרויקט חדש"
          size="md"
        >
          {errorMessage && (
            <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
              {errorMessage}
            </div>
          )}
          <ProjectForm
            mode="create"
            onSubmit={handleProjectFormSubmit}
            onCancel={() => !createProjectMutation.isPending && setIsProjectModalOpen(false)}
            isLoading={createProjectMutation.isPending}
          />
        </Modal>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background font-display" dir="rtl">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-3">
            <Button
              className="bg-primary hover:bg-blue-600 text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-all shadow-lg shadow-primary/20"
              onClick={() => handleAddTask(phases[0]?.id || '')}
              disabled={phases.length === 0}
            >
              <span className="material-icons text-lg">add</span>
              משימה חדשה
            </Button>
            <Button
              variant="outline"
              className="bg-surface border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 transition-colors"
              onClick={() => setIsPhaseModalOpen(true)}
            >
              <span className="material-icons text-lg">layers</span>
              שלב חדש
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
                  {project.status === 'active' ? 'פעיל' : project.status === 'completed' ? 'הושלם' : 'בהמתנה'}
                </span>
                <span className="text-slate-400 text-sm">פרויקט #{project.id.slice(0, 8)}</span>
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
            {phases.length === 0 ? (
              <div className="text-center py-16 bg-surface rounded-2xl border border-slate-200 dark:border-slate-800">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="material-icons text-3xl text-primary">layers</span>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-lg mb-4">אין שלבים בפרויקט זה עדיין</p>
                <p className="text-slate-400 text-sm mb-6">צור שלב ראשון כדי להתחיל להוסיף משימות</p>
                <Button
                  className="bg-primary hover:bg-blue-600 text-white px-6 py-2.5 rounded-lg font-semibold"
                  onClick={() => setIsPhaseModalOpen(true)}
                >
                  צור שלב ראשון
                </Button>
              </div>
            ) : viewMode === 'phases' ? (
              <div className="space-y-4 fp-stagger">
                {phases.map(phase => {
                  const phaseWithStatus = getPhaseWithCalculatedStatus(phase)
                  return (
                    <PhaseSection key={phase.id} phase={phaseWithStatus} tasks={getTasksForPhase(phase.id)}
                      taskAssignees={taskAssignees} onTaskClick={setSelectedTask}
                      onTaskStatusChange={handleTaskStatusChange} onAddTask={() => handleAddTask(phase.id)} />
                  )
                })}
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
                        <div className="text-sm font-bold">
                          {formatDate(selectedTask.start_date)} - {
                            selectedTask.end_date
                              ? formatDate(selectedTask.end_date)
                              : selectedTask.start_date && selectedTask.duration > 0
                                ? formatDate(calculateEndDate(selectedTask.start_date, selectedTask.duration))
                                : '—'
                          }
                        </div>
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
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600 text-white border-0 h-12 shadow-lg shadow-red-500/20 rounded-xl font-bold"
                    onClick={() => handleDeleteTask(selectedTask.id)}
                    disabled={deleteTaskMutation.isPending}
                  >
                    {deleteTaskMutation.isPending ? 'מוחק...' : 'מחק משימה'}
                  </Button>
                  <Button
                    className="flex-1 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-900 dark:text-white border-0 h-12 rounded-xl font-bold"
                    onClick={() => handleEditTask(selectedTask)}
                  >
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
        onClose={() => {
          if (!createTaskMutation.isPending && !updateTaskMutation.isPending) {
            setIsTaskModalOpen(false)
            setEditingTask(null)
            setSelectedPhaseId(null)
            setTaskErrorMessage(null)
          }
        }}
        title={editingTask ? 'עריכת משימה' : 'משימה חדשה'}
        size="md"
      >
        {taskErrorMessage && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {taskErrorMessage}
          </div>
        )}
        <TaskForm
          mode={editingTask ? 'edit' : 'create'}
          initialValues={editingTask ? {
            title: editingTask.title,
            description: editingTask.description || undefined,
            priority: editingTask.priority,
            duration: editingTask.duration,
            estimated_hours: editingTask.estimated_hours || undefined,
            start_date: typeof editingTask.start_date === 'string' ? editingTask.start_date : undefined,
            assignee_id: editingTask.assignee_id || undefined
          } : undefined}
          teamMembers={teamMembers}
          onSubmit={handleTaskFormSubmit}
          onCancel={() => {
            if (!createTaskMutation.isPending && !updateTaskMutation.isPending) {
              setIsTaskModalOpen(false)
              setEditingTask(null)
              setSelectedPhaseId(null)
              setTaskErrorMessage(null)
            }
          }}
          isLoading={createTaskMutation.isPending || updateTaskMutation.isPending}
        />
      </Modal>

      {/* Project Modal */}
      <Modal
        isOpen={isProjectModalOpen}
        onClose={() => !createProjectMutation.isPending && setIsProjectModalOpen(false)}
        title={project ? "הגדרות פרויקט" : "פרויקט חדש"}
        size="md"
      >
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {errorMessage}
          </div>
        )}
        <ProjectForm
          mode={project ? "edit" : "create"}
          initialValues={project ? {
            name: project.name,
            description: project.description || undefined,
            status: project.status,
            start_date: project.start_date instanceof Date ? project.start_date.toISOString().split('T')[0] : project.start_date || undefined,
            end_date: project.end_date instanceof Date ? project.end_date.toISOString().split('T')[0] : project.end_date || undefined
          } : undefined}
          onSubmit={handleProjectFormSubmit}
          onCancel={() => !createProjectMutation.isPending && setIsProjectModalOpen(false)}
          isLoading={createProjectMutation.isPending}
        />
      </Modal>

      {/* Phase Modal */}
      <Modal
        isOpen={isPhaseModalOpen}
        onClose={() => {
          if (!createPhaseMutation.isPending) {
            setIsPhaseModalOpen(false)
            setPhaseErrorMessage(null)
          }
        }}
        title="שלב חדש"
        size="md"
      >
        {phaseErrorMessage && (
          <div className="mb-4 p-3 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 text-sm">
            {phaseErrorMessage}
          </div>
        )}
        <PhaseForm
          mode="create"
          onSubmit={handlePhaseFormSubmit}
          onCancel={() => {
            if (!createPhaseMutation.isPending) {
              setIsPhaseModalOpen(false)
              setPhaseErrorMessage(null)
            }
          }}
          isLoading={createPhaseMutation.isPending}
        />
      </Modal>
    </div>
  )
}
