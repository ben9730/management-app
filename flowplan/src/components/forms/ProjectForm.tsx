/**
 * ProjectForm Component
 *
 * Form for creating and editing projects with validation.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ProjectStatus } from '@/types/entities'

export interface ProjectFormData {
  name: string
  description?: string
  status: ProjectStatus
  start_date?: string
  end_date?: string
}

export interface ProjectFormProps {
  onSubmit: (data: ProjectFormData) => void
  onCancel: () => void
  initialValues?: Partial<ProjectFormData>
  mode?: 'create' | 'edit'
  isLoading?: boolean
  className?: string
}

interface FormErrors {
  name?: string
  end_date?: string
}

const statusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'archived', label: 'Archived' },
]

const ProjectForm: React.FC<ProjectFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  mode = 'create',
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = React.useState<ProjectFormData>({
    name: initialValues?.name || '',
    description: initialValues?.description || '',
    status: initialValues?.status || 'active',
    start_date: initialValues?.start_date || '',
    end_date: initialValues?.end_date || '',
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Project name is required'
    }

    if (formData.start_date && formData.end_date) {
      if (new Date(formData.end_date) < new Date(formData.start_date)) {
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
        ...formData,
        description: formData.description || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
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
      {/* Project Name */}
      <div>
        <label
          htmlFor="name"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Project Name *
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
          disabled={isLoading}
          rows={3}
          className={cn(
            'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        />
      </div>

      {/* Status */}
      <div>
        <label
          htmlFor="status"
          className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
        >
          Status
        </label>
        <select
          id="status"
          name="status"
          value={formData.status}
          onChange={handleChange}
          disabled={isLoading}
          className={cn(
            'w-full appearance-none border-2 border-black bg-white px-3 py-2 font-medium transition-all',
            'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
            isLoading && 'opacity-50 cursor-not-allowed'
          )}
        >
          {statusOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
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
            htmlFor="end_date"
            className="mb-1 block text-sm font-bold uppercase tracking-wider text-black"
          >
            End Date
          </label>
          <input
            id="end_date"
            name="end_date"
            type="date"
            value={formData.end_date}
            onChange={handleChange}
            disabled={isLoading}
            aria-invalid={!!errors.end_date}
            aria-describedby={errors.end_date ? 'end_date-error' : undefined}
            className={cn(
              'w-full border-2 border-black bg-white px-3 py-2 font-medium transition-all',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-2',
              errors.end_date && 'border-red-500 focus:ring-red-500',
              isLoading && 'opacity-50 cursor-not-allowed'
            )}
          />
          {errors.end_date && (
            <div aria-live="polite">
              <p id="end_date-error" className="mt-1 text-sm text-red-500">
                {errors.end_date}
              </p>
            </div>
          )}
        </div>
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
          {isLoading ? 'Saving...' : isEditMode ? 'Update Project' : 'Create Project'}
        </Button>
      </div>
    </form>
  )
}

ProjectForm.displayName = 'ProjectForm'

export { ProjectForm }
