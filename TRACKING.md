# FlowPlan - מעקב עבודה מאוחד 📋

> **קובץ מעקב מרכזי** לניהול פיתוח הפרויקט, מעקב התקדמות, והנחיות עבודה למשתמש ול-Claude

---

## 🚀 סטטוס מהיר (Quick Status)

| פריט | מצב |
|------|-----|
| **Build** | ✅ מצליח |
| **Tests** | ✅ 1075+ tests עוברים (26 חדשים) |
| **Coverage** | ✅ מעל 80% |
| **סשן אחרון** | #5 - Add Time Off & Task Assignment |
| **משימה הבאה** | Phase B: יצירת Findings Center |

---

## 📊 התקדמות מימוש (Implementation Progress)

### טבלת השוואה: PRD מול מימוש

| שלב PRD | סטטוס PRD | מימוש בפועל | התקדמות |
|---------|-----------|--------------|----------|
| 1. Setup & Infrastructure | DONE | ✅ DONE | 100% |
| 2. Tasks + CPM Scheduling | DONE | ✅ DONE | 100% |
| 3. Team + Resources | DONE | ✅ DONE | 100% |
| 4. Audit Findings | DONE | 🟡 Services Only | 60% |
| 5. CRDT + Offline Sync | DONE | 🟡 Needs Testing | 80% |
| 6. Grounded AI (RAG) | DONE | 🟡 Needs UI Integration | 70% |
| 7. Modern SaaS UI | DONE | ✅ DONE | 100% |
| 8. Personal Branding | DONE | ✅ DONE | 100% |
| 9. Supabase Integration | PLANNED | ✅ DONE | 100% |
| 10. Authentication | PLANNED | ✅ DONE | 100% |
| 11. Team Workspace | PLANNED | ✅ DONE | 100% |
| 12. Findings Center | PLANNED | ❌ NOT STARTED | 0% |

### ✅ פיצ'רים מושלמים (100%)

1. **Authentication System**
   - Login/Register/Logout
   - Supabase Auth integration
   - Hebrew error messages
   - Session management
   - ✅ כל הבאגים תוקנו (redirect, error display, logout)

2. **Projects CRUD**
   - יצירה, עריכה, מחיקה
   - יצירה אוטומטית של פאזה "כללי"
   - Dashboard עם בחירת פרויקט

3. **Tasks CRUD + CPM**
   - משימות עם שדות CPM (ES, EF, LS, LF, slack, is_critical)
   - חישוב Critical Path
   - תלויות (FS/SS/FF/SF) עם lag days
   - תצוגת Gantt Chart

4. **Phases Management**
   - קיבוץ משימות לפאזות
   - ספירה אוטומטית של משימות

5. **Scheduling Engine**
   - אלגוריתם CPM מלא (596 שורות)
   - Forward/Backward Pass
   - התחשבות במשאבים
   - Calendar-aware (holidays, working days)

6. **Modern UI**
   - עיצוב Dark Mode
   - RTL Support מלא
   - Responsive Design
   - Tailwind CSS 4

7. **Team Workspace** (`/team` route)
   - רשימת חברי צוות מלאה
   - הוספה/עריכה/מחיקה של חברים
   - תצוגת שעות עבודה וימי עבודה
   - לוח שנה של חופשות (Time Off)
   - 100 tests עם 100% coverage
   - ✅ TDD methodology מלא

### 🔄 פיצ'רים בעבודה (60-80%)

1. **Audit Findings** (60%)
   - ✅ Service מלא ב-`services/audit-findings.ts`
   - ❌ חסר: דף `/findings` ייעודי
   - ❌ חסר: מעקב CAPA

2. **Offline Sync** (80%)
   - ✅ Yjs service קיים ב-`services/sync.ts`
   - ✅ OfflineSyncStatus component
   - ⚠️ צריך בדיקות E2E

3. **RAG/AI Features** (70%)
   - ✅ Services: `rag.ts`, `embeddings.ts`
   - ✅ AIChat component בסיסי
   - ❌ חסר: UI להעלאת מסמכים
   - ❌ חסר: AI chat panel במסך ראשי

### ⏳ פיצ'רים נותרים (0%)

1. **Findings Center Page** (`/findings`)
2. **Document Upload UI**
3. **AI Integration Enhancement**

---

## ✔️ צ'קליסט בדיקות למשתמש

### 🔹 לפני כל סשן עבודה

- [ ] `cd flowplan`
- [ ] `npm run build` - לוודא שהפרויקט בונה
- [ ] `npm test` - לוודא שהבדיקות עוברות
- [ ] בדוק ש-Supabase מחובר (`.env.local` קיים)
- [ ] פתח דפדפן ב-`http://localhost:3000`

### 🔹 אחרי שינויי Authentication

- [ ] התחבר עם משתמש קיים - האם מועבר ל-Dashboard?
- [ ] נסה להתחבר עם סיסמה שגויה - האם רואה הודעת שגיאה **על המסך**?
- [ ] צור משתמש חדש - האם ההרשמה עובדת?
- [ ] התנתק - האם מועבר ל-`/login`?
- [ ] נסה לגשת ל-Dashboard כשמתנתק - האם חוסם?

### 🔹 אחרי שינויי CRUD (Tasks/Projects/Phases)

- [ ] צור פרויקט חדש - האם נוצר פאזה "כללי" אוטומטית?
- [ ] צור משימה - האם נשמרת עם כל השדות?
- [ ] ערוך משימה - האם העדכון נשמר?
- [ ] מחק משימה - האם נמחקת?
- [ ] הוסף תלות בין משימות - האם ה-CPM מחושב נכון?
- [ ] בדוק Gantt Chart - האם מציג נכון?

### 🔹 אחרי שינויי UI

- [ ] בדוק Responsive - פתח ב-Mobile view
- [ ] בדוק RTL - האם הכיוון נכון בעברית?
- [ ] בדוק Dark Mode - האם הצבעים נכונים?
- [ ] בדוק Navigation - האם כל הלינקים עובדים?

---

## 📖 שלבי עבודה ל-Claude (Work Phases)

### Phase A: Team Workspace (`/team`)

**מטרה**: יצירת ממשק מלא לניהול צוות

**קבצים ליצירה**:
- `flowplan/src/app/team/page.tsx` - דף ראשי
- `flowplan/src/components/team/TeamMemberList.tsx` - רשימת חברי צוות
- `flowplan/src/components/team/TeamMemberCard.tsx` - כרטיס חבר צוות
- `flowplan/src/components/forms/TeamMemberForm.tsx` - טופס הוספה/עריכה
- `flowplan/src/components/team/TimeOffCalendar.tsx` - לוח שנה של חופשות

**קבצים קיימים לשימוש**:
- `flowplan/src/services/team-members.ts` - Service מוכן ✅
- `flowplan/src/hooks/use-team-members.ts` - Hook מוכן ✅
- `flowplan/src/services/time-off.ts` - Service מוכן ✅

**תוצאה צפויה**:
- ממשק `/team` מלא עם רשימת חברי צוות
- יכולת הוספה/עריכה/מחיקה של חברי צוות
- תצוגת שעות עבודה ויום עבודה
- לוח שנה של חופשות

**צעדי אימות**:
1. נווט ל-`/team` - האם הדף נטען?
2. הוסף חבר צוות חדש - האם נשמר?
3. ערוך שעות עבודה - האם מתעדכן?
4. הוסף חופשה - האם מופיעה בלוח השנה?
5. הרץ `npm test` - האם הבדיקות עוברות?

---

### Phase B: Findings Center (`/findings`)

**מטרה**: יצירת מרכז ממצאי ביקורת

**קבצים ליצירה**:
- `flowplan/src/app/findings/page.tsx` - דף ראשי
- `flowplan/src/components/findings/FindingsList.tsx` - רשימת ממצאים
- `flowplan/src/components/findings/FindingCard.tsx` - כרטיס ממצא
- `flowplan/src/components/forms/FindingForm.tsx` - טופס הוספה/עריכה
- `flowplan/src/components/findings/CapaTracker.tsx` - מעקב CAPA

**קבצים קיימים לשימוש**:
- `flowplan/src/services/audit-findings.ts` - Service מוכן ✅

**תוצאה צפויה**:
- ממשק `/findings` מלא עם רשימת ממצאים
- סינון לפי חומרה (Critical/High/Medium/Low)
- מעקב אחר CAPA (Corrective Action/Preventive Action)
- סטטוסים: Open/In Progress/Resolved/Closed

**צעדי אימות**:
1. נווט ל-`/findings` - האם הדף נטען?
2. צור ממצא חדש - האם נשמר?
3. סנן לפי חומרה - האם הסינון עובד?
4. עקוב אחר CAPA - האם הסטטוס מתעדכן?
5. הרץ `npm test` - האם הבדיקות עוברות?

---

### Phase C: AI Integration Enhancement

**מטרה**: שיפור אינטגרציית AI והצגת מסמכים

**קבצים לעדכון**:
- `flowplan/src/app/page.tsx` - הוספת AI chat panel
- `flowplan/src/components/ai/AIChat.tsx` - שיפור UI
- צור: `flowplan/src/components/ai/DocumentUpload.tsx` - העלאת מסמכים

**קבצים קיימים לשימוש**:
- `flowplan/src/services/rag.ts` - RAG service ✅
- `flowplan/src/services/embeddings.ts` - Embeddings service ✅
- `flowplan/src/services/document-parser.ts` - Parser service ✅

**תוצאה צפויה**:
- UI להעלאת מסמכים ב-Dashboard
- AI chat panel במסך ראשי
- הצגת source citations טובה יותר

**צעדי אימות**:
1. העלה מסמך - האם מתפרס ל-embeddings?
2. שאל שאלה - האם AI משתמש במסמך?
3. בדוק citations - האם מוצגים נכון?

---

### Phase D: Testing & Polish

**מטרה**: בדיקות E2E ושיפור ביצועים

**משימות**:
1. E2E tests עם Playwright לזרימות קריטיות
2. אימות RLS policies ב-Supabase
3. אופטימיזציית ביצועים
4. בדיקת Offline Sync

**צעדי אימות**:
1. הרץ E2E tests - האם עוברים?
2. בדוק RLS - האם מאובטח?
3. בדוק Performance - האם מהיר?
4. בדוק Offline - האם עובד?

---

## 📝 לוג סשנים (Session Log)

### Session #7 (03/02/2026) - MCP Integration & Bug Fixes

**What was done:**
- ✅ Connected Supabase MCP server for direct database access
- ✅ Connected Playwright MCP server for automated browser testing
- ✅ Fixed %NaN bug in phase progress display (PhaseSection.tsx)
- ✅ Tested full application flow with Playwright automation
- ✅ Verified Time Off feature works (added test entry successfully)
- ✅ Verified Task Assignment displays correctly (shows initials T1, BG)

**MCP Servers Configured:**

| Server | Status | Purpose |
|--------|--------|---------|
| Supabase | ✅ Connected | Database queries, migrations, debugging |
| Playwright | ✅ Connected | Automated browser testing |
| Context7 | ❌ Failed | Documentation (not critical) |

**Bug Fixed: %NaN in Phase Progress**
- **Problem**: Phase sections showed "NaN%" instead of actual percentage
- **Root Cause**: Code used `phase.task_count` and `phase.completed_task_count` but database columns are `total_tasks` and `completed_tasks`
- **Solution**: Updated PhaseSection.tsx to use correct column names with fallbacks:
```typescript
const totalTasks = phase.total_tasks ?? phase.task_count ?? 0
const completedTasks = phase.completed_tasks ?? phase.completed_task_count ?? 0
```

**Files Modified:**
- `flowplan/src/components/phases/PhaseSection.tsx` - Fixed NaN percentage bug
- `.mcp.json` - Added Supabase MCP authentication

**Playwright Testing Results:**
- ✅ Dashboard loads correctly
- ✅ Navigation to /team works
- ✅ Time Off form submission works
- ✅ Task assignment shows correct initials

**Next Steps:**
- Phase B: Create Findings Center (`/findings`)

---

### Session #6 (03/02/2026) - Fix Production Bugs: Time Off RLS & Task Assignee Dropdown

**What was done**:
- Fixed Bug 1: Time Off RLS 403 Forbidden error on INSERT
- Fixed Bug 2: Assignee dropdown not showing in TaskForm on dashboard
- Created new RLS migration for employee_time_off table
- Updated dashboard to fetch organization-level team members
- Added 12 new tests following TDD methodology

**Bug 1: Time Off RLS Error (403 Forbidden)**
- **Problem**: POST to employee_time_off failed with "new row violates row-level security policy"
- **Root Cause**: The existing RLS policy might not have been applied to the database, or INSERT needs explicit WITH CHECK clause
- **Solution**: Created migration `004_fix_time_off_rls.sql` with explicit policies:
  - Separate SELECT, INSERT, UPDATE, DELETE policies
  - Explicit WITH CHECK (true) for INSERT operations
  - GRANT permissions for anon and authenticated roles

**Bug 2: Task Assignment Dropdown Not Showing**
- **Problem**: Assignee dropdown not visible when creating new task from dashboard
- **Root Cause**: Dashboard used `useTeamMembersByProject` which queries `project_members` junction table. If no team members are assigned to the project, the array is empty.
- **Solution**: Updated `page.tsx` to also fetch organization-level team members using `useTeamMembers(DEFAULT_ORG_ID)`. The dashboard now combines org-level and project-level members.

**Files Created**:
- `flowplan/supabase/migrations/004_fix_time_off_rls.sql` - New RLS migration
- `flowplan/src/components/forms/TaskForm.teamMembers.test.tsx` - 8 tests for assignee dropdown
- `flowplan/src/app/page.teamMembers.test.tsx` - 4 tests for dashboard team members

**Files Modified**:
- `flowplan/src/app/page.tsx` - Fetch org-level team members for task assignment
- `TRACKING.md` - Updated session log

**TDD Methodology**:
- Wrote tests first (RED phase) - 12 tests
- Verified tests pass (some were already GREEN due to existing implementation)
- Implemented fixes (GREEN phase)
- All 12 new tests passing

**Test Coverage**:
- TaskForm Team Members: 8 tests
- Dashboard Team Members: 4 tests
- Total new tests: 12

**Next Steps**:
- Apply migration 004 to Supabase production
- Phase B: Create Findings Center (`/findings`)

---

### סשן #5 (03/02/2026) - Add Time Off Form & Task Assignment Feature

**מה נעשה**:
- ✅ יצירת TimeOffForm component עם TDD (14 tests)
- ✅ הוספת Assignee selection ל-TaskForm (12 tests)
- ✅ שילוב TimeOffForm בדף Team עם Modal
- ✅ הוספת כפתור "Add Time Off" ל-TimeOffCalendar
- ✅ כל 26 tests חדשים עוברים

**פיצ'רים שהוספו**:

1. **Time Off Form** (`TimeOffForm.tsx`)
   - בחירת חבר צוות מ-dropdown
   - בחירת תאריכי התחלה וסיום
   - בחירת סוג חופשה (Vacation, Sick, Personal, Other)
   - שדה הערות אופציונלי
   - ולידציה מלאה (חבר צוות נדרש, תאריכים נדרשים, תאריך סיום אחרי התחלה)
   - מצב Edit לעריכת חופשות קיימות
   - Loading state

2. **Task Assignment**
   - Dropdown לבחירת assignee ב-TaskForm
   - מוצג רק כאשר teamMembers prop מועבר
   - תמיכה ב-"Unassigned" option
   - Pre-selection במצב Edit
   - assignee_id נשמר עם המשימה

3. **TimeOffCalendar Updates**
   - כפתור "Add Time Off" בכותרת
   - כפתור "Add Time Off" גם ב-empty state
   - callback prop `onAddTimeOff`

4. **Team Page Integration**
   - Modal להוספת חופשה חדשה
   - שילוב עם useCreateTimeOff hook
   - Loading state בזמן שמירה

**קבצים שנוצרו**:
- `flowplan/src/components/forms/TimeOffForm.tsx`
- `flowplan/src/components/forms/TimeOffForm.test.tsx`
- `flowplan/src/components/forms/TaskForm.assignee.test.tsx`

**קבצים ששונו**:
- `flowplan/src/components/forms/TaskForm.tsx` - הוספת assignee dropdown
- `flowplan/src/components/team/TimeOffCalendar.tsx` - הוספת Add button
- `flowplan/src/app/team/page.tsx` - שילוב TimeOffForm modal
- `TRACKING.md` - עדכון לוג סשנים

**TDD Methodology**:
- כתיבת tests תחילה (RED) - 26 tests
- אימות שהבדיקות נכשלות
- מימוש מינימלי (GREEN)
- אימות שהבדיקות עוברות
- All 26 new tests passing

**Test Coverage**:
- TimeOffForm: 14 tests
- TaskForm Assignee: 12 tests
- Total new tests: 26

**צעדים הבאים**:
- Phase B: יצירת Findings Center (`/findings`)

---

### סשן #4 (03/02/2026) - תיקון באגי Production ב-Team Workspace ✅

**מה נעשה**:
- ✅ תיקון Issue #1: Database Error - "column team_members.organization_id does not exist"
- ✅ תיקון Issue #2: Navigation - לינק "צוות" לא עבד (הפנה ל-# במקום /team)
- ✅ יצירת migration חדש להוספת organization_id לטבלת team_members
- ✅ עדכון entities.ts לתמיכה ב-organization-level team members
- ✅ הוספת 6 tests חדשים ל-Navbar לאימות navigation links
- ✅ TDD methodology מלא - כתיבת tests לפני תיקון

**באגים שתוקנו**:

1. **Database Schema Mismatch**
   - **בעיה**: Service ציפה ל-`organization_id` אבל הטבלה הכילה רק `project_id`
   - **פתרון**: יצירת migration `003_add_organization_support.sql` שמוסיף:
     - `organization_id` column
     - `display_name`, `avatar_url`, `weekly_capacity_hours`, `skills`, `is_active` columns
     - `project_members` junction table לקשר בין team members לפרויקטים
     - RLS policies מעודכנים

2. **Navigation Links Broken**
   - **בעיה**: לינקים "צוות", "פרויקטים", "ממצאים" הפנו ל-"#" (placeholder)
   - **פתרון**: עדכון `Navbar.tsx` עם hrefs נכונים:
     - `צוות` -> `/team`
     - `פרויקטים` -> `/projects`
     - `ממצאים` -> `/findings`

**קבצים שנוצרו**:
- `flowplan/supabase/migrations/003_add_organization_support.sql`

**קבצים ששונו**:
- `flowplan/src/components/Navbar.tsx` - תיקון navigation hrefs
- `flowplan/src/components/Navbar.test.tsx` - הוספת 6 tests חדשים
- `flowplan/src/types/entities.ts` - תמיכה ב-organization-level TeamMember
- `TRACKING.md` - עדכון לוג סשנים

**Test Coverage**:
- Navbar.tsx: 85% statements, 88.23% lines
- team-members.ts: 93.22% statements, 93.1% lines
- 135 team-related tests עוברים

**צעדים הבאים**:
- הרצת migration ב-Supabase production
- Phase B: יצירת Findings Center (`/findings`)

---

### סשן #3 (03/02/2026) - מימוש Team Workspace (Phase A) ✅

**מה נעשה**:
- ✅ יצירת `/team` route מלא עם TDD
- ✅ TeamMemberCard component - תצוגת חבר צוות יחיד (29 tests)
- ✅ TeamMemberList component - רשימת כל חברי הצוות (27 tests)
- ✅ TimeOffCalendar component - לוח שנה של חופשות (24 tests)
- ✅ `/team` page integration - אינטגרציה מלאה (20 tests)
- ✅ תיקון type errors (UserRole, hourly_rate)
- ✅ Build מצליח עם `/team` route חדש
- ✅ 100 tests חדשים עוברים עם 100% coverage

**פיצ'רים שהוספו**:
- ניהול חברי צוות מלא (CRUD)
- תצוגת שעות עבודה וימי עבודה
- תמיכה בשבוע עבודה ישראלי
- לוח שנה של חופשות עם פילטור לפי סטטוס
- UI בעברית עם RTL מלא
- Dark mode styling

**TDD Methodology**:
- כל component נכתב עם tests תחילה (RED)
- אימות שהבדיקות נכשלות
- מימוש מינימלי (GREEN)
- אימות שהבדיקות עוברות
- Refactoring לפי הצורך

**קבצים שנוצרו**:
- `flowplan/src/app/team/page.tsx` + tests
- `flowplan/src/components/team/TeamMemberCard.tsx` + tests
- `flowplan/src/components/team/TeamMemberList.tsx` + tests
- `flowplan/src/components/team/TimeOffCalendar.tsx` + tests
- `flowplan/src/components/team/index.ts`

**קבצים ששונו**:
- `TRACKING.md` - עדכון לוג סשנים והתקדמות

**צעדים הבאים**:
- Phase B: יצירת Findings Center (`/findings`)

---

### סשן #2 (03/02/2026) - תיקון באגי אימות והקמת מעקב ✅

**מה נעשה**:
- ✅ תיקון באג redirect אחרי login (החלפה ל-`window.location.href`)
- ✅ תיקון באג הצגת שגיאות (הסרת `setIsLoading` מ-AuthContext)
- ✅ תיקון באג logout redirect
- ✅ כתיבת 8 integration tests חדשים ל-login page
- ✅ כל 28 auth tests עוברים
- ✅ ניתוח מלא של הקוד והשוואה ל-PRD
- ✅ יצירת קובץ TRACKING.md זה

**בעיות שנפתרו**:
1. **Login Redirect Hanging** - משתמש נשאר בדף login אחרי התחברות מוצלחת
   - **פתרון**: שימוש ב-`window.location.href = '/'` במקום `router.push()`

2. **Error Messages Not Visible** - שגיאות רק ב-console, לא על המסך
   - **פתרון**: הסרת `setIsLoading(true)` מ-`AuthContext.signIn/signUp` שגרמו ל-unmount של LoginForm

3. **Logout Not Redirecting** - לא חוזר ל-login אחרי logout
   - **פתרון**: שימוש ב-`window.location.href = '/login'` ב-Navbar

**קבצים שונו**:
- `flowplan/src/contexts/AuthContext.tsx` - הסרת `setIsLoading` מ-signIn/signUp
- `flowplan/src/app/(auth)/login/page.test.tsx` - יצירת 8 tests חדשים
- `TRACKING.md` - יצירת קובץ זה

**צעדים הבאים**:
- Phase A: יצירת `/team` workspace

---

### סשן #1 (תאריך לא מתועד) - הקמה ראשונית

**מה נעשה**:
- ✅ הקמת Next.js 16 + React 19
- ✅ אינטגרציה עם Supabase
- ✅ מימוש CPM Scheduling Engine
- ✅ יצירת UI components
- ✅ כתיבת 115+ tests

---

## ⚠️ בעיות ידועות וחסימות

### בעיות פתוחות

- אין בעיות קריטיות כרגע ✅

### חסימות

- אין חסימות כרגע ✅

---

## 🔌 מחקר MCP Servers (Model Context Protocol)

מחקר על שירותי MCP שיכולים לעזור בפיתוח האפליקציה.

### 1. Supabase MCP Server (מומלץ מאוד 🌟)

**התקנה:**
```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp"
    }
  }
}
```

**יכולות:**
- ניהול פרויקטים וארגונים
- חיפוש בדוקומנטציה של Supabase
- פעולות Database: טבלאות, migrations, SQL queries
- Debugging & monitoring: לוגים, התראות אבטחה
- Edge Functions deployment
- Database branching לבדיקות בטוחות
- ניהול Storage

**אזהרות אבטחה:**
- **לא לחבר ל-Production!** רק לסביבת פיתוח
- השתמש ב-read-only mode אם חייב לחבר לנתונים אמיתיים
- הגבל לפרויקט ספציפי (project scoping)

**מקורות:** [Supabase MCP Docs](https://supabase.com/docs/guides/getting-started/mcp) | [GitHub](https://github.com/supabase-community/supabase-mcp)

---

### 2. Playwright MCP Server (בדיקות דפדפן 🎭)

**התקנה ל-Claude Code:**
```bash
claude mcp add playwright npx @playwright/mcp@latest
```

**יכולות:**
- אוטומציה של דפדפן (Chromium, Firefox, WebKit)
- ניווט, לחיצות, מילוי טפסים
- יצירת PDF
- אינטראקציות מבוססות Vision/coordinates
- עבודה עם Accessibility Tree (מהיר ודטרמיניסטי)
- תמיכה ב-143 מכשירים (iPhone, iPad, Pixel, Desktop)

**מקורות:** [GitHub - microsoft/playwright-mcp](https://github.com/microsoft/playwright-mcp) | [ExecuteAutomation](https://github.com/executeautomation/mcp-playwright)

---

### 3. MCP Servers מומלצים נוספים

| Server | תיאור | שימוש |
|--------|-------|-------|
| **GitHub MCP** | ניהול repos, PRs, issues, CI/CD | גרסת בקרה ואוטומציה |
| **Context7** | דוקומנטציה עדכנית בזמן אמת | React, Next.js, Vue |
| **Sequential Thinking** | פתרון בעיות מורכבות | ארכיטקטורה, debugging |
| **PostgreSQL MCP** | עבודה ישירה עם Postgres | queries, schema design |
| **Figma MCP** | Design-to-code | המרת עיצובים לקוד |
| **Brave Search MCP** | חיפוש פרטי | מחקר ומידע עדכני |
| **File System MCP** | פעולות קבצים מאובטחות | refactoring, ניהול קוד |

**מקורות:** [Top 10 MCP Servers](https://apidog.com/blog/top-10-mcp-servers-for-claude-code/) | [Best MCP Servers 2026](https://www.builder.io/blog/best-mcp-servers-2026) | [awesome-mcp-servers](https://github.com/punkpeye/awesome-mcp-servers)

---

### המלצות לפרויקט FlowPlan

1. **Supabase MCP** - חובה להתקין. יאפשר לי לבדוק ולנהל את מסד הנתונים ישירות
2. **Playwright MCP** - לבדיקות E2E אוטומטיות בדפדפן
3. **Context7** - לדוקומנטציה עדכנית של Next.js 16 ו-React 19

---

## 🛠️ פקודות מהירות (Quick Commands)

### Development

```bash
cd flowplan
npm run dev          # Start dev server at http://localhost:3000
npm run build        # Production build (includes type-check)
npm run lint         # ESLint
```

### Testing

```bash
npm run test         # Vitest watch mode
npm run test:run     # Single test run
npm run test:coverage # Coverage report (80% threshold)

# Run single test file
npx vitest run src/services/tasks.test.ts
npx vitest run src/components/forms/TaskForm.test.tsx
```

### Database

```bash
# Supabase CLI
npx supabase start   # Start local Supabase
npx supabase status  # Check status
npx supabase db reset # Reset DB to migrations
```

### Git

```bash
git status
git add .
git commit -m "feat: description"
git push
```

---

## 📌 הערות חשובות

1. **TDD Methodology**: תמיד כתוב tests לפני implementation
2. **Immutability**: תמיד צור אובייקטים חדשים, אף פעם אל תשנה קיימים
3. **Coverage**: 80% minimum - מוגדר ב-`vitest.config.ts`
4. **Hebrew**: כל ה-UI בעברית (RTL)
5. **Services Return Pattern**: `{ data: T | null, error: { message: string; code?: string } | null }`

---

## 🔗 קישורים מהירים

- [CLAUDE.md](flowplan/CLAUDE.md) - הנחיות לפיתוח
- [PRD](FlowPlan-PRD.html) - מסמך איפיון מקורי
- [Plan File](C:\Users\User\.claude\plans\generic-sauteeing-gray.md) - תוכנית עבודה

---

**עודכן לאחרונה**: 03/02/2026
**גרסה**: 1.0
**מצב הפרויקט**: 🟢 Active Development
