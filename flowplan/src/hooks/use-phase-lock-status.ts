/**
 * usePhaseLockStatus Hook
 *
 * Derives phase lock status from usePhases + useTasks data via useMemo.
 * Automatically recomputes when task mutations invalidate the query cache.
 */

import { useMemo } from 'react'
import { usePhases } from '@/hooks/use-phases'
import { useTasks } from '@/hooks/use-tasks'
import { computePhaseLockStatus } from '@/services/phase-lock'
import type { PhaseLockInfo } from '@/types/entities'

export function usePhaseLockStatus(projectId: string) {
  const { data: phases = [], isLoading: isLoadingPhases } = usePhases(projectId)
  const { data: tasks = [], isLoading: isLoadingTasks } = useTasks(projectId)

  const lockStatus = useMemo(() => {
    if (phases.length === 0) return new Map<string, PhaseLockInfo>()
    return computePhaseLockStatus(phases, tasks)
  }, [phases, tasks])

  return {
    lockStatus,
    isLoading: isLoadingPhases || isLoadingTasks,
    /** Check if a specific phase is locked */
    isLocked: (phaseId: string) => lockStatus.get(phaseId)?.isLocked ?? false,
    /** Get full lock info for a phase */
    getLockInfo: (phaseId: string) => lockStatus.get(phaseId) ?? null,
  }
}
