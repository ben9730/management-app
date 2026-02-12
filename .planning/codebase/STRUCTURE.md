# Codebase Structure

**Analysis Date:** 2026-02-12

## Directory Layout

```
flowplan/
├── src/
│   ├── app/                      # Next.js App Router pages & API routes
│   │   ├── (auth)/               # Auth route group
│   │   │   ├── login/            # Login page
│   │   │   └── register/         # Registration page
│   │   ├── api/                  # API routes
│   │   │   └── ai/
│   │   │       └── chat/         # Gemini AI RAG endpoint
│   │   ├── about/                # About page
│   │   ├── debug-auth/           # Debug auth page
│   │   ├── findings/             # Audit findings page
│   │   ├── projects/             # Projects listing page
│   │   ├── team/                 # Team management page
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Dashboard (main entry point)
│   │   └── globals.css           # Global styles
│   │
│   ├── components/               # Reusable React components
│   │   ├── ai/                   # AI chat components
│   │   │   ├── AIChat.tsx        # Main AI chat interface
│   │   │   └── SourceCitationsPanel.tsx # RAG citation display
│   │   ├── calendar/             # Calendar management
│   │   │   └── CalendarExceptionsList.tsx
│   │   ├── findings/             # Audit findings components
│   │   │   ├── CapaTracker.tsx   # CAPA tracking
│   │   │   ├── FindingCard.tsx   # Individual finding card
│   │   │   └── FindingsList.tsx  # Findings list
│   │   ├── forms/                # Form components
│   │   │   ├── TaskForm.tsx      # Create/edit tasks
│   │   │   ├── ProjectForm.tsx   # Create/edit projects
│   │   │   ├── PhaseForm.tsx     # Create/edit phases
│   │   │   ├── TeamMemberForm.tsx # Team member management
│   │   │   ├── TimeOffForm.tsx   # Time off requests
│   │   │   ├── CalendarExceptionForm.tsx
│   │   │   ├── LoginForm.tsx     # Login form
│   │   │   ├── RegisterForm.tsx  # Registration form
│   │   │   └── UserSelect.tsx    # Assignee selection
│   │   ├── gantt/                # Gantt chart visualization
│   │   │   └── GanttChart.tsx    # CPM critical path display
│   │   ├── phases/               # Phase display components
│   │   │   └── PhaseSection.tsx  # Accordion task groups
│   │   ├── projects/             # Project listing components
│   │   │   ├── ProjectCard.tsx   # Individual project card
│   │   │   ├── ProjectsList.tsx  # Projects list view
│   │   │   └── index.ts          # Barrel export
│   │   ├── sync/                 # Offline sync status
│   │   │   └── OfflineSyncStatus.tsx
│   │   ├── tasks/                # Task display components
│   │   │   └── TaskCard.tsx      # Individual task card
│   │   ├── team/                 # Team components
│   │   │   ├── TeamMemberCard.tsx
│   │   │   ├── TeamMemberList.tsx
│   │   │   ├── TimeOffCalendar.tsx
│   │   │   └── index.ts
│   │   ├── ui/                   # UI primitives (design system)
│   │   │   ├── button.tsx        # Button component
│   │   │   ├── input.tsx         # Input field
│   │   │   ├── modal.tsx         # Modal dialog
│   │   │   ├── select.tsx        # Dropdown select
│   │   │   ├── badge.tsx         # Badge/label
│   │   │   ├── card.tsx          # Card container
│   │   │   ├── skeleton.tsx      # Loading skeleton
│   │   │   ├── avatar-stack.tsx  # Multi-avatar display
│   │   │   ├── multi-select.tsx  # Multi-select dropdown
│   │   │   └── ThemeToggle.tsx   # Dark/light mode toggle
│   │   ├── providers/            # Global providers
│   │   │   └── QueryProvider.tsx # React Query setup
│   │   ├── ErrorBoundary.tsx     # Error boundary
│   │   └── Navbar.tsx            # Navigation bar
│   │
│   ├── contexts/                 # React context providers
│   │   └── AuthContext.tsx       # Global auth state
│   │
│   ├── hooks/                    # Custom React hooks (React Query)
│   │   ├── use-projects.ts       # useProjects, useCreateProject, etc.
│   │   ├── use-tasks.ts          # useTasks, useCreateTask, etc.
│   │   ├── use-phases.ts         # usePhases, useCreatePhase, etc.
│   │   ├── use-team-members.ts   # useTeamMembers, useCreateTeamMember, etc.
│   │   ├── use-task-assignments.ts # Multi-assignee support
│   │   ├── use-dependencies.ts   # Task dependency hooks
│   │   ├── use-calendar-exceptions.ts # Holiday/non-working days
│   │   ├── use-audit-findings.ts # Audit findings CRUD
│   │   ├── use-time-off.ts       # Employee time off
│   │   ├── use-sync.tsx          # Offline synchronization
│   │   └── use-users.ts          # User profile hooks
│   │
│   ├── services/                 # Business logic & Supabase CRUD
│   │   ├── projects.ts           # Project CRUD operations
│   │   ├── tasks.ts              # Task CRUD operations
│   │   ├── phases.ts             # Phase CRUD operations
│   │   ├── team-members.ts       # Team member management
│   │   ├── task-assignments.ts   # Multi-assignee assignments
│   │   ├── dependencies.ts       # Task dependency management
│   │   ├── calendar-exceptions.ts # Holiday/non-working day management
│   │   ├── scheduling.ts         # Critical Path Method algorithm
│   │   ├── auth.ts               # Authentication service
│   │   ├── audit-findings.ts     # Audit findings CRUD
│   │   ├── time-off.ts           # Employee time off management
│   │   ├── rag.ts                # RAG pipeline (document retrieval)
│   │   ├── embeddings.ts         # Vector embeddings generation
│   │   ├── document-parser.ts    # Document parsing/extraction
│   │   ├── document-upload.ts    # File upload handling
│   │   ├── gemini.ts             # Google Gemini API client
│   │   ├── sync.ts               # Yjs CRDT synchronization
│   │   ├── offline-storage.ts    # IndexedDB operations
│   │   ├── offline-integration.ts # Offline-online sync logic
│   │   ├── users.ts              # User profile service
│   │   └── *.test.ts             # Unit tests co-located
│   │
│   ├── lib/                      # Utilities & configuration
│   │   ├── supabase.ts           # Supabase client (browser)
│   │   ├── supabase-server.ts    # Supabase client (server-side)
│   │   ├── utils.ts              # Helper functions (cn, calculateEndDate, formatDate)
│   │   └── *.test.ts             # Utility tests
│   │
│   ├── types/                    # TypeScript types & interfaces
│   │   ├── entities.ts           # Domain types (Project, Task, Phase, TeamMember, etc.)
│   │   ├── database.ts           # Supabase auto-generated types
│   │   └── auth.ts               # Auth-specific types
│   │
│   └── test/                     # Test configuration
│       └── setup.ts              # Vitest setup file
│
├── supabase/
│   └── migrations/               # SQL schema migrations
│
├── public/                       # Static assets
├── .env.local                   # Local environment variables (NOT committed)
├── .eslintrc                    # ESLint configuration
├── .prettierrc                  # Prettier formatting rules
├── tsconfig.json                # TypeScript configuration
├── next.config.ts               # Next.js configuration
├── vitest.config.ts             # Vitest configuration
├── playwright.config.ts         # Playwright E2E test config
├── package.json                 # Dependencies
└── CLAUDE.md                    # Project guidelines
```

## Directory Purposes

**src/app:**
- Purpose: Next.js App Router pages and API endpoints
- Contains: Page components (TSX), layouts, API routes (route.ts)
- Pattern: File-based routing (page.tsx = route, layout.tsx = wrapper)

**src/components:**
- Purpose: Reusable React components organized by feature/domain
- Contains: Form components, UI primitives, display components
- Pattern: Functional components, co-located tests (Component.test.tsx)

**src/contexts:**
- Purpose: React Context for global state
- Contains: AuthContext for user authentication state
- Pattern: Provider component wraps entire app in layout.tsx

**src/hooks:**
- Purpose: Custom React hooks, primarily React Query integration
- Contains: useQuery hooks (fetch), useMutation hooks (CRUD)
- Pattern: One hook file per service (use-projects.ts wraps projects.ts)

**src/services:**
- Purpose: Business logic, database operations, external API calls
- Contains: CRUD functions returning ServiceResult<T>, scheduling algorithms
- Pattern: Pure functions, async/await, ServiceResult error handling

**src/lib:**
- Purpose: Configuration, utilities, helper functions
- Contains: Supabase client setup, utility functions, custom hooks
- Pattern: Stateless functions, shared across application

**src/types:**
- Purpose: TypeScript type definitions and interfaces
- Contains: Domain entity types, database types, auth types
- Pattern: Exported interfaces matching database schema

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Main dashboard (project/task management)
- `src/app/layout.tsx`: Root layout (providers, navbar)
- `src/app/(auth)/login/page.tsx`: Login page
- `src/app/(auth)/register/page.tsx`: Registration page

**Configuration:**
- `src/lib/supabase.ts`: Supabase client for browser
- `src/lib/supabase-server.ts`: Supabase client for server
- `.env.local`: Environment variables (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY)
- `tsconfig.json`: TypeScript configuration with `@/*` alias

**Core Logic:**
- `src/services/scheduling.ts`: Critical Path Method algorithm
- `src/services/sync.ts`: Yjs CRDT offline synchronization
- `src/services/rag.ts`: RAG pipeline for document querying
- `src/services/auth.ts`: Supabase authentication

**UI Components:**
- `src/components/ui/`: Design system (Button, Input, Modal, Select, Badge, etc.)
- `src/components/forms/TaskForm.tsx`: Task creation/editing
- `src/components/gantt/GanttChart.tsx`: Gantt chart visualization
- `src/components/phases/PhaseSection.tsx`: Phase accordion display

**Testing:**
- `src/test/setup.ts`: Vitest configuration (DOM environment, testing library setup)
- `*.test.ts` / `*.test.tsx`: Unit tests co-located with source files

## Naming Conventions

**Files:**
- Components: PascalCase (TaskCard.tsx, PhaseSection.tsx)
- Services: camelCase (projects.ts, scheduling.ts)
- Hooks: Prefix with "use-" in kebab-case (use-projects.ts)
- Tests: Suffix with .test.ts or .test.tsx
- Types: entities.ts for domain types, database.ts for Supabase types

**Directories:**
- Feature groups: lowercase plural (components/, services/, hooks/)
- Domain-specific: lowercase (forms/, gantt/, phases/, tasks/)

**Functions & Variables:**
- Functions: camelCase (createProject, isWorkingDay)
- Constants: UPPER_SNAKE_CASE (DEFAULT_ORG_ID, MIN_REQUEST_INTERVAL_MS)
- Component props interfaces: Suffix with "Props" (PhaseSectionProps)
- React hooks: Prefix with "use" (useProjects, useCreateTask)

**Types:**
- Entities: PascalCase (Project, Task, TeamMember)
- Enums/unions: PascalCase (ProjectStatus, TaskPriority)
- Service inputs: Suffix with "Input" (CreateProjectInput, UpdateTaskInput)
- Service results: ServiceResult<T> generic

## Where to Add New Code

**New Feature (Task Management):**
- TypeScript types: `src/types/entities.ts` (add Task interface)
- Service CRUD: `src/services/tasks.ts` (add createTask, updateTask, etc.)
- React Query hook: `src/hooks/use-tasks.ts` (add useCreateTask, useUpdateTask)
- Form component: `src/components/forms/TaskForm.tsx` (create if needed)
- Page/modal: `src/app/page.tsx` (integrate hook and form)
- Tests: Co-located with source (tasks.ts → tasks.test.ts)

**New Component/Module:**
- Create file in appropriate subdirectory: `src/components/{feature}/{ComponentName}.tsx`
- Export from barrel: `src/components/{feature}/index.ts`
- Create props interface: `export interface {ComponentName}Props { ... }`
- Write tests alongside: `{ComponentName}.test.tsx`
- Import in consumer pages using `@/components/` alias

**Utilities:**
- Shared helpers: `src/lib/utils.ts` (cn function, date helpers)
- Domain helpers: Within service file or separate utility file in same directory
- Type guards: In `src/types/entities.ts` if generic, else service file

**New Service (External API Integration):**
1. Create file: `src/services/{feature}.ts`
2. Implement functions returning `ServiceResult<T>`
3. Add types to `src/types/entities.ts` if domain-related
4. Create React Query hook: `src/hooks/use-{feature}.ts`
5. Add tests: `src/services/{feature}.test.ts`
6. Integrate in component/page

## Special Directories

**src/app/api:**
- Purpose: Next.js API routes (server-side endpoints)
- Generated: No, manually created
- Committed: Yes
- Example: `src/app/api/ai/chat/route.ts` - Gemini AI endpoint

**supabase/migrations:**
- Purpose: SQL schema migrations for database structure
- Generated: Manual SQL files created in order
- Committed: Yes (version-controlled schema changes)
- Run via: Supabase CLI `supabase migration list`

**src/test:**
- Purpose: Global test configuration
- Generated: No, manually created
- Committed: Yes
- Contains: setup.ts (Vitest environment, testing-library config)

**public:**
- Purpose: Static assets served directly
- Generated: No, manual content only
- Committed: Yes (images, icons, fonts)

**node_modules:**
- Purpose: Installed dependencies
- Generated: Yes (from package-lock.json or yarn.lock)
- Committed: No (listed in .gitignore)

**.next:**
- Purpose: Next.js build output and type caches
- Generated: Yes (build artifacts)
- Committed: No (listed in .gitignore)

---

*Structure analysis: 2026-02-12*
