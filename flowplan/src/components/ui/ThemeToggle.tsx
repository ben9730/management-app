'use client'

import React, { useState, useEffect } from 'react'

export function ThemeToggle() {
    const [isDark, setIsDark] = useState(false)

    useEffect(() => {
        // Initialize state from document
        setIsDark(document.documentElement.classList.contains('dark'))
    }, [])

    const toggleTheme = () => {
        const newIsDark = !isDark
        setIsDark(newIsDark)
        if (newIsDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }

    return (
        <button
            className="fixed bottom-6 left-6 w-12 h-12 rounded-full bg-white dark:bg-slate-800 shadow-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-all hover:scale-110 active:scale-95 z-[100]"
            onClick={toggleTheme}
            aria-label="Toggle dark mode"
        >
            <span className="material-icons">
                {isDark ? 'light_mode' : 'dark_mode'}
            </span>
        </button>
    )
}
