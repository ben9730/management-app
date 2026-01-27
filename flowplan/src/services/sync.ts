import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

export interface SyncStatus {
  connected: boolean
  syncing: boolean
  pendingChanges: number
  lastSyncTime: Date | null
  error: string | null
}

export interface SyncConfig {
  documentId: string
  websocketUrl: string
  document?: Y.Doc
  awareness?: boolean
}

export interface ChangeEvent {
  origin: string
  type: 'local' | 'remote'
}

export interface AwarenessState {
  name?: string
  color?: string
  cursor?: { x: number; y: number }
  [key: string]: unknown
}

type StatusCallback = (status: SyncStatus) => void
type ChangeCallback = (event: ChangeEvent) => void
type AwarenessCallback = (states: Map<number, AwarenessState>) => void

export interface SyncService {
  getDocument(): Y.Doc
  getTasks(): Y.Map<unknown>
  getProjects(): Y.Map<unknown>
  getTeamMembers(): Y.Map<unknown>
  getAuditFindings(): Y.Array<unknown>

  setTask(id: string, data: unknown, origin?: string): void
  deleteTask(id: string): void
  transaction(fn: () => void): void

  connect(): Promise<void>
  disconnect(): void

  getStatus(): SyncStatus
  onStatusChange(callback: StatusCallback): () => void
  onChange(callback: ChangeCallback): () => void

  undo(): void
  redo(): void
  canUndo(): boolean
  canRedo(): boolean

  createSnapshot(): Uint8Array
  restoreFromSnapshot(snapshot: Uint8Array): void

  setAwarenessState(state: AwarenessState): void
  getLocalAwarenessState(): AwarenessState | null
  getAllAwarenessStates(): Map<number, AwarenessState>
  onAwarenessChange(callback: AwarenessCallback): () => void
}

export function createSyncService(config: SyncConfig): SyncService {
  const doc = config.document ?? new Y.Doc()
  let provider: WebsocketProvider | null = null

  const statusCallbacks = new Set<StatusCallback>()
  const changeCallbacks = new Set<ChangeCallback>()
  const awarenessCallbacks = new Set<AwarenessCallback>()

  let status: SyncStatus = {
    connected: false,
    syncing: false,
    pendingChanges: 0,
    lastSyncTime: null,
    error: null,
  }

  let localAwarenessState: AwarenessState | null = null
  const awarenessStates = new Map<number, AwarenessState>()

  // Undo manager for tracking changes
  const tasksMap = doc.getMap('tasks')
  const undoManager = new Y.UndoManager(tasksMap, {
    trackedOrigins: new Set(['local']),
  })

  const notifyStatusChange = () => {
    statusCallbacks.forEach(cb => cb(status))
  }

  const notifyChange = (event: ChangeEvent) => {
    changeCallbacks.forEach(cb => cb(event))
  }

  const notifyAwarenessChange = () => {
    awarenessCallbacks.forEach(cb => cb(new Map(awarenessStates)))
  }

  // Listen to document updates
  doc.on('update', (_update: Uint8Array, origin: unknown) => {
    const originStr = typeof origin === 'string' ? origin : 'unknown'
    notifyChange({
      origin: originStr,
      type: originStr === 'local' ? 'local' : 'remote',
    })
  })

  return {
    getDocument() {
      return doc
    },

    getTasks() {
      return doc.getMap('tasks')
    },

    getProjects() {
      return doc.getMap('projects')
    },

    getTeamMembers() {
      return doc.getMap('teamMembers')
    },

    getAuditFindings() {
      return doc.getArray('auditFindings')
    },

    setTask(id: string, data: unknown, origin = 'local') {
      doc.transact(() => {
        const tasks = doc.getMap('tasks')
        tasks.set(id, data)
      }, origin)
    },

    deleteTask(id: string) {
      doc.transact(() => {
        const tasks = doc.getMap('tasks')
        tasks.delete(id)
      }, 'local')
    },

    transaction(fn: () => void) {
      doc.transact(fn, 'local')
    },

    async connect() {
      if (provider) {
        provider.destroy()
      }

      return new Promise<void>((resolve) => {
        provider = new WebsocketProvider(
          config.websocketUrl,
          config.documentId,
          doc
        )

        provider.on('status', (event: { status: string }) => {
          status = {
            ...status,
            connected: event.status === 'connected',
            syncing: event.status === 'connecting',
          }
          notifyStatusChange()

          if (event.status === 'connected') {
            status.lastSyncTime = new Date()
            resolve()
          }
        })

        provider.on('sync', (isSynced: boolean) => {
          status = {
            ...status,
            syncing: !isSynced,
            lastSyncTime: isSynced ? new Date() : status.lastSyncTime,
          }
          notifyStatusChange()
        })

        // Handle awareness changes from provider
        if (provider.awareness) {
          provider.awareness.on('change', () => {
            const states = provider?.awareness?.getStates()
            if (states) {
              awarenessStates.clear()
              states.forEach((state, clientId) => {
                awarenessStates.set(clientId, state as AwarenessState)
              })
              notifyAwarenessChange()
            }
          })
        }

        // Resolve after a short timeout if already connected
        setTimeout(() => {
          if (status.connected) {
            resolve()
          }
        }, 0)
      })
    },

    disconnect() {
      if (provider) {
        provider.destroy()
        provider = null
      }
      status = {
        ...status,
        connected: false,
        syncing: false,
      }
      notifyStatusChange()
    },

    getStatus() {
      return { ...status }
    },

    onStatusChange(callback: StatusCallback) {
      statusCallbacks.add(callback)
      return () => {
        statusCallbacks.delete(callback)
      }
    },

    onChange(callback: ChangeCallback) {
      changeCallbacks.add(callback)
      return () => {
        changeCallbacks.delete(callback)
      }
    },

    undo() {
      undoManager.undo()
    },

    redo() {
      undoManager.redo()
    },

    canUndo() {
      return undoManager.canUndo()
    },

    canRedo() {
      return undoManager.canRedo()
    },

    createSnapshot() {
      return Y.encodeStateAsUpdate(doc)
    },

    restoreFromSnapshot(snapshot: Uint8Array) {
      Y.applyUpdate(doc, snapshot)
    },

    setAwarenessState(state: AwarenessState) {
      localAwarenessState = state
      if (provider?.awareness) {
        provider.awareness.setLocalState(state)
      }
      notifyAwarenessChange()
    },

    getLocalAwarenessState() {
      return localAwarenessState
    },

    getAllAwarenessStates() {
      return new Map(awarenessStates)
    },

    onAwarenessChange(callback: AwarenessCallback) {
      awarenessCallbacks.add(callback)
      return () => {
        awarenessCallbacks.delete(callback)
      }
    },
  }
}
