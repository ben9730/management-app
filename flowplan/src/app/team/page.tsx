'use client'

/**
 * Team Page
 *
 * Team workspace for managing team members and time off.
 * Hebrew RTL support.
 */

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui/modal'
import { TeamMemberList } from '@/components/team/TeamMemberList'
import { TimeOffCalendar } from '@/components/team/TimeOffCalendar'
import { TeamMemberForm, TeamMemberFormData } from '@/components/forms/TeamMemberForm'
import type { TeamMember, UserRole } from '@/types/entities'

// Hooks
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from '@/hooks/use-team-members'
import { useTimeOffs } from '@/hooks/use-time-off'

// Default organization ID (will be replaced with auth later)
const DEFAULT_ORG_ID = 'org-default'

// Date range for time off (current month + next 2 months)
const getTimeOffDateRange = () => {
  const now = new Date()
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
  const endDate = new Date(now.getFullYear(), now.getMonth() + 3, 0)
  return {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
  }
}

export default function TeamPage() {
  // Fetch team members
  const {
    data: teamMembers = [],
    isLoading: isLoadingMembers,
    error: membersError,
    refetch: refetchMembers,
  } = useTeamMembers(DEFAULT_ORG_ID)

  // Fetch time offs
  const timeOffDateRange = getTimeOffDateRange()
  const {
    data: timeOffs = [],
    isLoading: isLoadingTimeOffs,
    error: timeOffsError,
  } = useTimeOffs(timeOffDateRange)

  // Mutations
  const createMemberMutation = useCreateTeamMember()
  const updateMemberMutation = useUpdateTeamMember()
  const deleteMemberMutation = useDeleteTeamMember()

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)

  // Get the ID of member being deleted
  const deletingMemberId = deleteMemberMutation.isPending
    ? (deleteMemberMutation.variables as string)
    : null

  // Map TeamMember to form data
  // Note: Form only supports 'admin' | 'member' roles, so we map other roles to 'member'
  const memberToFormData = (member: TeamMember): Partial<TeamMemberFormData> => ({
    name: `${member.first_name} ${member.last_name}`,
    email: member.email,
    role: (member.role === 'admin' ? 'admin' : 'member') as UserRole,
    employment_type: member.employment_type,
    work_hours_per_day: member.work_hours_per_day,
    hourly_rate: member.hourly_rate ?? undefined,
    work_days: member.work_days,
  })

  // Handle add member
  const handleAddMember = useCallback(() => {
    setEditingMember(null)
    setIsModalOpen(true)
  }, [])

  // Handle edit member
  const handleEditMember = useCallback((member: TeamMember) => {
    setEditingMember(member)
    setIsModalOpen(true)
  }, [])

  // Handle delete member
  const handleDeleteMember = useCallback(
    (id: string) => {
      deleteMemberMutation.mutate(id, {
        onSuccess: () => {
          // Mutation success handled by React Query cache invalidation
        },
        onError: (error) => {
          console.error('Failed to delete member:', error)
        },
      })
    },
    [deleteMemberMutation]
  )

  // Handle form submit
  const handleFormSubmit = useCallback(
    (data: TeamMemberFormData) => {
      if (editingMember) {
        // Update existing member
        updateMemberMutation.mutate(
          {
            id: editingMember.id,
            updates: {
              display_name: data.name,
              email: data.email,
              role: data.role,
              weekly_capacity_hours: data.work_hours_per_day * data.work_days.length,
              hourly_rate: data.hourly_rate ?? null,
            },
          },
          {
            onSuccess: () => {
              setIsModalOpen(false)
              setEditingMember(null)
            },
            onError: (error) => {
              console.error('Failed to update member:', error)
            },
          }
        )
      } else {
        // Create new member
        createMemberMutation.mutate(
          {
            organization_id: DEFAULT_ORG_ID,
            display_name: data.name,
            email: data.email,
            role: data.role,
            weekly_capacity_hours: data.work_hours_per_day * data.work_days.length,
            hourly_rate: data.hourly_rate ?? null,
          },
          {
            onSuccess: () => {
              setIsModalOpen(false)
            },
            onError: (error) => {
              console.error('Failed to create member:', error)
            },
          }
        )
      }
    },
    [editingMember, createMemberMutation, updateMemberMutation]
  )

  // Handle form cancel
  const handleFormCancel = useCallback(() => {
    if (!createMemberMutation.isPending && !updateMemberMutation.isPending) {
      setIsModalOpen(false)
      setEditingMember(null)
    }
  }, [createMemberMutation.isPending, updateMemberMutation.isPending])

  // Handle retry
  const handleRetry = useCallback(() => {
    refetchMembers()
  }, [refetchMembers])

  // Transform team members data to match expected format for display
  // The service returns organization-level members, but our components expect project-level format
  const displayMembers: TeamMember[] = teamMembers.map((member) => ({
    id: member.id,
    user_id: member.user_id || member.id,
    project_id: member.project_id || 'org-level', // Not project-specific
    first_name: member.first_name || member.display_name?.split(' ')[0] || '',
    last_name: member.last_name || member.display_name?.split(' ').slice(1).join(' ') || '',
    email: member.email,
    employment_type: member.employment_type || 'full_time' as const, // Default
    work_hours_per_day: member.work_hours_per_day || Math.round((member.weekly_capacity_hours || 40) / 5),
    work_days: member.work_days || [0, 1, 2, 3, 4], // Default Israeli work week
    role: (member.role === 'admin' ? 'admin' : 'member') as UserRole,
    hourly_rate: member.hourly_rate ?? null,
    created_at: member.created_at,
  }))

  return (
    <div
      data-testid="team-page"
      dir="rtl"
      className="min-h-screen bg-background font-display"
    >
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Team Workspace</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            Manage your team members and track time off
          </p>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Team Members Section (2/3 width on large screens) */}
          <div className="lg:col-span-2">
            <TeamMemberList
              members={displayMembers}
              onAdd={handleAddMember}
              onEdit={handleEditMember}
              onDelete={handleDeleteMember}
              onRetry={handleRetry}
              isLoading={isLoadingMembers}
              error={membersError?.message || null}
              deletingMemberId={deletingMemberId}
            />
          </div>

          {/* Time Off Section (1/3 width on large screens) */}
          <div className="lg:col-span-1">
            <TimeOffCalendar
              timeOffs={timeOffs}
              teamMembers={displayMembers}
              isLoading={isLoadingTimeOffs}
              error={timeOffsError?.message || null}
            />
          </div>
        </div>
      </main>

      {/* Add/Edit Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleFormCancel}
        title={editingMember ? 'Edit Team Member' : 'Add Team Member'}
        size="md"
      >
        <TeamMemberForm
          mode={editingMember ? 'edit' : 'create'}
          initialValues={editingMember ? memberToFormData(editingMember) : undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createMemberMutation.isPending || updateMemberMutation.isPending}
        />
      </Modal>
    </div>
  )
}
