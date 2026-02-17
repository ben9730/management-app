/**
 * DependencyManager Component
 *
 * Manages task dependencies: shows existing, allows adding/removing.
 * Shown in the task edit modal below the task form.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { useDependenciesForTask, useCreateDependency, useDeleteDependency } from '@/hooks/use-dependencies'
import { useScheduling } from '@/hooks/use-scheduling'
import type { Task, DependencyType, Dependency } from '@/types/entities'
import { useDependencies } from '@/hooks/use-dependencies'

interface DependencyManagerProps {
  task: Task
  allTasks: Task[]
  projectId: string
  projectStartDate: Date | string | null
  className?: string
}

const depTypeOptions = [
  { value: 'FS', label: 'FS (סיום-התחלה)' },
  { value: 'SS', label: 'SS (התחלה-התחלה)' },
  { value: 'FF', label: 'FF (סיום-סיום)' },
  { value: 'SF', label: 'SF (התחלה-סיום)' },
]

function DependencyManagerComponent({
  task,
  allTasks,
  projectId,
  projectStartDate,
  className,
}: DependencyManagerProps) {
  const { data: taskDeps = [], isLoading } = useDependenciesForTask(task.id)
  const { data: allDeps = [] } = useDependencies(projectId)
  const createDependency = useCreateDependency()
  const deleteDependency = useDeleteDependency()
  const { recalculate } = useScheduling(projectId, projectStartDate)

  // Start collapsed -- user clicks "Add dependency" button to expand
  const [isAdding, setIsAdding] = React.useState(false)
  const [newDepTaskId, setNewDepTaskId] = React.useState('')
  const [newDepType, setNewDepType] = React.useState<DependencyType>('FS')
  const [newDepLag, setNewDepLag] = React.useState(0)
  const [error, setError] = React.useState<string | null>(null)

  // Split dependencies into predecessors and successors
  const predecessors = taskDeps.filter(d => d.successor_id === task.id)
  const successors = taskDeps.filter(d => d.predecessor_id === task.id)

  // Available tasks for dependency (exclude self and already-linked)
  const linkedTaskIds = new Set([
    task.id,
    ...predecessors.map(d => d.predecessor_id),
  ])
  const availableTasks = allTasks.filter(t => !linkedTaskIds.has(t.id))

  const taskNameMap = React.useMemo(() => {
    const map: Record<string, string> = {}
    for (const t of allTasks) {
      map[t.id] = t.title
    }
    return map
  }, [allTasks])

  const handleAdd = React.useCallback(async () => {
    if (!newDepTaskId) {
      setError('יש לבחור משימה')
      return
    }
    setError(null)

    try {
      const newDep = await createDependency.mutateAsync({
        predecessor_id: newDepTaskId,
        successor_id: task.id,
        type: newDepType,
        lag_days: newDepLag,
      })
      // Build updated deps array immediately (don't wait for cache)
      const updatedDeps = [...allDeps, newDep]
      // Recalculate with fresh dependencies (synchronous — updates cache immediately)
      recalculate(undefined, updatedDeps)

      // Reset form
      setNewDepTaskId('')
      setNewDepType('FS')
      setNewDepLag(0)
      setIsAdding(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה ביצירת תלות')
    }
  }, [newDepTaskId, newDepType, newDepLag, task.id, createDependency, allDeps, recalculate])

  const handleDelete = React.useCallback(async (depId: string) => {
    setError(null)
    try {
      await deleteDependency.mutateAsync(depId)
      // Build updated deps array immediately (don't wait for cache)
      const updatedDeps = allDeps.filter(d => d.id !== depId)
      // Recalculate with fresh dependencies (synchronous — updates cache immediately)
      recalculate(undefined, updatedDeps)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'שגיאה במחיקת תלות'
      setError(msg)
      console.error('Failed to delete dependency:', err)
    }
  }, [deleteDependency, allDeps, recalculate])

  const formatDepLabel = (dep: Dependency, linkedTaskId: string) => {
    const lagStr = dep.lag_days !== 0
      ? ` ${dep.lag_days > 0 ? '+' : ''}${dep.lag_days}d`
      : ''
    return `${taskNameMap[linkedTaskId] || linkedTaskId.slice(0, 8)} — ${dep.type}${lagStr}`
  }

  return (
    <div className={cn('space-y-4', className)} dir="rtl">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          תלויות ({predecessors.length + successors.length})
        </h4>
        {!isAdding && (
          <Button
            type="button"
            variant="ghost"
            className="text-xs text-primary hover:text-blue-400 px-2 py-1"
            onClick={() => setIsAdding(true)}
          >
            <Plus className="w-3.5 h-3.5 ml-1" />
            הוסף תלות
          </Button>
        )}
      </div>

      {/* Error feedback (visible for both add and delete errors) */}
      {error && !isAdding && (
        <p className="text-xs text-red-400">{error}</p>
      )}

      {/* Predecessors */}
      {predecessors.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            קודמות (predecessors)
          </div>
          {predecessors.map(dep => (
            <div
              key={dep.id}
              className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
                <span>{formatDepLabel(dep, dep.predecessor_id)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(dep.id)}
                className={cn(
                  'transition-colors p-1',
                  deleteDependency.isPending
                    ? 'text-slate-600 cursor-wait'
                    : 'text-slate-500 hover:text-red-400'
                )}
                disabled={deleteDependency.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Successors */}
      {successors.length > 0 && (
        <div className="space-y-2">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            עוקבות (successors)
          </div>
          {successors.map(dep => (
            <div
              key={dep.id}
              className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2 border border-slate-700/50"
            >
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <ArrowLeft className="w-3.5 h-3.5 text-slate-500 rotate-180" />
                <span>{formatDepLabel(dep, dep.successor_id)}</span>
              </div>
              <button
                type="button"
                onClick={() => handleDelete(dep.id)}
                className={cn(
                  'transition-colors p-1',
                  deleteDependency.isPending
                    ? 'text-slate-600 cursor-wait'
                    : 'text-slate-500 hover:text-red-400'
                )}
                disabled={deleteDependency.isPending}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {predecessors.length === 0 && successors.length === 0 && !isAdding && (
        <p className="text-sm text-slate-500 text-center py-3">
          אין תלויות למשימה זו
        </p>
      )}

      {/* Add dependency form */}
      {isAdding && (
        <div className="bg-slate-800/30 rounded-lg p-3 border border-slate-700/50 space-y-3">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
            הוסף משימה קודמת (predecessor)
          </div>

          <Select
            id="dep-task"
            name="dep-task"
            value={newDepTaskId}
            onChange={(e) => setNewDepTaskId(e.target.value)}
            placeholder="בחר משימה..."
            options={availableTasks.map(t => ({ value: t.id, label: t.title }))}
            fullWidth
            size="sm"
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              id="dep-type"
              name="dep-type"
              label="סוג"
              value={newDepType}
              onChange={(e) => setNewDepType(e.target.value as DependencyType)}
              options={depTypeOptions}
              fullWidth
              size="sm"
            />
            <Input
              label="השהיה (ימים)"
              id="dep-lag"
              name="dep-lag"
              type="number"
              value={newDepLag}
              onChange={(e) => setNewDepLag(Number(e.target.value))}
              fullWidth
              data-testid="dep-lag-input"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              className="bg-primary hover:bg-blue-600 text-white text-xs px-4 py-1.5 rounded-lg"
              onClick={handleAdd}
              disabled={createDependency.isPending}
              loading={createDependency.isPending}
            >
              {createDependency.isPending ? 'שומר...' : 'הוסף'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="text-xs text-slate-400 px-3 py-1.5"
              onClick={() => {
                setIsAdding(false)
                setError(null)
                setNewDepTaskId('')
                setNewDepType('FS')
                setNewDepLag(0)
              }}
            >
              ביטול
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

DependencyManagerComponent.displayName = 'DependencyManager'

const DependencyManager = React.memo(DependencyManagerComponent)
export { DependencyManager }
