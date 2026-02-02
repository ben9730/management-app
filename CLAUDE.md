# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FlowPlan is an AI-native audit management system built for Hebrew-speaking users. It provides project/task management with Critical Path Method (CPM) scheduling, Gantt charts, and offline-first capabilities.

**Tech Stack**: Next.js 16, React 19, TypeScript 5, Supabase (PostgreSQL + Auth), TanStack Query, Yjs (CRDT), Tailwind CSS 4, Vitest

## Commands

All commands run from the `flowplan/` directory:

```bash
# Development
npm run dev          # Start dev server at http://localhost:3000

# Build & Lint
npm run build        # Production build (includes type-check)
npm run lint         # ESLint

# Testing
npm run test         # Vitest watch mode
npm run test:run     # Single test run
npm run test:coverage # Coverage report (80% threshold)

# Run single test file
npx vitest run src/services/tasks.test.ts
npx vitest run src/components/forms/TaskForm.test.tsx
```

## Architecture

### Directory Structure

```
flowplan/
├── src/
│   ├── app/                 # Next.js App Router pages
│   ├── components/
│   │   ├── ai/              # AIChat, SourceCitationsPanel (RAG UI)
│   │   ├── forms/           # TaskForm, ProjectForm, PhaseForm, TeamMemberForm
│   │   ├── gantt/           # GanttChart (CPM visualization)
│   │   ├── phases/          # PhaseSection (accordion task groups)
│   │   ├── sync/            # OfflineSyncStatus (Yjs sync indicator)
│   │   ├── tasks/           # TaskCard
│   │   └── ui/              # Primitives: Button, Modal, Input, Select, Badge
│   ├── hooks/               # React Query hooks (use-projects, use-tasks, etc.)
│   ├── services/            # Supabase CRUD + business logic
│   │   ├── scheduling.ts    # CPM algorithm (forward/backward pass, critical path)
│   │   ├── rag.ts           # RAG pipeline (embeddings, retrieval)
│   │   ├── sync.ts          # Yjs CRDT synchronization
│   │   └── offline-storage.ts # IndexedDB persistence
│   ├── lib/
│   │   ├── supabase.ts      # Supabase client config
│   │   └── utils.ts         # cn() helper (clsx + tailwind-merge)
│   └── types/
│       ├── entities.ts      # Domain types (Project, Task, Phase, etc.)
│       └── database.ts      # Supabase generated types
└── supabase/
    └── migrations/          # SQL schema migrations
```

### Data Flow

1. **UI Layer** (`app/page.tsx`) → Uses React Query hooks
2. **Hooks** (`hooks/use-*.ts`) → Wrap service calls with caching/mutations
3. **Services** (`services/*.ts`) → Supabase CRUD operations
4. **Database** → Supabase PostgreSQL with RLS policies

### Key Domain Entities

- **Project**: Container with phases, tasks, calendar exceptions
- **ProjectPhase**: Task groupings (auto-creates "כללי" phase on project creation)
- **Task**: Has CPM fields (es, ef, ls, lf, slack, is_critical)
- **Dependency**: FS/SS/FF/SF relationships between tasks
- **TeamMember**: Users assigned to projects with work hours/days

### CPM Scheduling (`services/scheduling.ts`)

The `SchedulingService` class implements Critical Path Method:
- `forwardPass()`: Calculate Early Start (ES) and Early Finish (EF)
- `backwardPass()`: Calculate Late Start (LS) and Late Finish (LF)
- `calculateCriticalPath()`: Tasks where slack = 0
- Calendar-aware: respects holidays and working days

### Offline Sync (`services/sync.ts`)

Uses Yjs CRDT for offline-first:
- `IndexedDBProvider`: Local persistence
- `WebsocketProvider`: Real-time sync when online
- Conflict-free merging of concurrent edits

## Code Patterns

### Immutability (Critical)

Always create new objects, never mutate:
```typescript
// Correct
const updated = { ...task, status: 'done' }

// Wrong
task.status = 'done'
```

### Date Handling

Task dates can be `Date | string | null`. Services include helpers:
```typescript
private toDate(value: Date | string | null): Date | null {
  if (!value) return null
  return value instanceof Date ? value : new Date(value)
}
```

### Input Validation

Use Zod for user input:
```typescript
const schema = z.object({
  title: z.string().min(1),
  priority: z.enum(['low', 'medium', 'high', 'critical'])
})
```

### Service Result Pattern

Services return `{ data, error }`:
```typescript
interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}
```

## Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Database Notes

### RLS Policies

Development uses permissive "Anyone can..." policies. For production, use SECURITY DEFINER functions to avoid infinite recursion in self-referential policies (like team_members checking team_members).

### Schema Alignment

TypeScript types in `entities.ts` and service inputs must match the actual database schema. Key tables:
- `projects`: name, description, status, start_date, end_date
- `tasks`: project_id, phase_id, title, status, priority, duration, es/ef/ls/lf, slack, is_critical
- `project_phases`: project_id, name, phase_order, status

## Testing Requirements

- **Coverage**: 80% minimum (configured in vitest.config.ts)
- **TDD Workflow**: Write tests first, then implement
- **Test Location**: Co-located with source (e.g., `tasks.ts` → `tasks.test.ts`)

## UI Notes

- **Language**: Hebrew (RTL)
- **Theme**: Dark mode enforced via `className="dark"` on `<html>`
- **Font**: Assistant (RTL-optimized)
