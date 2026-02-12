# Testing Patterns

**Analysis Date:** 2026-02-12

## Test Framework

**Runner:**
- Vitest 4.0.18
- Config: `vitest.config.ts`
- Environment: happy-dom (lightweight DOM)

**Assertion Library:**
- @testing-library/react 16.3.2 (component testing)
- @testing-library/user-event 14.6.1 (user interactions)
- @testing-library/jest-dom 6.9.1 (DOM matchers)
- Vitest built-in `expect()` (assertions)

**Run Commands:**
```bash
npm run test              # Watch mode (re-runs on changes)
npm run test:run         # Single run (CI mode)
npm run test:coverage    # Coverage report (exits after run)
npm run test:e2e         # Playwright E2E tests
npm run test:e2e:ui      # E2E tests with UI
npm run test:e2e:headed  # E2E tests with browser visible
npm run test:e2e:debug   # Debug E2E tests (pauses execution)
```

## Test File Organization

**Location:**
- Co-located with source files (same directory)
- `.test.ts` for service/utility tests
- `.test.tsx` for component tests
- Special case: `src/components/ai/__tests__/` subdirectory for AI component tests

**Example Structure:**
```
src/
├── services/
│   ├── tasks.ts
│   └── tasks.test.ts          # Adjacent test file
├── hooks/
│   ├── use-tasks.ts
│   └── use-tasks.test.ts      # Adjacent test file
├── components/
│   ├── forms/
│   │   ├── TaskForm.tsx
│   │   └── TaskForm.test.tsx  # Adjacent test file
│   ├── ai/
│   │   ├── AIChat.tsx
│   │   └── __tests__/
│   │       └── AIChat.test.tsx # Subdirectory for AI tests
│   └── ui/
│       ├── button.tsx
│       └── button.test.tsx    # Adjacent test file
└── lib/
    ├── utils.ts
    └── utils.test.ts          # Adjacent test file
```

**Naming:**
- Match source file name: `tasks.ts` → `tasks.test.ts`
- Test files are included in coverage: `include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}']`

## Test Structure

**Suite Organization:**
```typescript
describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createTask', () => {
    it('should create a task with valid input', async () => {
      // Test body
    })

    it('should return validation error for empty title', async () => {
      // Test body
    })
  })

  describe('updateTask', () => {
    it('should update task status', async () => {
      // Test body
    })
  })
})
```

**Patterns:**
- Top-level `describe()` for module/component name
- Nested `describe()` for function/feature grouping
- `beforeEach()` for setup (mock clearing, etc.)
- `it()` for individual test cases

**Setup Files:**
- Global setup: `src/test/setup.ts`
- Configured in `vitest.config.ts`: `setupFiles: ['./src/test/setup.ts']`
- Mocks global objects: `next/navigation`, `window.matchMedia`, `IntersectionObserver`, `ResizeObserver`
- Sets environment variables for tests

## Test Structure Details

**Service Test Example (from `src/services/tasks.test.ts`):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createTask, getTask, getTasks, updateTask, deleteTask } from './tasks'
import type { Task } from '@/types/entities'

// Mock Supabase client
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
  in: vi.fn(),
}))

// Setup chainable mock methods
mockSupabase.from.mockReturnValue(mockSupabase)
mockSupabase.select.mockReturnValue(mockSupabase)
mockSupabase.insert.mockReturnValue(mockSupabase)

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockTask: Task = {
  id: 'task-1',
  project_id: 'proj-1',
  phase_id: 'phase-1',
  title: 'Test Task',
  // ... all required fields
}

describe('Tasks Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chainable mocks
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
  })

  describe('createTask', () => {
    it('should validate input', async () => {
      // Test validation
    })
  })
})
```

**Component Test Example (from `src/components/ui/button.test.tsx`):**
```typescript
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from './button'

describe('Button', () => {
  it('renders with children text', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByText('Click me')).toBeInTheDocument()
  })

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn()
    render(<Button onClick={handleClick}>Click</Button>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>)
    expect(screen.getByRole('button')).toBeDisabled()
  })
})
```

**Hook Test Example (from `src/hooks/use-projects.test.ts`):**
```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import { useProjects, useCreateProject } from './use-projects'
import * as projectsService from '@/services/projects'
import type { Project } from '@/types/entities'

describe('useProjects', () => {
  const queryClient = new QueryClient()
  const wrapper = ({ children }: { children: React.ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children)

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches projects', async () => {
    const mockProjects: Project[] = [/* test data */]
    vi.spyOn(projectsService, 'getProjects').mockResolvedValue({
      data: mockProjects,
      error: null,
    })

    const { result } = renderHook(() => useProjects(), { wrapper })

    await waitFor(() => {
      expect(result.current.data).toEqual(mockProjects)
    })
  })
})
```

## Mocking

**Framework:** Vitest's `vi` module

**Mock Patterns:**

1. **Module Mocking:**
```typescript
vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

vi.mock('@/services/team-members', () => ({
  checkMemberAvailability: vi.fn().mockResolvedValue({ available: true }),
}))
```

2. **Function Mocking:**
```typescript
const mockOnSubmit = vi.fn()
const mockOnCancel = vi.fn()

// In component
render(<TaskForm onSubmit={mockOnSubmit} onCancel={mockOnCancel} />)

// Assert mock was called
expect(mockOnSubmit).toHaveBeenCalledTimes(1)
expect(mockOnSubmit).toHaveBeenCalledWith(expectedData)
```

3. **Chainable Mock (for Supabase):**
```typescript
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
}))

mockSupabase.from.mockReturnValue(mockSupabase)
mockSupabase.select.mockReturnValue(mockSupabase)
mockSupabase.insert.mockReturnValue(mockSupabase)
mockSupabase.eq.mockReturnValue(mockSupabase)
mockSupabase.single.mockResolvedValue({ data: mockTask, error: null })
```

4. **Spy Mocking:**
```typescript
vi.spyOn(projectsService, 'getProjects').mockResolvedValue({
  data: mockProjects,
  error: null,
})
```

**What to Mock:**
- External services: Supabase, API calls
- Date/time-dependent operations: `vi.useFakeTimers()`
- Browser APIs: `window.matchMedia`, `IntersectionObserver`
- Navigation: `next/navigation` (mocked in setup.ts)

**What NOT to Mock:**
- React components under test
- Utility functions (import and test directly)
- Date/time helpers (unless testing specific dates)
- Database schema validation logic

## Fixtures and Factories

**Test Data Pattern:**
```typescript
function createMockTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 'task-1',
    project_id: 'project-1',
    phase_id: null,
    title: 'Test Task',
    description: null,
    status: 'pending',
    priority: 'medium',
    assignee_id: null,
    duration: 1,
    estimated_hours: null,
    start_date: null,
    end_date: null,
    es: null,
    ef: null,
    ls: null,
    lf: null,
    slack: 0,
    is_critical: false,
    created_at: new Date('2026-01-01'),
    updated_at: new Date('2026-01-01'),
    ...overrides,
  }
}
```

**Factory Functions (from scheduling tests):**
```typescript
function createMockDependency(
  predecessor_id: string,
  successor_id: string,
  overrides: Partial<Dependency> = {}
): Dependency {
  return {
    id: `dep-${predecessor_id}-${successor_id}`,
    predecessor_id,
    successor_id,
    type: 'FS',
    lag_days: 0,
    created_at: new Date('2026-01-01'),
    ...overrides,
  }
}

function createMockTeamMember(overrides: Partial<TeamMember> = {}): TeamMember {
  return {
    id: 'member-1',
    user_id: 'user-1',
    project_id: 'project-1',
    employment_type: 'full_time',
    work_hours_per_day: 8,
    work_days: [0, 1, 2, 3, 4],
    role: 'member',
    hourly_rate: null,
    created_at: new Date('2026-01-01'),
    ...overrides,
  }
}
```

**Location:**
- Factory functions defined at top of test file after imports
- Can be extracted to `src/test/factories/` if reused across multiple test files

## Coverage

**Requirements:**
- Minimum 80% across branches, functions, lines, statements
- Configured in `vitest.config.ts`:
```typescript
coverage: {
  provider: 'v8',
  reporter: ['text', 'json', 'html'],
  exclude: [
    'node_modules/',
    'src/test/',
    '**/*.d.ts',
    '**/*.config.*',
    '**/types/**',
  ],
  thresholds: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
}
```

**View Coverage:**
```bash
npm run test:coverage
# Opens HTML report at: coverage/index.html
```

**Coverage is measured for:**
- All service files
- All hook files
- All component files
- All utility files

**Excluded from coverage:**
- Test utilities and helpers
- Type definition files
- Configuration files
- Database-generated types

## Test Types

**Unit Tests:**
- Scope: Individual functions, pure logic
- Examples: utility functions (`utils.test.ts`), validation logic
- Approach: Test inputs and outputs, no dependencies
- Frequency: Most tests are unit tests

Example from `services/tasks.test.ts`:
```typescript
describe('createTask', () => {
  it('should validate input', async () => {
    const result = await createTask({
      project_id: 'proj-1',
      title: '', // Invalid
    })
    expect(result.error).toBeDefined()
  })
})
```

**Integration Tests:**
- Scope: Service + database (mocked), hooks + React Query
- Examples: service CRUD operations with mocked Supabase
- Approach: Mock external dependencies, test interaction
- Location: `*.test.ts` for services, hooks with providers

Example from `hooks/use-projects.test.ts`:
```typescript
it('fetches projects', async () => {
  vi.spyOn(projectsService, 'getProjects').mockResolvedValue({
    data: mockProjects,
    error: null,
  })

  const { result } = renderHook(() => useProjects(), { wrapper })

  await waitFor(() => {
    expect(result.current.data).toEqual(mockProjects)
  })
})
```

**E2E Tests:**
- Framework: Playwright 1.58.1
- Commands: `npm run test:e2e`, `npm run test:e2e:ui`
- Location: Typically in separate `e2e/` directory (config in `playwright.config.ts`)
- Approach: Test complete user workflows through browser
- Currently used for critical flows (login, project creation, task management)

## Common Patterns

**Async Testing:**
```typescript
// Service test
it('should create a task', async () => {
  mockSupabase.single.mockResolvedValue({ data: mockTask, error: null })

  const result = await createTask({ project_id: 'proj-1', title: 'Task' })

  expect(result.data).toEqual(mockTask)
})

// Hook test with waitFor
it('fetches tasks', async () => {
  const { result } = renderHook(() => useTasks('proj-1'), { wrapper })

  await waitFor(() => {
    expect(result.current.data).toBeDefined()
  })
})

// User interaction test
it('submits form on button click', async () => {
  const user = userEvent.setup()
  const onSubmit = vi.fn()

  render(<TaskForm onSubmit={onSubmit} />)

  await user.type(screen.getByTestId('task-title-input'), 'New Task')
  await user.click(screen.getByRole('button', { name: /save/i }))

  expect(onSubmit).toHaveBeenCalled()
})
```

**Error Testing:**
```typescript
// Service error handling
it('returns error for invalid input', async () => {
  const result = await createTask({
    project_id: '',
    title: 'Task',
  })

  expect(result.error).toBeDefined()
  expect(result.error?.message).toContain('Project ID is required')
  expect(result.data).toBeNull()
})

// Hook error handling
it('throws error on service failure', async () => {
  vi.spyOn(tasksService, 'getTasks').mockResolvedValue({
    data: null,
    error: { message: 'Database error' },
  })

  const { result } = renderHook(() => useTasks('proj-1'), { wrapper })

  await waitFor(() => {
    expect(result.current.error).toBeDefined()
  })
})

// Component error boundary
it('displays error message on failure', async () => {
  const onError = vi.fn()

  render(<TaskForm onError={onError} onSubmit={vi.fn()} />)

  // Trigger error condition
  // Assert error message displays
})
```

**Data-TestId Pattern (for reliable selectors):**
```typescript
// In component
<input data-testid="task-title-input" />
<button data-testid="task-form-cancel-button">Cancel</button>
<div role="alert" data-testid="vacation-warning" />

// In test
expect(screen.getByTestId('task-title-input')).toBeInTheDocument()
await user.click(screen.getByTestId('task-form-cancel-button'))
expect(screen.queryByTestId('vacation-warning')).not.toBeInTheDocument()
```

**QueryClient Setup for Hook Tests:**
```typescript
// Create fresh client for each test
const queryClient = new QueryClient()
const wrapper = ({ children }: { children: React.ReactNode }) =>
  createElement(QueryClientProvider, { client: queryClient }, children)

// Render hook with provider wrapper
const { result } = renderHook(() => useTasks(projectId), { wrapper })

// Wait for query to resolve
await waitFor(() => {
  expect(result.current.data).toBeDefined()
})
```

## Test Organization by Type

**Service Tests (`src/services/*.test.ts`):**
- Focus: CRUD operations, validation, business logic
- Mocks: Supabase client
- Assertions: Result shape, error handling, data transformation

**Hook Tests (`src/hooks/*.test.ts`):**
- Focus: Query/mutation behavior, cache management
- Mocks: Service functions, Supabase
- Setup: React Query provider wrapper
- Assertions: Data loading, mutations, cache updates

**Component Tests (`src/components/**/*.test.tsx`):**
- Focus: Rendering, user interactions, prop behavior
- Mocks: Service calls, navigation
- Selectors: data-testid for reliability
- Assertions: DOM elements, event callbacks, rendering logic

**Utility Tests (`src/lib/*.test.ts`):**
- Focus: Pure function outputs
- Mocks: None (no dependencies)
- Assertions: Return values, edge cases

---

*Testing analysis: 2026-02-12*
