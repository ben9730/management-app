/**
 * CalendarExceptionForm Component
 *
 * Form for creating and editing calendar exceptions (holidays, non-working days).
 * Supports date ranges for multi-day events like Passover week.
 * Hebrew RTL support with validation.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { CalendarExceptionType } from '@/types/entities'

export interface CalendarExceptionFormData {
  date: Date // Start date
  end_date?: Date | null // End date (optional, for multi-day exceptions)
  type: CalendarExceptionType
  name?: string | null
}

export interface CalendarExceptionFormProps {
  mode: 'create' | 'edit'
  initialValues?: Partial<CalendarExceptionFormData>
  onSubmit: (data: CalendarExceptionFormData) => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

interface FormErrors {
  date?: string
  end_date?: string
  name?: string
}

// Type options in Hebrew
const typeOptions: SelectOption[] = [
  { value: 'holiday', label: 'חג' },
  { value: 'non_working', label: 'יום לא עובד' },
]

/**
 * Helper to convert date to string format for input
 */
function formatDateForInput(date: Date | string | null | undefined): string {
  if (!date) return ''
  if (typeof date === 'string') return date.split('T')[0]
  return date.toISOString().split('T')[0]
}

/**
 * Helper to parse date string to Date object
 */
function parseDateInput(value: string): Date | null {
  if (!value) return null
  return new Date(value)
}

const CalendarExceptionForm: React.FC<CalendarExceptionFormProps> = ({
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = React.useState({
    date: formatDateForInput(initialValues?.date),
    end_date: formatDateForInput(initialValues?.end_date),
    type: initialValues?.type || ('holiday' as CalendarExceptionType),
    name: initialValues?.name || '',
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  // Reset form when initialValues or mode changes
  React.useEffect(() => {
    setFormData({
      date: formatDateForInput(initialValues?.date),
      end_date: formatDateForInput(initialValues?.end_date),
      type: initialValues?.type || ('holiday' as CalendarExceptionType),
      name: initialValues?.name || '',
    })
    setErrors({})
  }, [initialValues, mode])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.date) {
      newErrors.date = 'יש לבחור תאריך התחלה'
    }

    // If end_date is provided, it must be >= date
    if (formData.end_date && formData.date) {
      const startDate = new Date(formData.date)
      const endDate = new Date(formData.end_date)
      if (endDate < startDate) {
        newErrors.end_date = 'תאריך סיום חייב להיות אחרי תאריך התחלה'
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
      const parsedDate = parseDateInput(formData.date)

      if (!parsedDate) {
        setErrors({ date: 'תאריך לא תקין' })
        return
      }

      const parsedEndDate = formData.end_date ? parseDateInput(formData.end_date) : null

      const submitData: CalendarExceptionFormData = {
        date: parsedDate,
        end_date: parsedEndDate,
        type: formData.type,
        name: formData.name?.trim() || null,
      }

      onSubmit(submitData)
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
      {/* Date Range Row */}
      <div className="grid grid-cols-2 gap-4">
        {/* Start Date Input */}
        <Input
          label="מתאריך *"
          id="date"
          name="date"
          type="date"
          value={formData.date}
          onChange={handleChange}
          disabled={isLoading}
          error={errors.date}
          fullWidth
          data-testid="calendar-exception-date-input"
        />

        {/* End Date Input (Optional) */}
        <Input
          label="עד תאריך"
          id="end_date"
          name="end_date"
          type="date"
          value={formData.end_date}
          onChange={handleChange}
          disabled={isLoading}
          error={errors.end_date}
          fullWidth
          data-testid="calendar-exception-end-date-input"
        />
      </div>

      <p className="text-xs text-slate-500 -mt-4">
        השאר ריק ליום בודד, או בחר טווח תאריכים לחופשות מרובות ימים (כמו פסח)
      </p>

      {/* Type Selection */}
      <Select
        label="סוג *"
        id="type"
        name="type"
        value={formData.type}
        options={typeOptions}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
        data-testid="calendar-exception-type-select"
      />

      {/* Name Input */}
      <Input
        label="שם (אופציונלי)"
        id="name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
        placeholder="לדוגמה: יום כיפור, פסח..."
        data-testid="calendar-exception-name-input"
      />

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onCancel}
          disabled={isLoading}
          className="font-bold text-slate-400 hover:text-slate-600"
          data-testid="calendar-exception-form-cancel-button"
        >
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-purple-200 text-white min-w-[140px]"
          data-testid="calendar-exception-form-submit-button"
        >
          {isLoading ? 'שומר...' : isEditMode ? 'עדכן' : 'הוסף'}
        </Button>
      </div>
    </form>
  )
}

CalendarExceptionForm.displayName = 'CalendarExceptionForm'

export { CalendarExceptionForm }
