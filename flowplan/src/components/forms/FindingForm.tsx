/**
 * FindingForm Component
 *
 * Form for creating and editing audit findings.
 * Hebrew RTL support with validation.
 */

import * as React from 'react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import type { Task, FindingSeverity, FindingStatus } from '@/types/entities'

export interface FindingFormData {
  task_id: string
  severity: FindingSeverity
  finding: string
  root_cause?: string | null
  capa?: string | null
  due_date?: Date | null
  status?: FindingStatus // Only in edit mode
}

export interface FindingFormProps {
  tasks: Task[]
  mode: 'create' | 'edit'
  initialValues?: Partial<FindingFormData>
  onSubmit: (data: FindingFormData) => void
  onCancel: () => void
  isLoading?: boolean
  className?: string
}

interface FormErrors {
  task_id?: string
  finding?: string
}

// Severity options in Hebrew
const severityOptions: SelectOption[] = [
  { value: 'critical', label: 'קריטי' },
  { value: 'high', label: 'גבוה' },
  { value: 'medium', label: 'בינוני' },
  { value: 'low', label: 'נמוך' },
]

// Status options in Hebrew
const statusOptions: SelectOption[] = [
  { value: 'open', label: 'פתוח' },
  { value: 'in_progress', label: 'בתהליך' },
  { value: 'closed', label: 'סגור' },
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

const FindingForm: React.FC<FindingFormProps> = ({
  tasks,
  mode,
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
  className,
}) => {
  const [formData, setFormData] = React.useState({
    task_id: initialValues?.task_id || '',
    severity: initialValues?.severity || ('medium' as FindingSeverity),
    finding: initialValues?.finding || '',
    root_cause: initialValues?.root_cause || '',
    capa: initialValues?.capa || '',
    due_date: formatDateForInput(initialValues?.due_date),
    status: initialValues?.status || ('open' as FindingStatus),
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  // Build task options for dropdown
  const taskOptions: SelectOption[] = React.useMemo(() => {
    return tasks.map((task) => ({
      value: task.id,
      label: task.title,
    }))
  }, [tasks])

  const validate = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.task_id) {
      newErrors.task_id = 'יש לבחור משימה'
    }

    if (!formData.finding || !formData.finding.trim()) {
      newErrors.finding = 'יש להזין תיאור הממצא'
    } else if (formData.finding.trim().length < 10) {
      newErrors.finding = 'תיאור קצר מדי - לפחות 10 תווים'
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
      const trimmedFinding = formData.finding.trim()
      const trimmedRootCause = formData.root_cause?.trim() || null
      const trimmedCapa = formData.capa?.trim() || null
      const parsedDueDate = parseDateInput(formData.due_date)

      const submitData: FindingFormData = {
        task_id: formData.task_id,
        severity: formData.severity,
        finding: trimmedFinding,
        root_cause: trimmedRootCause,
        capa: trimmedCapa,
        due_date: parsedDueDate,
      }

      // Include status only in edit mode
      if (mode === 'edit') {
        submitData.status = formData.status
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
      {/* Task Selection */}
      <Select
        label="משימה *"
        id="task_id"
        name="task_id"
        value={formData.task_id}
        options={taskOptions}
        onChange={handleChange}
        disabled={isLoading}
        error={errors.task_id}
        fullWidth
        placeholder="בחר משימה"
        data-testid="finding-task-select"
      />

      {/* Severity Selection */}
      <Select
        label="חומרה *"
        id="severity"
        name="severity"
        value={formData.severity}
        options={severityOptions}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
        data-testid="finding-severity-select"
      />

      {/* Finding Description */}
      <Input
        label="תיאור הממצא *"
        id="finding"
        name="finding"
        value={formData.finding}
        onChange={handleChange}
        disabled={isLoading}
        error={errors.finding}
        multiline
        rows={4}
        fullWidth
        placeholder="תאר את הממצא..."
        data-testid="finding-description-input"
      />

      {/* Root Cause */}
      <Input
        label="סיבת שורש"
        id="root_cause"
        name="root_cause"
        value={formData.root_cause}
        onChange={handleChange}
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="מה הסיבה לממצא?"
        data-testid="finding-root-cause-input"
      />

      {/* CAPA */}
      <Input
        label="פעולה מתקנת/מונעת - CAPA"
        id="capa"
        name="capa"
        value={formData.capa}
        onChange={handleChange}
        disabled={isLoading}
        multiline
        rows={3}
        fullWidth
        placeholder="מה הפעולות לתיקון ומניעה?"
        data-testid="finding-capa-input"
      />

      {/* Due Date */}
      <Input
        label="תאריך יעד"
        id="due_date"
        name="due_date"
        type="date"
        value={formData.due_date}
        onChange={handleChange}
        disabled={isLoading}
        fullWidth
        data-testid="finding-due-date-input"
      />

      {/* Status - Only in Edit Mode */}
      {isEditMode && (
        <Select
          label="סטטוס"
          id="status"
          name="status"
          value={formData.status}
          options={statusOptions}
          onChange={handleChange}
          disabled={isLoading}
          fullWidth
          data-testid="finding-status-select"
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
          data-testid="finding-form-cancel-button"
        >
          ביטול
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          loading={isLoading}
          className="bg-[#8B5CF6] hover:bg-[#7C3AED] shadow-purple-200 text-white min-w-[140px]"
        >
          {isLoading ? 'שומר...' : isEditMode ? 'עדכן' : 'שמור'}
        </Button>
      </div>
    </form>
  )
}

FindingForm.displayName = 'FindingForm'

export { FindingForm }
