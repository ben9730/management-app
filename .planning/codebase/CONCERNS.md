# Codebase Concerns

**Analysis Date:** 2026-02-12

## Tech Debt

### Large Page Component (Critical Complexity)

**Issue:** Main dashboard page `src/app/page.tsx` is 1,238 lines with extensive inline state management and event handling logic.

**Files:** `src/app/page.tsx`

**Impact:**
- Difficult to test individual features
- High cognitive load when modifying existing features
- Risk of unintended side effects when adding new functionality
- Makes code review challenging

**Fix approach:**
- Extract state management into custom hooks (useProjectDashboard, useTaskManagement)
- Separate form handling logic into dedicated handlers module
- Split into feature-specific sub-components (TaskManagement, ProjectManagement, CalendarManagement)
- Consider moving to a state management solution (Zustand/Jotai) for complex UI state

### Large Component Files

**Issue:** Multiple components exceed 600 lines, approaching architectural limits:
- `src/components/gantt/GanttChart.tsx` - 612 lines
- `src/components/forms/TaskForm.tsx` - 615 lines
- `src/services/scheduling.ts` - 681 lines

**Files:**
- `src/components/gantt/GanttChart.tsx`
- `src/components/forms/TaskForm.tsx`
- `src/services/scheduling.ts`

**Impact:**
- Difficult to isolate concerns
- Reduced reusability
- Higher maintenance burden

**Fix approach:**
- Break TaskForm into smaller sub-forms (BasicDetails, AssigneeSection, DatesAndDuration, CalendarWarnings)
- Extract Gantt calculation logic into separate service layer
- Split SchedulingService into SchedulingEngine (calculations) and WorkingDayCalculator (utility)

### Type Casting with `any` in UI Components

**Issue:** `src/components/ui/input.tsx` uses `as any` type assertion on line 107 to work around TypeScript limitations with conditional element types.

**Files:** `src/components/ui/input.tsx:107`

**Impact:**
- Loss of type safety for props spread
- Could allow incompatible props to reach textarea/input
- Makes refactoring riskier

**Fix approach:**
- Create separate Input and Textarea component types with proper typing
- Use discriminated unions instead of conditional rendering
- Or use React.forwardRef with proper overloads for each element type

---

## Known Bugs

### Sync Service UndoManager Not Fully Tracked

**Symptoms:** The UndoManager in sync.ts is initialized but may not track all changes across different users or connection states.

**Files:** `src/services/sync.ts:121`

**Trigger:** Undo/redo operations during offline mode or with concurrent edits from multiple users

**Workaround:** Currently undo/redo is minimal risk since primary operations use React Query mutations; Yjs is for metadata only

**Fix approach:**
- Configure UndoManager to track all relevant document changes
- Add tests for undo/redo with offline scenarios
- Document limitations clearly in API comments

### Console.log Statements in Auth Pages

**Symptoms:** Debug logging left in production code for authentication flows.

**Files:**
- `src/app/(auth)/login/page.tsx:20, 22`
- `src/app/(auth)/register/page.tsx:20, 22`

**Trigger:** Every page load of login/register pages

**Workaround:** None - logs are benign but expose implementation details

**Fix approach:** Remove all console.log statements or gate behind process.env.DEBUG_AUTH

---

## Security Considerations

### AI Chat Feature Flag Disabled Due to Rate Limits

**Risk:** AI chat disabled for free tier Gemini, but code path still exists. Feature flag at `src/app/page.tsx:35` could be accidentally enabled.

**Files:**
- `src/app/page.tsx:34-36`
- `src/app/api/ai/chat/route.ts`

**Current mitigation:**
- Feature flag defaults to false
- Retry logic with exponential backoff (max 2 minutes)
- Response caching to reduce quota consumption
- Token limits (MAX_OUTPUT_TOKENS: 256)

**Recommendations:**
- Add explicit environment variable to enable AI features
- Document rate limit behavior in README
- Consider switching to paid tier or alternative provider (Groq, Anthropic) before enabling in production

### Incomplete RAG Implementation

**Risk:** RAG (Retrieval-Augmented Generation) functions exist but are stubbed out - embeddings search is disabled.

**Files:** `src/services/gemini.ts:119, 146`

**Current mitigation:**
- Marked with TODO comments
- Feature is disabled (not wired to UI)

**Recommendations:**
- Implement embeddings service when ready (requires database schema, indexing)
- Add comprehensive tests for RAG pipeline before enabling
- Implement rate limiting per project/user for embedding operations

### Potential XSS in Error Messages

**Risk:** Error messages from Gemini API are displayed directly to users without HTML escaping in some cases.

**Files:** `src/app/page.tsx:54, 77, 84, 96` (error messages in Hebrew)

**Current mitigation:** Messages are shown via text nodes, not innerHTML, but worth auditing all error display paths

**Recommendations:**
- Audit all external API error message display
- Use a sanitization library if displaying any HTML-based content
- Validate error message format before display

---

## Performance Bottlenecks

### In-Memory Response Cache Can Grow Unbounded

**Problem:** The AI chat response cache in `src/app/api/ai/chat/route.ts` is limited to 100 entries but stored in server memory. With multiple server instances or restarts, cache effectiveness is reduced.

**Files:** `src/app/api/ai/chat/route.ts:36-73`

**Cause:** Simple Map-based cache without persistent storage; scaling horizontally will duplicate cache per instance

**Improvement path:**
- Move cache to Redis for multi-instance deployments
- Add cache invalidation strategy based on user feedback (incorrect responses)
- Monitor cache hit rate and adjust TTL (currently 5 minutes)

### Gantt Chart Date Header Generation Every Render

**Problem:** Date header and layout calculations in GanttChart regenerate on every render without memoization of intermediate values.

**Files:** `src/components/gantt/GanttChart.tsx:41-93` (getDateRange, generateDateHeaders)

**Cause:** Functions called directly in render without useMemo; O(n) loop for date generation

**Improvement path:**
- Memoize getDateRange and generateDateHeaders with useMemo
- Cache TaskPosition calculations separately
- Consider virtual scrolling for very large task lists (100+)
- Add React.memo to child components if not already present

### Task List Filtering Without Index

**Problem:** getTasksForPhase filters entire task array for each phase without caching.

**Files:** `src/app/page.tsx:275-277`

**Cause:** useCallback prevents re-creation but still filters on every access

**Improvement path:**
- Pre-compute phase task maps using useMemo
- Index tasks by phase_id at load time
- Consider pagination if projects grow beyond 500 tasks

---

## Fragile Areas

### Offline Sync Conflict Resolution Not Fully Tested

**Component:** Offline storage and sync service

**Files:**
- `src/services/offline-storage.ts`
- `src/services/sync.ts`
- `src/hooks/use-sync.tsx`

**Why fragile:**
- IndexedDB operations are browser-dependent
- Yjs conflict resolution is automatic but untested for custom domain scenarios
- No test coverage for network reconnection edge cases
- Persistence provider initialization can fail silently

**Safe modification:**
- Always wrap IndexedDB operations in try-catch
- Test changes against both online and offline scenarios
- Verify Yjs state matches Supabase state after reconnection

**Test coverage gaps:**
- E2E tests for offline → online transition with concurrent edits
- IndexedDB storage quota exceeded scenarios
- Browser tab sync (multiple tabs editing same document)

### Task Duration Calculation with Time Off

**Component:** TaskForm vacation conflict checking and scheduling service

**Files:**
- `src/components/forms/TaskForm.tsx:100-250` (vacation logic)
- `src/services/team-members.ts` (checkMemberAvailability)
- `src/services/scheduling.ts` (addWorkingDays with holidays)

**Why fragile:**
- Multiple date handling approaches (Date, string, null)
- Calendar exception logic spread across components and services
- Vacation conflicts checked but not enforced at database level
- Different working day definitions (project-level vs team-member level)

**Safe modification:**
- Always validate dates match expected format (ISO 8601)
- Test with Hebrew locale (RTL) date calculations
- Verify calendar exceptions in both forward and backward pass
- Check that duration recalculation doesn't break existing CPM values

**Test coverage gaps:**
- Vacation conflict warnings with multi-day events
- Duration changes affecting dependent tasks' ES/LS values
- Calendar exception creation/deletion affecting existing task dates

### CPM Scheduling Algorithm Edge Cases

**Component:** Critical Path Method implementation

**Files:** `src/services/scheduling.ts`

**Why fragile:**
- Complex date arithmetic (addWorkingDays, subtractWorkingDays)
- Forward/backward pass ordering assumptions
- Dependency chain cycles not explicitly handled
- Resource constraints not fully integrated with scheduling

**Safe modification:**
- Never modify addWorkingDays/subtractWorkingDays logic without extensive testing
- Test with 0-day duration tasks
- Test with circular dependencies (should be caught at creation, not here)
- Verify calendar holiday calculations across year boundaries

**Test coverage gaps:**
- Circular dependency detection
- Very long duration tasks (1000+ days)
- Tasks with null dates in dependency chains
- Leap year calendar calculations

---

## Scaling Limits

### Offline Queue Management

**Current capacity:** In-memory queue holds all pending operations until sync

**Limit:** Breaks when projects have 1000+ concurrent offline operations (browser memory limits)

**Scaling path:**
- Implement queue batching (group operations by entity type)
- Add queue compression (merge update operations on same entity)
- Implement selective sync (user can choose which changes to push)
- Monitor queue size and warn at 500+ pending operations

### Supabase RLS Policies

**Current:** Row-level security checks ensureProjectMember for each operation

**Limit:** Linear check against project_members table; slow with 100+ team members per project

**Scaling path:**
- Add project_id indexed lookups in RLS
- Cache team member permissions at application level
- Implement role-based access (admin, editor, viewer) to reduce granularity
- Consider materialized view for permission checks

### React Query Caching

**Current:** Each project loads all tasks, phases, team members separately

**Limit:** Large projects (1000+ tasks) cause memory bloat and slow sorting/filtering in UI

**Scaling path:**
- Implement pagination in hooks (useProjects, useTasks)
- Add infinite scroll for task lists
- Implement task filtering at Supabase level (push-down filtering)
- Use normalized caching strategy for shared entities (team members)

---

## Dependencies at Risk

### Yjs Websocket Provider Unstable Network Handling

**Risk:** WebsocketProvider may silently disconnect in poor network conditions without proper reconnection

**Impact:** Offline sync appears to work but server changes are lost

**Migration plan:**
- Test thoroughly in network throttled scenarios
- Consider fallback to polling if websocket reliability issues emerge
- Add explicit network status monitoring separate from Yjs
- Monitor production for silent disconnection patterns

### Gemini API (Free Tier Dependency)

**Risk:** Free tier rate limits make AI features unreliable; no SLA or support

**Impact:** Feature disabled until paid tier; incomplete RAG implementation

**Migration plan:**
- Switch to Groq API (faster, free tier with higher limits)
- Or upgrade to Gemini paid tier
- Or use Anthropic Claude API (via existing @anthropic-ai/sdk dependency)

### IndexedDB Browser Compatibility

**Risk:** IndexedDB quota varies significantly across browsers (5MB-50MB); no graceful degradation if exceeded

**Impact:** Offline storage silently fails; sync queue disappears

**Migration plan:**
- Implement quota monitoring and user warnings
- Add queue compression to reduce storage footprint
- Fall back to localStorage for critical metadata only
- Add user-initiated queue cleanup option

---

## Missing Critical Features

### Dependency Constraint Enforcement

**Problem:** Task dependencies are stored but not validated. Users can create circular dependencies or orphan chains.

**Files:**
- `src/services/dependencies.ts`
- No validation in task creation forms

**Blocks:** Advanced scheduling features, what-if analysis

**Fix approach:**
- Add dependency cycle detection at creation time
- Validate dependency types (FS, SS, FF, SF) match scheduling rules
- Prevent deletion of tasks with dependent children

### Audit Trail / Change History

**Problem:** No record of who changed what and when. Only current state is tracked.

**Files:** Database schema missing audit log table

**Blocks:** Compliance requirements, debugging issues, undo for accidental changes

**Fix approach:**
- Create audit_logs table with user_id, action, entity, timestamp
- Trigger-based logging in Supabase (SECURITY DEFINER functions)
- API endpoint to query change history
- UI component to display change timeline

### Time Tracking / Actual Hours

**Problem:** PRD mentions estimated_hours but no actual_hours_spent field exists.

**Files:** Database schema in Supabase; missing field in `src/types/entities.ts`

**Blocks:** Project actuals tracking, resource utilization reports

**Fix approach:**
- Add actual_hours_spent and hours_remaining columns to tasks table
- Create time_log entries table for detailed hour entries
- Update TaskForm to accept time logs
- Add burndown chart to reporting

### Role-Based Access Control (RBAC)

**Problem:** All authenticated users have same permissions. No admin/editor/viewer roles.

**Files:** RLS policies in Supabase; ensureProjectMember only checks membership

**Blocks:** Enterprise deployments, security model improvements

**Fix approach:**
- Add role column to project_members (admin, editor, viewer, guest)
- Update RLS to check role for sensitive operations
- Implement role selection in team management UI

---

## Test Coverage Gaps

### AIChat Component and RAG Logic

**What's not tested:**
- Complete RAG pipeline (embeddings → search → context → generation)
- Rate limit retry logic in route.ts
- Cache hit/miss scenarios

**Files:**
- `src/components/ai/AIChat.tsx`
- `src/services/gemini.ts`
- `src/app/api/ai/chat/route.ts`

**Risk:** AI features will break silently; rate limits may cause cascading failures

**Priority:** High (feature disabled but blocks future enablement)

### Offline Sync Edge Cases

**What's not tested:**
- Multiple browser tabs editing same document
- Network drop during transaction
- IndexedDB quota exceeded
- Persistence provider initialization failure
- Concurrent edits from multiple users with conflict resolution

**Files:**
- `src/services/sync.ts`
- `src/services/offline-storage.ts`

**Risk:** Data loss or corruption during offline use; silent failures

**Priority:** High (core feature for MVP)

### CPM Scheduling Complex Scenarios

**What's not tested:**
- Circular dependencies (should reject at creation, not here)
- Tasks with null dates in chains
- Very long duration calculations (leap years, DST)
- Resource availability with part-time workers (work_hours_per_day)
- Overlapping time-off periods

**Files:** `src/services/scheduling.ts`

**Risk:** Incorrect schedule calculations affecting project timelines

**Priority:** High (business logic)

### Form Validation Edge Cases

**What's not tested:**
- Special characters in Hebrew text fields
- Very long descriptions (10,000+ chars)
- Concurrent form submissions
- Validation with future dates beyond 2100
- Duration validation with calendar exceptions

**Files:**
- `src/components/forms/TaskForm.tsx`
- `src/components/forms/ProjectForm.tsx`
- `src/components/forms/TeamMemberForm.tsx`

**Risk:** Invalid data persisted to database; UX confusion

**Priority:** Medium (validation exists but edge cases untested)

### RLS Policy Security

**What's not tested:**
- User attempting to access other org's projects
- Deleted project member trying to access project
- Admin bypass attempts
- Session expiration during mutation

**Files:** Supabase RLS policies (not in codebase)

**Risk:** Security bypass; unauthorized data access

**Priority:** High (security-critical)

---

## Consumer Debt (Design Patterns)

### Deprecation Warning in Type Definitions

**Issue:** TaskFormData type includes deprecated assignee_id with comment, but code still uses it as fallback.

**Files:** `src/components/forms/TaskForm.tsx:25-28`

**Impact:**
- Confusion about which field to use (assignee_id vs assignee_ids)
- Migration path unclear
- Database might still have legacy assignee_id values

**Fix approach:**
- Complete migration to assignee_ids array
- Add database migration to move assignee_id → task_assignments table
- Remove fallback logic in component
- Update all services to use task_assignments exclusively

### Inconsistent Error Handling Patterns

**Issue:** Some services return `{ data, error }` tuples, others throw exceptions.

**Files:**
- `src/services/tasks.ts` - returns { data, error }
- `src/services/gemini.ts` - throws exceptions
- `src/services/team-members.ts` - returns { data, error }

**Impact:** Inconsistent error handling in components; some errors caught, some propagate

**Fix approach:**
- Standardize all services on { data, error } return pattern
- Add try-catch boundaries only at component/route level
- Document error handling contract in service interfaces

### State Synchronization Issues

**Issue:** selectedTask state in page.tsx is synced with React Query but can become stale.

**Files:** `src/app/page.tsx:249-258`

**Impact:** Sidebar shows outdated task info after mutations; race conditions possible

**Fix approach:**
- Use React Query's useQueryClient to update cache directly
- Remove manual state sync
- Use invalidateQueries instead of useState synchronization

---

*Concerns audit: 2026-02-12*
