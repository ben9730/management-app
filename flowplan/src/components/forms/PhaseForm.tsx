/**
 * PhaseForm Component
 *
 * Form for creating and editing project phases with validation.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export interface PhaseFormData {
  name: string
  description?: string
  start_date?: string
  end_date?: string
}

export interface PhaseFormProps {
  onSubmit: (data: PhaseFormData) => void
  onCancel: () => void
  initialValues?: Partial<PhaseFormData>
  mode?: 'create' | 'edit'
  isLoading?: boolean
  className?: string
}

interface FormErrors {
  name?: string
}

const PhaseForm: React.FC<PhaseFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  mode = 'create',
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = React.useState<PhaseFormData>({
    name: initialValues?.name || '',
    description: initialValues?.description || '',
    start_date: initialValues?.start_date || '',
    end_date: initialValues?.end_date || '',
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'שם השלב הוא שדה חובה'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target

    setFormData((prev) => ({
      ...prev,
      [name]: value,
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
        name: formData.name,
        description: formData.description || undefined,
        start_date: formData.start_date || undefined,
        end_date: formData.end_date || undefined,
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
      {/* Name */}
      <Input
        label="שם השלב *"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        disabled={isLoading}
        required
        error={errors.name}
        fullWidth
        placeholder="לדוגמה: שלב תכנון"
        data-testid="phase-name-input"
      />

      {/* Description */}
      <Input
        label="תיאור"
        id="description"
        name="description"
        value={formData.description}
        onChange={handleChange}
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="הוסף פירוט על השלב..."
        data-testid="phase-description-input"
      />

      {/* Dates - Side by Side */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="תאריך התחלה"
          id="start_date"
          name="start_date"
          type="date"
          value={formData.start_date}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="phase-start-date-input"
        />

        <Input
          label="תאריך סיום"
          id="end_date"
          name="end_date"
          type="date"
          value={formData.end_date}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="phase-end-date-input"
        />
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="font-bold text-slate-400 hover:text-slate-600"
          data-testid="phase-form-cancel-button"
        >
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-purple-200 text-white min-w-[140px]"
        >
          {isLoading ? 'שומר...' : isEditMode ? 'עדכן שלב' : 'צור שלב'}
        </Button>
      </div>
    </form>
  )
}

PhaseForm.displayName = 'PhaseForm'

export { PhaseForm }
