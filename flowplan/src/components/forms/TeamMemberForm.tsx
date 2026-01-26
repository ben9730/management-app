/**
 * TeamMemberForm Component
 *
 * Form for adding and editing team members with work schedule configuration.
 * Based on PRD v2.1 - Brutalist UI design with Israeli calendar support.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { UserRole, EmploymentType } from '@/types/entities'

export interface TeamMemberFormData {
  name: string
  email: string
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
}

interface FormErrors {
  name?: string
  email?: string
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
}) => {
  const [formData, setFormData] = React.useState<TeamMemberFormData>({
    name: initialValues?.name || '',
    email: initialValues?.email || '',
    role: initialValues?.role || 'member',
    employment_type: initialValues?.employment_type || 'full_time',
    work_hours_per_day: initialValues?.work_hours_per_day || 8,
    hourly_rate: initialValues?.hourly_rate,
    work_days: initialValues?.work_days || DEFAULT_WORK_DAYS,
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required'
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = 'Invalid email format'
    }

    if (formData.work_days.length === 0) {
      newErrors.work_days = 'Select at least one work day'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
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
      {/* Name */}
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Name *
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          disabled={isLoading}
          required
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={cn(
            'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            errors.name && 'border-red-500 focus:ring-red-500',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
        {errors.name && (
          <div aria-live="polite">
            <p id="name-error" className="mt-1 text-sm text-red-500">
              {errors.name}
            </p>
          </div>
        )}
      </div>

      {/* Email */}
      <div>
        <label
          htmlFor="email"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Email *
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          disabled={isLoading}
          required
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={cn(
            'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            errors.email && 'border-red-500 focus:ring-red-500',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
        {errors.email && (
          <div aria-live="polite">
            <p id="email-error" className="mt-1 text-sm text-red-500">
              {errors.email}
            </p>
          </div>
        )}
      </div>

      {/* Role & Employment Type */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="role"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            Role
          </label>
          <select
            id="role"
            name="role"
            value={formData.role}
            onChange={handleChange}
            disabled={isLoading}
            className={cn(
              'w-full appearance-none border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {roleOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="employment_type"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            Employment Type
          </label>
          <select
            id="employment_type"
            name="employment_type"
            value={formData.employment_type}
            onChange={handleChange}
            disabled={isLoading}
            className={cn(
              'w-full appearance-none border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          >
            {employmentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Work Hours & Hourly Rate */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="work_hours_per_day"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            Work Hours Per Day
          </label>
          <input
            id="work_hours_per_day"
            name="work_hours_per_day"
            type="number"
            min={1}
            max={24}
            step={0.5}
            value={formData.work_hours_per_day}
            onChange={handleChange}
            disabled={isLoading}
            className={cn(
              'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>

        <div>
          <label
            htmlFor="hourly_rate"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            Hourly Rate (₪)
          </label>
          <input
            id="hourly_rate"
            name="hourly_rate"
            type="number"
            min={0}
            step={1}
            value={formData.hourly_rate || ''}
            onChange={handleChange}
            disabled={isLoading}
            className={cn(
              'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {/* Work Days */}
      <fieldset
        role="group"
        aria-labelledby="work-days-label"
        className="border-2 border-black p-4"
      >
        <legend
          id="work-days-label"
          className="px-2 text-sm font-bold uppercase tracking-wider text-black"
        >
          Work Days
        </legend>
        <div className="flex flex-wrap gap-2">
          {weekDays.map((day) => (
            <label
              key={day.value}
              className={cn(
                'flex cursor-pointer items-center gap-2 border-2 border-black px-3 py-2 transition-all',
                formData.work_days.includes(day.value)
                  ? 'bg-black text-white'
                  : 'bg-white text-black hover:bg-gray-100',
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
            <p className="mt-2 text-sm text-red-500">{errors.work_days}</p>
          </div>
        )}
      </fieldset>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-black">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} loading={isLoading}>
          {isLoading ? 'Saving...' : isEditMode ? 'Update Member' : 'Add Member'}
        </Button>
      </div>
    </form>
  )
}

TeamMemberForm.displayName = 'TeamMemberForm'

export { TeamMemberForm }
