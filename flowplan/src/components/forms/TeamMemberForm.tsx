/**
 * TeamMemberForm Component
 *
 * Form for adding and editing team members with work schedule configuration.
 * Uses UserSelect to select from registered users.
 * Based on PRD v2.1 - Brutalist UI design with Israeli calendar support.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { UserSelect } from '@/components/forms/UserSelect'
import { UserRole, EmploymentType } from '@/types/entities'

export interface TeamMemberFormData {
  user_id: string
  display_name?: string // Custom display name (optional, defaults to email)
  role: UserRole
  employment_type: EmploymentType
  work_hours_per_day: number
  hourly_rate?: number
  work_days: number[] // 0=Sunday, 1=Monday, etc.
}

export interface TeamMemberFormProps {
  onSubmit: (data: TeamMemberFormData) => void
  onCancel: () => void
  initialValues?: Partial<TeamMemberFormData>
  mode?: 'create' | 'edit'
  isLoading?: boolean
  className?: string
  /** User IDs to exclude from selection (e.g., already added members) */
  excludeUserIds?: string[]
}

interface FormErrors {
  user_id?: string
  work_days?: string
}

const roleOptions = [
  { value: 'admin', label: 'Admin' },
  { value: 'member', label: 'Member' },
]

const employmentTypeOptions = [
  { value: 'full_time', label: 'Full Time' },
  { value: 'part_time', label: 'Part Time' },
  { value: 'contractor', label: 'Contractor' },
]

const weekDays = [
  { value: 0, label: 'Sunday', shortLabel: 'Sun' },
  { value: 1, label: 'Monday', shortLabel: 'Mon' },
  { value: 2, label: 'Tuesday', shortLabel: 'Tue' },
  { value: 3, label: 'Wednesday', shortLabel: 'Wed' },
  { value: 4, label: 'Thursday', shortLabel: 'Thu' },
  { value: 5, label: 'Friday', shortLabel: 'Fri' },
  { value: 6, label: 'Saturday', shortLabel: 'Sat' },
]

// Israeli work week: Sunday to Thursday
const DEFAULT_WORK_DAYS = [0, 1, 2, 3, 4]

const TeamMemberForm: React.FC<TeamMemberFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  mode = 'create',
  isLoading = false,
  className,
  excludeUserIds = [],
}) => {
  const [formData, setFormData] = React.useState<TeamMemberFormData>({
    user_id: initialValues?.user_id || '',
    display_name: initialValues?.display_name || '',
    role: initialValues?.role || 'member',
    employment_type: initialValues?.employment_type || 'full_time',
    work_hours_per_day: initialValues?.work_hours_per_day || 8,
    hourly_rate: initialValues?.hourly_rate,
    work_days: initialValues?.work_days || DEFAULT_WORK_DAYS,
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.user_id) {
      newErrors.user_id = 'יש לבחור משתמש'
    }

    if (formData.work_days.length === 0) {
      newErrors.work_days = 'יש לבחור לפחות יום עבודה אחד'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target
    const newValue = type === 'number' ? Number(value) : value

    setFormData((prev) => ({
      ...prev,
      [name]: newValue,
    }))

    // Clear error when field is changed
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleUserChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const userId = e.target.value
    setFormData((prev) => ({
      ...prev,
      user_id: userId,
    }))

    // Clear error when user is selected
    if (errors.user_id) {
      setErrors((prev) => ({ ...prev, user_id: undefined }))
    }
  }

  const handleWorkDayToggle = (day: number) => {
    setFormData((prev) => {
      const newWorkDays = prev.work_days.includes(day)
        ? prev.work_days.filter((d) => d !== day)
        : [...prev.work_days, day].sort()
      return { ...prev, work_days: newWorkDays }
    })

    // Clear work days error
    if (errors.work_days) {
      setErrors((prev) => ({ ...prev, work_days: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      onSubmit({
        ...formData,
        hourly_rate: formData.hourly_rate || undefined,
      })
    }
  }

  const handleCancel = (e: React.MouseEvent) => {
    e.preventDefault()
    onCancel()
  }

  const isEditMode = mode === 'edit'

  return (
    <form
      role="form"
      onSubmit={handleSubmit}
      noValidate
      className={cn('space-y-4', className)}
    >
      {/* User Selection */}
      <UserSelect
        label="משתמש *"
        id="user_id"
        name="user_id"
        value={formData.user_id}
        onChange={handleUserChange}
        disabled={isLoading || isEditMode}
        error={errors.user_id}
        excludeUserIds={excludeUserIds}
        fullWidth
        placeholder="בחר משתמש..."
      />
      {isEditMode && (
        <p className="text-xs text-slate-400 -mt-2">
          לא ניתן לשנות את המשתמש במצב עריכה
        </p>
      )}

      {/* Display Name */}
      <Input
        label="שם תצוגה"
        id="display_name"
        name="display_name"
        type="text"
        value={formData.display_name || ''}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
        placeholder="השם שיוצג במשימות (אופציונלי)"
      />
      <p className="text-xs text-slate-400 -mt-2">
        אם ריק, יוצג האימייל של המשתמש
      </p>

      {/* Role & Employment Type */}
      <div className="grid grid-cols-2 gap-4">
        <Select
          label="תפקיד"
          id="role"
          name="role"
          value={formData.role}
          options={roleOptions}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
        />

        <Select
          label="סוג העסקה"
          id="employment_type"
          name="employment_type"
          value={formData.employment_type}
          options={employmentTypeOptions}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
        />
      </div>

      {/* Work Hours & Hourly Rate */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="שעות עבודה ביום"
          id="work_hours_per_day"
          name="work_hours_per_day"
          type="number"
          min={1}
          max={24}
          step={0.5}
          value={formData.work_hours_per_day}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
        />

        <Input
          label="שכר לשעה (₪)"
          id="hourly_rate"
          name="hourly_rate"
          type="number"
          min={0}
          step={1}
          value={formData.hourly_rate || ''}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
        />
      </div>

      {/* Work Days */}
      <fieldset
        role="group"
        aria-labelledby="work-days-label"
        className="border border-slate-200 dark:border-slate-600 p-4 rounded-xl bg-white dark:bg-slate-800"
      >
        <legend
          id="work-days-label"
          className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400"
        >
          ימי עבודה
        </legend>
        <div className="flex flex-wrap gap-2">
          {weekDays.map((day) => (
            <label
              key={day.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 border px-3 py-2 transition-all rounded-lg',
                formData.work_days.includes(day.value)
                  ? 'bg-indigo-600 text-white border-indigo-600'
                  : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border-slate-200 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-600',
                isLoading && 'opacity-50 cursor-not-allowed'
              )}
            >
              <input
                type="checkbox"
                checked={formData.work_days.includes(day.value)}
                onChange={() => handleWorkDayToggle(day.value)}
                disabled={isLoading}
                className="sr-only"
                aria-label={day.label}
              />
              <span className="text-sm font-bold">{day.shortLabel}</span>
            </label>
          ))}
        </div>
        {errors.work_days && (
          <div aria-live="polite">
            <p className="mt-2 text-sm text-red-500 font-medium">{errors.work_days}</p>
          </div>
        )}
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-600">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
        >
          ביטול
        </Button>
        <Button type="submit" disabled={isLoading} loading={isLoading}>
          {isLoading ? 'שומר...' : isEditMode ? 'עדכון' : 'הוסף'}
        </Button>
      </div>
    </form>
  )
}

TeamMemberForm.displayName = 'TeamMemberForm'

export { TeamMemberForm }
