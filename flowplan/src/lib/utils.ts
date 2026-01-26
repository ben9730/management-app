/**
 * Utility Functions
 *
 * Common utility functions used throughout the application.
 */

import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names with Tailwind CSS class merging
 * Uses clsx for conditional classes and tailwind-merge for deduplication
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Format a date to ISO string (YYYY-MM-DD)
 */
export function formatDateISO(date: Date | string | null | undefined): string | null {
  if (!date) return null
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toISOString().split('T')[0]
}

/**
 * Format a date for display (DD/MM/YYYY for Hebrew locale)
 */
export function formatDateDisplay(date: Date | string | null | undefined): string {
  if (!date) return '-'
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('he-IL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

/**
 * Parse ISO date string to Date object
 */
export function parseDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null
  return new Date(dateStr)
}

/**
 * Get Hebrew day name
 */
const hebrewDays = ['ראשון', 'שני', 'שלישי', 'רביעי', 'חמישי', 'שישי', 'שבת']

export function getHebrewDayName(dayIndex: number): string {
  return hebrewDays[dayIndex] || ''
}

/**
 * Get work days display string
 */
export function formatWorkDays(workDays: number[]): string {
  if (workDays.length === 0) return '-'
  if (workDays.length === 5 && workDays.includes(0) && workDays.includes(4)) {
    return "א'-ה'"
  }
  if (workDays.length === 4 && workDays.includes(0) && workDays.includes(3)) {
    return "א'-ד'"
  }
  return workDays.map(d => hebrewDays[d]?.charAt(0) || '').join(', ')
}

/**
 * Calculate percentage
 */
export function calculatePercentage(completed: number, total: number): number {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Get priority color class
 */
export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-600 text-white'
    case 'high':
      return 'bg-orange-500 text-white'
    case 'medium':
      return 'bg-yellow-500 text-black'
    case 'low':
      return 'bg-gray-400 text-white'
    default:
      return 'bg-gray-300 text-black'
  }
}

/**
 * Get status color class
 */
export function getStatusColor(status: string): string {
  switch (status) {
    case 'done':
    case 'completed':
    case 'closed':
      return 'bg-green-600 text-white'
    case 'in_progress':
    case 'active':
      return 'bg-blue-600 text-white'
    case 'pending':
    case 'open':
      return 'bg-gray-500 text-white'
    default:
      return 'bg-gray-300 text-black'
  }
}

/**
 * Get severity color class
 */
export function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-red-700 text-white'
    case 'high':
      return 'bg-red-500 text-white'
    case 'medium':
      return 'bg-yellow-500 text-black'
    case 'low':
      return 'bg-blue-400 text-white'
    default:
      return 'bg-gray-300 text-black'
  }
}

/**
 * Debounce function
 */
export function debounce<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

/**
 * Throttle function
 */
export function throttle<T extends (...args: Parameters<T>) => ReturnType<T>>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return crypto.randomUUID()
}

/**
 * Sleep utility for async operations
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T
  } catch {
    return fallback
  }
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - 3) + '...'
}
