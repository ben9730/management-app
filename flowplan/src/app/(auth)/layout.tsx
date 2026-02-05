/**
 * Auth Layout
 * Layout for authentication pages (login, register)
 * No navbar, centered card design
 */

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">FlowPlan</h1>
          <p className="text-slate-400">מערכת ניהול ביקורות מבוססת AI</p>
        </div>

        {/* Auth Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 shadow-xl">
          {children}
        </div>
      </div>
    </div>
  )
}
