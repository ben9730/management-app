# Coding Conventions

**Analysis Date:** 2026-02-12

## Naming Patterns

**Files:**
- PascalCase for components: `TaskForm.tsx`, `GanttChart.tsx`, `Button.tsx`
- camelCase for services, hooks, utilities: `tasks.ts`, `use-tasks.ts`, `utils.ts`
- Test files: `*.test.ts` (services) or `*.test.tsx` (components)
- Index files follow convention: `index.ts` (not present in this codebase - explicit exports used instead)

**Functions:**
- camelCase: `createTask()`, `getTasks()`, `calculatePercentage()`, `formatDateDisplay()`
- Service functions are exported from modules: `export async function createTask()`
- Hook functions follow React naming: `useQuery`, `useMutation`, `useCreateTask`

**Variables:**
- camelCase for all variables: `projectId`, `teamMembers`, `taskData`, `vacationConflict`
- Constants in camelCase (not UPPER_CASE): `priorityOptions`, `mockTask`, `hebrewDays`
- Interface properties match database schema: `project_id`, `start_date`, `estimated_hours`

**Types:**
- PascalCase for interfaces and types: `Task`, `Project`, `ServiceResult`, `CreateTaskInput`
- Suffix pattern for input/output types: `CreateTaskInput`, `UpdateTaskInput`, `TasksFilter`
- Union types for enums: `type ProjectStatus = 'active' | 'completed' | 'archived'`
- Component props as PascalCase interfaces: `TaskFormProps`, `ButtonProps`, `VacationWarningProps`

**Test Patterns:**
- Describe blocks use plain English: `describe('Tasks Service')`, `describe('Button')`
- Test names describe behavior: `it('renders form element')`, `it('calls onClick when clicked')`
- Mock names start with `mock`: `mockSupabase`, `mockTask`, `mockOnSubmit`

## Code Style

**Formatting:**
- Tool: ESLint with `eslint-config-next` (Next.js 16 config)
- No Prettier configuration detected - ESLint is primary linter
- Indentation: 2 spaces (standard TypeScript)
- Line length: No explicit limit, but files kept under 400 lines

**Linting:**
- ESLint config: `eslint.config.mjs` (flat config format)
- Rules: Next.js core web vitals + TypeScript strict rules
- Command: `npm run lint`

**Immutability (CRITICAL):**
All data mutations follow immutability pattern:
```typescript
// Correct - spread operator creates new object
const updated = { ...task, status: 'done' }

// Service results use immutable pattern
return { data: project, error: null }

// Avoid mutation
task.status = 'done'  // WRONG
```

## Import Organization

**Order:**
1. React imports: `import * as React from 'react'`, `import { useQuery } from '@tanstack/react-query'`
2. Supabase/external libraries: `import { supabase } from '@/lib/supabase'`, `import OpenAI from 'openai'`
3. Type imports: `import type { Task } from '@/types/entities'`
4. Relative component imports: `import { Button } from '@/components/ui/button'`
5. Service imports: `import { getTasks, createTask } from '@/services/tasks'`
6. Hook imports: `import { useTasks } from '@/hooks/use-tasks'`

**Path Aliases:**
- `@/` maps to `src/` directory (configured in `tsconfig.json`)
- Always use `@/` for all imports (no relative paths like `../`)
- Example: `import { cn } from '@/lib/utils'`

**Example from codebase:**
```typescript
import * as React from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getTasks, createTask, updateTask, deleteTask, type CreateTaskInput } from '@/services/tasks'
import { phaseKeys } from '@/hooks/use-phases'
import type { Task } from '@/types/entities'
```

## Error Handling

**Service Result Pattern:**
All service functions return consistent error structure:
```typescript
interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}
```

Example from `services/tasks.ts`:
```typescript
export async function createTask(input: CreateTaskInput): Promise<ServiceResult<Task>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const { data, error } = await supabase.from('tasks').insert(taskData).select().single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as Task, error: null }
}
```

**Hook Error Handling:**
Hooks convert service errors to exceptions:
```typescript
export function useTasks(projectId: string, filter?: TasksFilter) {
  return useQuery({
    queryKey: taskKeys.list(projectId, filter),
    queryFn: async () => {
      const result = await getTasks(projectId, filter)
      if (result.error) {
        throw new Error(result.error.message)
      }
      return result.data ?? []
    },
  })
}
```

**Input Validation:**
Validation happens in service layer before database operations:
```typescript
function validateCreateInput(input: CreateTaskInput): string | null {
  if (!input.title || input.title.trim() === '') {
    return 'Task title is required'
  }
  if (input.estimated_hours !== undefined && input.estimated_hours < 0) {
    return 'Invalid estimated_hours. Must be a positive number'
  }
  return null
}
```

## Logging

**Framework:** console (built-in)

**Patterns:**
- Use `console.warn()` for non-blocking errors: `console.warn('Failed to create default phase:', phaseError)`
- Use `console.error()` for critical errors (rarely used)
- No `console.log()` statements in production code
- Logging only for side effects and non-critical operations

Example from `services/projects.ts`:
```typescript
try {
  await createPhase({ project_id: project.id, name: 'כללי' })
} catch (phaseError) {
  console.warn('Failed to create default phase for project:', phaseError)
}
```

## Comments

**When to Comment:**
- Module-level documentation: JSDoc comments for all service functions
- Complex algorithms: Comments for scheduling logic in `SchedulingService`
- Business logic: Explain "why" not "what"

**JSDoc/TSDoc Pattern:**
```typescript
/**
 * TaskForm Component
 *
 * Form for creating and editing tasks with validation.
 * Based on PRD v2.1 - Brutalist UI design.
 */

/**
 * Create a new task
 */
export async function createTask(input: CreateTaskInput): Promise<ServiceResult<Task>>
```

**Deprecation Notes:**
Marked with `@deprecated`:
```typescript
/** @deprecated Use assignee_ids for multi-assignee support */
assignee_id?: string
```

## Function Design

**Size:**
- Service functions: 20-50 lines typically
- Component functions: 50-150 lines (including JSX)
- Utility functions: 5-30 lines
- Maximum 400 lines per file before extraction

**Parameters:**
- Input objects are preferred over multiple params: `input: CreateTaskInput`
- Destructure props in component parameters
- Query/mutation hook options object pattern:
```typescript
export function useCreateTask() {
  return useMutation({
    mutationFn: async (input: CreateTaskInput) => { ... },
    onSuccess: (data) => { ... },
  })
}
```

**Return Values:**
- Services return `ServiceResult<T>` tuple-like objects
- Components return JSX
- Hooks return React Query result objects: `{ data, isLoading, error, ...}`

## Module Design

**Exports:**
- Named exports preferred: `export async function createTask()`, `export const taskKeys = {...}`
- No default exports (all explicit)
- Functions exported from service modules directly

Example from `services/tasks.ts`:
```typescript
export interface CreateTaskInput { ... }
export interface UpdateTaskInput { ... }
export interface TasksFilter { ... }
export async function createTask(input: CreateTaskInput): Promise<ServiceResult<Task>>
export async function getTasks(projectId: string, filter?: TasksFilter): Promise<ServiceResult<Task[]>>
```

**Barrel Files:**
- Not used in this codebase
- Each module is imported directly: `import { createTask } from '@/services/tasks'`

**Query Keys (React Query):**
Hierarchical key structure for cache management:
```typescript
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (projectId: string, filter?: TasksFilter) =>
    [...taskKeys.lists(), projectId, filter] as const,
  details: () => [...taskKeys.all, 'detail'] as const,
  detail: (id: string) => [...taskKeys.details(), id] as const,
}
```

## Date Handling

**Flexible Type:**
Date values can be `Date | string | null`:
```typescript
start_date: Date | string | null
end_date: Date | string | null
```

**Helper Functions (in `lib/utils.ts`):**
```typescript
export function formatDateISO(date: Date | string | null | undefined): string | null
export function formatDateDisplay(date: Date | string | null | undefined): string
export function parseDate(date: Date | string | null | undefined): Date | null
export function calculateEndDate(startDate: Date | string | null, durationDays: number): Date | null
```

**Service Conversion (in scheduling service):**
```typescript
private toDate(value: Date | string | null): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}

private toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
```

## Hebrew/RTL Considerations

**Language Support:**
- All Hebrew strings in Hebrew (not English approximations)
- Date formatting uses `he-IL` locale: `d.toLocaleDateString('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' })`
- Days array: `const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']`

**Example from `lib/utils.ts`:**
```typescript
export function getHebrewDayName(dayIndex: number): string {
  return hebrewDays[dayIndex] || ''
}

export function formatWorkDays(workDays: number[]): string {
  if (workDays.length === 5 && workDays.includes(0) && workDays.includes(4)) {
    return "א'-ה'"  // Sunday-Thursday
  }
  if (workDays.length === 4 && workDays.includes(0) && workDays.includes(3)) {
    return "א'-ד'"  // Sunday-Wednesday
  }
  return workDays.map(d => hebrewDays[d]?.charAt(0) || '').join(', ')
}
```

---

*Convention analysis: 2026-02-12*
