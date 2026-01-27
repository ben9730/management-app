export interface StorageConfig {
  dbName: string
  version: number
}

export interface QueuedOperation {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: string
  entityId?: string
  data: Record<string, unknown>
  timestamp: number
}

export type StoreName = 'documents' | 'syncQueue' | 'metadata'

export interface OfflineStorageService {
  // Document operations
  save(store: StoreName, key: string, value: unknown): Promise<void>
  load(store: StoreName, key: string): Promise<unknown>
  delete(store: StoreName, key: string): Promise<void>
  loadAll(store: StoreName): Promise<unknown[]>

  // Sync queue
  queueOperation(operation: QueuedOperation): Promise<void>
  getPendingOperations(): Promise<QueuedOperation[]>
  removeOperation(id: string): Promise<void>
  getQueueCount(): Promise<number>
  clearQueue(): Promise<void>

  // Metadata
  setMetadata(key: string, value: unknown): Promise<void>
  getMetadata(key: string): Promise<unknown>
  setDocumentVersion(docId: string, version: number): Promise<void>
  getDocumentVersion(docId: string): Promise<number>
  setOnlineStatus(isOnline: boolean): Promise<void>
  getOnlineStatus(): Promise<boolean>

  // Storage management
  clearAll(): Promise<void>
  estimateStorageSize(): Promise<number>
  close(): Promise<void>

  // Conflict resolution
  detectConflicts(entity: string, entityId: string): Promise<QueuedOperation[]>
  resolveConflicts(
    entity: string,
    entityId: string,
    strategy: 'last-write-wins' | 'first-write-wins'
  ): Promise<Record<string, unknown>>
}

function openDatabase(config: StorageConfig): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(config.dbName, config.version)

    request.onerror = () => {
      reject(request.error)
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('documents')) {
        db.createObjectStore('documents', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('syncQueue')) {
        db.createObjectStore('syncQueue', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('metadata')) {
        db.createObjectStore('metadata', { keyPath: 'key' })
      }
    }
  })
}

function promisifyRequest<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// In-memory implementation for testing and SSR
export function createInMemoryStorage(): OfflineStorageService {
  const stores = {
    documents: new Map<string, unknown>(),
    syncQueue: new Map<string, QueuedOperation>(),
    metadata: new Map<string, unknown>(),
  }

  const service: OfflineStorageService = {
    async save(store: StoreName, key: string, value: unknown): Promise<void> {
      ;(stores[store] as Map<string, unknown>).set(key, value)
    },

    async load(store: StoreName, key: string): Promise<unknown> {
      return (stores[store] as Map<string, unknown>).get(key)
    },

    async delete(store: StoreName, key: string): Promise<void> {
      ;(stores[store] as Map<string, unknown>).delete(key)
    },

    async loadAll(store: StoreName): Promise<unknown[]> {
      return Array.from((stores[store] as Map<string, unknown>).values())
    },

    async queueOperation(operation: QueuedOperation): Promise<void> {
      stores.syncQueue.set(operation.id, operation)
    },

    async getPendingOperations(): Promise<QueuedOperation[]> {
      return Array.from(stores.syncQueue.values())
    },

    async removeOperation(id: string): Promise<void> {
      stores.syncQueue.delete(id)
    },

    async getQueueCount(): Promise<number> {
      return stores.syncQueue.size
    },

    async clearQueue(): Promise<void> {
      stores.syncQueue.clear()
    },

    async setMetadata(key: string, value: unknown): Promise<void> {
      stores.metadata.set(key, value)
    },

    async getMetadata(key: string): Promise<unknown> {
      return stores.metadata.get(key)
    },

    async setDocumentVersion(docId: string, version: number): Promise<void> {
      await this.setMetadata(`version:${docId}`, version)
    },

    async getDocumentVersion(docId: string): Promise<number> {
      const version = await this.getMetadata(`version:${docId}`)
      return (version as number) || 0
    },

    async setOnlineStatus(isOnline: boolean): Promise<void> {
      await this.setMetadata('onlineStatus', isOnline)
    },

    async getOnlineStatus(): Promise<boolean> {
      const status = await this.getMetadata('onlineStatus')
      return status !== false
    },

    async clearAll(): Promise<void> {
      stores.documents.clear()
      stores.syncQueue.clear()
      stores.metadata.clear()
    },

    async estimateStorageSize(): Promise<number> {
      const documents = await this.loadAll('documents')
      const queue = await this.getPendingOperations()
      return JSON.stringify(documents).length + JSON.stringify(queue).length
    },

    async close(): Promise<void> {
      // No-op for in-memory storage
    },

    async detectConflicts(entity: string, entityId: string): Promise<QueuedOperation[]> {
      const operations = await this.getPendingOperations()
      return operations.filter(
        op => op.entity === entity && op.entityId === entityId
      )
    },

    async resolveConflicts(
      entity: string,
      entityId: string,
      strategy: 'last-write-wins' | 'first-write-wins'
    ): Promise<Record<string, unknown>> {
      const conflicts = await this.detectConflicts(entity, entityId)

      if (conflicts.length === 0) {
        return {}
      }

      const sorted = [...conflicts].sort((a, b) => a.timestamp - b.timestamp)
      const result: Record<string, unknown> = {}

      if (strategy === 'last-write-wins') {
        for (const op of sorted) {
          Object.assign(result, op.data)
        }
      } else {
        for (const op of sorted.reverse()) {
          Object.assign(result, op.data)
        }
      }

      return result
    },
  }

  return service
}

export async function createOfflineStorage(
  config: StorageConfig
): Promise<OfflineStorageService> {
  const db = await openDatabase(config)

  const getStore = (
    storeName: StoreName,
    mode: IDBTransactionMode = 'readonly'
  ): IDBObjectStore => {
    const transaction = db.transaction(storeName, mode)
    return transaction.objectStore(storeName)
  }

  const getPendingOps = async (): Promise<QueuedOperation[]> => {
    const objectStore = getStore('syncQueue', 'readonly')
    const result = await promisifyRequest(objectStore.getAll())
    return (result as QueuedOperation[]) || []
  }

  const loadAllDocs = async (store: StoreName): Promise<unknown[]> => {
    const objectStore = getStore(store, 'readonly')
    const result = await promisifyRequest(objectStore.getAll())
    return result || []
  }

  const setMeta = async (key: string, value: unknown): Promise<void> => {
    const objectStore = getStore('metadata', 'readwrite')
    await promisifyRequest(objectStore.put({ key, value }))
  }

  const getMeta = async (key: string): Promise<unknown> => {
    const objectStore = getStore('metadata', 'readonly')
    const result = await promisifyRequest(objectStore.get(key)) as { value: unknown } | undefined
    return result?.value
  }

  const service: OfflineStorageService = {
    async save(store: StoreName, key: string, value: unknown): Promise<void> {
      const objectStore = getStore(store, 'readwrite')
      const data = typeof value === 'object' && value !== null
        ? { ...value as object, id: key }
        : { id: key, value }
      await promisifyRequest(objectStore.put(data))
    },

    async load(store: StoreName, key: string): Promise<unknown> {
      const objectStore = getStore(store, 'readonly')
      const result = await promisifyRequest(objectStore.get(key))
      return result
    },

    async delete(store: StoreName, key: string): Promise<void> {
      const objectStore = getStore(store, 'readwrite')
      await promisifyRequest(objectStore.delete(key))
    },

    async loadAll(store: StoreName): Promise<unknown[]> {
      return loadAllDocs(store)
    },

    async queueOperation(operation: QueuedOperation): Promise<void> {
      const objectStore = getStore('syncQueue', 'readwrite')
      await promisifyRequest(objectStore.put(operation))
    },

    async getPendingOperations(): Promise<QueuedOperation[]> {
      return getPendingOps()
    },

    async removeOperation(id: string): Promise<void> {
      const objectStore = getStore('syncQueue', 'readwrite')
      await promisifyRequest(objectStore.delete(id))
    },

    async getQueueCount(): Promise<number> {
      const operations = await getPendingOps()
      return operations.length
    },

    async clearQueue(): Promise<void> {
      const objectStore = getStore('syncQueue', 'readwrite')
      await promisifyRequest(objectStore.clear())
    },

    async setMetadata(key: string, value: unknown): Promise<void> {
      await setMeta(key, value)
    },

    async getMetadata(key: string): Promise<unknown> {
      return getMeta(key)
    },

    async setDocumentVersion(docId: string, version: number): Promise<void> {
      await setMeta(`version:${docId}`, version)
    },

    async getDocumentVersion(docId: string): Promise<number> {
      const version = await getMeta(`version:${docId}`)
      return (version as number) || 0
    },

    async setOnlineStatus(isOnline: boolean): Promise<void> {
      await setMeta('onlineStatus', isOnline)
    },

    async getOnlineStatus(): Promise<boolean> {
      const status = await getMeta('onlineStatus')
      return status !== false // Default to true if not set
    },

    async clearAll(): Promise<void> {
      const stores: StoreName[] = ['documents', 'syncQueue', 'metadata']

      for (const storeName of stores) {
        const objectStore = getStore(storeName, 'readwrite')
        await promisifyRequest(objectStore.clear())
      }
    },

    async estimateStorageSize(): Promise<number> {
      // This is a rough estimate based on stringifying data
      const documents = await loadAllDocs('documents')
      const queue = await getPendingOps()

      const docsSize = JSON.stringify(documents).length
      const queueSize = JSON.stringify(queue).length

      return docsSize + queueSize
    },

    async close(): Promise<void> {
      db.close()
    },

    async detectConflicts(entity: string, entityId: string): Promise<QueuedOperation[]> {
      const operations = await getPendingOps()
      return operations.filter(
        op => op.entity === entity && op.entityId === entityId
      )
    },

    async resolveConflicts(
      entity: string,
      entityId: string,
      strategy: 'last-write-wins' | 'first-write-wins'
    ): Promise<Record<string, unknown>> {
      const conflicts = await service.detectConflicts(entity, entityId)

      if (conflicts.length === 0) {
        return {}
      }

      // Sort by timestamp
      const sorted = [...conflicts].sort((a, b) => a.timestamp - b.timestamp)

      // Merge all data based on strategy
      const result: Record<string, unknown> = {}

      if (strategy === 'last-write-wins') {
        // Apply in order, last write wins
        for (const op of sorted) {
          Object.assign(result, op.data)
        }
      } else {
        // Apply in reverse order, first write wins
        for (const op of sorted.reverse()) {
          Object.assign(result, op.data)
        }
      }

      return result
    },
  }

  return service
}
