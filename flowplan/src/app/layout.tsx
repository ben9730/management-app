import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: 'FlowPlan - AI-Native Project Management',
  description: 'Advanced project management with Critical Path Method, resource scheduling, and AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <body className={`${inter.variable} font-sans antialiased bg-gray-50`}>
        {/* Main App Shell */}
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b-4 border-black bg-white">
            <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-black uppercase tracking-tight">
                  FlowPlan
                </h1>
                <span className="px-2 py-0.5 bg-black text-white text-xs font-bold">
                  BETA
                </span>
              </div>
              <nav className="flex items-center gap-6">
                <a
                  href="/"
                  className="text-sm font-bold uppercase hover:underline"
                >
                  Dashboard
                </a>
                <a
                  href="/projects"
                  className="text-sm font-bold uppercase hover:underline"
                >
                  Projects
                </a>
                <a
                  href="/team"
                  className="text-sm font-bold uppercase hover:underline"
                >
                  Team
                </a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t-2 border-black bg-white py-4">
            <div className="max-w-7xl mx-auto px-4 text-center text-sm text-gray-600">
              FlowPlan © 2026 - AI-Native Project Management
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
