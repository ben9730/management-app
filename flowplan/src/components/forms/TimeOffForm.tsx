/**
 * TimeOffForm Component
 *
 * Form for creating and editing time off entries.
 * Hebrew RTL support with validation.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { TeamMember, TimeOffType } from '@/types/entities'

export interface TimeOffFormData {
  team_member_id: string
  start_date: string
  end_date: string
  type: TimeOffType
  notes?: string
}

export interface TimeOffFormProps {
  teamMembers: TeamMember[]
  onSubmit: (data: TimeOffFormData) => void
  onCancel: () => void
  initialValues?: Partial<TimeOffFormData>
  mode?: 'create' | 'edit'
  isLoading?: boolean
  className?: string
}

interface FormErrors {
  team_member_id?: string
  start_date?: string
  end_date?: string
}

// Time off type options
const typeOptions: SelectOption[] = [
  { value: 'vacation', label: 'Vacation' },
  { value: 'sick', label: 'Sick' },
  { value: 'personal', label: 'Personal' },
  { value: 'other', label: 'Other' },
]

const TimeOffForm: React.FC<TimeOffFormProps> = ({
  teamMembers,
  onSubmit,
  onCancel,
  initialValues,
  mode = 'create',
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = React.useState<TimeOffFormData>({
    team_member_id: initialValues?.team_member_id || '',
    start_date: initialValues?.start_date || '',
    end_date: initialValues?.end_date || '',
    type: initialValues?.type || 'vacation',
    notes: initialValues?.notes || '',
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  // Build team member options
  const memberOptions: SelectOption[] = React.useMemo(() => {
    return teamMembers.map((member) => {
      const displayName = member.display_name ||
        `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
        member.email
      return {
        value: member.id,
        label: displayName,
      }
    })
  }, [teamMembers])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.team_member_id) {
      newErrors.team_member_id = 'Team member is required'
    }

    if (!formData.start_date) {
      newErrors.start_date = 'Start date is required'
    }

    if (!formData.end_date) {
      newErrors.end_date = 'End date is required'
    }

    if (formData.start_date && formData.end_date) {
      const start = new Date(formData.start_date)
      const end = new Date(formData.end_date)
      if (end < start) {
        newErrors.end_date = 'End date must be after start date'
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Clear error when field is changed
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      onSubmit({
        team_member_id: formData.team_member_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        type: formData.type,
        notes: formData.notes?.trim() || undefined,
      })
    }
  }

  const isEditMode = mode === 'edit'

  return (
    <form
      role="form"
      onSubmit={handleSubmit}
      noValidate
      className={cn('space-y-6', className)}
      dir="rtl"
    >
      {/* Team Member Selection */}
      <Select
        label="Team Member *"
        id="team_member_id"
        name="team_member_id"
        value={formData.team_member_id}
        options={memberOptions}
        onChange={handleChange}
        disabled={isLoading}
        error={errors.team_member_id}
        fullWidth
        placeholder="Select team member"
        data-testid="timeoff-member-select"
      />

      {/* Date Fields - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date *"
          id="start_date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          disabled={isLoading}
          error={errors.start_date}
          fullWidth
          data-testid="timeoff-start-date-input"
        />

        <Input
          label="End Date *"
          id="end_date"
          name="end_date"
          type="date"
          value={formData.end_date}
          onChange={handleChange}
          disabled={isLoading}
          error={errors.end_date}
          fullWidth
          data-testid="timeoff-end-date-input"
        />
      </div>

      {/* Type Selection */}
      <Select
        label="Type *"
        id="type"
        name="type"
        value={formData.type}
        options={typeOptions}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
        data-testid="timeoff-type-select"
      />

      {/* Notes */}
      <Input
        label="Notes"
        id="notes"
        name="notes"
        value={formData.notes}
        onChange={handleChange}
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="Add any additional notes..."
        data-testid="timeoff-notes-input"
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="font-bold text-slate-400 hover:text-slate-600"
          data-testid="timeoff-form-cancel-button"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-purple-200 text-white min-w-[140px]"
        >
          {isLoading ? 'Saving...' : isEditMode ? 'Update' : 'Add Time Off'}
        </Button>
      </div>
    </form>
  )
}

TimeOffForm.displayName = 'TimeOffForm'

export { TimeOffForm }
