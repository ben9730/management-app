'use client'

import { useSyncStatus, useOfflineStatus } from '../../hooks/use-sync'
import { formatDistanceToNow } from 'date-fns'

interface OfflineSyncStatusProps {
  compact?: boolean
}

type ConnectionState = 'online' | 'offline' | 'syncing' | 'connecting'

function getConnectionState(
  isOnline: boolean,
  connected: boolean,
  syncing: boolean
): ConnectionState {
  if (!isOnline) return 'offline'
  if (syncing) return 'syncing'
  if (!connected) return 'connecting'
  return 'online'
}

function getStatusColor(state: ConnectionState): string {
  switch (state) {
    case 'online':
      return 'bg-green-500'
    case 'offline':
      return 'bg-red-500'
    case 'syncing':
    case 'connecting':
      return 'bg-yellow-500'
  }
}

function getStatusText(state: ConnectionState): string {
  switch (state) {
    case 'online':
      return 'Online'
    case 'offline':
      return 'Offline'
    case 'syncing':
      return 'Syncing'
    case 'connecting':
      return 'Connecting'
  }
}

export function OfflineSyncStatus({ compact = false }: OfflineSyncStatusProps) {
  const status = useSyncStatus()
  const { isOnline, queueCount, forceSync } = useOfflineStatus()

  const connectionState = getConnectionState(isOnline, status.connected, status.syncing)
  const statusColor = getStatusColor(connectionState)
  const statusText = getStatusText(connectionState)

  const showSyncButton = queueCount > 0
  const isSyncDisabled = !isOnline || status.syncing

  const formatLastSyncTime = () => {
    if (!status.lastSyncTime) return 'Never'
    return formatDistanceToNow(status.lastSyncTime, { addSuffix: true })
  }

  return (
    <div
      data-testid="offline-sync-status"
      aria-label={`Sync status: ${statusText}`}
      className={`flex items-center gap-2 ${compact ? 'compact' : ''}`}
    >
      {/* Status Indicator */}
      <div className="flex items-center gap-2">
        <div
          data-testid="status-indicator"
          className={`w-2 h-2 rounded-full ${statusColor}`}
        />
        {!compact && <span className="text-sm font-medium">{statusText}</span>}
      </div>

      {/* Pending Changes Count */}
      {!compact && status.pendingChanges > 0 && (
        <span data-testid="pending-count" className="text-sm text-gray-500">
          {status.pendingChanges} pending
        </span>
      )}

      {/* Queue Count (offline) */}
      {!compact && queueCount > 0 && (
        <span data-testid="queue-count" className="text-sm text-gray-500">
          {queueCount} queued
        </span>
      )}

      {/* Sync Button */}
      {showSyncButton && (
        <button
          onClick={forceSync}
          disabled={isSyncDisabled}
          aria-label="Sync pending changes"
          className={`px-2 py-1 text-xs font-medium rounded border ${
            isSyncDisabled
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-black text-white hover:bg-gray-800'
          }`}
        >
          Sync
        </button>
      )}

      {/* Last Sync Time */}
      {!compact && (
        <span data-testid="last-sync-time" className="text-xs text-gray-400">
          Last sync: {formatLastSyncTime()}
        </span>
      )}

      {/* WebSocket Connection Status */}
      {status.connected ? (
        <div data-testid="ws-connected" className="text-green-500" title="WebSocket connected">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      ) : (
        <div data-testid="ws-disconnected" className="text-gray-400" title="WebSocket disconnected">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      )}

      {/* Error Display */}
      {status.error && (
        <div
          data-testid="sync-error"
          className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded"
        >
          {status.error}
        </div>
      )}
    </div>
  )
}
