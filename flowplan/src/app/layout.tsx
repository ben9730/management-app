import type { Metadata } from 'next'
import { DM_Sans } from 'next/font/google'
import './globals.css'

import { Navbar } from '@/components/Navbar'
import { QueryProvider } from '@/components/providers/QueryProvider'

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
        <QueryProvider>
          <div className="min-h-screen flex flex-col">
            <Navbar />

            <main className="flex-1">
              {children}
            </main>

          </div>
        </QueryProvider>
      </body>
    </html>
  )
}

