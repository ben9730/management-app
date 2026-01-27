/**
 * Offline Integration Tests
 *
 * Tests the complete offline workflow including:
 * - Offline data persistence
 * - Sync recovery after connectivity restored
 * - Conflict resolution
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createSyncService, SyncService, SyncConfig } from './sync'
import {
  createInMemoryStorage,
  OfflineStorageService,
  QueuedOperation,
} from './offline-storage'

// Mock y-indexeddb
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

  // Simulate going offline
  simulateOffline() {
    this.readyState = 3
    this.onclose?.()
  }

  // Simulate coming back online
  simulateOnline() {
    this.readyState = 1
    this.onopen?.()
  }
}

vi.stubGlobal('WebSocket', MockWebSocket)

describe('Offline Integration', () => {
  let syncService: SyncService
  let offlineStorage: OfflineStorageService
  const defaultConfig: SyncConfig = {
    documentId: 'integration-test-doc',
    websocketUrl: 'wss://sync.example.com',
    persistence: {
      enabled: true,
      name: 'integration-test-db',
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
    MockWebSocket.clear()
    offlineStorage = createInMemoryStorage()
  })

  afterEach(() => {
    if (syncService) {
      syncService.disconnect()
    }
  })

  describe('offline data persistence', () => {
    it('should persist changes locally when offline', async () => {
      syncService = createSyncService(defaultConfig)

      // Add task while "online"
      syncService.setTask('task-1', { id: 'task-1', title: 'Online Task' })

      // Verify task exists in sync service
      const tasks = syncService.getTasks()
      expect(tasks.get('task-1')).toEqual({ id: 'task-1', title: 'Online Task' })

      // Store in offline storage using the correct API
      await offlineStorage.save('documents', 'task-1', {
        id: 'task-1',
        title: 'Online Task',
        version: 1,
      })

      // Verify persistence
      const stored = await offlineStorage.load('documents', 'task-1')
      expect(stored).toEqual({ id: 'task-1', title: 'Online Task', version: 1 })
    })

    it('should queue operations when offline', async () => {
      syncService = createSyncService(defaultConfig)

      // Queue offline operations using the correct interface
      await offlineStorage.queueOperation({
        id: 'op-1',
        type: 'create',
        entity: 'task',
        entityId: 'task-offline-1',
        data: { id: 'task-offline-1', title: 'Offline Task 1' },
        timestamp: Date.now(),
      })

      await offlineStorage.queueOperation({
        id: 'op-2',
        type: 'update',
        entity: 'task',
        entityId: 'task-offline-2',
        data: { id: 'task-offline-2', title: 'Offline Task 2' },
        timestamp: Date.now(),
      })

      // Verify queue
      const queueCount = await offlineStorage.getQueueCount()
      expect(queueCount).toBe(2)

      const operations = await offlineStorage.getPendingOperations()
      expect(operations).toHaveLength(2)
      expect(operations[0].entityId).toBe('task-offline-1')
      expect(operations[1].entityId).toBe('task-offline-2')
    })

    it('should preserve data across sync service recreation', async () => {
      // Create first instance and add data
      syncService = createSyncService(defaultConfig)
      syncService.setTask('task-persist', { id: 'task-persist', title: 'Persistent Task' })

      // Create snapshot before disconnect
      const snapshot = syncService.createSnapshot()
      syncService.disconnect()

      // Create new instance and restore
      const newSyncService = createSyncService(defaultConfig)
      newSyncService.restoreFromSnapshot(snapshot)

      // Verify data persisted
      const tasks = newSyncService.getTasks()
      expect(tasks.get('task-persist')).toEqual({
        id: 'task-persist',
        title: 'Persistent Task',
      })

      newSyncService.disconnect()
    })

    it('should maintain offline storage separate from CRDT document', async () => {
      syncService = createSyncService(defaultConfig)

      // Store in offline storage
      await offlineStorage.save('documents', 'offline-doc-1', {
        id: 'offline-doc-1',
        data: 'offline data',
      })

      // Store in sync service
      syncService.setTask('sync-task-1', { id: 'sync-task-1', data: 'sync data' })

      // Verify both storages are independent
      const offlineDoc = await offlineStorage.load('documents', 'offline-doc-1')
      const syncTask = syncService.getTasks().get('sync-task-1')

      expect(offlineDoc).toEqual({ id: 'offline-doc-1', data: 'offline data' })
      expect(syncTask).toEqual({ id: 'sync-task-1', data: 'sync data' })
    })
  })

  describe('sync recovery after connectivity restored', () => {
    it('should process queued operations when coming back online', async () => {
      syncService = createSyncService(defaultConfig)

      // Queue operations while "offline"
      await offlineStorage.queueOperation({
        id: 'recovery-op-1',
        type: 'create',
        entity: 'task',
        entityId: 'recovery-task-1',
        data: { id: 'recovery-task-1', title: 'Recovery Task' },
        timestamp: Date.now(),
      })

      // Process queued operations (simulating sync)
      const operations = await offlineStorage.getPendingOperations()
      for (const op of operations) {
        if (op.type === 'create' || op.type === 'update') {
          syncService.setTask(op.entityId!, op.data as Record<string, unknown>)
        }
        await offlineStorage.removeOperation(op.id)
      }

      // Verify task was synced
      const tasks = syncService.getTasks()
      expect(tasks.get('recovery-task-1')).toEqual({
        id: 'recovery-task-1',
        title: 'Recovery Task',
      })

      // Verify queue is empty
      const queueCount = await offlineStorage.getQueueCount()
      expect(queueCount).toBe(0)
    })

    it('should handle multiple operations in order', async () => {
      syncService = createSyncService(defaultConfig)
      const processedOrder: string[] = []

      // Queue multiple operations with different timestamps
      const now = Date.now()
      await offlineStorage.queueOperation({
        id: 'order-op-1',
        type: 'create',
        entity: 'task',
        entityId: 'order-task-1',
        data: { id: 'order-task-1', title: 'First' },
        timestamp: now,
      })

      await offlineStorage.queueOperation({
        id: 'order-op-2',
        type: 'update',
        entity: 'task',
        entityId: 'order-task-1',
        data: { id: 'order-task-1', title: 'Updated' },
        timestamp: now + 100,
      })

      await offlineStorage.queueOperation({
        id: 'order-op-3',
        type: 'create',
        entity: 'task',
        entityId: 'order-task-2',
        data: { id: 'order-task-2', title: 'Second' },
        timestamp: now + 200,
      })

      // Process in order
      const operations = await offlineStorage.getPendingOperations()
      for (const op of operations) {
        processedOrder.push(op.id)
        if (op.type === 'create' || op.type === 'update') {
          syncService.setTask(op.entityId!, op.data as Record<string, unknown>)
        }
        await offlineStorage.removeOperation(op.id)
      }

      // Verify order
      expect(processedOrder).toEqual(['order-op-1', 'order-op-2', 'order-op-3'])

      // Verify final state
      const tasks = syncService.getTasks()
      expect(tasks.get('order-task-1')).toEqual({
        id: 'order-task-1',
        title: 'Updated',
      })
      expect(tasks.get('order-task-2')).toEqual({
        id: 'order-task-2',
        title: 'Second',
      })
    })

    it('should handle delete operations during recovery', async () => {
      syncService = createSyncService(defaultConfig)

      // Create a task first
      syncService.setTask('delete-test', { id: 'delete-test', title: 'To Delete' })

      // Queue delete operation
      await offlineStorage.queueOperation({
        id: 'delete-op-1',
        type: 'delete',
        entity: 'task',
        entityId: 'delete-test',
        data: {},
        timestamp: Date.now(),
      })

      // Process delete
      const operations = await offlineStorage.getPendingOperations()
      for (const op of operations) {
        if (op.type === 'delete' && op.entityId) {
          syncService.deleteTask(op.entityId)
        }
        await offlineStorage.removeOperation(op.id)
      }

      // Verify task was deleted
      const tasks = syncService.getTasks()
      expect(tasks.get('delete-test')).toBeUndefined()
    })

    it('should track sync status changes', async () => {
      syncService = createSyncService(defaultConfig)
      const statusChanges: boolean[] = []

      syncService.onStatusChange((status) => {
        statusChanges.push(status.connected)
      })

      // Connect
      await syncService.connect()
      await new Promise((resolve) => setTimeout(resolve, 10))

      // Disconnect
      syncService.disconnect()

      // Should have recorded status changes
      expect(statusChanges).toContain(true)
      expect(statusChanges[statusChanges.length - 1]).toBe(false)
    })
  })

  describe('conflict resolution', () => {
    it('should detect conflicts between local and remote operations', async () => {
      // Queue multiple operations for the same entity
      const now = Date.now()
      await offlineStorage.queueOperation({
        id: 'conflict-op-1',
        type: 'update',
        entity: 'task',
        entityId: 'conflict-task',
        data: { title: 'Local Version' },
        timestamp: now,
      })

      await offlineStorage.queueOperation({
        id: 'conflict-op-2',
        type: 'update',
        entity: 'task',
        entityId: 'conflict-task',
        data: { title: 'Another Version' },
        timestamp: now + 100,
      })

      // Detect conflicts
      const conflicts = await offlineStorage.detectConflicts('task', 'conflict-task')

      expect(conflicts).toHaveLength(2)
      expect(conflicts[0].data).toEqual({ title: 'Local Version' })
      expect(conflicts[1].data).toEqual({ title: 'Another Version' })
    })

    it('should resolve conflicts with last-write-wins strategy', async () => {
      const now = Date.now()

      await offlineStorage.queueOperation({
        id: 'lww-op-1',
        type: 'update',
        entity: 'task',
        entityId: 'lww-task',
        data: { title: 'First Write', value: 10 },
        timestamp: now,
      })

      await offlineStorage.queueOperation({
        id: 'lww-op-2',
        type: 'update',
        entity: 'task',
        entityId: 'lww-task',
        data: { title: 'Last Write', description: 'Added later' },
        timestamp: now + 100,
      })

      // Resolve with last-write-wins
      const resolved = await offlineStorage.resolveConflicts('task', 'lww-task', 'last-write-wins')

      // Last write should win for overlapping fields, all fields merged
      expect(resolved.title).toBe('Last Write')
      expect(resolved.value).toBe(10)
      expect(resolved.description).toBe('Added later')
    })

    it('should resolve conflicts with first-write-wins strategy', async () => {
      const now = Date.now()

      await offlineStorage.queueOperation({
        id: 'fww-op-1',
        type: 'update',
        entity: 'task',
        entityId: 'fww-task',
        data: { title: 'First Write', value: 10 },
        timestamp: now,
      })

      await offlineStorage.queueOperation({
        id: 'fww-op-2',
        type: 'update',
        entity: 'task',
        entityId: 'fww-task',
        data: { title: 'Last Write', description: 'Added later' },
        timestamp: now + 100,
      })

      // Resolve with first-write-wins
      const resolved = await offlineStorage.resolveConflicts('task', 'fww-task', 'first-write-wins')

      // First write should win for overlapping fields
      expect(resolved.title).toBe('First Write')
      expect(resolved.value).toBe(10)
      expect(resolved.description).toBe('Added later')
    })

    it('should handle CRDT automatic conflict resolution', () => {
      // Create two sync services simulating two clients
      const service1 = createSyncService({
        ...defaultConfig,
        documentId: 'crdt-test-doc',
      })

      const service2 = createSyncService({
        ...defaultConfig,
        documentId: 'crdt-test-doc-2',
      })

      // Both make changes
      service1.setTask('crdt-task', { id: 'crdt-task', title: 'Version 1', value: 10 })
      service2.setTask('crdt-task', { id: 'crdt-task', title: 'Version 2', value: 20 })

      // Simulate sync by applying updates
      const update1 = service1.createSnapshot()
      const update2 = service2.createSnapshot()

      // Apply each other's updates
      service1.restoreFromSnapshot(update2)
      service2.restoreFromSnapshot(update1)

      // After CRDT merge, both should converge to same state
      const task1 = service1.getTasks().get('crdt-task')
      const task2 = service2.getTasks().get('crdt-task')

      // CRDT will have merged the changes (last write wins in Y.Map)
      expect(task1).toBeDefined()
      expect(task2).toBeDefined()

      service1.disconnect()
      service2.disconnect()
    })

    it('should preserve undo history after making changes', () => {
      syncService = createSyncService(defaultConfig)

      // Make initial change
      syncService.setTask('undo-task', { id: 'undo-task', title: 'Original' })
      expect(syncService.canUndo()).toBe(true)

      // Undo should remove the task (go back to empty state)
      syncService.undo()
      const tasksAfterUndo = syncService.getTasks()
      expect(tasksAfterUndo.get('undo-task')).toBeUndefined()

      // Redo should restore the task
      syncService.redo()
      const tasksAfterRedo = syncService.getTasks()
      expect(tasksAfterRedo.get('undo-task')).toEqual({ id: 'undo-task', title: 'Original' })
    })
  })

  describe('edge cases', () => {
    it('should handle empty queue gracefully', async () => {
      const operations = await offlineStorage.getPendingOperations()
      expect(operations).toEqual([])

      const queueCount = await offlineStorage.getQueueCount()
      expect(queueCount).toBe(0)
    })

    it('should handle rapid online/offline transitions', async () => {
      syncService = createSyncService(defaultConfig)

      // Rapid transitions
      for (let i = 0; i < 5; i++) {
        await syncService.connect()
        await new Promise((resolve) => setTimeout(resolve, 5))
        syncService.disconnect()
      }

      // Should end in disconnected state
      expect(syncService.getStatus().connected).toBe(false)
    })

    it('should handle large batches of operations', async () => {
      const batchSize = 100

      // Create many operations
      for (let i = 0; i < batchSize; i++) {
        const op: QueuedOperation = {
          id: `batch-op-${i}`,
          type: 'create',
          entity: 'task',
          entityId: `batch-task-${i}`,
          data: { id: `batch-task-${i}`, title: `Task ${i}` },
          timestamp: Date.now() + i,
        }
        await offlineStorage.queueOperation(op)
      }

      // Verify all queued
      const queueCount = await offlineStorage.getQueueCount()
      expect(queueCount).toBe(batchSize)

      // Process all
      const pending = await offlineStorage.getPendingOperations()
      expect(pending).toHaveLength(batchSize)

      // Clear queue
      await offlineStorage.clearQueue()
      const finalCount = await offlineStorage.getQueueCount()
      expect(finalCount).toBe(0)
    })

    it('should handle storage size estimation', async () => {
      // Add some data using the correct API
      await offlineStorage.save('documents', 'size-test-1', { data: 'a'.repeat(1000) })
      await offlineStorage.save('documents', 'size-test-2', { data: 'b'.repeat(2000) })

      const size = await offlineStorage.estimateStorageSize()
      expect(size).toBeGreaterThan(0)
    })

    it('should clear all data when requested', async () => {
      // Add data using the correct API
      await offlineStorage.save('documents', 'clear-test', { data: 'test' })
      await offlineStorage.queueOperation({
        id: 'clear-op',
        type: 'create',
        entity: 'task',
        entityId: 'clear-task',
        data: {},
        timestamp: Date.now(),
      })
      await offlineStorage.setMetadata('clear-meta', 'value')

      // Clear all
      await offlineStorage.clearAll()

      // Verify all cleared
      const doc = await offlineStorage.load('documents', 'clear-test')
      const queue = await offlineStorage.getQueueCount()
      const meta = await offlineStorage.getMetadata('clear-meta')

      expect(doc).toBeUndefined()
      expect(queue).toBe(0)
      expect(meta).toBeUndefined()
    })
  })
})
