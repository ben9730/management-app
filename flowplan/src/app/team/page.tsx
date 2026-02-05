'use client'

/**
 * Team Page
 *
 * Team workspace for managing team members and time off.
 * Hebrew RTL support.
 */

import { useState, useCallback, useMemo } from 'react'
import { Modal } from '@/components/ui/modal'
import { TeamMemberList } from '@/components/team/TeamMemberList'
import { TimeOffCalendar } from '@/components/team/TimeOffCalendar'
import { TeamMemberForm, TeamMemberFormData } from '@/components/forms/TeamMemberForm'
import { TimeOffForm, TimeOffFormData } from '@/components/forms/TimeOffForm'
import type { TeamMember, UserRole } from '@/types/entities'
import { useRegisteredUsers } from '@/hooks/use-users'

// Hooks
import {
  useTeamMembers,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from '@/hooks/use-team-members'
import { useTimeOffs, useCreateTimeOff } from '@/hooks/use-time-off'

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
  // Fetch registered users for email lookup
  const { data: registeredUsers = [] } = useRegisteredUsers()

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
  const createTimeOffMutation = useCreateTimeOff()

  // UI State
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null)
  const [isTimeOffModalOpen, setIsTimeOffModalOpen] = useState(false)

  // Get the ID of member being deleted
  const deletingMemberId = deleteMemberMutation.isPending
    ? (deleteMemberMutation.variables as string)
    : null

  // Get list of user IDs that are already team members (to exclude from selection)
  const existingMemberUserIds = useMemo(() => {
    return teamMembers
      .map((m) => m.user_id)
      .filter((id): id is string => id !== null && id !== undefined)
  }, [teamMembers])

  // Helper to get user email by ID
  const getUserEmail = useCallback(
    (userId: string) => {
      const user = registeredUsers.find((u) => u.id === userId)
      return user?.email || ''
    },
    [registeredUsers]
  )

  // Map TeamMember to form data
  const memberToFormData = (member: TeamMember): Partial<TeamMemberFormData> => ({
    user_id: member.user_id || '',
    display_name: member.display_name || '',
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
      // Get user email for the selected user
      const userEmail = getUserEmail(data.user_id)

      // Use custom display_name if provided, otherwise use email
      const displayName = data.display_name?.trim() || userEmail

      if (editingMember) {
        // Update existing member (user_id cannot be changed)
        updateMemberMutation.mutate(
          {
            id: editingMember.id,
            updates: {
              display_name: displayName,
              role: data.role,
              employment_type: data.employment_type,
              work_hours_per_day: data.work_hours_per_day,
              work_days: data.work_days,
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
        // Create new member with user_id
        createMemberMutation.mutate(
          {
            organization_id: DEFAULT_ORG_ID,
            user_id: data.user_id,
            display_name: displayName,
            email: userEmail,
            role: data.role,
            employment_type: data.employment_type,
            work_hours_per_day: data.work_hours_per_day,
            work_days: data.work_days,
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
    [editingMember, createMemberMutation, updateMemberMutation, getUserEmail]
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

  // Handle add time off
  const handleAddTimeOff = useCallback(() => {
    setIsTimeOffModalOpen(true)
  }, [])

  // Handle time off form submit
  const handleTimeOffSubmit = useCallback(
    (data: TimeOffFormData) => {
      createTimeOffMutation.mutate(
        {
          team_member_id: data.team_member_id,
          start_date: data.start_date,
          end_date: data.end_date,
          type: data.type,
          notes: data.notes || null,
        },
        {
          onSuccess: () => {
            setIsTimeOffModalOpen(false)
          },
          onError: (error) => {
            console.error('Failed to create time off:', error)
          },
        }
      )
    },
    [createTimeOffMutation]
  )

  // Handle time off form cancel
  const handleTimeOffCancel = useCallback(() => {
    if (!createTimeOffMutation.isPending) {
      setIsTimeOffModalOpen(false)
    }
  }, [createTimeOffMutation.isPending])

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
          <h1 className="text-3xl font-bold text-foreground">צוות העבודה</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-2">
            ניהול חברי צוות ומעקב אחר חופשות
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
              onAddTimeOff={handleAddTimeOff}
            />
          </div>
        </div>
      </main>

      {/* Add/Edit Member Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleFormCancel}
        title={editingMember ? 'עריכת חבר צוות' : 'הוספת חבר צוות'}
        size="md"
      >
        <TeamMemberForm
          mode={editingMember ? 'edit' : 'create'}
          initialValues={editingMember ? memberToFormData(editingMember) : undefined}
          onSubmit={handleFormSubmit}
          onCancel={handleFormCancel}
          isLoading={createMemberMutation.isPending || updateMemberMutation.isPending}
          excludeUserIds={editingMember ? [] : existingMemberUserIds}
        />
      </Modal>

      {/* Add Time Off Modal */}
      <Modal
        isOpen={isTimeOffModalOpen}
        onClose={handleTimeOffCancel}
        title="הוספת חופשה"
        size="md"
      >
        <TimeOffForm
          teamMembers={displayMembers}
          onSubmit={handleTimeOffSubmit}
          onCancel={handleTimeOffCancel}
          isLoading={createTimeOffMutation.isPending}
        />
      </Modal>
    </div>
  )
}
