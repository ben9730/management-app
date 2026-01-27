import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import React from 'react'
import {
  useSyncStatus,
  useSyncDocument,
  useOfflineStatus,
  SyncProvider,
  useSyncContext,
} from './use-sync'

// Mock the sync service
vi.mock('../services/sync', () => ({
  createSyncService: vi.fn(() => ({
    getDocument: vi.fn(() => ({})),
    getTasks: vi.fn(() => new Map()),
    getProjects: vi.fn(() => new Map()),
    getTeamMembers: vi.fn(() => new Map()),
    getAuditFindings: vi.fn(() => []),
    setTask: vi.fn(),
    deleteTask: vi.fn(),
    transaction: vi.fn((fn) => fn()),
    connect: vi.fn().mockResolvedValue(undefined),
    disconnect: vi.fn(),
    getStatus: vi.fn(() => ({
      connected: true,
      syncing: false,
      pendingChanges: 0,
      lastSyncTime: new Date(),
      error: null,
    })),
    onStatusChange: vi.fn(() => () => {}),
    onChange: vi.fn(() => () => {}),
    undo: vi.fn(),
    redo: vi.fn(),
    canUndo: vi.fn(() => false),
    canRedo: vi.fn(() => false),
    createSnapshot: vi.fn(() => new Uint8Array()),
    restoreFromSnapshot: vi.fn(),
    setAwarenessState: vi.fn(),
    getLocalAwarenessState: vi.fn(() => null),
    getAllAwarenessStates: vi.fn(() => new Map()),
    onAwarenessChange: vi.fn(() => () => {}),
  })),
}))

// Mock offline storage
vi.mock('../services/offline-storage', () => ({
  createInMemoryStorage: vi.fn(() => ({
    save: vi.fn(),
    load: vi.fn(),
    delete: vi.fn(),
    loadAll: vi.fn().mockResolvedValue([]),
    queueOperation: vi.fn(),
    getPendingOperations: vi.fn().mockResolvedValue([]),
    removeOperation: vi.fn(),
    getQueueCount: vi.fn().mockResolvedValue(0),
    clearQueue: vi.fn(),
    setMetadata: vi.fn(),
    getMetadata: vi.fn(),
    setDocumentVersion: vi.fn(),
    getDocumentVersion: vi.fn().mockResolvedValue(0),
    setOnlineStatus: vi.fn(),
    getOnlineStatus: vi.fn().mockResolvedValue(true),
    clearAll: vi.fn(),
    estimateStorageSize: vi.fn().mockResolvedValue(0),
    close: vi.fn(),
    detectConflicts: vi.fn().mockResolvedValue([]),
    resolveConflicts: vi.fn().mockResolvedValue({}),
  })),
}))

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(
      QueryClientProvider,
      { client: queryClient },
      React.createElement(
        SyncProvider,
        { documentId: 'test-doc', websocketUrl: 'wss://test.example.com' },
        children
      )
    )
  }
}

describe('useSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return initial sync status', async () => {
    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    expect(result.current.connected).toBeDefined()
    expect(result.current.syncing).toBeDefined()
  })

  it('should show connected status', async () => {
    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.connected).toBe(true)
    })
  })

  it('should provide pending changes count', async () => {
    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.pendingChanges).toBe(0)
    })
  })

  it('should provide last sync time', async () => {
    const { result } = renderHook(() => useSyncStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.lastSyncTime).toBeDefined()
    })
  })
})

describe('useSyncDocument', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should provide access to document operations', async () => {
    const { result } = renderHook(() => useSyncDocument(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    expect(result.current.setTask).toBeDefined()
    expect(result.current.deleteTask).toBeDefined()
    expect(result.current.transaction).toBeDefined()
  })

  it('should provide undo/redo functionality', async () => {
    const { result } = renderHook(() => useSyncDocument(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.undo).toBeDefined()
      expect(result.current.redo).toBeDefined()
      expect(result.current.canUndo).toBeDefined()
      expect(result.current.canRedo).toBeDefined()
    })
  })
})

describe('useOfflineStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should return online status', async () => {
    const { result } = renderHook(() => useOfflineStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    expect(result.current.isOnline).toBeDefined()
  })

  it('should provide offline queue count', async () => {
    const { result } = renderHook(() => useOfflineStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.queueCount).toBe(0)
    })
  })

  it('should allow force sync', async () => {
    const { result } = renderHook(() => useOfflineStatus(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current.forceSync).toBeDefined()
    })
  })
})

describe('SyncProvider', () => {
  it('should provide sync context to children', async () => {
    const { result } = renderHook(() => useSyncContext(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(result.current).toBeDefined()
    })

    expect(result.current.syncService).toBeDefined()
    expect(result.current.offlineStorage).toBeDefined()
  })

  it('should connect on mount', async () => {
    const { createSyncService } = await import('../services/sync')

    renderHook(() => useSyncContext(), {
      wrapper: createWrapper(),
    })

    await waitFor(() => {
      expect(createSyncService).toHaveBeenCalled()
    })
  })
})

describe('useSyncContext error handling', () => {
  it('should throw error when used outside provider', () => {
    const queryClient = new QueryClient()

    const wrapper = ({ children }: { children: React.ReactNode }) =>
      React.createElement(QueryClientProvider, { client: queryClient }, children)

    expect(() => {
      renderHook(() => useSyncContext(), { wrapper })
    }).toThrow('useSyncContext must be used within a SyncProvider')
  })
})
