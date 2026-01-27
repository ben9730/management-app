/**
 * OfflineSyncStatus Component Tests (TDD)
 *
 * Visual indicator component for offline/online sync status
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { OfflineSyncStatus } from './OfflineSyncStatus'

// Mock the sync hooks
const mockUseSyncStatus = vi.fn()
const mockUseOfflineStatus = vi.fn()

vi.mock('../../hooks/use-sync', () => ({
  useSyncStatus: () => mockUseSyncStatus(),
  useOfflineStatus: () => mockUseOfflineStatus(),
}))

describe('OfflineSyncStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock values - online and connected
    mockUseSyncStatus.mockReturnValue({
      connected: true,
      syncing: false,
      pendingChanges: 0,
      lastSyncTime: new Date('2026-01-27T15:00:00'),
      error: null,
    })
    mockUseOfflineStatus.mockReturnValue({
      isOnline: true,
      queueCount: 0,
      forceSync: vi.fn(),
    })
  })

  describe('online/offline status indicator', () => {
    it('shows online status when connected', () => {
      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('status-indicator')).toBeInTheDocument()
      expect(screen.getByTestId('status-indicator')).toHaveClass('bg-green-500')
      expect(screen.getByText('Online')).toBeInTheDocument()
    })

    it('shows offline status when not online', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        queueCount: 0,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('status-indicator')).toHaveClass('bg-red-500')
      expect(screen.getByText('Offline')).toBeInTheDocument()
    })

    it('shows syncing status when actively syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: true,
        syncing: true,
        pendingChanges: 5,
        lastSyncTime: new Date('2026-01-27T15:00:00'),
        error: null,
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('status-indicator')).toHaveClass('bg-yellow-500')
      expect(screen.getByText('Syncing')).toBeInTheDocument()
    })

    it('shows connecting status when not connected but online', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: false,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime: null,
        error: null,
      })
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        queueCount: 0,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('status-indicator')).toHaveClass('bg-yellow-500')
      expect(screen.getByText('Connecting')).toBeInTheDocument()
    })
  })

  describe('pending changes count', () => {
    it('shows pending changes count when there are pending changes', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: true,
        syncing: false,
        pendingChanges: 5,
        lastSyncTime: new Date('2026-01-27T15:00:00'),
        error: null,
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('pending-count')).toBeInTheDocument()
      expect(screen.getByText('5 pending')).toBeInTheDocument()
    })

    it('shows queue count when offline with queued operations', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        queueCount: 3,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('queue-count')).toBeInTheDocument()
      expect(screen.getByText('3 queued')).toBeInTheDocument()
    })

    it('hides pending count when zero', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: true,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime: new Date('2026-01-27T15:00:00'),
        error: null,
      })

      render(<OfflineSyncStatus />)

      expect(screen.queryByTestId('pending-count')).not.toBeInTheDocument()
    })

    it('hides queue count when zero and offline', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        queueCount: 0,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.queryByTestId('queue-count')).not.toBeInTheDocument()
    })
  })

  describe('sync button', () => {
    it('shows sync button when online with queued changes', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        queueCount: 3,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByRole('button', { name: /sync/i })).toBeInTheDocument()
    })

    it('calls forceSync when sync button is clicked', async () => {
      const mockForceSync = vi.fn()
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        queueCount: 3,
        forceSync: mockForceSync,
      })

      render(<OfflineSyncStatus />)

      fireEvent.click(screen.getByRole('button', { name: /sync/i }))

      expect(mockForceSync).toHaveBeenCalledTimes(1)
    })

    it('disables sync button when offline', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: false,
        queueCount: 3,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled()
    })

    it('disables sync button while syncing', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: true,
        syncing: true,
        pendingChanges: 5,
        lastSyncTime: new Date('2026-01-27T15:00:00'),
        error: null,
      })
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        queueCount: 3,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByRole('button', { name: /sync/i })).toBeDisabled()
    })

    it('hides sync button when no queued changes', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        queueCount: 0,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      expect(screen.queryByRole('button', { name: /sync/i })).not.toBeInTheDocument()
    })
  })

  describe('last sync time', () => {
    it('displays last sync time when available', () => {
      const lastSyncTime = new Date('2026-01-27T15:30:00')
      mockUseSyncStatus.mockReturnValue({
        connected: true,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime,
        error: null,
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('last-sync-time')).toBeInTheDocument()
      expect(screen.getByText(/last sync/i)).toBeInTheDocument()
    })

    it('shows "Never" when lastSyncTime is null', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: false,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime: null,
        error: null,
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByText(/never/i)).toBeInTheDocument()
    })

    it('formats last sync time relative to now', () => {
      // Set last sync time to 5 minutes ago
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
      mockUseSyncStatus.mockReturnValue({
        connected: true,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime: fiveMinutesAgo,
        error: null,
      })

      render(<OfflineSyncStatus />)

      // Should show relative time like "5 minutes ago"
      expect(screen.getByTestId('last-sync-time')).toHaveTextContent(/ago/i)
    })
  })

  describe('connection status indicator', () => {
    it('shows WebSocket connected icon when connected', () => {
      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('ws-connected')).toBeInTheDocument()
    })

    it('shows WebSocket disconnected icon when not connected', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: false,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime: null,
        error: null,
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('ws-disconnected')).toBeInTheDocument()
    })
  })

  describe('error display', () => {
    it('shows error message when there is a sync error', () => {
      mockUseSyncStatus.mockReturnValue({
        connected: false,
        syncing: false,
        pendingChanges: 0,
        lastSyncTime: null,
        error: 'Connection failed',
      })

      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('sync-error')).toBeInTheDocument()
      expect(screen.getByText('Connection failed')).toBeInTheDocument()
    })

    it('hides error message when no error', () => {
      render(<OfflineSyncStatus />)

      expect(screen.queryByTestId('sync-error')).not.toBeInTheDocument()
    })
  })

  describe('compact mode', () => {
    it('renders in compact mode when compact prop is true', () => {
      render(<OfflineSyncStatus compact />)

      expect(screen.getByTestId('offline-sync-status')).toHaveClass('compact')
    })

    it('hides last sync time in compact mode', () => {
      render(<OfflineSyncStatus compact />)

      expect(screen.queryByTestId('last-sync-time')).not.toBeInTheDocument()
    })

    it('shows only status indicator in compact mode', () => {
      render(<OfflineSyncStatus compact />)

      expect(screen.getByTestId('status-indicator')).toBeInTheDocument()
      expect(screen.queryByText('Online')).not.toBeInTheDocument()
    })
  })

  describe('accessibility', () => {
    it('has appropriate aria-label for status', () => {
      render(<OfflineSyncStatus />)

      expect(screen.getByTestId('offline-sync-status')).toHaveAttribute(
        'aria-label',
        expect.stringContaining('Sync status')
      )
    })

    it('sync button has accessible label', () => {
      mockUseOfflineStatus.mockReturnValue({
        isOnline: true,
        queueCount: 3,
        forceSync: vi.fn(),
      })

      render(<OfflineSyncStatus />)

      const button = screen.getByRole('button', { name: /sync/i })
      expect(button).toHaveAttribute('aria-label')
    })
  })
})
