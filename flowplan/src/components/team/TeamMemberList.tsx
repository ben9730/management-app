/**
 * TeamMemberList Component
 *
 * Displays a list of team members with loading, empty, and error states.
 * Hebrew RTL support.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { TeamMemberCard } from './TeamMemberCard'
import type { TeamMember } from '@/types/entities'
import { Loader2, Plus, Users, AlertCircle } from 'lucide-react'

export interface TeamMemberListProps {
  members: TeamMember[]
  onEdit: (member: TeamMember) => void
  onDelete: (id: string) => void
  onAdd: () => void
  onRetry?: () => void
  isLoading?: boolean
  error?: string | null
  deletingMemberId?: string | null
  className?: string
}

const TeamMemberList: React.FC<TeamMemberListProps> = ({
  members,
  onEdit,
  onDelete,
  onAdd,
  onRetry,
  isLoading = false,
  error = null,
  deletingMemberId = null,
  className,
}) => {
  const memberCount = members.length
  const countText = memberCount === 1 ? '1 member' : `${memberCount} members`

  // Loading State
  if (isLoading) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div
          data-testid="loading-indicator"
          className="flex flex-col items-center gap-4"
        >
          <Loader2 className="w-12 h-12 animate-spin text-primary" />
          <p className="text-slate-500 dark:text-slate-400 text-lg">
            Loading team members...
          </p>
        </div>
      </div>
    )
  }

  // Error State
  if (error) {
    return (
      <div className={cn('flex flex-col items-center justify-center py-16', className)}>
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            Failed to load team members
          </h3>
          <p className="text-slate-500 dark:text-slate-400">{error}</p>
          {onRetry && (
            <Button onClick={onRetry} variant="outline">
              Retry
            </Button>
          )}
        </div>
      </div>
    )
  }

  // Empty State
  if (memberCount === 0) {
    return (
      <div className={cn('flex flex-col', className)}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Team Members
            </h2>
            <span className="text-sm text-slate-500 dark:text-slate-400">
              (0 members)
            </span>
          </div>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 ml-2" />
            Add Member
          </Button>
        </div>

        {/* Empty State Content */}
        <div className="flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Users className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No team members yet
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 text-center max-w-sm">
            Add your first team member to start managing your team&apos;s work schedule and assignments.
          </p>
          <Button onClick={onAdd}>
            <Plus className="w-4 h-4 ml-2" />
            Add First Member
          </Button>
        </div>
      </div>
    )
  }

  // Normal State with Members
  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Team Members
          </h2>
          <span className="text-sm text-slate-500 dark:text-slate-400">
            ({countText})
          </span>
        </div>
        <Button onClick={onAdd}>
          <Plus className="w-4 h-4 ml-2" />
          Add Member
        </Button>
      </div>

      {/* Member Grid */}
      <div
        data-testid="member-list"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
      >
        {members.map((member) => (
          <TeamMemberCard
            key={member.id}
            member={member}
            onEdit={onEdit}
            onDelete={onDelete}
            isDeleting={deletingMemberId === member.id}
          />
        ))}
      </div>
    </div>
  )
}

TeamMemberList.displayName = 'TeamMemberList'

export { TeamMemberList }
