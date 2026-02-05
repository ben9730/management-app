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

    it('should merge conflicting operations with first-write-wins', async () => {
      const now = Date.now()
      const op1: QueuedOperation = {
        id: 'op-1',
        type: 'update',
        entity: 'tasks',
        entityId: 'task-2',
        data: { status: 'done', title: 'First Write' },
        timestamp: now,
      }
      const op2: QueuedOperation = {
        id: 'op-2',
        type: 'update',
        entity: 'tasks',
        entityId: 'task-2',
        data: { status: 'in_progress', title: 'Second Write' },
        timestamp: now + 100,
      }

      await storage.queueOperation(op1)
      await storage.queueOperation(op2)

      const merged = await storage.resolveConflicts('tasks', 'task-2', 'first-write-wins')

      expect(merged.status).toBe('done')
      expect(merged.title).toBe('First Write')
    })

    it('should return empty object when no conflicts exist', async () => {
      const merged = await storage.resolveConflicts('tasks', 'non-existent', 'last-write-wins')

      expect(merged).toEqual({})
    })

    it('should only detect conflicts for specific entity and entityId', async () => {
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
        entityId: 'task-2',
        data: { status: 'pending' },
        timestamp: Date.now(),
      }
      const op3: QueuedOperation = {
        id: 'op-3',
        type: 'update',
        entity: 'projects',
        entityId: 'task-1',
        data: { name: 'Project' },
        timestamp: Date.now(),
      }

      await storage.queueOperation(op1)
      await storage.queueOperation(op2)
      await storage.queueOperation(op3)

      const conflicts = await storage.detectConflicts('tasks', 'task-1')

      expect(conflicts).toHaveLength(1)
      expect(conflicts[0].id).toBe('op-1')
    })
  })

  describe('edge cases', () => {
    it('should handle deleting non-existent document gracefully', async () => {
      await expect(storage.delete('documents', 'non-existent')).resolves.not.toThrow()
    })

    it('should handle removing non-existent operation gracefully', async () => {
      await expect(storage.removeOperation('non-existent-op')).resolves.not.toThrow()
    })

    it('should return default online status when not set', async () => {
      const newStorage = createInMemoryStorage()
      const isOnline = await newStorage.getOnlineStatus()
      expect(isOnline).toBe(true) // Default should be true
    })

    it('should handle storing and loading different data types', async () => {
      // String
      await storage.save('documents', 'string-doc', 'just a string')
      const stringDoc = await storage.load('documents', 'string-doc')
      expect(stringDoc).toBe('just a string')

      // Number
      await storage.setMetadata('number-meta', 42)
      const numberMeta = await storage.getMetadata('number-meta')
      expect(numberMeta).toBe(42)

      // Boolean
      await storage.setMetadata('bool-meta', true)
      const boolMeta = await storage.getMetadata('bool-meta')
      expect(boolMeta).toBe(true)

      // Array
      await storage.save('documents', 'array-doc', [1, 2, 3])
      const arrayDoc = await storage.load('documents', 'array-doc')
      expect(arrayDoc).toEqual([1, 2, 3])

      // Null
      await storage.setMetadata('null-meta', null)
      const nullMeta = await storage.getMetadata('null-meta')
      expect(nullMeta).toBeNull()
    })

    it('should handle empty loadAll result', async () => {
      const docs = await storage.loadAll('documents')
      expect(docs).toEqual([])
    })

    it('should handle clearing already empty storage', async () => {
      await expect(storage.clearAll()).resolves.not.toThrow()

      const docs = await storage.loadAll('documents')
      const queue = await storage.getPendingOperations()

      expect(docs).toHaveLength(0)
      expect(queue).toHaveLength(0)
    })

    it('should handle storing documents with special characters in id', async () => {
      const specialId = 'doc/with:special-chars_and.dots'
      await storage.save('documents', specialId, { data: 'test' })

      const loaded = await storage.load('documents', specialId)
      expect(loaded).toEqual({ data: 'test' })
    })

    it('should update document version correctly', async () => {
      await storage.setDocumentVersion('doc-1', 1)
      await storage.setDocumentVersion('doc-1', 2)
      await storage.setDocumentVersion('doc-1', 3)

      const version = await storage.getDocumentVersion('doc-1')
      expect(version).toBe(3)
    })

    it('should handle operations with delete type', async () => {
      const deleteOp: QueuedOperation = {
        id: 'delete-op-1',
        type: 'delete',
        entity: 'tasks',
        entityId: 'task-to-delete',
        data: {},
        timestamp: Date.now(),
      }

      await storage.queueOperation(deleteOp)

      const queue = await storage.getPendingOperations()
      expect(queue).toHaveLength(1)
      expect(queue[0].type).toBe('delete')
    })

    it('should handle large data objects', async () => {
      const largeData = {
        id: 'large-doc',
        data: 'x'.repeat(10000),
        nested: {
          array: Array(100).fill({ key: 'value' }),
        },
      }

      await storage.save('documents', 'large-doc', largeData)

      const loaded = await storage.load('documents', 'large-doc')
      expect(loaded).toEqual(largeData)
    })

    it('should estimate storage size including queue and documents', async () => {
      await storage.save('documents', 'doc-1', { data: 'test data' })
      await storage.queueOperation({
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: { title: 'Task' },
        timestamp: Date.now(),
      })

      const size = await storage.estimateStorageSize()
      expect(size).toBeGreaterThan(0)
    })
  })

  describe('multiple stores', () => {
    it('should maintain separate stores for documents, syncQueue, and metadata', async () => {
      // Store in documents
      await storage.save('documents', 'key-1', { type: 'document' })

      // Store in syncQueue
      await storage.queueOperation({
        id: 'key-1',
        type: 'create',
        entity: 'test',
        data: { type: 'operation' },
        timestamp: Date.now(),
      })

      // Store in metadata
      await storage.setMetadata('key-1', 'metadata value')

      // Each store should be independent
      const doc = await storage.load('documents', 'key-1')
      const ops = await storage.getPendingOperations()
      const meta = await storage.getMetadata('key-1')

      expect(doc).toEqual({ type: 'document' })
      expect(ops[0].data).toEqual({ type: 'operation' })
      expect(meta).toBe('metadata value')
    })

    it('should load all from syncQueue store', async () => {
      await storage.queueOperation({
        id: 'op-1',
        type: 'create',
        entity: 'tasks',
        data: {},
        timestamp: 1,
      })
      await storage.queueOperation({
        id: 'op-2',
        type: 'update',
        entity: 'tasks',
        data: {},
        timestamp: 2,
      })

      const all = await storage.loadAll('syncQueue')

      expect(all).toHaveLength(2)
    })

    it('should load all from metadata store', async () => {
      await storage.setMetadata('meta-1', 'value1')
      await storage.setMetadata('meta-2', 'value2')

      const all = await storage.loadAll('metadata')

      expect(all).toHaveLength(2)
    })
  })
})
