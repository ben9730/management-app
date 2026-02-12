/**
 * Phase Lock Service
 *
 * Pure computation of phase lock status from phases and tasks arrays.
 * A phase is locked if any task in the previous phase (by phase_order) is not 'done'.
 * The first phase is always unlocked. Empty phases do not block subsequent phases.
 */

import type { ProjectPhase, Task, PhaseLockInfo } from '@/types/entities'

export type { PhaseLockInfo }

/**
 * Compute lock status for all phases in a project.
 *
 * Rules:
 * 1. First phase (lowest phase_order) is ALWAYS unlocked
 * 2. A phase is locked if any task in the previous phase is not 'done'
 * 3. Empty phases (zero tasks) are treated as complete (non-blocking)
 * 4. Tasks with null phase_id are ignored
 * 5. Phases are sorted by phase_order ascending (input is not mutated)
 */
export function computePhaseLockStatus(
  phases: ProjectPhase[],
  tasks: Task[]
): Map<string, PhaseLockInfo> {
  const result = new Map<string, PhaseLockInfo>()

  if (phases.length === 0) return result

  // Sort phases by phase_order ascending -- do NOT mutate input
  const sortedPhases = [...phases].sort((a, b) => a.phase_order - b.phase_order)

  // First phase is always unlocked
  result.set(sortedPhases[0].id, {
    phaseId: sortedPhases[0].id,
    isLocked: false,
    reason: 'first_phase',
    blockedByPhaseId: null,
    blockedByPhaseName: null,
  })

  // For each subsequent phase, check if previous phase's tasks are all done
  for (let i = 1; i < sortedPhases.length; i++) {
    const currentPhase = sortedPhases[i]
    const previousPhase = sortedPhases[i - 1]

    const previousPhaseTasks = tasks.filter(t => t.phase_id === previousPhase.id)
    const previousPhaseComplete =
      previousPhaseTasks.length === 0 ||
      previousPhaseTasks.every(t => t.status === 'done')

    result.set(currentPhase.id, {
      phaseId: currentPhase.id,
      isLocked: !previousPhaseComplete,
      reason: previousPhaseComplete
        ? 'previous_phase_complete'
        : 'previous_phase_incomplete',
      blockedByPhaseId: previousPhaseComplete ? null : previousPhase.id,
      blockedByPhaseName: previousPhaseComplete ? null : previousPhase.name,
    })
  }

  return result
}

/**
 * Convenience: check if a specific phase is locked.
 * Returns false for unknown phase IDs.
 */
export function isPhaseLocked(
  phaseId: string,
  phases: ProjectPhase[],
  tasks: Task[]
): boolean {
  const lockMap = computePhaseLockStatus(phases, tasks)
  return lockMap.get(phaseId)?.isLocked ?? false
}
