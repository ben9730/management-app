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
import { MultiSelect, MultiSelectOption } from '@/components/ui/multi-select'
import { Button } from '@/components/ui/button'
import { checkMemberAvailability } from '@/services/team-members'
import type { TaskPriority, TeamMember, EmployeeTimeOff, CalendarException } from '@/types/entities'

export interface TaskFormData {
  title: string
  description?: string
  priority: TaskPriority
  duration: number
  estimated_hours?: number
  start_date?: string
  phase_id?: string
  /** @deprecated Use assignee_ids for multi-assignee support */
  assignee_id?: string
  /** Array of team member IDs assigned to this task */
  assignee_ids?: string[]
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
  /** Calendar exceptions (holidays, non-working days) for the project */
  calendarExceptions?: CalendarException[]
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

/**
 * Get Hebrew display text for calendar exception type
 */
function getExceptionTypeLabel(type: CalendarException['type']): string {
  switch (type) {
    case 'holiday':
      return 'חג'
    case 'non_working':
      return 'יום לא עובד'
    default:
      return type
  }
}

/**
 * Check if two date ranges overlap
 */
function dateRangesOverlap(
  taskStart: Date,
  taskEnd: Date,
  exceptionStart: Date,
  exceptionEnd: Date
): boolean {
  return taskStart <= exceptionEnd && taskEnd >= exceptionStart
}

/**
 * Find calendar exceptions that overlap with the task date range
 */
function findOverlappingExceptions(
  taskStartDate: string | undefined,
  taskDuration: number,
  exceptions: CalendarException[]
): CalendarException[] {
  if (!taskStartDate || !exceptions || exceptions.length === 0) {
    return []
  }

  const taskStart = new Date(taskStartDate)
  const taskEnd = calculateEndDate(taskStartDate, taskDuration)

  if (!taskEnd) {
    return []
  }

  return exceptions.filter((exception) => {
    const exceptionStart = exception.date instanceof Date
      ? exception.date
      : new Date(exception.date)
    const exceptionEnd = exception.end_date
      ? (exception.end_date instanceof Date ? exception.end_date : new Date(exception.end_date))
      : exceptionStart // Single-day exception

    return dateRangesOverlap(taskStart, taskEnd, exceptionStart, exceptionEnd)
  })
}

/**
 * Holiday Warning Component
 * Displays a warning when task dates overlap with calendar exceptions
 */
interface HolidayWarningProps {
  exceptions: CalendarException[]
}

const HolidayWarning: React.FC<HolidayWarningProps> = ({ exceptions }) => {
  if (exceptions.length === 0) return null

  // Determine if any are holidays (vs all being non_working)
  const hasHoliday = exceptions.some(e => e.type === 'holiday')
  const hasNonWorking = exceptions.some(e => e.type === 'non_working')

  // Pick the appropriate emoji
  const emoji = hasHoliday ? '🎉' : '🚫'

  return (
    <div
      role="alert"
      data-testid="holiday-warning"
      className={cn(
        'rounded-lg border-2 p-4',
        hasHoliday
          ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20'
          : 'border-slate-400 bg-slate-50 dark:bg-slate-800/50'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 text-xl">
          {emoji}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-slate-900 dark:text-white">
            התראה: חפיפה עם {hasHoliday ? 'חג' : 'יום לא עובד'}
          </h4>
          <div className="mt-2 space-y-1">
            {exceptions.map((exception) => {
              const startDate = formatDateDisplay(exception.date)
              const endDate = exception.end_date ? formatDateDisplay(exception.end_date) : null
              const typeLabel = getExceptionTypeLabel(exception.type)

              return (
                <div key={exception.id} className="text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-medium">{exception.name || typeLabel}</span>
                  <span className="text-slate-500 dark:text-slate-400 mr-2">
                    {endDate ? `${startDate} - ${endDate}` : startDate}
                  </span>
                  {exception.name && (
                    <span className="text-xs text-slate-400 dark:text-slate-500 mr-2">
                      ({typeLabel})
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            משך המשימה האפקטיבי עשוי להיות ארוך יותר
          </p>
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
  calendarExceptions = [],
}) => {
  // Build assignee options from team members for MultiSelect
  const assigneeOptions: MultiSelectOption[] = React.useMemo(() => {
    if (!teamMembers || teamMembers.length === 0) return []

    return teamMembers.map((member) => {
      const displayName = member.display_name ||
        `${member.first_name || ''} ${member.last_name || ''}`.trim() ||
        member.email
      return {
        value: member.id,
        label: displayName,
        description: member.role || undefined,
      }
    })
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
    // Support both legacy assignee_id and new assignee_ids
    assignee_ids: initialValues?.assignee_ids ||
      (initialValues?.assignee_id ? [initialValues.assignee_id] : []),
  })

  const [errors, setErrors] = React.useState<FormErrors>({})

  // Update assignee_ids when initialValues changes (handles async loading of task assignments)
  React.useEffect(() => {
    if (initialValues?.assignee_ids && initialValues.assignee_ids.length > 0) {
      setFormData(prev => ({
        ...prev,
        assignee_ids: initialValues.assignee_ids,
      }))
    }
  }, [initialValues?.assignee_ids])

  // Get primary assignee ID (first selected) for duration calculations
  const primaryAssigneeId = formData.assignee_ids?.[0]

  // Find overlapping calendar exceptions (holidays, non-working days)
  const overlappingExceptions = React.useMemo(() => {
    return findOverlappingExceptions(
      formData.start_date,
      formData.duration,
      calendarExceptions
    )
  }, [formData.start_date, formData.duration, calendarExceptions])

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
    const calculatedDuration = calculateDurationFromHours(formData.estimated_hours, primaryAssigneeId)
    if (calculatedDuration !== null && calculatedDuration !== formData.duration) {
      setFormData(prev => ({ ...prev, duration: calculatedDuration }))
    }
  }, [formData.estimated_hours, primaryAssigneeId, calculateDurationFromHours, formData.duration])

  // Check vacation availability when assignee, start_date, or duration changes
  // For multi-assignee, we check the primary (first) assignee
  React.useEffect(() => {
    // Skip if external conflict is provided (controlled mode)
    if (externalVacationConflict !== undefined) return

    // Skip if no assignee or no start date
    if (!primaryAssigneeId || !formData.start_date) {
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
        const result = await checkMemberAvailability(primaryAssigneeId, startDate, endDate)
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
  }, [primaryAssigneeId, formData.start_date, formData.duration, externalVacationConflict])

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

  // Handle multi-select change for assignees
  const handleAssigneesChange = (selectedIds: string[]) => {
    setFormData(prev => ({
      ...prev,
      assignee_ids: selectedIds,
    }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (validate()) {
      onSubmit({
        ...formData,
        description: formData.description || undefined,
        estimated_hours: formData.estimated_hours || undefined,
        start_date: formData.start_date || undefined,
        // Include both for backward compatibility
        assignee_id: formData.assignee_ids?.[0] || undefined,
        assignee_ids: formData.assignee_ids?.length ? formData.assignee_ids : undefined,
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
                teamMembers?.find(m => m.id === primaryAssigneeId)?.work_hours_per_day || 8
              } שעות/יום
            </p>
          )}
          {/* Time-off duration impact hint */}
          {vacationConflict && !vacationConflict.available && vacationConflict.conflictingTimeOff && (
            <p className="text-xs text-amber-500 mt-1" data-testid="duration-timeoff-hint">
              ⚠️ משך אפקטיבי עשוי להיות ארוך יותר בשל {getTimeOffTypeLabel(vacationConflict.conflictingTimeOff.type)}
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

      {/* Multi-Assignee Selection - Only show if team members are provided */}
      {assigneeOptions.length > 0 && (
        <MultiSelect
          label="אחראים"
          options={assigneeOptions}
          selected={formData.assignee_ids || []}
          onChange={handleAssigneesChange}
          disabled={isLoading}
          placeholder="בחר אחראים..."
          data-testid="task-assignees-select"
        />
      )}

      {/* Vacation Warning - shows conflict for primary assignee */}
      {vacationConflict && !vacationConflict.available && vacationConflict.conflictingTimeOff && (
        <VacationWarning
          timeOff={vacationConflict.conflictingTimeOff}
          assigneeName={teamMembers?.find(m => m.id === primaryAssigneeId)?.display_name || ''}
        />
      )}

      {/* Holiday Warning - shows when task dates overlap with calendar exceptions */}
      {overlappingExceptions.length > 0 && (
        <HolidayWarning exceptions={overlappingExceptions} />
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
