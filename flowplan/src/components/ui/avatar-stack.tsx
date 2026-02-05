/**
 * AvatarStack Component
 *
 * Displays a stack of avatars with overlap effect.
 * Shows initials when no avatar URL is available.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface AvatarData {
  id: string
  name?: string | null
  email?: string | null
  avatarUrl?: string | null
}

export interface AvatarStackProps {
  avatars: AvatarData[]
  max?: number // Maximum avatars to show before "+N"
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

// Size configurations
const sizeConfig = {
  sm: {
    container: 'h-6 w-6 text-[10px]',
    overlap: '-ml-2',
    plusBadge: 'h-6 w-6 text-[10px]',
  },
  md: {
    container: 'h-8 w-8 text-xs',
    overlap: '-ml-2.5',
    plusBadge: 'h-8 w-8 text-xs',
  },
  lg: {
    container: 'h-10 w-10 text-sm',
    overlap: '-ml-3',
    plusBadge: 'h-10 w-10 text-sm',
  },
}

// Color palette for avatars (based on name/email hash)
const avatarColors = [
  'bg-blue-500',
  'bg-green-500',
  'bg-purple-500',
  'bg-orange-500',
  'bg-pink-500',
  'bg-teal-500',
  'bg-indigo-500',
  'bg-rose-500',
]

/**
 * Get initials from name or email
 */
function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }
  if (email) {
    return email.slice(0, 2).toUpperCase()
  }
  return '??'
}

/**
 * Get consistent color based on string hash
 */
function getColorForId(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i)
    hash = hash & hash
  }
  return avatarColors[Math.abs(hash) % avatarColors.length]
}

const AvatarStack: React.FC<AvatarStackProps> = ({
  avatars,
  max = 3,
  size = 'md',
  className,
}) => {
  const config = sizeConfig[size]
  const visibleAvatars = avatars.slice(0, max)
  const remainingCount = avatars.length - max

  if (avatars.length === 0) {
    return null
  }

  return (
    <div
      className={cn('flex items-center', className)}
      data-testid="avatar-stack"
    >
      {visibleAvatars.map((avatar, index) => (
        <div
          key={avatar.id}
          className={cn(
            config.container,
            'rounded-full flex items-center justify-center font-medium text-white border-2 border-slate-900 dark:border-slate-800',
            index > 0 && config.overlap,
            avatar.avatarUrl ? '' : getColorForId(avatar.id)
          )}
          style={{ zIndex: avatars.length - index }}
          title={avatar.name || avatar.email || 'Unknown'}
          data-testid={`avatar-${avatar.id}`}
        >
          {avatar.avatarUrl ? (
            <img
              src={avatar.avatarUrl}
              alt={avatar.name || avatar.email || 'Avatar'}
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            getInitials(avatar.name, avatar.email)
          )}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={cn(
            config.plusBadge,
            config.overlap,
            'rounded-full flex items-center justify-center font-medium bg-slate-600 text-white border-2 border-slate-900 dark:border-slate-800'
          )}
          style={{ zIndex: 0 }}
          title={`${remainingCount} more`}
          data-testid="avatar-stack-overflow"
        >
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

AvatarStack.displayName = 'AvatarStack'

export { AvatarStack }
