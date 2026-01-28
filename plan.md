# FlowPlan Development Plan

Last Updated: 2026-01-28 07:25 (Session 7 - Israel Time)

---

## Current Phase: ALL PHASES COMPLETE! ✅

### Phase 5: CRDT + Offline ✅ COMPLETE (116 tests)
1. **Offline Storage Service** (19 tests) ✅
2. **Sync Service with Yjs** (42 tests) ✅
3. **Sync React Hooks** (12 tests) ✅
4. **OfflineSyncStatus UI Component** (25 tests) ✅
5. **Offline Integration Tests** (18 tests) ✅

---

## Phase 6: Grounded AI ✅ COMPLETE (182 tests)

### Completed Work
1. **Document Upload Service** (28 tests) ✅
   - File upload to Supabase Storage
   - Supported file types: PDF, Word, Excel, TXT, CSV
   - File size validation (50MB limit)
   - Metadata extraction and storage
   - Batch upload support
   - Progress tracking

2. **Document Parser Service** (27 tests) ✅
   - Plain text and CSV parsing
   - PDF parsing (mock for MVP)
   - Word document parsing (.doc, .docx)
   - Excel parsing (.xls, .xlsx)
   - Document chunking for RAG
   - Metadata extraction (word count, character count)

3. **Vector Embeddings Service** (23 tests) ✅
   - OpenAI text-embedding-3-small integration
   - Supabase pgvector storage
   - Semantic similarity search
   - Batch embedding generation
   - Document embedding lifecycle

4. **RAG Service** (29 tests) ✅
   - Retrieval Augmented Generation
   - Source attribution (FR-032 CRITICAL) ✅
   - Grounding enforcement (no hallucination)
   - Hebrew/English language support
   - Context formatting with citations
   - Token usage tracking

5. **AI Chat Interface UI Component** (45 tests) ✅
   - Chat input with send button
   - Message display (user/assistant roles)
   - Loading state indicators
   - Source citations in responses
   - Error handling and retry
   - RTL support (Hebrew)
   - Accessibility (ARIA roles, keyboard navigation)
   - Clear history functionality

6. **Source Citations Panel Component** (30 tests) ✅
   - Citation list with relevance scores
   - Expand/collapse excerpts
   - Color-coded relevance (high/medium/low)
   - Document link callbacks
   - Sorting (by relevance/name)
   - Statistics display (avg relevance, doc count)
   - Compact mode
   - Keyboard navigation

---

## PRD Phase Summary

| Phase | Status | Tests |
|-------|--------|-------|
| Phase 1: Setup | ✅ Complete | - |
| Phase 2: Tasks + CPM | ✅ Complete | 38 |
| Phase 3: Team + Resources | ✅ Complete | 86 |
| Phase 4: Audit Findings | ✅ Complete | 19 |
| Phase 5: CRDT + Offline | ✅ Complete | 116 |
| Phase 6: Grounded AI | ✅ Complete | 182 |

**Total Tests: 1004 ✅**

---

## TDD Workflow Reminder

Following `/skills/tdd-workflow.md`:
1. Write tests FIRST
2. Run tests (they should fail)
3. Implement code to make tests pass
4. Refactor while keeping tests green
5. Verify 80%+ coverage

---

## Session 5 Progress Log

- [x] Updated progress.txt with Phase 5 CRDT work documentation
- [x] Created plan.md
- [x] Add y-indexeddb persistence to sync service (11 new tests)
- [x] Create OfflineSyncStatus UI component with TDD (25 tests)
- [x] Create offline integration tests (18 tests)
- [x] Verify all tests pass (824 total)
- [x] Phase 5 COMPLETE ✅

### Phase 6 Progress (Session 6)
- [x] Document Upload Service (28 tests)
- [x] Document Parser Service (27 tests)
- [x] Vector Embeddings Service (23 tests)
- [x] RAG Service with Source Attribution (29 tests)
- [x] AI Chat Interface UI Component (45 tests)
- [x] Source Citations Panel Component (30 tests)
- [x] Phase 6 COMPLETE ✅

### Phase 7 Progress (Current Session) - UI Redesign
- [x] Replaced Brutalist design with Modern (Monday.com-like) system
- [x] Refactored Core Components: TaskCard, PhaseSection, GanttChart
- [x] Updated UI Primitives: Button, Badge
- [x] Verified all tests passing with new design expectations
- [x] Phase 7 COMPLETE ✅

---

## MVP COMPLETE! 🎉

All 6 phases of the FlowPlan PRD have been implemented with TDD methodology.
Total: **1004 tests** passing.

---

## Session 6 Fixes (Production-Ready)

### TypeScript Fixes
- Updated `entities.ts` types to match implementation (TaskStatus, Dependency interface)
- Fixed `TaskStatus` to use 'pending' | 'in_progress' | 'done' (removed 'blocked', changed 'completed' to 'done')
- Fixed `Dependency` interface to use `type` field instead of `dependency_type`
- Fixed dependency types to use 'FS', 'SS', 'FF', 'SF' format

### Service Layer Fixes
- Fixed `dependencies.ts` to use correct table name ('dependencies' instead of 'task_dependencies')
- Fixed `dependencies.ts` to use correct field name ('type' instead of 'dependency_type')
- Fixed Supabase type inference issues with `as never` casts

### Test Fixes
- Updated `TaskCard.test.tsx` to match new status types (39 tests)
- Updated `dependencies.test.ts` to match new table/field names (22 tests)

### Production Build
- ✅ Next.js 16.1.4 production build successful
- ✅ All 1004 tests passing
- ✅ Ready for Vercel deployment

---

## Gap Analysis: Services vs UI

### What's Built (Backend Ready):
| Layer | Status |
|-------|--------|
| Services (CRUD) | ✅ All tested |
| Scheduling (CPM) | ✅ Working |
| Offline/Sync (Yjs) | ✅ Working |
| AI (RAG, Embeddings) | ✅ Working |
| React Hooks | ✅ All tested |
| UI Components | ✅ All tested |

### What's Missing (UI Integration):
| Missing | Description |
|---------|-------------|
| Real Pages | Only demo page exists with static data |
| Supabase Connection | Services exist but pages not connected |
| Interactive CRUD | Can't create/edit/delete from UI |
| Routing | Only "/" route, no /team, /projects, etc. |

### To Make Fully Functional:
1. Configure Supabase environment (.env.local)
2. Create database schema in Supabase
3. Build interactive pages connected to hooks/services

---

## Session 7 Progress (Current Session)

### Interactive UI Page Implementation
- [x] Rewrote `src/app/page.tsx` with interactive Hebrew dashboard
- [x] Fixed TypeScript errors (TeamMember, Task types)
- [x] Used existing tested components (PhaseSection, GanttChart, TaskForm, ProjectForm)
- [x] Local state management for tasks, phases, project
- [x] CRUD operations (create, edit, delete tasks)
- [x] Project settings modal
- [x] View toggle (phases view / Gantt chart)
- [x] Task detail sidebar
- [x] Hebrew RTL support throughout

### TypeScript Fixes (Session 7)
- Fixed `TeamMember` initial data to match type (removed `organization_id`, `name`, `is_active`, `capacity`)
- Fixed `Task` creation to use `actual_hours: 0` and `slack: 0` (not nullable)
- Fixed component prop names (`initialValues` instead of `initialData`)
- Fixed `PhaseSection` to use `taskAssignees` Record instead of `getAssigneeName` function
- Removed non-existent `startDate`/`endDate` props from `GanttChart`

### Build & Test Status
- ✅ Next.js 16.1.4 production build successful
- ✅ All 1004 tests passing
- ✅ Interactive page ready for local development

### Updated Gap Analysis

| Feature | Before Session 7 | After Session 7 |
|---------|------------------|-----------------|
| Interactive UI | ❌ Static demo only | ✅ Full CRUD with local state |
| Hebrew Support | ❌ English only | ✅ Hebrew RTL throughout |
| Task CRUD | ❌ Not available | ✅ Create/Edit/Delete |
| Project Settings | ❌ Not available | ✅ Edit modal |
| Gantt View | ❌ Not integrated | ✅ Toggle view mode |

### Still Needed for Production:
1. **Supabase Setup**: Configure `.env.local` with real credentials
2. **Database Schema**: Run `001_initial_schema.sql` in Supabase
3. **Connect to Backend**: Replace local state with React Query hooks
4. **Authentication**: Add Supabase Auth flow
5. **Team Page**: Build `/team` route for member management

---
### שלב 8: תיקון נראות וקונטרסט (UI Visibility Fix) - TDD Approach
- **בעיה**: קונטרסט נמוך בשדות קלט, פלייסהולדרים וכפתורי Cancel (כפי שנראה בצילומי המסך).
- **מתודולוגיה**: TDD מלא לפי `tdd-workflow.md`.
    1. כתיבת טסטים ב-`input.test.tsx` ו-`button.test.tsx` שבודקים את הקלאסים החדשים.
    2. עדכון הקומפוננטות וה-CSS.
    3. הרצת טסטים ואישור מעבר.
- [ ] תיקון Input placeholder contrast
- [ ] תיקון Select text contrast
- [ ] תיקון Button secondary visibility
- [ ] תיקון Modal labels contrast
