# Technology Stack

**Analysis Date:** 2026-02-12

## Languages

**Primary:**
- TypeScript 5 - Full application (frontend + backend)
- JSX/TSX - React component definitions

**Secondary:**
- JavaScript (ES2017 target) - Build configuration and utilities
- SQL - Supabase migrations in `supabase/migrations/`

## Runtime

**Environment:**
- Node.js (no specific version pinned; .nvmrc not found)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (standard npm)

## Frameworks

**Core:**
- Next.js 16.1.4 - Full-stack framework (App Router)
- React 19.2.3 - UI rendering
- React DOM 19.2.3 - DOM utilities

**UI & Styling:**
- Tailwind CSS 4 - Utility-first CSS framework
- @tailwindcss/postcss 4 - PostCSS plugin for Tailwind
- Lucide React 0.563.0 - Icon library
- Radix UI slot 1.2.4 - Headless UI primitives

**State Management & Data:**
- TanStack React Query 5.90.20 - Server state management, caching, synchronization
- Yjs 13.6.29 - CRDT for offline-first collaboration
- y-websocket 3.0.0 - WebSocket provider for Yjs sync
- y-indexeddb 9.0.12 - IndexedDB persistence for Yjs

**Testing:**
- Vitest 4.0.18 - Unit/integration test runner
- @vitest/coverage-v8 4.0.18 - Code coverage via V8
- Playwright 1.58.1 - E2E testing
- @testing-library/react 16.3.2 - React component testing utilities
- @testing-library/jest-dom 6.9.1 - Jest matchers for DOM
- @testing-library/user-event 14.6.1 - User interaction simulation
- Happy DOM 20.3.9 - Lightweight DOM implementation for tests
- jsdom 27.4.0 - JavaScript implementation of web standards

**Build & Dev:**
- @vitejs/plugin-react 5.1.2 - Vite React plugin for Vitest
- Tailwind CSS 4 - Build-time CSS generation
- TypeScript 5 - Type checking and compilation

**Code Quality:**
- ESLint 9 - JavaScript/TypeScript linting
- eslint-config-next 16.1.4 - Next.js recommended ESLint rules

## Key Dependencies

**Critical (Core Integrations):**
- @supabase/supabase-js 2.91.1 - Supabase client for PostgreSQL + Auth
- @supabase/ssr 0.8.0 - Server-side session management with cookies
- @anthropic-ai/sdk 0.71.2 - Claude API for RAG/grounded AI
- @google/generative-ai 0.24.1 - Google Gemini API for AI chat
- openai 6.16.0 - OpenAI API for text embeddings

**Utilities:**
- zod 4.3.6 - TypeScript-first schema validation
- date-fns 4.1.0 - Date manipulation (working with task dates, schedules)
- uuid 13.0.0 - UUID generation
- clsx 2.1.1 - Conditional className utility
- tailwind-merge 3.4.0 - Merge Tailwind classes without conflicts

**Type Definitions:**
- @types/node 20 - Node.js types
- @types/react 19 - React types
- @types/react-dom 19 - React DOM types
- @types/uuid 10.0.0 - UUID types

## Configuration

**Environment:**
- Located in `.env.local` (not committed)
- Example at `.env.example` with:
  - `NEXT_PUBLIC_SUPABASE_URL` - Supabase instance URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key (client-side)
  - `SUPABASE_SERVICE_ROLE_KEY` - Optional server-side admin key
  - `ANTHROPIC_API_KEY` - Optional Claude API key for grounded AI

**Build:**
- TypeScript: `tsconfig.json` with strict mode, Next.js plugin
- ESLint: `eslint.config.mjs` with Next.js + core web vitals rules
- PostCSS: `postcss.config.mjs` with Tailwind CSS 4 plugin
- Next.js: `next.config.ts` (minimal, mostly defaults)
- Vitest: `vitest.config.ts` with:
  - Environment: `happy-dom`
  - Coverage provider: `v8`
  - Coverage threshold: 80% (global)
  - Path alias: `@/*` → `src/*`
- Playwright: `playwright.config.ts` with:
  - Multiple browsers: Chromium, Firefox, WebKit, mobile-chrome
  - Hebrew locale (he-IL) and Asia/Jerusalem timezone
  - Dev server auto-start at `http://localhost:3000`

## Platform Requirements

**Development:**
- Node.js runtime
- npm package manager
- A modern terminal (bash, zsh, or Windows equivalent)
- Modern browser with WebSocket support (for Yjs real-time sync)

**Production:**
- Deployment target: Vercel (Next.js standard), or Node.js-compatible platform
- Environment: HTTP server capable of running Next.js
- Database: Supabase PostgreSQL (external)
- External APIs: OpenAI, Anthropic, Google Gemini (optional but recommended)

**Browser Support:**
- Chromium-based (Chrome, Edge, etc.)
- Firefox
- Safari (WebKit)
- Mobile browsers (Chromium-based mobile tested)

---

*Stack analysis: 2026-02-12*
