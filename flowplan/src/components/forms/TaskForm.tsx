/**
 * TaskForm Component
 *
 * Form for creating and editing tasks with validation.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { TaskPriority, TeamMember } from '@/types/entities'

export interface TaskFormData {
  title: string
  description?: string
  priority: TaskPriority
  duration: number
  estimated_hours?: number
  start_date?: string
  phase_id?: string
  assignee_id?: string
}

export interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  initialValues?: Partial<TaskFormData>
  mode?: 'create' | 'edit'
  isLoading?: boolean
  className?: string
  /** Team members available for assignment */
  teamMembers?: TeamMember[]
}

interface FormErrors {
  title?: string
  duration?: string
}

const priorityOptions: SelectOption[] = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
]

const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  mode = 'create',
  isLoading = false,
  className,
  teamMembers,
}) => {
  // Build assignee options from team members
  const assigneeOptions: SelectOption[] = React.useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) return []

    const options: SelectOption[] = [
      { value: '', label: 'Unassigned' },
    ]

    teamMembers.forEach((member) => {
      const displayName = member.display_name ||
        `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
        member.email
      options.push({
        value: member.id,
        label: displayName,
      })
    })

    return options
  }, [teamMembers])
  const [formData, setFormData] = React.useState<TaskFormData>({
    title: initialValues?.title || '',
    description: initialValues?.description || '',
    priority: initialValues?.priority || 'medium',
    duration: initialValues?.duration || 1,
    estimated_hours: initialValues?.estimated_hours,
    start_date: initialValues?.start_date || '',
    phase_id: initialValues?.phase_id,
    assignee_id: initialValues?.assignee_id,
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'כותרת היא שדה חובה'
    }

    if (formData.duration < 1) {
      newErrors.duration = 'משך זמן חייב להיות לפחות יום אחד'
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
        ...formData,
        description: formData.description || undefined,
        estimated_hours: formData.estimated_hours || undefined,
        start_date: formData.start_date || undefined,
        assignee_id: formData.assignee_id || undefined,
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
      {/* Title */}
      <Input
        label="שם המשימה *"
        id="title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        disabled={isLoading}
        required
        error={errors.title}
        fullWidth
        placeholder="לדוגמה: הכנת תוכנית עבודה"
        data-testid="task-title-input"
      />

      {/* Description */}
      <Input
        label="תיאור המשימה"
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="הוסף פירוט על המשימה..."
        data-testid="task-description-input"
      />

      <div className="grid grid-cols-2 gap-4">
        {/* Priority */}
        <Select
          label="עדיפות"
          id="priority"
          name="priority"
          value={formData.priority}
          options={[
            { value: 'low', label: 'נמוכה' },
            { value: 'medium', label: 'בינונית' },
            { value: 'high', label: 'גבוהה' },
            { value: 'critical', label: 'קריטית' },
          ]}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="task-priority-select"
        />

        {/* Start Date */}
        <Input
          label="תאריך התחלה"
          id="start_date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="task-start-date-input"
        />
      </div>

      {/* Duration & Estimated Hours - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="משך זמן (ימים)"
          id="duration"
          name="duration"
          type="number"
          min={1}
          value={formData.duration}
          onChange={handleChange}
          disabled={isLoading}
          error={errors.duration}
          fullWidth
          data-testid="task-duration-input"
        />

        <Input
          label="שעות מוערכות"
          id="estimated_hours"
          name="estimated_hours"
          type="number"
          min={0}
          value={formData.estimated_hours || ''}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="task-estimated-hours-input"
        />
      </div>

      {/* Assignee Selection - Only show if team members are provided */}
      {assigneeOptions.length > 0 && (
        <Select
          label="Assignee"
          id="assignee_id"
          name="assignee_id"
          value={formData.assignee_id || ''}
          options={assigneeOptions}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="task-assignee-select"
        />
      )}

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="font-bold text-slate-400 hover:text-slate-600"
          data-testid="task-form-cancel-button"
        >
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-purple-200 text-white min-w-[140px]"
        >
          {isLoading ? 'שומר...' : isEditMode ? 'עדכן משימה' : 'צור משימה'}
        </Button>
      </div>
    </form>
  )
}

TaskForm.displayName = 'TaskForm'

export { TaskForm }
