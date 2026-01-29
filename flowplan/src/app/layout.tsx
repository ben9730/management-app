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
    <html lang="he" dir="rtl" className="dark">
      <head>
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet" />
      </head>
      <body
        className={`${dmSans.variable} font-sans antialiased bg-background text-foreground min-h-screen transition-colors duration-200`}
        suppressHydrationWarning
      >
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b border-slate-200 dark:border-slate-800 bg-surface sticky top-0 z-50">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
              {/* Logo & Nav (Right side) */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="bg-primary p-1.5 rounded-lg">
                    <span className="material-icons text-white text-xl">check_circle</span>
                  </div>
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    FlowPlan <span className="text-xs bg-primary/20 text-primary px-1.5 py-0.5 rounded ml-1">BETA</span>
                  </span>
                </div>
                <nav className="hidden md:flex items-center gap-6">
                  <NavLink href="/">לוח בקרה</NavLink>
                  <NavLink href="/about">אודות</NavLink>
                  <NavLink href="#">ממצאים</NavLink>
                  <NavLink href="#">צוות</NavLink>
                  <NavLink href="#">פרויקטים</NavLink>
                </nav>
              </div>

              {/* User Profile (Left side) */}
              <div className="flex items-center gap-4">
                <button className="p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors relative">
                  <span className="material-icons">notifications</span>
                  <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                </button>
                <div className="flex items-center gap-3 pr-4 border-r border-slate-200 dark:border-slate-800">
                  <div className="text-left leading-tight hidden sm:block">
                    <p className="text-sm font-semibold text-foreground">דוד כהן</p>
                    <p className="text-xs text-slate-500">מנהל פרויקט</p>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white font-bold">DC</div>
                </div>
              </div>
            </div>
          </header>

          <main className="flex-1">
            {children}
          </main>

        </div>
      </body>
    </html>
  )
}

function NavLink({ href, children, active }: { href: string; children: React.ReactNode; active?: boolean }) {
  if (active) {
    return (
      <a className="text-primary font-semibold border-b-2 border-primary py-4 mt-1" href={href}>
        {children}
      </a>
    )
  }
  return (
    <a href={href} className="text-slate-500 hover:text-primary dark:text-slate-400 transition-colors">
      {children}
    </a>
  )
}
