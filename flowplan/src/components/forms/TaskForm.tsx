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
import { TaskPriority } from '@/types/entities'

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
}) => {
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
  const [touched, setTouched] = React.useState<Record<string, boolean>>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required'
    }

    if (formData.duration < 1) {
      newErrors.duration = 'Duration must be at least 1'
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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name } = e.target
    setTouched((prev) => ({ ...prev, [name]: true }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      onSubmit({
        ...formData,
        description: formData.description || undefined,
        estimated_hours: formData.estimated_hours || undefined,
        start_date: formData.start_date || undefined,
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
      {/* Title */}
      <Input
        label="Title *"
        id="title"
        name="title"
        value={formData.title}
        onChange={handleChange}
        // onBlur={handleBlur} // Removed
        disabled={isLoading}
        required
        error={errors.title}
        fullWidth
        placeholder="Enter task title"
        data-testid="task-title-input"
      />

      {/* Description */}
      <Input
        label="Description"
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        // onBlur={handleBlur} // Removed
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="Enter task description"
        data-testid="task-description-input"
      />

      {/* Priority */}
      <Select
        label="Priority"
        id="priority"
        name="priority"
        value={formData.priority}
        options={priorityOptions}
        onChange={handleChange}
        // onBlur={handleBlur} // Removed
        disabled={isLoading}
        fullWidth
        data-testid="task-priority-select"
      />

      {/* Duration & Estimated Hours - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Duration (days)"
          id="duration"
          name="duration"
          type="number"
          min={1}
          value={formData.duration}
          onChange={handleChange}
          // onBlur={handleBlur} // Removed
          disabled={isLoading}
          error={errors.duration} // Changed to always show error if present after submit
          fullWidth
          data-testid="task-duration-input"
        />

        <Input
          label="Estimated Hours"
          id="estimated_hours"
          name="estimated_hours"
          type="number"
          min={0}
          value={formData.estimated_hours || ''}
          onChange={handleChange}
          // onBlur={handleBlur} // Removed
          disabled={isLoading}
          fullWidth
          data-testid="task-estimated-hours-input"
        />
      </div>

      {/* Start Date */}
      <Input
        label="Start Date"
        id="start_date"
        name="start_date"
        type="date"
        value={formData.start_date}
        onChange={handleChange}
        // onBlur={handleBlur} // Removed
        disabled={isLoading}
        fullWidth
        data-testid="task-start-date-input"
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-[#c3c6d4]">
        <Button
          type="button"
          variant="secondary"
          onClick={handleCancel}
          disabled={isLoading}
          data-testid="task-form-cancel-button"
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading} loading={isLoading}>
          {isLoading ? 'Saving...' : isEditMode ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}

TaskForm.displayName = 'TaskForm'

export { TaskForm }
