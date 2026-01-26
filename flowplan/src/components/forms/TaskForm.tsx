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
      <div>
        <label
          htmlFor="title"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Title *
        </label>
        <input
          id="title"
          name="title"
          type="text"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
          required
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? 'title-error' : undefined}
          className={cn(
            'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            errors.title && 'border-red-500 focus:ring-red-500',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
        {errors.title && (
          <div aria-live="polite">
            <p id="title-error" className="mt-1 text-sm text-red-500">
              {errors.title}
            </p>
          </div>
        )}
      </div>

      {/* Description */}
      <div>
        <label
          htmlFor="description"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
          rows={3}
          className={cn(
            'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>

      {/* Priority */}
      <div>
        <label
          htmlFor="priority"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Priority
        </label>
        <select
          id="priority"
          name="priority"
          value={formData.priority}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
          className={cn(
            'w-full appearance-none border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {priorityOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Duration & Estimated Hours - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="duration"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            Duration (days)
          </label>
          <input
            id="duration"
            name="duration"
            type="number"
            min={1}
            value={formData.duration}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            aria-invalid={!!errors.duration}
            aria-describedby={errors.duration ? 'duration-error' : undefined}
            className={cn(
              'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              errors.duration && 'border-red-500 focus:ring-red-500',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
          {errors.duration && (
            <div aria-live="polite">
              <p id="duration-error" className="mt-1 text-sm text-red-500">
                {errors.duration}
              </p>
            </div>
          )}
        </div>

        <div>
          <label
            htmlFor="estimated_hours"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            Estimated Hours
          </label>
          <input
            id="estimated_hours"
            name="estimated_hours"
            type="number"
            min={0}
            value={formData.estimated_hours || ''}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isLoading}
            className={cn(
              'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
        </div>
      </div>

      {/* Start Date */}
      <div>
        <label
          htmlFor="start_date"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Start Date
        </label>
        <input
          id="start_date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isLoading}
          className={cn(
            'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>

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
          {isLoading ? 'Saving...' : isEditMode ? 'Update Task' : 'Create Task'}
        </Button>
      </div>
    </form>
  )
}

TaskForm.displayName = 'TaskForm'

export { TaskForm }
