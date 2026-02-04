/**
 * TaskForm Component
 *
 * Form for creating and editing tasks with validation.
 * Based on PRD v2.1 - Brutalist UI design.
 */

import * as React from 'react'
import { cn, formatDateDisplay, calculateEndDate } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Select, SelectOption } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { checkMemberAvailability } from '@/services/team-members'
import type { TaskPriority, TeamMember, EmployeeTimeOff } from '@/types/entities'

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

/**
 * Vacation conflict information
 */
export interface VacationConflict {
  available: boolean
  conflictingTimeOff?: EmployeeTimeOff
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
  /** Vacation conflict information for the selected assignee */
  vacationConflict?: VacationConflict
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

/**
 * Get Hebrew display text for time off type
 */
function getTimeOffTypeLabel(type: string): string {
  switch (type) {
    case 'vacation':
      return 'חופשה'
    case 'sick':
      return 'מחלה (sick)'
    case 'personal':
      return 'אישי'
    case 'other':
      return 'אחר'
    default:
      return type
  }
}

/**
 * Vacation Warning Component
 * Displays a warning when the assignee has conflicting time off
 */
interface VacationWarningProps {
  timeOff: EmployeeTimeOff
  assigneeName: string
}

const VacationWarning: React.FC<VacationWarningProps> = ({ timeOff, assigneeName }) => {
  const startDate = formatDateDisplay(timeOff.start_date)
  const endDate = formatDateDisplay(timeOff.end_date)
  const typeLabel = getTimeOffTypeLabel(timeOff.type)

  return (
    <div
      role="alert"
      data-testid="vacation-warning"
      className={cn(
        'rounded-lg border-2 p-4',
        timeOff.type === 'sick'
          ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20'
          : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-xl">
          {timeOff.type === 'sick' ? '🤒' : '🏖️'}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 dark:text-white">
            התראה: חפיפה עם {typeLabel}
          </h4>
          <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
            {assigneeName} לא יהיה זמין בתאריכים {startDate} - {endDate} ({typeLabel})
          </p>
          {timeOff.notes && (
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              הערה: {timeOff.notes}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const TaskForm: React.FC<TaskFormProps> = ({
  onSubmit,
  onCancel,
  initialValues,
  mode = 'create',
  isLoading = false,
  className,
  teamMembers,
  vacationConflict: externalVacationConflict,
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

  // Internal vacation conflict state (auto-checks when assignee/dates change)
  const [internalVacationConflict, setInternalVacationConflict] = React.useState<VacationConflict | null>(null)

  // Use external prop if provided, otherwise use internal state
  const vacationConflict = externalVacationConflict ?? internalVacationConflict

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

  // Calculate duration from estimated_hours when assignee changes
  const calculateDurationFromHours = React.useCallback((estimatedHours: number | undefined, assigneeId: string | undefined) => {
    if (!estimatedHours || estimatedHours <= 0) return null

    // Get assignee's work hours per day (default 8)
    const assignee = teamMembers?.find(m => m.id === assigneeId)
    const workHoursPerDay = assignee?.work_hours_per_day || 8

    // Calculate and round up to nearest day
    return Math.ceil(estimatedHours / workHoursPerDay)
  }, [teamMembers])

  // Auto-calculate duration when estimated_hours or assignee changes
  React.useEffect(() => {
    const calculatedDuration = calculateDurationFromHours(formData.estimated_hours, formData.assignee_id)
    if (calculatedDuration !== null && calculatedDuration !== formData.duration) {
      setFormData(prev => ({ ...prev, duration: calculatedDuration }))
    }
  }, [formData.estimated_hours, formData.assignee_id, calculateDurationFromHours, formData.duration])

  // Check vacation availability when assignee, start_date, or duration changes
  React.useEffect(() => {
    // Skip if external conflict is provided (controlled mode)
    if (externalVacationConflict !== undefined) return

    // Skip if no assignee or no start date
    if (!formData.assignee_id || !formData.start_date) {
      setInternalVacationConflict(null)
      return
    }

    // Calculate task date range
    const startDate = new Date(formData.start_date)
    const endDate = calculateEndDate(formData.start_date, formData.duration)

    if (!endDate) {
      setInternalVacationConflict(null)
      return
    }

    // Check availability
    const checkAvailability = async () => {
      try {
        const result = await checkMemberAvailability(formData.assignee_id!, startDate, endDate)
        setInternalVacationConflict({
          available: result.available,
          conflictingTimeOff: result.conflictingTimeOff,
        })
      } catch {
        // Silently fail - don't block form submission
        setInternalVacationConflict(null)
      }
    }

    checkAvailability()
  }, [formData.assignee_id, formData.start_date, formData.duration, externalVacationConflict])

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
        <div>
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
          {formData.estimated_hours && formData.estimated_hours > 0 && (
            <p className="text-xs text-slate-500 mt-1" data-testid="duration-calculation-hint">
              מחושב: {formData.estimated_hours} שעות ÷ {
                teamMembers?.find(m => m.id === formData.assignee_id)?.work_hours_per_day || 8
              } שעות/יום
            </p>
          )}
        </div>

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

      {/* Vacation Warning */}
      {vacationConflict && !vacationConflict.available && vacationConflict.conflictingTimeOff && (
        <VacationWarning
          timeOff={vacationConflict.conflictingTimeOff}
          assigneeName={teamMembers?.find(m => m.id === formData.assignee_id)?.display_name || ''}
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
