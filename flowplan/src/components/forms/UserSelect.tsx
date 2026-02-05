/**
 * UserSelect Component
 *
 * A dropdown for selecting from registered users.
 * Wraps the Select component and fetches users via useRegisteredUsers hook.
 */

import * as React from 'react'
import { Select, type SelectProps, type SelectOption } from '@/components/ui/select'
import { useRegisteredUsers } from '@/hooks/use-users'

export interface UserSelectProps
  extends Omit<SelectProps, 'options'> {
  /** Exclude certain user IDs from the list (e.g., already added team members) */
  excludeUserIds?: string[]
}

const UserSelect = React.forwardRef<HTMLSelectElement, UserSelectProps>(
  ({ excludeUserIds = [], disabled, placeholder = 'בחר משתמש...', ...props }, ref) => {
    const { data: users, isLoading, error } = useRegisteredUsers()

    // Map users to select options, excluding specified IDs
    const options: SelectOption[] = React.useMemo(() => {
      if (!users) return []

      return users
        .filter((user) => !excludeUserIds.includes(user.id))
        .map((user) => ({
          value: user.id,
          label: user.email,
        }))
    }, [users, excludeUserIds])

    // Loading state
    if (isLoading) {
      return (
        <Select
          ref={ref}
          options={[]}
          disabled
          placeholder="טוען משתמשים..."
          {...props}
        />
      )
    }

    // Error state
    if (error) {
      return (
        <Select
          ref={ref}
          options={[]}
          disabled
          placeholder="שגיאה בטעינת משתמשים"
          error="לא ניתן לטעון את רשימת המשתמשים"
          {...props}
        />
      )
    }

    // No users available
    if (options.length === 0) {
      return (
        <Select
          ref={ref}
          options={[]}
          disabled
          placeholder="אין משתמשים זמינים"
          helperText="כל המשתמשים כבר נוספו או אין משתמשים רשומים"
          {...props}
        />
      )
    }

    return (
      <Select
        ref={ref}
        options={options}
        disabled={disabled}
        placeholder={placeholder}
        {...props}
      />
    )
  }
)

UserSelect.displayName = 'UserSelect'

export { UserSelect }
