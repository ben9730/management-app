import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-dm-sans',
})

export const metadata: Metadata = {
  title: 'FlowPlan - AI-Native Audit Management',
  description: 'Advanced audit management with Critical Path Method, resource scheduling, and AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${dmSans.variable} font-sans antialiased`}>
        <div className="min-h-screen flex flex-col" style={{ background: 'var(--fp-bg-primary)' }}>
          {/* Header */}
          <header className="sticky top-0 z-40 fp-glass border-b" style={{ borderColor: 'var(--fp-border-light)' }}>
            <div className="max-w-[1400px] mx-auto px-6 h-16 flex items-center justify-between">
              {/* Logo & Brand */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  {/* Logo Icon */}
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg, var(--fp-brand-primary), var(--fp-brand-secondary))' }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <span className="text-xl font-bold" style={{ color: 'var(--fp-text-primary)' }}>
                    FlowPlan
                  </span>
                </div>
                <span
                  className="px-2 py-0.5 text-[10px] font-semibold rounded"
                  style={{
                    background: 'var(--fp-status-info-bg)',
                    color: 'var(--fp-brand-primary)'
                  }}
                >
                  BETA
                </span>
              </div>

              {/* Navigation */}
              <nav className="flex items-center gap-1">
                <NavLink href="/" active>Dashboard</NavLink>
                <NavLink href="/projects">Projects</NavLink>
                <NavLink href="/team">Team</NavLink>
                <NavLink href="/findings">Findings</NavLink>
              </nav>

              {/* Right Side */}
              <div className="flex items-center gap-3">
                {/* Notifications */}
                <button
                  className="w-9 h-9 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--fp-bg-tertiary)]"
                  style={{ color: 'var(--fp-text-secondary)' }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </button>

                {/* User Avatar */}
                <button className="flex items-center gap-2 p-1 pr-3 rounded-lg transition-colors hover:bg-[var(--fp-bg-tertiary)]">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-semibold"
                    style={{
                      background: 'linear-gradient(135deg, #10b981, #059669)',
                      color: 'white'
                    }}
                  >
                    DC
                  </div>
                  <span className="text-sm font-medium" style={{ color: 'var(--fp-text-primary)' }}>
                    David
                  </span>
                </button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer
            className="border-t py-4"
            style={{
              borderColor: 'var(--fp-border-light)',
              background: 'var(--fp-bg-secondary)'
            }}
          >
            <div className="max-w-[1400px] mx-auto px-6 flex items-center justify-between">
              <span className="text-sm" style={{ color: 'var(--fp-text-tertiary)' }}>
                FlowPlan © 2026
              </span>
              <div className="flex items-center gap-4">
                <a href="#" className="text-sm hover:underline" style={{ color: 'var(--fp-text-secondary)' }}>
                  Documentation
                </a>
                <a href="#" className="text-sm hover:underline" style={{ color: 'var(--fp-text-secondary)' }}>
                  Support
                </a>
              </div>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  return (
    <a
      href={href}
      className="px-4 py-2 text-sm font-medium rounded-lg transition-colors"
      style={{
        background: active ? 'var(--fp-bg-tertiary)' : 'transparent',
        color: active ? 'var(--fp-text-primary)' : 'var(--fp-text-secondary)'
      }}
    >
      {children}
    </a>
  )
}
