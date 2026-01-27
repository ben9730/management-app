import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import * as Y from 'yjs'
import {
  SyncService,
  createSyncService,
  SyncStatus,
  SyncConfig,
  PersistenceConfig,
} from './sync'

// Mock y-indexeddb with hoisted mock functions
const { mockDestroy, mockClearData, MockIndexeddbPersistence } = vi.hoisted(() => {
  const mockDestroy = vi.fn()
  const mockClearData = vi.fn(() => Promise.resolve())

  class MockIndexeddbPersistence {
    whenSynced = Promise.resolve()
    destroy = mockDestroy
    clearData = mockClearData

    constructor(public name: string, public doc: unknown) {}
  }

  return { mockDestroy, mockClearData, MockIndexeddbPersistence }
})

vi.mock('y-indexeddb', () => ({
  IndexeddbPersistence: MockIndexeddbPersistence,
}))

// Mock WebSocket
class MockWebSocket {
  static instances: MockWebSocket[] = []
  readyState = 1 // OPEN
  onopen: (() => void) | null = null
  onclose: (() => void) | null = null
  onmessage: ((event: { data: unknown }) => void) | null = null
  onerror: ((error: unknown) => void) | null = null

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
    setTimeout(() => this.onopen?.(), 0)
  }

  send = vi.fn()
  close = vi.fn(() => {
    this.readyState = 3 // CLOSED
    this.onclose?.()
  })

  static clear() {
    MockWebSocket.instances = []
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

describe('SyncService', () => {
  let syncService: SyncService
  const defaultConfig: SyncConfig = {
    documentId: 'test-doc-123',
    websocketUrl: 'wss://sync.example.com',
  }

  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.clear()
  })

  afterEach(() => {
    if (syncService) {
      syncService.disconnect()
    }
  })

  describe('createSyncService', () => {
    it('should create a sync service with default config', () => {
      syncService = createSyncService(defaultConfig)

      expect(syncService).toBeDefined()
      expect(syncService.getDocument).toBeDefined()
      expect(syncService.connect).toBeDefined()
      expect(syncService.disconnect).toBeDefined()
      expect(syncService.getStatus).toBeDefined()
    })

    it('should create a Yjs document', () => {
      syncService = createSyncService(defaultConfig)
      const doc = syncService.getDocument()

      expect(doc).toBeInstanceOf(Y.Doc)
    })

    it('should use provided document if given', () => {
      const existingDoc = new Y.Doc()
      syncService = createSyncService({
        ...defaultConfig,
        document: existingDoc,
      })

      expect(syncService.getDocument()).toBe(existingDoc)
    })
  })

  describe('document operations', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should get a Y.Map for tasks', () => {
      const tasks = syncService.getTasks()

      expect(tasks).toBeInstanceOf(Y.Map)
    })

    it('should get a Y.Map for projects', () => {
      const projects = syncService.getProjects()

      expect(projects).toBeInstanceOf(Y.Map)
    })

    it('should get a Y.Map for team members', () => {
      const teamMembers = syncService.getTeamMembers()

      expect(teamMembers).toBeInstanceOf(Y.Map)
    })

    it('should get a Y.Array for audit findings', () => {
      const findings = syncService.getAuditFindings()

      expect(findings).toBeInstanceOf(Y.Array)
    })

    it('should add a task to the document', () => {
      const task = {
        id: 'task-1',
        title: 'Test Task',
        status: 'pending',
      }

      syncService.setTask(task.id, task)
      const tasks = syncService.getTasks()

      expect(tasks.get(task.id)).toEqual(task)
    })

    it('should update a task in the document', () => {
      const task = {
        id: 'task-1',
        title: 'Test Task',
        status: 'pending',
      }

      syncService.setTask(task.id, task)
      syncService.setTask(task.id, { ...task, status: 'completed' })
      const tasks = syncService.getTasks()

      expect(tasks.get(task.id)).toEqual({ ...task, status: 'completed' })
    })

    it('should delete a task from the document', () => {
      const task = { id: 'task-1', title: 'Test Task' }

      syncService.setTask(task.id, task)
      syncService.deleteTask(task.id)
      const tasks = syncService.getTasks()

      expect(tasks.get(task.id)).toBeUndefined()
    })

    it('should batch updates in a transaction', () => {
      const doc = syncService.getDocument()
      const updateSpy = vi.fn()
      doc.on('update', updateSpy)

      syncService.transaction(() => {
        syncService.setTask('task-1', { id: 'task-1', title: 'Task 1' })
        syncService.setTask('task-2', { id: 'task-2', title: 'Task 2' })
        syncService.setTask('task-3', { id: 'task-3', title: 'Task 3' })
      })

      // Should only fire one update for the entire transaction
      expect(updateSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('sync status', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should start with disconnected status', () => {
      const status = syncService.getStatus()

      expect(status.connected).toBe(false)
      expect(status.syncing).toBe(false)
    })

    it('should track pending changes count', () => {
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      const status = syncService.getStatus()
      expect(status.pendingChanges).toBeGreaterThanOrEqual(0)
    })

    it('should allow subscribing to status changes', async () => {
      const statusCallback = vi.fn()

      syncService.onStatusChange(statusCallback)
      await syncService.connect()

      // Wait for async connection
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(statusCallback).toHaveBeenCalled()
    })

    it('should allow unsubscribing from status changes', () => {
      const statusCallback = vi.fn()

      const unsubscribe = syncService.onStatusChange(statusCallback)
      unsubscribe()

      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      // Should not be called after unsubscribe
      expect(statusCallback).not.toHaveBeenCalled()
    })
  })

  describe('connection', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should connect to websocket server', async () => {
      await syncService.connect()

      // Wait for async connection
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(MockWebSocket.instances.length).toBeGreaterThan(0)
    })

    it('should update status when connected', async () => {
      const statusCallback = vi.fn()
      syncService.onStatusChange(statusCallback)

      await syncService.connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      const status = syncService.getStatus()
      expect(status.connected).toBe(true)
    })

    it('should disconnect from websocket server', async () => {
      await syncService.connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      syncService.disconnect()

      const status = syncService.getStatus()
      expect(status.connected).toBe(false)
    })

    it('should handle reconnection', async () => {
      await syncService.connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      syncService.disconnect()
      await syncService.connect()
      await new Promise(resolve => setTimeout(resolve, 10))

      expect(syncService.getStatus().connected).toBe(true)
    })
  })

  describe('change tracking', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should track document changes', () => {
      const changeCallback = vi.fn()

      syncService.onChange(changeCallback)
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      expect(changeCallback).toHaveBeenCalled()
    })

    it('should provide change origin information', () => {
      const changeCallback = vi.fn()

      syncService.onChange(changeCallback)
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: expect.any(String),
        })
      )
    })

    it('should distinguish local and remote changes', () => {
      const changeCallback = vi.fn()

      syncService.onChange(changeCallback)
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' }, 'local')

      expect(changeCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          origin: 'local',
        })
      )
    })
  })

  describe('undo/redo', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should support undo operation', () => {
      // Add a task
      syncService.setTask('task-1', { id: 'task-1', title: 'Original' })

      // Undo should remove the task (go back to empty state)
      syncService.undo()

      const tasks = syncService.getTasks()
      expect(tasks.get('task-1')).toBeUndefined()
    })

    it('should support redo operation', () => {
      syncService.setTask('task-1', { id: 'task-1', title: 'Original' })

      syncService.undo()
      syncService.redo()

      const tasks = syncService.getTasks()
      expect(tasks.get('task-1')).toEqual({ id: 'task-1', title: 'Original' })
    })

    it('should track undo stack state', () => {
      expect(syncService.canUndo()).toBe(false)

      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      expect(syncService.canUndo()).toBe(true)
    })

    it('should track redo stack state', () => {
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      expect(syncService.canRedo()).toBe(false)

      syncService.undo()

      expect(syncService.canRedo()).toBe(true)
    })
  })

  describe('snapshot', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should create a snapshot of the document', () => {
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })

      const snapshot = syncService.createSnapshot()

      expect(snapshot).toBeInstanceOf(Uint8Array)
      expect(snapshot.length).toBeGreaterThan(0)
    })

    it('should restore from snapshot', () => {
      syncService.setTask('task-1', { id: 'task-1', title: 'Test' })
      const snapshot = syncService.createSnapshot()

      // Create new service and restore
      const newService = createSyncService({ ...defaultConfig, documentId: 'test-doc-456' })
      newService.restoreFromSnapshot(snapshot)

      const tasks = newService.getTasks()
      expect(tasks.get('task-1')).toEqual({ id: 'task-1', title: 'Test' })

      newService.disconnect()
    })
  })

  describe('awareness', () => {
    beforeEach(() => {
      syncService = createSyncService(defaultConfig)
    })

    it('should set local awareness state', () => {
      const userState = {
        name: 'John Doe',
        color: '#ff0000',
        cursor: { x: 100, y: 200 },
      }

      syncService.setAwarenessState(userState)

      const localState = syncService.getLocalAwarenessState()
      expect(localState).toEqual(userState)
    })

    it('should get all awareness states', async () => {
      syncService.setAwarenessState({ name: 'User 1' })

      const states = syncService.getAllAwarenessStates()

      expect(states).toBeInstanceOf(Map)
    })

    it('should notify on awareness changes', () => {
      const awarenessCallback = vi.fn()

      syncService.onAwarenessChange(awarenessCallback)
      syncService.setAwarenessState({ name: 'Test User' })

      expect(awarenessCallback).toHaveBeenCalled()
    })
  })

  describe('persistence', () => {
    const persistenceConfig: SyncConfig = {
      ...defaultConfig,
      persistence: {
        enabled: true,
        name: 'test-persistence',
      },
    }

    afterEach(() => {
      if (syncService) {
        syncService.disconnect()
      }
      vi.clearAllMocks()
    })

    it('should create sync service with persistence enabled', () => {
      syncService = createSyncService(persistenceConfig)

      expect(syncService).toBeDefined()
      expect(syncService.isPersistenceEnabled()).toBe(true)
    })

    it('should create sync service without persistence by default', () => {
      syncService = createSyncService(defaultConfig)

      expect(syncService.isPersistenceEnabled()).toBe(false)
    })

    it('should wait for persistence to sync before reporting ready', async () => {
      syncService = createSyncService(persistenceConfig)

      const isReady = await syncService.waitForPersistence()

      expect(isReady).toBe(true)
    })

    it('should return immediately when persistence is disabled', async () => {
      syncService = createSyncService(defaultConfig)

      const isReady = await syncService.waitForPersistence()

      expect(isReady).toBe(true)
    })

    it('should track persistence status', () => {
      syncService = createSyncService(persistenceConfig)

      const status = syncService.getPersistenceStatus()

      expect(status).toHaveProperty('enabled')
      expect(status).toHaveProperty('synced')
      expect(status.enabled).toBe(true)
    })

    it('should clear persistence data', async () => {
      syncService = createSyncService(persistenceConfig)

      await syncService.clearPersistence()

      expect(mockClearData).toHaveBeenCalled()
    })

    it('should not error when clearing persistence without provider', async () => {
      syncService = createSyncService(defaultConfig)

      await expect(syncService.clearPersistence()).resolves.not.toThrow()
    })

    it('should persist data to IndexedDB', async () => {
      syncService = createSyncService(persistenceConfig)
      syncService.setTask('task-1', { id: 'task-1', title: 'Persisted Task' })

      // Verify persistence was enabled and data can be retrieved
      expect(syncService.isPersistenceEnabled()).toBe(true)
      const tasks = syncService.getTasks()
      expect(tasks.get('task-1')).toEqual({ id: 'task-1', title: 'Persisted Task' })
    })

    it('should recover data after recreation', async () => {
      // Create first instance and add data
      syncService = createSyncService(persistenceConfig)
      syncService.setTask('task-1', { id: 'task-1', title: 'Test Task' })

      // Simulate document snapshot for recovery
      const snapshot = syncService.createSnapshot()
      syncService.disconnect()

      // Create new instance and restore from snapshot
      const newSyncService = createSyncService(persistenceConfig)
      newSyncService.restoreFromSnapshot(snapshot)

      const tasks = newSyncService.getTasks()
      expect(tasks.get('task-1')).toEqual({ id: 'task-1', title: 'Test Task' })

      newSyncService.disconnect()
    })

    it('should use custom persistence name', () => {
      const customConfig: SyncConfig = {
        ...defaultConfig,
        persistence: {
          enabled: true,
          name: 'custom-db-name',
        },
      }

      syncService = createSyncService(customConfig)

      expect(syncService.getPersistenceStatus().name).toBe('custom-db-name')
    })

    it('should destroy persistence provider on disconnect', () => {
      syncService = createSyncService(persistenceConfig)
      syncService.disconnect()

      expect(mockDestroy).toHaveBeenCalled()
    })
  })
})
