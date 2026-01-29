/**
 * ProjectForm Component
 *
 * Form for creating and editing projects with validation.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
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
      <Input
        label="Project Name *"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        disabled={isLoading}
        required
        error={errors.name}
        fullWidth
        placeholder="Enter project name"
      />

      {/* Description */}
      <Input
        label="Description"
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="Enter project description"
      />

      {/* Status */}
      <Select
        label="Status"
        id="status"
        name="status"
        value={formData.status}
        options={statusOptions}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
      />

      {/* Date Range */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Start Date"
          id="start_date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
        />

        <Input
          label="End Date"
          id="end_date"
          name="end_date"
          type="date"
          value={formData.end_date}
          onChange={handleChange}
          disabled={isLoading}
          error={errors.end_date}
          fullWidth
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t-2 border-slate-200 dark:border-slate-600">
        <Button
          type="button"
          variant="secondary"
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
