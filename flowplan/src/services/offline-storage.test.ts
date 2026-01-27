import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  OfflineStorageService,
  createInMemoryStorage,
  QueuedOperation,
} from './offline-storage'

describe('OfflineStorageService', () => {
  let storage: OfflineStorageService

  beforeEach(() => {
    vi.clearAllMocks()
    storage = createInMemoryStorage()
  })

  afterEach(async () => {
    if (storage) {
      await storage.close()
    }
  })

  describe('createInMemoryStorage', () => {
    it('should create an offline storage service', () => {
      expect(storage).toBeDefined()
      expect(storage.save).toBeDefined()
      expect(storage.load).toBeDefined()
      expect(storage.delete).toBeDefined()
    })
  })

  describe('document storage', () => {
    it('should save a document', async () => {
      const doc = { id: 'doc-1', data: { title: 'Test Document' } }

      await storage.save('documents', doc.id, doc)

      const loaded = await storage.load('documents', doc.id)
      expect(loaded).toEqual(doc)
    })

    it('should update an existing document', async () => {
      const doc = { id: 'doc-1', data: { title: 'Original' } }
      await storage.save('documents', doc.id, doc)

      const updated = { ...doc, data: { title: 'Updated' } }
      await storage.save('documents', doc.id, updated)

      const loaded = await storage.load('documents', doc.id)
      expect(loaded).toEqual(updated)
    })

    it('should delete a document', async () => {
      const doc = { id: 'doc-1', data: { title: 'Test' } }
      await storage.save('documents', doc.id, doc)

      await storage.delete('documents', doc.id)

      const loaded = await storage.load('documents', doc.id)
      expect(loaded).toBeUndefined()
    })

    it('should return undefined for non-existent document', async () => {
      const loaded = await storage.load('documents', 'non-existent')

      expect(loaded).toBeUndefined()
    })

    it('should load all documents', async () => {
      await storage.save('documents', 'doc-1', { id: 'doc-1', title: 'Doc 1' })
      await storage.save('documents', 'doc-2', { id: 'doc-2', title: 'Doc 2' })

      const all = await storage.loadAll('documents')

      expect(all).toHaveLength(2)
      expect(all).toContainEqual({ id: 'doc-1', title: 'Doc 1' })
      expect(all).toContainEqual({ id: 'doc-2', title: 'Doc 2' })
    })
  })

  describe('sync queue', () => {
    it('should queue an operation for sync', async () => {
      const operation: QueuedOperation = {
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: { id: 'task-1', title: 'New Task' },
        timestamp: Date.now(),
      }

      await storage.queueOperation(operation)

      const queue = await storage.getPendingOperations()
      expect(queue).toHaveLength(1)
      expect(queue[0]).toEqual(operation)
    })

    it('should queue multiple operations', async () => {
      const op1: QueuedOperation = {
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: { id: 'task-1' },
        timestamp: Date.now(),
      }
      const op2: QueuedOperation = {
        id: 'op-2',
        type: 'update',
        entity: 'tasks',
        data: { id: 'task-1', status: 'done' },
        timestamp: Date.now() + 1,
      }

      await storage.queueOperation(op1)
      await storage.queueOperation(op2)

      const queue = await storage.getPendingOperations()
      expect(queue).toHaveLength(2)
    })

    it('should remove operation from queue after sync', async () => {
      const operation: QueuedOperation = {
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: { id: 'task-1' },
        timestamp: Date.now(),
      }

      await storage.queueOperation(operation)
      await storage.removeOperation(operation.id)

      const queue = await storage.getPendingOperations()
      expect(queue).toHaveLength(0)
    })

    it('should get queue count', async () => {
      await storage.queueOperation({
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: {},
        timestamp: Date.now(),
      })
      await storage.queueOperation({
        id: 'op-2',
        type: 'update',
        entity: 'tasks',
        data: {},
        timestamp: Date.now(),
      })

      const count = await storage.getQueueCount()

      expect(count).toBe(2)
    })

    it('should clear entire queue', async () => {
      await storage.queueOperation({
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: {},
        timestamp: Date.now(),
      })

      await storage.clearQueue()

      const queue = await storage.getPendingOperations()
      expect(queue).toHaveLength(0)
    })
  })

  describe('metadata storage', () => {
    it('should save and load metadata', async () => {
      const lastSync = Date.now()

      await storage.setMetadata('lastSyncTime', lastSync)
      const loaded = await storage.getMetadata('lastSyncTime')

      expect(loaded).toBe(lastSync)
    })

    it('should save document version', async () => {
      await storage.setDocumentVersion('doc-1', 5)

      const version = await storage.getDocumentVersion('doc-1')
      expect(version).toBe(5)
    })

    it('should return 0 for unknown document version', async () => {
      const version = await storage.getDocumentVersion('unknown')

      expect(version).toBe(0)
    })

    it('should track online/offline status', async () => {
      await storage.setOnlineStatus(false)
      let isOnline = await storage.getOnlineStatus()
      expect(isOnline).toBe(false)

      await storage.setOnlineStatus(true)
      isOnline = await storage.getOnlineStatus()
      expect(isOnline).toBe(true)
    })
  })

  describe('storage management', () => {
    it('should clear all data', async () => {
      await storage.save('documents', 'doc-1', { id: 'doc-1' })
      await storage.queueOperation({
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: {},
        timestamp: Date.now(),
      })

      await storage.clearAll()

      const docs = await storage.loadAll('documents')
      const queue = await storage.getPendingOperations()

      expect(docs).toHaveLength(0)
      expect(queue).toHaveLength(0)
    })

    it('should estimate storage size', async () => {
      await storage.save('documents', 'doc-1', { id: 'doc-1', data: 'test' })

      const size = await storage.estimateStorageSize()

      expect(size).toBeGreaterThanOrEqual(0)
    })
  })

  describe('conflict resolution', () => {
    it('should detect conflicting operations', async () => {
      const op1: QueuedOperation = {
        id: 'op-1',
        type: 'update',
        entity: 'tasks',
        entityId: 'task-1',
        data: { status: 'done' },
        timestamp: Date.now(),
      }
      const op2: QueuedOperation = {
        id: 'op-2',
        type: 'update',
        entity: 'tasks',
        entityId: 'task-1',
        data: { status: 'in_progress' },
        timestamp: Date.now() + 100,
      }

      await storage.queueOperation(op1)
      await storage.queueOperation(op2)

      const conflicts = await storage.detectConflicts('tasks', 'task-1')

      expect(conflicts).toHaveLength(2)
    })

    it('should merge conflicting operations with last-write-wins', async () => {
      const op1: QueuedOperation = {
        id: 'op-1',
        type: 'update',
        entity: 'tasks',
        entityId: 'task-1',
        data: { status: 'done', title: 'Task 1' },
        timestamp: Date.now(),
      }
      const op2: QueuedOperation = {
        id: 'op-2',
        type: 'update',
        entity: 'tasks',
        entityId: 'task-1',
        data: { status: 'in_progress' },
        timestamp: Date.now() + 100,
      }

      await storage.queueOperation(op1)
      await storage.queueOperation(op2)

      const merged = await storage.resolveConflicts('tasks', 'task-1', 'last-write-wins')

      expect(merged.status).toBe('in_progress')
      expect(merged.title).toBe('Task 1')
    })
  })
})
