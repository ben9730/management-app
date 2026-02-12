# External Integrations

**Analysis Date:** 2026-02-12

## APIs & External Services

**AI & Grounding:**
- **OpenAI (Text Embeddings)** - Vector embeddings for semantic search (RAG)
  - SDK/Client: `openai` package (v6.16.0)
  - Model: `text-embedding-3-small` (1536-dimension vectors)
  - Auth: `ANTHROPIC_API_KEY` (Note: naming is misleading; this is OpenAI for embeddings)
  - Implementation: `src/services/embeddings.ts` - `createEmbeddingsService()`
  - Usage: Document chunking → OpenAI embedding → Supabase pgvector storage → similarity search

- **Anthropic Claude API** - RAG responses with source attribution
  - SDK/Client: `@anthropic-ai/sdk` package (v0.71.2)
  - Model: `claude-3-5-sonnet-20241022` (default, configurable)
  - Auth: `ANTHROPIC_API_KEY` environment variable
  - Implementation: `src/services/rag.ts` - `createRAGService()`
  - Usage: Takes search results + user query → Claude answers with source citations [Source X]
  - Critical: Implements SECURITY DEFINER pattern - never makes up information not in context

- **Google Gemini** - Alternative AI for general chat (optional fallback)
  - SDK/Client: `@google/generative-ai` package (v0.24.1)
  - Model: `gemini-2.0-flash` (free tier)
  - Auth: `GOOGLE_GENERATIVE_AI_API_KEY` (optional, not in .env.example but referenced in code)
  - Implementation: `src/services/gemini.ts` - `createGeminiService()` and `createGeminiRAGService()`
  - Usage: Chat without RAG (fallback), or RAG-enabled when embeddings are set up
  - Note: Hebrew system prompt included for RTL support

## Data Storage

**Databases:**
- **PostgreSQL (via Supabase)**
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public endpoint)
  - Auth: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (client-side) + optional `SUPABASE_SERVICE_ROLE_KEY` (server)
  - Client: `@supabase/supabase-js` (browser) + `@supabase/ssr` (server)
  - Browser initialization: `src/lib/supabase.ts` - `createBrowserClient<Database>`
  - Server initialization: `src/lib/supabase-server.ts` - `createServerSupabaseClient()`

**Tables (9 core + implicit storage):**
- `projects` - Project metadata, status, dates
- `project_phases` - Task groupings (auto-creates "כללי" phase per CLAUDE.md)
- `tasks` - CPM fields (es, ef, ls, lf, slack, is_critical)
- `dependencies` - Task relationships (FS/SS/FF/SF)
- `audit_findings` - Findings with severity and CAPA
- `calendar_exceptions` - Holidays, non-working days (Hebrew date support)
- `team_members` - Project membership with work hours/days
- `employee_time_off` - Vacation, sick, personal leave
- `task_assignments` - Multi-assignee support with allocated/actual hours
- `document_embeddings` - Vector storage (pgvector) for RAG: `id`, `document_id`, `chunk_index`, `chunk_text`, `embedding` (1536-dim float vector), `metadata`

**File Storage:**
- **Supabase Storage (Cloud object storage)**
  - Purpose: Document storage for RAG (PDFs, DOCX, XLSX, TXT, CSV)
  - Max file size: 50MB per document
  - Supported formats: PDF, DOCX, DOC, XLSX, XLS, TXT, CSV
  - Implementation: `src/services/document-upload.ts` - `createDocumentUploadService()`
  - Metadata: document records stored in PostgreSQL, files in object storage
  - Access: Behind Supabase Auth RLS policies

**Local Storage (Offline):**
- **IndexedDB (Browser)**
  - Purpose: Offline-first persistence via Yjs + IndexedDBProvider
  - Implementation: `src/services/sync.ts` - `createSyncService()` with `IndexeddbPersistence`
  - Stores: tasks, projects, team_members, audit_findings (Y.Map/Y.Array structures)
  - Automatic sync when online: `y-websocket` WebsocketProvider
  - Queue: Queued operations in IndexedDB when offline, replayed when online

- **In-Memory Storage (Testing/SSR)**
  - Implementation: `src/services/offline-storage.ts` - `createInMemoryStorage()`
  - Stores: `documents`, `syncQueue`, `metadata`
  - Used for: Server-side rendering, unit tests, fallback

**Caching:**
- **TanStack React Query**
  - Purpose: Server state management with client-side caching
  - Query keys defined per hook: `projectKeys`, `taskKeys`, etc. in `src/hooks/use-*.ts`
  - Deduping: Automatic request deduplication by query key
  - Background refetch: Configurable stale time (not visible in sample hooks)
  - Example: `useProjects()` → `getProjects()` service → Supabase RPC/query

## Authentication & Identity

**Auth Provider:**
- **Supabase Auth (built on GoTrue)**
  - Implementation: `src/services/auth.ts`
  - Methods: Email/password (signIn, signUp, signOut)
  - Session: Cookie-based via `@supabase/ssr` for SSR compatibility
  - User object: Available via `supabase.auth.getUser()` or server `getServerUser()`
  - Database connection: `auth.users` table referenced by `user_id` foreign keys
  - RLS policies: Use `is_project_member()` and `is_project_admin()` helper functions
  - Helpers: `getCurrentUser()`, `isAuthenticated()` in `src/lib/supabase.ts`

## Monitoring & Observability

**Error Tracking:**
- None detected - Only console logging implemented

**Logs:**
- Console logging only: `console.error()`, `console.log()` in services
- No centralized logging service (Sentry, DataDog, etc.)

## CI/CD & Deployment

**Hosting:**
- Designed for Vercel (Next.js first-class support)
- Can run on any Node.js platform

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or similar in codebase

## Environment Configuration

**Required env vars (`.env.local` format):**
```
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
ANTHROPIC_API_KEY=sk-ant-...
```

**Optional env vars:**
```
SUPABASE_SERVICE_ROLE_KEY=eyJ...        # Server-side admin operations
GOOGLE_GENERATIVE_AI_API_KEY=AIza...   # For Gemini fallback
```

**Secrets location:**
- `.env.local` (local development, not committed)
- Production: Deploy to Vercel environment variables or similar

## Webhooks & Callbacks

**Incoming:**
- Not detected - No webhook routes in `src/app/api/`

**Outgoing:**
- Not detected - No calls to external webhook endpoints

## Real-time Communication

**Sync Protocol:**
- **Yjs + WebSocket**
  - Purpose: Offline-first CRDT sync with real-time collaborative editing
  - Client library: `y-websocket` (WebsocketProvider)
  - Persistence: `y-indexeddb` (IndexeddbPersistence)
  - Awareness: Cursor positions, user presence (optional)
  - Undo/Redo: Built-in Yjs transaction support
  - Implementation: `src/services/sync.ts` - `createSyncService(SyncConfig)`
  - Data structures: Y.Map for tasks/projects, Y.Array for audit findings

**WebSocket Server:**
- Configured via `y-websocket` provider
- URL: `websocketUrl` in `SyncConfig`
- Fallback: When offline, IndexedDB stores queued operations for replay

## API Documentation

**GraphQL:**
- Not used - All queries via Supabase REST API or SQL

**REST:**
- **Supabase PostgREST**
  - Automatic REST API from PostgreSQL schema
  - Examples in services: `.from('tasks').select()`, `.rpc('match_documents', ...)`
  - Auth: Supabase RLS policies enforce row-level access control
  - RPC functions: `is_project_member()`, `is_project_admin()`, `match_documents()` (pgvector)

**SDKs:**
- Supabase JS SDK wraps PostgREST + Auth + Storage
- Direct OpenAI SDK for embeddings
- Direct Anthropic SDK for Claude API
- Direct Google AI SDK for Gemini

## Key Service Implementations

**RAG Pipeline (Grounded AI):**
1. User uploads document → `src/services/document-upload.ts` → Supabase Storage
2. Document parser → `src/services/document-parser.ts` → Chunk document
3. Embeddings generator → `src/services/embeddings.ts` → OpenAI text-embedding-3-small → pgvector in Supabase
4. User query → `src/services/rag.ts` → Search embeddings → Retrieve context
5. Claude response → With source citations → Display via RAG UI component

**Offline-First Sync:**
1. User edits locally → Yjs updates → IndexedDB persist (offline)
2. Auto-sync when online → `y-websocket` → Supabase Yjs provider (if set up)
3. Or manual sync → TanStack Query mutations → Supabase REST API
4. Conflict resolution: Last-write-wins or first-write-wins (configurable)

---

*Integration audit: 2026-02-12*
