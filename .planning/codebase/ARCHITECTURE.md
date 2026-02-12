# Architecture

**Analysis Date:** 2026-02-12

## Pattern Overview

**Overall:** Layered architecture with React/Next.js frontend, service-oriented middleware, and Supabase PostgreSQL backend.

**Key Characteristics:**
- Client-side state management via React Query (TanStack Query)
- Service layer for business logic and Supabase CRUD operations
- CRDT-based offline-first synchronization using Yjs
- Critical Path Method (CPM) scheduling algorithm for project planning
- RTL Hebrew-first UI with dark theme enforced
- Feature flags for experimental features (AI_CHAT disabled in `src/app/page.tsx`)

## Layers

**Presentation (UI Layer):**
- Purpose: React components for user interaction
- Location: `src/app/` (Next.js pages), `src/components/` (reusable UI)
- Contains: Page components, form components, display components (TaskCard, PhaseSection, GanttChart)
- Depends on: React Query hooks, context providers, types
- Used by: Browser/client

**State Management & Caching:**
- Purpose: React Query hooks managing data fetching, caching, and mutations
- Location: `src/hooks/` (e.g., `use-projects.ts`, `use-tasks.ts`)
- Contains: Query hooks and mutations with TanStack Query integration
- Depends on: Service layer functions
- Used by: Page components, other hooks

**Service Layer:**
- Purpose: Business logic, Supabase CRUD, scheduling algorithms, RAG/embeddings
- Location: `src/services/`
- Contains:
  - `projects.ts`, `tasks.ts`, `phases.ts` - Core CRUD operations
  - `scheduling.ts` - Critical Path Method algorithm (ES/EF/LS/LF calculation)
  - `sync.ts` - Yjs CRDT synchronization with IndexedDB persistence
  - `rag.ts` - RAG pipeline for AI document querying
  - `embeddings.ts` - Vector embeddings generation
  - `offline-storage.ts` - IndexedDB operations
  - `auth.ts` - Authentication service
  - `calendar-exceptions.ts` - Holiday/non-working day management
- Depends on: Supabase client, external APIs (Google Gemini)
- Used by: React Query hooks, API routes

**Data Access:**
- Purpose: Direct Supabase database communication
- Location: `src/lib/supabase.ts` (browser), `src/lib/supabase-server.ts` (server)
- Contains: Supabase client initialization, database schema types
- Depends on: `@supabase/supabase-js`, environment variables
- Used by: Service layer

**Global State & Context:**
- Purpose: Authentication state management
- Location: `src/contexts/AuthContext.tsx`
- Contains: Supabase auth state, user session management
- Depends on: Supabase auth API
- Used by: Layout, protected pages

**Infrastructure:**
- Purpose: Server-side API routes and configuration
- Location: `src/app/api/` (Next.js API routes)
- Contains: `src/app/api/ai/chat/route.ts` - Gemini AI endpoint
- Depends on: Service layer, external AI APIs
- Used by: Client-side fetch calls

## Data Flow

**Create/Update Task Flow:**

1. User fills TaskForm in modal (`src/components/forms/TaskForm.tsx`)
2. Form submits to `handleTaskFormSubmit()` in `src/app/page.tsx`
3. Component calls `createTaskMutation.mutate()` or `updateTaskMutation.mutate()`
4. React Query mutation calls service function from `src/services/tasks.ts`
5. Service inserts/updates record in Supabase `tasks` table
6. On success:
   - React Query cache invalidates (`projectKeys.lists()`)
   - Task assignments synced via `useTaskAssignmentsByProject` hook
   - Multi-assignee support via `task_assignments` table
   - Tasks re-fetched and UI re-renders via PhaseSection/TaskCard

**Critical Path Calculation:**

1. `SchedulingService.calculateCriticalPath()` invoked during scheduling
2. Forward pass: Calculate ES/EF for all tasks
3. Backward pass: Calculate LS/LF from project end date
4. Slack = LS - ES; if slack = 0, task is critical (is_critical = true)
5. Respects calendar exceptions (holidays, non-working days)
6. Updates task records with ES, EF, LS, LF, slack, is_critical values

**Offline Synchronization Flow:**

1. `sync.ts` implements Yjs CRDT for conflict-free edits
2. `IndexeddbPersistence` persists Y.Doc to IndexedDB locally
3. `WebsocketProvider` syncs changes when online
4. Local edits queued automatically; synced when connection established
5. Concurrent edits from multiple users merged conflict-free via CRDT

**Authentication Flow:**

1. User navigates to `/login` or `/register`
2. Form submission calls `authSignIn()` or `authSignUp()` from `src/services/auth.ts`
3. Supabase JWT created/validated
4. AuthContext subscribes to `supabase.auth.onAuthStateChange()`
5. Session updated globally; protected routes accessible

**State Management:**
- React Query manages server state (projects, tasks, phases, team members)
- Local component state for UI (modals, selections, form state)
- Context (AuthContext) for authentication state
- Yjs for collaborative document editing (offline-first)

## Key Abstractions

**ServiceResult<T>:**
- Purpose: Consistent error handling pattern across services
- Pattern: `{ data: T | null, error: { message: string; code?: string } | null }`
- Examples: `src/services/projects.ts`, `src/services/tasks.ts`
- Used by: All service functions, converted to throwing errors in React Query hooks

**SchedulingService (Class):**
- Purpose: Critical Path Method algorithm
- Pattern: Instance-based with methods for:
  - `forwardPass(tasks, dependencies)` - Calculate ES/EF
  - `backwardPass(tasks)` - Calculate LS/LF
  - `calculateCriticalPath(tasks)` - Identify critical tasks
  - `addWorkingDays()` - Calendar-aware date arithmetic
- Examples: `src/services/scheduling.ts`

**React Query Key Factory Pattern:**
- Purpose: Consistent cache key management
- Pattern: Nested objects with `all`, `lists()`, `list()`, `details()`, `detail()`
- Examples: `projectKeys`, `taskKeys` in `src/hooks/use-projects.ts`, `src/hooks/use-tasks.ts`

**Immutability Pattern (Critical):**
- Purpose: Prevent bugs from state mutation
- Pattern: Always use spread operator `{ ...obj, field: newValue }` for updates
- Examples: Throughout `src/app/page.tsx` state management
- Enforced: CLAUDE.md coding-style.md specifies "ALWAYS create new objects, NEVER mutate"

## Entry Points

**Browser Page:**
- Location: `src/app/page.tsx`
- Triggers: User navigates to `/`
- Responsibilities:
  - Fetch projects, tasks, phases, team members via React Query
  - Render dashboard with two view modes (phases list or Gantt chart)
  - Handle project/task/phase CRUD operations via modals
  - Manage task detail sidebar
  - Coordinate multi-assignee task assignments

**Auth Pages:**
- Locations: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`
- Triggers: Navigation to `/login` or `/register`
- Responsibilities: User authentication via Supabase

**Project List Page:**
- Location: `src/app/projects/page.tsx`
- Triggers: Navigation to `/projects`
- Responsibilities: Display all projects; create/delete projects

**Team Page:**
- Location: `src/app/team/page.tsx`
- Triggers: Navigation to `/team`
- Responsibilities: Manage team members, time off, work schedules

**Findings Page:**
- Location: `src/app/findings/page.tsx`
- Triggers: Navigation to `/findings`
- Responsibilities: Audit findings management with CAPA tracking

**API Routes:**
- Location: `src/app/api/ai/chat/route.ts`
- Triggers: POST to `/api/ai/chat` from client
- Responsibilities: Gemini AI RAG query endpoint (server-side rate limiting)

## Error Handling

**Strategy:** Try-catch blocks with console.error logging; user-facing error messages in Hebrew.

**Patterns:**
- Service functions return `ServiceResult<T>` with error object
- React Query mutations throw errors (converted from ServiceResult errors)
- Component-level error boundaries catch React errors
- Form validation via Zod schema before submission
- API error responses include proper HTTP status codes

**Examples:**
- `src/services/projects.ts` - Input validation + Supabase error handling
- `src/components/forms/TaskForm.tsx` - Zod validation
- `src/components/ErrorBoundary.tsx` - React error boundary
- `src/app/page.tsx` - Modal error messages for task/project operations

## Cross-Cutting Concerns

**Logging:**
- Pattern: `console.error()` for failures, no `console.log()` in production code
- Examples: `src/services/auth.ts`, `src/app/page.tsx`

**Validation:**
- Tool: Zod schema validation
- Location: Form components (`src/components/forms/`)
- Pattern: Server-side validation in services before database operations

**Authentication:**
- Method: Supabase JWT + cookie-based sessions
- Location: `src/contexts/AuthContext.tsx`, `src/services/auth.ts`
- Pattern: AuthProvider wraps entire app; hooks call context for user state

**Authorization:**
- Location: Supabase RLS (Row Level Security) policies on database
- Pattern: Development uses permissive "Anyone can..." policies (see CLAUDE.md)

**RTL Support:**
- Pattern: `dir="rtl"` on HTML element in `src/app/layout.tsx`
- Dark mode: `className="dark"` enforced on HTML
- Font: DM Sans from Google Fonts (RTL-optimized)
- Localization: Hebrew strings hardcoded in components

**Offline Support:**
- Tool: Yjs CRDT + IndexedDB via `src/services/sync.ts`
- Pattern: LocalStorage for small settings; IndexedDB for large datasets
- Automatic sync when connection re-established

---

*Architecture analysis: 2026-02-12*
