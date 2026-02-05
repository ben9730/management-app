# FlowPlan - Gap Analysis & Implementation Plan

## Executive Summary

After comprehensive analysis of the project against the PRD requirements:
- **Implemented**: 85% of features
- **Missing Critical**: `/projects` page (route exists in Navbar but no page)
- **Needs Integration**: AI/RAG features (services ready, UI not connected)
- **Needs Testing**: Offline sync E2E tests

---

## 1. Gap Analysis: What's Missing

### Critical Missing Features

| Feature | PRD Status | Implementation | Priority |
|---------|------------|----------------|----------|
| **Projects List Page** (`/projects`) | Required | NOT EXISTS | P0 |
| **Multi-Project View** | Required | Dashboard shows only 1 project | P0 |
| **AI Chat Panel in Dashboard** | DONE in PRD | Component exists, not integrated | P1 |
| **Document Upload UI** | DONE in PRD | Service exists, no UI | P1 |

### Partial Implementation

| Feature | Status | Notes |
|---------|--------|-------|
| **Offline Sync** | 80% | Services complete (sync.ts, offline-storage.ts), needs E2E testing |
| **RAG/AI** | 70% | Services complete (rag.ts, embeddings.ts), needs dashboard integration |
| **Document Parser** | Partial | PDF/DOCX use mock implementations |

### Fully Implemented (100%)

- Authentication (Login/Register/Logout)
- Tasks CRUD + CPM Scheduling (596 lines in scheduling.ts)
- Team Management (`/team` route)
- Findings Center (`/findings` - hidden via feature flag)
- Gantt Charts
- Modern UI (Dark mode, RTL, Hebrew)
- Database schema (9 tables, 6 migrations)

---

## 2. Implementation Plan

### Phase 1: Projects Page (`/projects`) - HIGH PRIORITY

**Goal**: Create dedicated projects management page

**Files to Create**:
```
flowplan/src/app/projects/page.tsx         # Main projects page
flowplan/src/components/projects/ProjectsList.tsx
flowplan/src/components/projects/ProjectCard.tsx
flowplan/src/components/projects/index.ts
```

**Components Needed**:
1. **ProjectCard** - Card displaying project summary (name, status, progress, dates)
2. **ProjectsList** - Grid/list of all user projects with filters
3. **Projects Page** - Integration with create/edit modals

**Existing Code to Reuse**:
- `flowplan/src/services/projects.ts` - CRUD operations
- `flowplan/src/hooks/use-projects.ts` - React Query hooks
- `flowplan/src/components/forms/ProjectForm.tsx` - Create/edit form

**TDD Approach**:
1. Write tests first for ProjectCard, ProjectsList
2. Implement components
3. Verify 80%+ coverage

### Phase 2: AI Integration - MEDIUM PRIORITY

**Goal**: Integrate AI chat into main dashboard

**Files to Modify**:
- `flowplan/src/app/page.tsx` - Add AI chat panel

**Existing Code to Use**:
- `flowplan/src/components/ai/AIChat.tsx`
- `flowplan/src/components/ai/SourceCitationsPanel.tsx`
- `flowplan/src/services/rag.ts`

**Optional - Document Upload UI**:
- Create `DocumentUpload.tsx` component
- Integrate with `document-upload.ts` service

### Phase 3: E2E Testing - MEDIUM PRIORITY

**Goal**: Verify offline sync and critical user flows

**Test Scenarios**:
1. Login -> Dashboard -> Create Task -> Offline -> Back Online -> Sync
2. Multi-user editing (CRDT conflict resolution)
3. Full project lifecycle

**Tools**: Playwright MCP (already configured)

---

## 3. Available Tools & Agents for Development

### Agents (Immediate Use)

| Agent | When to Use | Command |
|-------|-------------|---------|
| **tdd-guide** | New features (Projects page) | Task tool with `tdd-guide` |
| **planner** | Complex implementation planning | Task tool with `planner` |
| **code-reviewer** | After writing code | Task tool with `code-reviewer` |
| **e2e-runner** | E2E test generation | Task tool with `e2e-runner` |
| **build-error-resolver** | Build failures | Task tool with `build-error-resolver` |

### Skills/Commands Available

| Command | Purpose |
|---------|---------|
| `/tdd` | Enforce test-first workflow |
| `/code-review` | Review code quality |
| `/test-coverage` | Check coverage |
| `/e2e` | Run E2E tests |
| `/build-fix` | Fix build errors |
| `/verify` | Verify implementation |
| `/plan` | Create implementation plan |

### External MCP Tools

| Tool | Status | Use Case |
|------|--------|----------|
| **Supabase MCP** | Connected | DB queries, migrations |
| **Playwright MCP** | Connected | Browser automation |

---

## 4. Verification Plan

### After Projects Page Implementation

1. **Build Check**: `npm run build`
2. **Tests**: `npm run test:coverage` (80% threshold)
3. **Manual Testing via Playwright**:
   - Navigate to `/projects`
   - Create new project
   - View project list
   - Edit project
   - Delete project
4. **Verify Navigation**: Navbar link works

### End of Session

1. Stop dev server
2. Close browser sessions
3. Run final build check
4. Update TRACKING.md

---

## Implementation Order (User Confirmed)

**User Choices**:
- Projects UI: Dedicated List Page (grid/list view with full CRUD)
- Priority: Projects Page First

**Execution Order**:
1. Update Documentation (TRACKING.md, CLAUDE.md) - Add gap analysis, server shutdown checklist
2. Projects Page (TDD):
   - Write tests for `ProjectCard`
   - Implement `ProjectCard` component
   - Write tests for `ProjectsList`
   - Implement `ProjectsList` component
   - Create `/projects/page.tsx` integrating all components
   - Test with Playwright
3. AI Dashboard Integration (after Projects page complete)
4. E2E Tests for critical flows

---

## Files to be Modified

| File | Action |
|------|--------|
| `TRACKING.md` | Add gap analysis section, update status |
| `CLAUDE.md` | Add end-of-session checklist |
| `flowplan/src/app/projects/page.tsx` | CREATE |
| `flowplan/src/components/projects/ProjectCard.tsx` | CREATE |
| `flowplan/src/components/projects/ProjectsList.tsx` | CREATE |
| `flowplan/src/components/projects/ProjectCard.test.tsx` | CREATE |
| `flowplan/src/components/projects/ProjectsList.test.tsx` | CREATE |
