# Phase 3: Unlock Notifications - Research

**Researched:** 2026-02-14
**Domain:** Toast notifications, React state transition detection, RTL-compatible notification libraries
**Confidence:** HIGH

## Summary

Phase 3 adds toast notifications when a phase completes and the next phase unlocks. The scope is narrow: detect when a phase transitions from locked to unlocked (by comparing previous vs current lock status), then show a toast with the completed phase name and the newly unlocked phase name, auto-dismissing after 5 seconds with a manual close option.

The project currently has no toast/notification library installed. The two viable approaches are (1) use Sonner, a lightweight (~14kb gzipped) toast library with built-in RTL support (`dir="rtl"`), dark mode (`theme="dark"`), auto-dismiss, close button, and SSR-safe portals, or (2) build a custom toast component from scratch. Given that even a "simple" toast must handle animation, auto-dismiss timer cleanup, ARIA live regions, SSR portals, RTL positioning, z-index stacking, and theme awareness, Sonner is the clear choice -- it solves all of these out of the box with a 2-line setup.

The detection mechanism uses a `useRef`-based "previous value" pattern: capture the previous lock status map, compare it with the current one after each React Query refetch, and fire `toast.success()` when a phase transitions from `isLocked: true` to `isLocked: false`. This comparison happens inside a `useEffect` in a custom hook (`usePhaseUnlockNotifier` or similar), which consumes the existing `usePhaseLockStatus` hook's output.

**Primary recommendation:** Install `sonner`, add `<Toaster dir="rtl" theme="dark" position="top-center" closeButton duration={5000} />` in layout.tsx, and create a `usePhaseUnlockNotifier` hook that detects lock-to-unlock transitions and calls `toast.success()`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sonner | ^2.x | Toast notifications | RTL support via `dir="rtl"`, dark mode via `theme="dark"`, auto-dismiss + close button built-in, zero dependencies, ~14kb gzipped, SSR-safe, actively maintained, used by shadcn/ui |

### Supporting (already installed -- no new packages)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| React | 19.2.3 | UI framework (useRef, useEffect, useMemo for transition detection) | Core hook logic |
| lucide-react | ^0.563.0 | Icons (Unlock, PartyPopper or similar) for toast icon | Optional toast icon customization |
| Vitest | ^4.0.18 | Unit testing for detection hook | Testing the usePhaseUnlockNotifier hook |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Sonner | Custom Toast component | Must hand-roll: animations, auto-dismiss cleanup, ARIA live regions, SSR portal, RTL positioning, z-index, theme awareness. ~200-300 lines of code to get right. Not worth it for 3 requirements. |
| Sonner | react-hot-toast | Similar API and size, but no built-in `dir` prop for RTL. Would need CSS overrides. |
| Sonner | react-toastify | Heavier (~30kb), more features than needed, overkill for this use case |
| useRef previous-value pattern | TanStack Query `onSuccess` callback | `onSuccess` fires on every successful query, not just when data changes. Would need diff logic anyway. useRef pattern is cleaner for comparing derived state across renders. |

**Installation:**
```bash
npm install sonner
```

## Architecture Patterns

### Recommended Project Structure
```
src/
  components/
    ui/
      toast-provider.tsx    # Toaster wrapper (or inline in layout.tsx)
  hooks/
    use-phase-unlock-notifier.ts       # NEW: Detects lock->unlock transitions, fires toast
    use-phase-unlock-notifier.test.ts  # NEW: Tests for the detection hook
    use-phase-lock-status.ts           # EXISTS: No changes needed
  services/
    phase-lock.ts                      # EXISTS: No changes needed
  app/
    layout.tsx                         # MODIFY: Add <Toaster> component
    page.tsx                           # MODIFY: Call usePhaseUnlockNotifier (1 line)
```

### Pattern 1: Previous-Value Comparison for Transition Detection
**What:** Use a `useRef` to store the previous lock status map. On each render (after React Query refetch), compare previous vs current. When a phase transitions from locked to unlocked, fire the toast.
**When to use:** When you need to detect state transitions (not just current state) in React.
**Example:**
```typescript
// usePhaseUnlockNotifier.ts
import { useRef, useEffect } from 'react'
import { toast } from 'sonner'
import type { PhaseLockInfo } from '@/types/entities'

export function usePhaseUnlockNotifier(
  lockStatus: Map<string, PhaseLockInfo>,
  phases: ProjectPhase[],
  isLoading: boolean
) {
  const prevLockStatusRef = useRef<Map<string, PhaseLockInfo> | null>(null)

  useEffect(() => {
    // Skip during initial load or when data isn't ready
    if (isLoading || lockStatus.size === 0) return

    const prevLockStatus = prevLockStatusRef.current

    // On first render with data, just store -- don't fire toasts
    if (prevLockStatus === null) {
      prevLockStatusRef.current = new Map(lockStatus)
      return
    }

    // Compare: find phases that were locked before and are now unlocked
    for (const [phaseId, currentInfo] of lockStatus) {
      const prevInfo = prevLockStatus.get(phaseId)
      if (prevInfo?.isLocked === true && currentInfo.isLocked === false) {
        // This phase just unlocked!
        const unlockedPhase = phases.find(p => p.id === phaseId)
        const completedPhase = phases.find(p => p.id === prevInfo.blockedByPhaseId)

        if (unlockedPhase && completedPhase) {
          toast.success(
            `השלב "${completedPhase.name}" הושלם!`,
            {
              description: `השלב "${unlockedPhase.name}" נפתח לעבודה`,
              duration: 5000,
            }
          )
        }
      }
    }

    // Update ref for next comparison
    prevLockStatusRef.current = new Map(lockStatus)
  }, [lockStatus, phases, isLoading])
}
```

### Pattern 2: Toaster in Layout (Global Provider)
**What:** Place the `<Toaster>` component once in the root layout. All `toast()` calls anywhere in the app will render through it.
**When to use:** Always -- Sonner's design requires a single Toaster mount point.
**Example:**
```typescript
// In app/layout.tsx
import { Toaster } from 'sonner'

// Inside the body:
<Toaster
  dir="rtl"
  theme="dark"
  position="top-center"
  closeButton
  duration={5000}
  richColors
/>
```

### Pattern 3: Hook Wiring in Page (Minimal Change)
**What:** Call the notifier hook in the page component where phases and lock status are already available.
**When to use:** In page.tsx where `usePhaseLockStatus` and `usePhases` are already called.
**Example:**
```typescript
// In page.tsx DashboardContent, after existing hooks:
const { lockStatus, isLocked, getLockInfo, isLoading: isLoadingLockStatus } = usePhaseLockStatus(projectId)

// Add this one line:
usePhaseUnlockNotifier(lockStatus, phases, isLoadingLockStatus || isLoadingPhases)
```

### Anti-Patterns to Avoid
- **Firing toast on every render:** Do NOT call `toast()` inside a render function without transition detection. This would spam toasts on every re-render.
- **Comparing by JSON.stringify:** Do NOT compare entire lock status maps with `JSON.stringify()`. It's fragile (key ordering) and expensive. Compare individual entries by phaseId.
- **Detecting unlock in the mutation callback:** Do NOT try to detect unlocks in `useUpdateTask`'s `onSuccess`. The lock status is derived from the query cache, not the mutation result. The cache may not be updated yet when `onSuccess` fires.
- **Storing previous state in useState:** Do NOT use `useState` for the previous lock status. It causes an extra re-render cycle. `useRef` is the correct choice because it doesn't trigger re-renders.
- **Adding Toaster to page.tsx:** Do NOT add `<Toaster>` inside page.tsx. It belongs in layout.tsx so it's available globally and doesn't re-mount on page transitions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Toast notifications | Custom Toast component | Sonner (`toast.success()`) | Auto-dismiss timers, animations, ARIA live regions, SSR portal, stacking, RTL -- all built in |
| Auto-dismiss with manual close | setTimeout + state management | Sonner `duration` + `closeButton` props | Timer cleanup on unmount, dismiss animation, accessibility -- handled internally |
| Toast positioning in RTL layout | Manual CSS `right`/`left` calculations | Sonner `dir="rtl"` + `position` props | Sonner handles RTL positioning correctly |
| Dark mode toast styling | Custom dark theme CSS | Sonner `theme="dark"` | Matches project's enforced dark mode |
| ARIA live region for screen readers | Manual `aria-live="polite"` region | Sonner's built-in accessibility | Sonner announces toasts to screen readers automatically |
| Previous-value tracking | usePrevious library | `useRef` + `useEffect` pattern | 5 lines of code, no dependency needed for this simple pattern |

**Key insight:** The notification requirements (show toast, include names, auto-dismiss 5s, manual close) are deceptively simple. Getting animations, accessibility, RTL, timer cleanup, and SSR portals right adds ~200-300 lines. Sonner does all of it with `npm install sonner` and 2 lines of config.

## Common Pitfalls

### Pitfall 1: Toast Spam on Initial Page Load
**What goes wrong:** On first page load, all phases have their lock status computed for the first time. If the comparison treats "no previous status" as "was locked," it fires unlock toasts for all unlocked phases on load.
**Why it happens:** The previous value ref starts as `null`. If the code interprets `null` (no previous entry) as "was locked," every unlocked phase triggers a toast.
**How to avoid:** On the first render with data (when `prevLockStatusRef.current === null`), simply store the current state without firing any toasts. Only fire toasts on subsequent changes.
**Warning signs:** Multiple toasts appear when the page first loads or when switching projects.

### Pitfall 2: Toast Fires Twice Due to React StrictMode
**What goes wrong:** React StrictMode in development double-invokes effects, causing the transition detection to fire twice and show duplicate toasts.
**Why it happens:** `useEffect` runs twice in development with StrictMode enabled.
**How to avoid:** Use `toast()` with a stable `id` based on the phase ID, so duplicate calls replace instead of stack: `toast.success(message, { id: \`unlock-\${phaseId}\` })`. Sonner deduplicates toasts with the same `id`.
**Warning signs:** Two identical toasts appear in development mode.

### Pitfall 3: Toast Shows After Project Switch
**What goes wrong:** When switching from Project A to Project B, the lock status map changes completely. If phases in Project B have different unlock states than Project A, spurious toasts fire.
**Why it happens:** The previous lock status ref still holds Project A's data when Project B's data arrives.
**How to avoid:** Reset `prevLockStatusRef.current` to `null` when the project ID changes. This re-initializes the baseline.
**Warning signs:** Switching projects shows "Phase X unlocked" toasts for phases the user didn't interact with.

### Pitfall 4: Stale Closure in useEffect
**What goes wrong:** The `phases` array used in the toast message might be stale if the closure captures an old reference.
**Why it happens:** React closures capture values at the time of the effect definition.
**How to avoid:** Ensure `phases` is in the `useEffect` dependency array. Since `useMemo`/React Query returns stable references when data hasn't changed, this won't cause unnecessary re-runs.
**Warning signs:** Toast shows wrong phase name, or an old phase name from before a rename.

### Pitfall 5: Toaster Not Rendering in SSR/RSC
**What goes wrong:** `<Toaster>` renders a portal that requires `document.body`. In a Server Component context, this crashes.
**Why it happens:** Next.js 16 layout.tsx is a Server Component by default.
**How to avoid:** Sonner's `<Toaster>` component is already client-safe. However, if layout.tsx is a Server Component, wrap the Toaster in a small Client Component or add `'use client'` to a toast-provider wrapper. Alternatively, Sonner may handle this internally -- verify during implementation.
**Warning signs:** Hydration mismatch error or "document is not defined" error on page load.

### Pitfall 6: usePhaseLockStatus Returns Different Map Reference Each Render
**What goes wrong:** If `computePhaseLockStatus` creates a new `Map` on every call, and `useMemo` dependencies change frequently, the effect fires too often.
**Why it happens:** `useMemo` recomputes when `phases` or `tasks` arrays change reference. React Query returns new array references on refetch.
**How to avoid:** The comparison logic should compare individual entries (phaseId -> isLocked), not the Map reference itself. The `useEffect` should depend on `lockStatus`, but the internal comparison handles the "did anything actually change" check.
**Warning signs:** Toast fires when unrelated task changes happen (e.g., changing a task title in a phase that was already unlocked).

## Code Examples

Verified patterns from official sources and existing codebase:

### Sonner Setup in Next.js Layout
```typescript
// Source: https://sonner.emilkowal.ski/toaster
// In app/layout.tsx (add to body, alongside existing providers)
import { Toaster } from 'sonner'

// Inside <body>:
<QueryProvider>
  <AuthProvider>
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </main>
    </div>
    <Toaster
      dir="rtl"
      theme="dark"
      position="top-center"
      closeButton
      duration={5000}
      richColors
    />
  </AuthProvider>
</QueryProvider>
```

### Toast Call for Phase Unlock
```typescript
// Source: https://sonner.emilkowal.ski/toast
import { toast } from 'sonner'

// Fire when phase unlocks:
toast.success(
  `השלב "${completedPhaseName}" הושלם!`,
  {
    description: `השלב "${unlockedPhaseName}" נפתח לעבודה`,
    duration: 5000,
    id: `unlock-${unlockedPhaseId}`, // Prevent duplicates
  }
)
```

### usePrevious Pattern for Lock Status Comparison
```typescript
// Source: React docs FAQ + community pattern
// This is a well-established React pattern, not library-specific.

function usePrevious<T>(value: T): T | null {
  const ref = useRef<T | null>(null)
  useEffect(() => {
    ref.current = value
  }, [value])
  return ref.current
}
```

### Wiring in page.tsx (1 line addition)
```typescript
// After existing hook calls in DashboardContent:
const { lockStatus, isLocked, getLockInfo, isLoading: isLoadingLock } = usePhaseLockStatus(projectId)

// NEW: Add notification trigger
usePhaseUnlockNotifier(lockStatus, phases, isLoadingLock || isLoadingPhases)
```

### Test Pattern for Transition Detection Hook
```typescript
// Using Vitest + Testing Library
import { renderHook, act } from '@testing-library/react'
import { vi } from 'vitest'
import { usePhaseUnlockNotifier } from './use-phase-unlock-notifier'

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
  },
}))

it('fires toast when phase transitions from locked to unlocked', () => {
  const phases = [
    makePhase({ id: 'p1', name: 'Phase 1' }),
    makePhase({ id: 'p2', name: 'Phase 2' }),
  ]

  const lockedStatus = new Map([
    ['p1', { phaseId: 'p1', isLocked: false, reason: 'first_phase', blockedByPhaseId: null, blockedByPhaseName: null }],
    ['p2', { phaseId: 'p2', isLocked: true, reason: 'previous_phase_incomplete', blockedByPhaseId: 'p1', blockedByPhaseName: 'Phase 1' }],
  ])

  const unlockedStatus = new Map([
    ['p1', { phaseId: 'p1', isLocked: false, reason: 'first_phase', blockedByPhaseId: null, blockedByPhaseName: null }],
    ['p2', { phaseId: 'p2', isLocked: false, reason: 'previous_phase_complete', blockedByPhaseId: null, blockedByPhaseName: null }],
  ])

  // First render: store baseline (locked)
  const { rerender } = renderHook(
    ({ lockStatus, phases, isLoading }) =>
      usePhaseUnlockNotifier(lockStatus, phases, isLoading),
    {
      initialProps: { lockStatus: lockedStatus, phases, isLoading: false },
    }
  )

  expect(toast.success).not.toHaveBeenCalled()

  // Second render: phase 2 unlocks
  rerender({ lockStatus: unlockedStatus, phases, isLoading: false })

  expect(toast.success).toHaveBeenCalledOnce()
  expect(toast.success).toHaveBeenCalledWith(
    expect.stringContaining('Phase 1'),
    expect.objectContaining({
      description: expect.stringContaining('Phase 2'),
      duration: 5000,
    })
  )
})
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| react-toastify (~30kb, feature-heavy) | Sonner (~14kb, focused API) | 2023-2024 | Lighter, better DX, built-in RTL |
| Custom toast with useState + setTimeout | Sonner with `duration` prop | 2023+ | No timer cleanup bugs, no animation code |
| Polling for state changes | React Query cache invalidation + useEffect comparison | React Query v5 era | Reactive, no polling needed |

**Deprecated/outdated:**
- `react-toastify`: Still maintained but heavier than needed. Sonner is the modern lightweight choice.
- Manual `setTimeout` for auto-dismiss: Bug-prone (timer cleanup on unmount). Use library `duration` prop.

## Open Questions

1. **Should the Toaster be wrapped in a Client Component or placed directly in layout.tsx?**
   - What we know: layout.tsx is currently a Server Component. Sonner's `<Toaster>` is a client component. Next.js allows importing client components into server components.
   - What's unclear: Whether Sonner handles the server/client boundary gracefully or if it needs an explicit `'use client'` wrapper.
   - Recommendation: Test during implementation. If hydration errors occur, create a `ToastProvider` client component wrapper. Sonner's README examples show it working in Next.js layout files without issues.

2. **Should we expose the `lockStatus` Map directly from `usePhaseLockStatus` for the notifier hook?**
   - What we know: Currently, `usePhaseLockStatus` returns `{ lockStatus, isLoading, isLocked, getLockInfo }`. The `lockStatus` Map is already exposed.
   - What's unclear: Whether the hook needs any modification.
   - Recommendation: No changes needed to `usePhaseLockStatus`. The notifier hook can consume `lockStatus` directly.

3. **Should the toast include a visual icon (e.g., unlock icon)?**
   - What we know: Sonner `toast.success()` includes a checkmark icon by default. Alternatively, we could pass a custom `icon` prop with lucide-react's `Unlock` or `PartyPopper`.
   - What's unclear: Whether the default checkmark is sufficient or if a custom icon adds value.
   - Recommendation: Use `toast.success()` default icon for v1. It's universally understood. Custom icon is a nice-to-have for later.

## Sources

### Primary (HIGH confidence)
- **Sonner official docs** - [Toaster component props](https://sonner.emilkowal.ski/toaster), [Toast function API](https://sonner.emilkowal.ski/toast) -- verified `dir="rtl"`, `theme`, `closeButton`, `duration`, `position`, `richColors`, `id` props
- **Sonner GitHub** - [github.com/emilkowalski/sonner](https://github.com/emilkowalski/sonner) -- confirmed active maintenance, React 19 compatibility
- **Existing codebase** -- `src/services/phase-lock.ts`, `src/hooks/use-phase-lock-status.ts`, `src/app/layout.tsx`, `src/app/page.tsx` -- direct code review of current architecture

### Secondary (MEDIUM confidence)
- **React usePrevious pattern** -- [React FAQ](https://legacy.reactjs.org/docs/hooks-faq.html), [usehooks.com/useprevious](https://usehooks.com/useprevious) -- well-established community pattern
- **Sonner bundle size** -- [BundlePhobia](https://bundlephobia.com/package/sonner), [Best of JS](https://bestofjs.org/projects/sonner) -- ~14kb gzipped
- **shadcn/ui Sonner integration** -- [ui.shadcn.com](https://ui.shadcn.com/docs/components/radix/sonner) -- validates Sonner as the standard toast choice in the React ecosystem

### Tertiary (LOW confidence)
- None -- all findings verified against official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- Sonner API verified against official docs, RTL support confirmed via `dir` prop
- Architecture: HIGH -- Detection pattern (useRef prev-value comparison) is a well-established React pattern; hook integration points verified via direct codebase code review
- Pitfalls: HIGH -- Identified through reasoning about React lifecycle behavior (StrictMode, initial load, project switch) and verified patterns from community sources

**Research date:** 2026-02-14
**Valid until:** 2026-03-14 (30 days -- stable domain, Sonner API is mature)
