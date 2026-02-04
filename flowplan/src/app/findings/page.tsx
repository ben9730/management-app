'use client'

/**
 * Findings Page
 *
 * Audit Findings Center for managing and tracking audit findings and CAPA.
 * Hebrew RTL support with dark mode styling.
 * Uses dynamic project fetching (same pattern as Dashboard).
 */

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { Button } from '@/components/ui/button'
import { FindingsList } from '@/components/findings/FindingsList'
import { CapaTracker } from '@/components/findings/CapaTracker'
import { FindingForm, FindingFormData } from '@/components/forms/FindingForm'
import type { AuditFinding, FindingSeverity, FindingStatus } from '@/types/entities'
import { AlertTriangle, Loader2 } from 'lucide-react'

// Hooks
import {
  useAuditFindings,
  useCreateAuditFinding,
  useUpdateAuditFinding,
  useDeleteAuditFinding,
} from '@/hooks/use-audit-findings'
import { useTasks } from '@/hooks/use-tasks'
import { useProjects } from '@/hooks/use-projects'

// Default organization ID (will be replaced with auth later)
const DEFAULT_ORG_ID = 'org-default'

export default function FindingsPage() {
  // Fetch projects for the organization (same pattern as Dashboard)
  const { data: projects = [], isLoading: isLoadingProjects } = useProjects(DEFAULT_ORG_ID)

  // Get the first project (or null if none)
  const project = projects[0] || null
  const projectId = project?.id || ''

  // Fetch findings (only when we have a valid project)
  const {
    data: findings = [],
    isLoading: isLoadingFindings,
    error: findingsError,
    refetch: refetchFindings,
  } = useAuditFindings(projectId)

  // Fetch tasks for the form dropdown (only when we have a valid project)
  const { data: tasks = [] } = useTasks(projectId, undefined)

  // Mutations
  const createFindingMutation = useCreateAuditFinding()
  const updateFindingMutation = useUpdateAuditFinding()
  const deleteFindingMutation = useDeleteAuditFinding()

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingFinding, setEditingFinding] = useState<AuditFinding | null>(null)

  // Filter State
  const [severityFilter, setSeverityFilter] = useState<FindingSeverity | null>(null)
  const [statusFilter, setStatusFilter] = useState<FindingStatus | null>(null)

  // Get the ID of finding being deleted
  const deletingFindingId = deleteFindingMutation.isPending
    ? (deleteFindingMutation.variables as string)
    : null

  // Map AuditFinding to form data
  const findingToFormData = (finding: AuditFinding): Partial<FindingFormData> => ({
    task_id: finding.task_id,
    severity: finding.severity,
    finding: finding.finding,
    root_cause: finding.root_cause,
    capa: finding.capa,
    due_date: finding.due_date,
    status: finding.status,
  })

  // Handle add finding
  const handleAddFinding = useCallback(() => {
    setEditingFinding(null)
    setIsModalOpen(true)
  }, [])

  // Handle edit finding
  const handleEditFinding = useCallback((finding: AuditFinding) => {
    setEditingFinding(finding)
    setIsModalOpen(true)
  }, [])

  // Handle delete finding
  const handleDeleteFinding = useCallback(
    (id: string) => {
      deleteFindingMutation.mutate(id, {
        onSuccess: () => {
          // Mutation success handled by React Query cache invalidation
        },
        onError: (error) => {
          console.error('Failed to delete finding:', error)
        },
      })
    },
    [deleteFindingMutation]
  )

  // Handle form submit
  const handleFormSubmit = useCallback(
    (data: FindingFormData) => {
      if (editingFinding) {
        // Update existing finding
        updateFindingMutation.mutate(
          {
            id: editingFinding.id,
            updates: {
              severity: data.severity,
              finding: data.finding,
              root_cause: data.root_cause ?? null,
              capa: data.capa ?? null,
              due_date: data.due_date ? data.due_date.toISOString().split('T')[0] : null,
              status: data.status,
            },
          },
          {
            onSuccess: () => {
              setIsModalOpen(false)
              setEditingFinding(null)
            },
            onError: (error) => {
              console.error('Failed to update finding:', error)
            },
          }
        )
      } else {
        // Create new finding
        createFindingMutation.mutate(
          {
            task_id: data.task_id,
            severity: data.severity,
            finding: data.finding,
            root_cause: data.root_cause ?? null,
            capa: data.capa ?? null,
            due_date: data.due_date ? data.due_date.toISOString().split('T')[0] : null,
          },
          {
            onSuccess: () => {
              setIsModalOpen(false)
            },
            onError: (error) => {
              console.error('Failed to create finding:', error)
            },
          }
        )
      }
    },
    [editingFinding, createFindingMutation, updateFindingMutation]
  )

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    if (!createFindingMutation.isPending && !updateFindingMutation.isPending) {
      setIsModalOpen(false)
      setEditingFinding(null)
    }
  }, [createFindingMutation.isPending, updateFindingMutation.isPending])

  // Handle retry
  const handleRetry = useCallback(() => {
    refetchFindings()
  }, [refetchFindings])

  // Handle severity filter change
  const handleSeverityFilterChange = useCallback((severity: FindingSeverity | null) => {
    setSeverityFilter(severity)
  }, [])

  // Handle status filter change
  const handleStatusFilterChange = useCallback((status: FindingStatus | null) => {
    setStatusFilter(status)
  }, [])

  // Loading state: include projects loading, and query loading only when project exists
  const isLoading = isLoadingProjects || (projectId && isLoadingFindings)

  // Loading UI
  if (isLoading) {
    return (
      <div
        data-testid="findings-page"
        dir="rtl"
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="text-center" data-testid="loading-indicator">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-slate-500 dark:text-slate-400 text-lg">טוען נתונים...</p>
        </div>
      </div>
    )
  }

  // No project - show empty state
  if (!project) {
    return (
      <div
        data-testid="findings-page"
        dir="rtl"
        className="min-h-screen bg-background flex items-center justify-center"
      >
        <div className="text-center max-w-md" data-testid="no-project-state">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-3">אין פרויקט פעיל</h1>
          <p className="text-slate-500 dark:text-slate-400 mb-4">
            כדי להתחיל לנהל ממצאים, עליך ליצור פרויקט בדף הבית
          </p>
          <Button
            className="bg-primary hover:bg-blue-600 text-white px-8 py-3 rounded-xl font-semibold"
            onClick={() => window.location.href = '/'}
          >
            חזרה לדף הבית
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div
      data-testid="findings-page"
      dir="rtl"
      className="min-h-screen bg-background font-display"
    >
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">
            מרכז ממצאי ביקורת
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            ניהול ומעקב אחר ממצאי ביקורת ותיקונים
          </p>
        </div>

        {/* Main Content Grid */}
        <div
          data-testid="findings-grid"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8"
        >
          {/* Findings List Section (2/3 width on large screens) */}
          <div data-testid="findings-section" className="lg:col-span-2">
            <FindingsList
              findings={findings}
              onAdd={handleAddFinding}
              onEdit={handleEditFinding}
              onDelete={handleDeleteFinding}
              onRetry={handleRetry}
              isLoading={isLoadingFindings}
              error={findingsError?.message || null}
              deletingId={deletingFindingId}
              severityFilter={severityFilter}
              statusFilter={statusFilter}
              onSeverityFilterChange={handleSeverityFilterChange}
              onStatusFilterChange={handleStatusFilterChange}
            />
          </div>

          {/* CAPA Tracker Section (1/3 width on large screens) */}
          <div data-testid="tracker-section" className="lg:col-span-1">
            <CapaTracker
              findings={findings}
              isLoading={isLoadingFindings}
            />
          </div>
        </div>
      </main>

      {/* Add/Edit Finding Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleFormCancel}
        title={editingFinding ? 'עריכת ממצא' : 'הוספת ממצא'}
        size="lg"
      >
        <FindingForm
          tasks={tasks}
          mode={editingFinding ? 'edit' : 'create'}
          initialValues={editingFinding ? findingToFormData(editingFinding) : undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createFindingMutation.isPending || updateFindingMutation.isPending}
        />
      </Modal>
    </div>
  )
}
