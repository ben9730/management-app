'use client'

import { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { createSyncService, SyncService, SyncStatus } from '../services/sync'
import { createInMemoryStorage, OfflineStorageService } from '../services/offline-storage'

interface SyncContextValue {
  syncService: SyncService | null
  offlineStorage: OfflineStorageService | null
  status: SyncStatus
  isOnline: boolean
  queueCount: number
}

const SyncContext = createContext<SyncContextValue | null>(null)

interface SyncProviderProps {
  children: ReactNode
  documentId: string
  websocketUrl: string
}

export function SyncProvider({ children, documentId, websocketUrl }: SyncProviderProps) {
  const [syncService, setSyncService] = useState<SyncService | null>(null)
  const [offlineStorage, setOfflineStorage] = useState<OfflineStorageService | null>(null)
  const [status, setStatus] = useState<SyncStatus>({
    connected: false,
    syncing: false,
    pendingChanges: 0,
    lastSyncTime: null,
    error: null,
  })
  const [isOnline, setIsOnline] = useState(true)
  const [queueCount, setQueueCount] = useState(0)

  // Initialize services
  useEffect(() => {
    const service = createSyncService({
      documentId,
      websocketUrl,
    })

    const storage = createInMemoryStorage()

    setSyncService(service)
    setOfflineStorage(storage)

    // Subscribe to status changes
    const unsubscribe = service.onStatusChange((newStatus) => {
      setStatus(newStatus)
    })

    // Connect
    service.connect().catch((error) => {
      console.error('Failed to connect sync service:', error)
    })

    // Update initial status
    setStatus(service.getStatus())

    // Handle online/offline events
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)
      setIsOnline(navigator.onLine)
    }

    return () => {
      unsubscribe()
      service.disconnect()
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [documentId, websocketUrl])

  // Update queue count
  useEffect(() => {
    if (!offlineStorage) return

    const updateQueueCount = async () => {
      const count = await offlineStorage.getQueueCount()
      setQueueCount(count)
    }

    updateQueueCount()
    const interval = setInterval(updateQueueCount, 5000)

    return () => clearInterval(interval)
  }, [offlineStorage])

  const value = useMemo(
    () => ({
      syncService,
      offlineStorage,
      status,
      isOnline,
      queueCount,
    }),
    [syncService, offlineStorage, status, isOnline, queueCount]
  )

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>
}

export function useSyncContext(): SyncContextValue {
  const context = useContext(SyncContext)
  if (!context) {
    throw new Error('useSyncContext must be used within a SyncProvider')
  }
  return context
}

export function useSyncStatus() {
  const { status } = useSyncContext()
  return status
}

export function useSyncDocument() {
  const { syncService } = useSyncContext()

  const setTask = useCallback(
    (id: string, data: unknown) => {
      syncService?.setTask(id, data)
    },
    [syncService]
  )

  const deleteTask = useCallback(
    (id: string) => {
      syncService?.deleteTask(id)
    },
    [syncService]
  )

  const transaction = useCallback(
    (fn: () => void) => {
      syncService?.transaction(fn)
    },
    [syncService]
  )

  const undo = useCallback(() => {
    syncService?.undo()
  }, [syncService])

  const redo = useCallback(() => {
    syncService?.redo()
  }, [syncService])

  const canUndo = useCallback(() => {
    return syncService?.canUndo() ?? false
  }, [syncService])

  const canRedo = useCallback(() => {
    return syncService?.canRedo() ?? false
  }, [syncService])

  return {
    setTask,
    deleteTask,
    transaction,
    undo,
    redo,
    canUndo,
    canRedo,
  }
}

export function useOfflineStatus() {
  const { isOnline, queueCount, syncService, offlineStorage } = useSyncContext()

  const forceSync = useCallback(async () => {
    if (!syncService || !offlineStorage) return

    const operations = await offlineStorage.getPendingOperations()
    for (const op of operations) {
      // Process each operation through sync service
      if (op.type === 'create' || op.type === 'update') {
        syncService.setTask(op.entityId || op.id, op.data)
      } else if (op.type === 'delete' && op.entityId) {
        syncService.deleteTask(op.entityId)
      }
      await offlineStorage.removeOperation(op.id)
    }
  }, [syncService, offlineStorage])

  return {
    isOnline,
    queueCount,
    forceSync,
  }
}

// Custom hook for awareness (multi-user presence)
export function useAwareness() {
  const { syncService } = useSyncContext()
  const [states, setStates] = useState<Map<number, unknown>>(new Map())

  useEffect(() => {
    if (!syncService) return

    const unsubscribe = syncService.onAwarenessChange((newStates) => {
      setStates(newStates)
    })

    return unsubscribe
  }, [syncService])

  const setLocalState = useCallback(
    (state: { name?: string; color?: string; cursor?: { x: number; y: number } }) => {
      syncService?.setAwarenessState(state)
    },
    [syncService]
  )

  return {
    states,
    setLocalState,
    localState: syncService?.getLocalAwarenessState() ?? null,
  }
}
