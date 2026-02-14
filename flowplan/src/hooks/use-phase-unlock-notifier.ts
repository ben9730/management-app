/**
 * usePhaseUnlockNotifier Hook
 *
 * Detects when a phase transitions from locked to unlocked and fires
 * a Hebrew toast notification using Sonner. Uses a useRef-based
 * "previous value" pattern to compare lock status across renders.
 *
 * Key behaviors:
 * - No toasts on initial page load (baseline capture)
 * - No spurious toasts on project switch (projectId reset)
 * - Stable toast id prevents StrictMode duplicates
 */

import { useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { PhaseLockInfo, ProjectPhase } from '@/types/entities'

export function usePhaseUnlockNotifier(
  lockStatus: Map<string, PhaseLockInfo>,
  phases: ProjectPhase[],
  isLoading: boolean,
  projectId: string
) {
  const prevLockStatusRef = useRef<Map<string, PhaseLockInfo> | null>(null)
  const prevProjectIdRef = useRef<string | null>(null)

  useEffect(() => {
    // Data not ready yet — skip
    if (isLoading || lockStatus.size === 0) return

    // Project changed — reset baseline to prevent spurious toasts
    if (prevProjectIdRef.current !== null && prevProjectIdRef.current !== projectId) {
      prevLockStatusRef.current = null
      prevProjectIdRef.current = projectId
      // Store current as new baseline and return
      prevLockStatusRef.current = new Map(lockStatus)
      return
    }

    // Track current project
    prevProjectIdRef.current = projectId

    // First render with data — store baseline, no toasts
    if (prevLockStatusRef.current === null) {
      prevLockStatusRef.current = new Map(lockStatus)
      return
    }

    const prevLockStatus = prevLockStatusRef.current

    // Compare: find phases that were locked before and are now unlocked
    for (const [phaseId, currentInfo] of lockStatus) {
      const prevInfo = prevLockStatus.get(phaseId)

      if (prevInfo?.isLocked === true && currentInfo.isLocked === false) {
        // This phase just unlocked!
        const unlockedPhase = phases.find(p => p.id === phaseId)

        // The completed phase is the one that was blocking this phase
        const completedPhaseName = prevInfo.blockedByPhaseName
        const unlockedPhaseName = unlockedPhase?.name

        if (completedPhaseName && unlockedPhaseName) {
          toast.success(
            `\u05D4\u05E9\u05DC\u05D1 "${completedPhaseName}" \u05D4\u05D5\u05E9\u05DC\u05DD!`,
            {
              description: `\u05D4\u05E9\u05DC\u05D1 "${unlockedPhaseName}" \u05E0\u05E4\u05EA\u05D7 \u05DC\u05E2\u05D1\u05D5\u05D3\u05D4`,
              duration: 5000,
              id: `unlock-${phaseId}`,
            }
          )
        }
      }
    }

    // Update ref for next comparison
    prevLockStatusRef.current = new Map(lockStatus)
  }, [lockStatus, phases, isLoading, projectId])
}
