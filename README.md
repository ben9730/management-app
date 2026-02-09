# FlowPlan - AI-Native Audit Management System

<div align="center">

**FlowPlan** is an intelligent audit and project management platform built for Hebrew-speaking teams.
It combines **Critical Path Method (CPM)** scheduling, **Gantt charts**, **team resource management**,
and **offline-first** capabilities into a modern, dark-themed web application.

[Features](#features) | [Tech Stack](#tech-stack) | [Getting Started](#getting-started) | [Architecture](#architecture) | [Testing](#testing)

[![Demo Video](https://img.youtube.com/vi/k0eFrVMY10g/maxresdefault.jpg)](https://www.youtube.com/watch?v=k0eFrVMY10g)

**[▶ צפה בסרטון הדמו](https://www.youtube.com/watch?v=k0eFrVMY10g)**

</div>

---

## Features

### Project & Task Management
- Full CRUD for projects, tasks, and phases
- Auto-creation of default phase ("כללי") on new project
- Task priorities: Low, Medium, High, Critical
- Task statuses: Pending, In Progress, Done
- Multi-project dashboard with project switcher

### CPM Scheduling Engine
- Complete Critical Path Method implementation (~600 lines)
- **Forward Pass** - Early Start (ES) & Early Finish (EF) calculation
- **Backward Pass** - Late Start (LS) & Late Finish (LF) calculation
- **Slack calculation** & critical path identification
- 4 dependency types: FS, SS, FF, SF with lag days
- Calendar-aware scheduling (holidays, working days)
- Resource-aware duration calculation (team availability, time off)

### Interactive Gantt Chart
- Visual task timeline with dependency arrows
- Critical path highlighting (red)
- Phase grouping with accordion sections
- Task count per phase

### Team & Resource Management
- Team member profiles with employment type (full-time, part-time, contractor)
- Configurable work hours and work days per member
- Time off management (vacation, sick, personal)
- Multi-assignee support with AvatarStack UI
- Duration hints based on team availability

### Calendar Exceptions
- Holiday and non-working day management per project
- Multi-day exception support (e.g., Passover week)
- Integrated with CPM scheduling engine

### Audit Findings Center
- Finding cards with severity badges (Critical, High, Medium, Low)
- CAPA (Corrective/Preventive Action) tracking with statistics
- Filterable by severity and status
- *Currently hidden behind feature flag*

### Authentication & Security
- Supabase Auth (email/password)
- Hebrew error messages
- Session management with auto-refresh
- Row Level Security (RLS) - project-based permissions
- `ensureProjectMember()` pattern for authorization

### Offline-First Architecture
- **Yjs CRDT** for conflict-free real-time sync
- **IndexedDB** local persistence
- **WebSocket** provider for online sync
- Offline status indicator component

### UI/UX
- Dark mode enforced
- Full RTL (Right-to-Left) Hebrew support
- Responsive design
- Error Boundary with graceful error recovery
- Performance optimized with React.memo and useMemo

---

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js (App Router) | 16 |
| **UI Library** | React | 19 |
| **Language** | TypeScript | 5 |
| **Database** | Supabase (PostgreSQL) | - |
| **Auth** | Supabase Auth | - |
| **State Management** | TanStack React Query | 5 |
| **Offline Sync** | Yjs (CRDT) + y-indexeddb + y-websocket | 13 |
| **Styling** | Tailwind CSS | 4 |
| **Validation** | Zod | 4 |
| **Icons** | Lucide React | - |
| **Date Handling** | date-fns | 4 |
| **Unit Testing** | Vitest + Testing Library | - |
| **E2E Testing** | Playwright | - |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+
- Supabase project (local or cloud)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd flowplan

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Variables

Create a `.env.local` file in the `flowplan/` directory:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
```

### Database Setup

Apply migrations to your Supabase project (in order):

```
supabase/migrations/
├── 001_initial_schema.sql          # Core tables (projects, tasks, phases, etc.)
├── 002_fix_team_members_rls.sql    # RLS policy fixes
├── 003_add_organization_support.sql # Organization-level team members
├── 004_fix_time_off_rls.sql        # Time off RLS policies
├── 005_fix_tasks_assignee_fkey.sql # Foreign key fix
└── 006_fix_time_off_user_fkey.sql  # User foreign key fix
```

### Running the App

```bash
cd flowplan

# Development server
npm run dev
# Open http://localhost:3000

# Production build
npm run build
npm run start
```

---

## Architecture

### Directory Structure

```
flowplan/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/                   # Auth pages (login, register)
│   │   ├── about/                    # About page
│   │   ├── api/ai/chat/             # AI chat API route
│   │   ├── findings/                 # Findings center page
│   │   ├── projects/                 # Projects list page
│   │   ├── team/                     # Team workspace page
│   │   ├── layout.tsx               # Root layout (RTL, dark mode)
│   │   └── page.tsx                 # Main dashboard
│   │
│   ├── components/
│   │   ├── ai/                      # AIChat, SourceCitationsPanel
│   │   ├── calendar/                # CalendarExceptionsList
│   │   ├── findings/                # FindingCard, FindingsList, CapaTracker
│   │   ├── forms/                   # TaskForm, ProjectForm, PhaseForm, etc.
│   │   ├── gantt/                   # GanttChart (CPM visualization)
│   │   ├── phases/                  # PhaseSection (accordion groups)
│   │   ├── sync/                    # OfflineSyncStatus
│   │   ├── tasks/                   # TaskCard
│   │   ├── ui/                      # Button, Modal, Input, Select, Badge, Card
│   │   ├── providers/               # QueryProvider (TanStack)
│   │   ├── ErrorBoundary.tsx        # Global error boundary
│   │   └── Navbar.tsx               # Navigation bar
│   │
│   ├── contexts/
│   │   └── AuthContext.tsx          # Authentication context
│   │
│   ├── hooks/                       # React Query hooks
│   │   ├── use-projects.ts
│   │   ├── use-tasks.ts
│   │   ├── use-phases.ts
│   │   ├── use-dependencies.ts
│   │   ├── use-team-members.ts
│   │   ├── use-time-off.ts
│   │   ├── use-audit-findings.ts
│   │   ├── use-calendar-exceptions.ts
│   │   ├── use-task-assignments.ts
│   │   └── use-sync.tsx
│   │
│   ├── services/                    # Business logic & Supabase CRUD
│   │   ├── scheduling.ts           # CPM algorithm (~600 lines)
│   │   ├── sync.ts                 # Yjs CRDT synchronization
│   │   ├── offline-storage.ts      # IndexedDB persistence
│   │   ├── rag.ts                  # RAG pipeline (AI)
│   │   ├── embeddings.ts           # Embedding generation
│   │   ├── document-parser.ts      # Document parsing
│   │   ├── document-upload.ts      # File upload service
│   │   ├── audit-findings.ts       # Findings CRUD
│   │   └── dependencies.ts         # Dependencies CRUD
│   │
│   ├── lib/
│   │   ├── supabase.ts             # Supabase client config
│   │   └── utils.ts                # cn() helper, utilities
│   │
│   └── types/
│       ├── entities.ts              # Domain types (Project, Task, Phase, etc.)
│       ├── database.ts              # Supabase generated types
│       └── auth.ts                  # Auth types
│
├── tests/
│   └── e2e/                         # Playwright E2E tests
│       ├── auth.spec.ts
│       ├── dashboard.spec.ts
│       ├── projects.spec.ts
│       ├── team-workspace.spec.ts
│       ├── calendar-exceptions.spec.ts
│       ├── multi-assignee.spec.ts
│       ├── offline-sync.spec.ts
│       └── findings-center.spec.ts
│
└── supabase/
    └── migrations/                  # SQL schema migrations
```

### Data Flow

```
UI (App Router pages)
  └─▶ React Query Hooks (use-*.ts)
       └─▶ Services (Supabase CRUD + business logic)
            └─▶ Supabase PostgreSQL (with RLS)
```

### Key Domain Entities

| Entity | Description |
|--------|-------------|
| **Project** | Container with phases, tasks, and calendar exceptions |
| **ProjectPhase** | Task groupings within a project |
| **Task** | Work item with CPM fields (ES, EF, LS, LF, slack, is_critical) |
| **Dependency** | Relationship between tasks (FS/SS/FF/SF + lag days) |
| **TeamMember** | User profile with work hours, days, and skills |
| **EmployeeTimeOff** | Vacation/sick/personal time records |
| **CalendarException** | Holidays and non-working days |
| **AuditFinding** | Audit finding with severity and CAPA tracking |
| **TaskAssignment** | Multi-assignee mapping (task ↔ team member) |

---

## Scripts

All commands run from the `flowplan/` directory:

```bash
# Development
npm run dev              # Start dev server (http://localhost:3000)

# Build
npm run build            # Production build (includes type-check)
npm run start            # Start production server

# Linting
npm run lint             # ESLint

# Unit Tests (Vitest)
npm run test             # Watch mode
npm run test:run         # Single run
npm run test:coverage    # Coverage report (80% threshold)

# E2E Tests (Playwright)
npm run test:e2e         # Run all E2E tests
npm run test:e2e:headed  # Run with browser UI
npm run test:e2e:ui      # Playwright UI mode
npm run test:e2e:debug   # Debug mode
npm run test:e2e:report  # Show HTML report
```

---

## Testing

### Coverage Requirements

- **Minimum threshold**: 80% (branches, functions, lines, statements)
- **Methodology**: Test-Driven Development (TDD)
- **Unit tests**: 200+ tests with Vitest + Testing Library
- **E2E tests**: 107+ tests with Playwright across 8 spec files

### Test Structure

- **Unit tests**: Co-located with source files (`*.test.ts` / `*.test.tsx`)
- **E2E tests**: Located in `tests/e2e/*.spec.ts`

### E2E Test Coverage

| Suite | Coverage |
|-------|----------|
| Authentication | Login, register, logout, session management |
| Dashboard | Project switching, task CRUD, phase management |
| Projects | Create, edit, delete, list |
| Team Workspace | Members, time off, work hours |
| Calendar Exceptions | Holidays, non-working days |
| Multi-Assignee | Assign/remove multiple team members |
| Offline Sync | CRDT sync, offline detection |
| Findings Center | Findings CRUD, CAPA tracking |

---

## Feature Flags

Some features can be toggled via flags in [page.tsx](flowplan/src/app/page.tsx):

| Flag | Default | Description |
|------|---------|-------------|
| `AI_CHAT` | `false` | AI chat panel (disabled - Gemini API rate limits) |

Hidden pages accessible via Navbar flags in [Navbar.tsx](flowplan/src/components/Navbar.tsx):

| Feature | How to Enable |
|---------|---------------|
| Findings Center | Set `FEATURE_FLAGS.FINDINGS_PAGE = true` |

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `projects` | Project metadata (name, status, dates) |
| `project_phases` | Phase groupings within projects |
| `tasks` | Tasks with CPM scheduling fields |
| `dependencies` | Task dependency relationships |
| `team_members` | Team member profiles |
| `employee_time_off` | Time off records |
| `calendar_exceptions` | Holidays and non-working days |
| `audit_findings` | Audit findings with CAPA |
| `task_assignments` | Multi-assignee mappings |

### RLS (Row Level Security)

All tables use project-based RLS policies. The `ensureProjectMember()` pattern ensures users can only access data for projects they belong to.

---

## UI Design

- **Language**: Hebrew (RTL)
- **Theme**: Dark mode (enforced via `className="dark"` on `<html>`)
- **Font**: DM Sans (with RTL support)
- **Colors**: Slate-based dark palette with accent highlights
- **Icons**: Lucide React + Material Icons

---

## Future Roadmap

| Feature | Status | Notes |
|---------|--------|-------|
| AI Chat (RAG) | Deferred | Pending paid API tier (Groq/Gemini/Claude) |
| Document Upload | Deferred | Depends on AI activation |
| Multi-language | Planned | English support |

---

## License

Private project. All rights reserved.
