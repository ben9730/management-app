/**
 * Utils Tests
 */

import { describe, it, expect, vi } from 'vitest'
import {
  cn,
  formatDateISO,
  formatDateDisplay,
  parseDate,
  getHebrewDayName,
  formatWorkDays,
  calculatePercentage,
  getPriorityColor,
  getStatusColor,
  getSeverityColor,
  truncate,
  debounce,
  generateId,
  safeJsonParse,
} from './utils'

describe('cn (classnames)', () => {
  it('combines multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('foo', false && 'bar', 'baz')).toBe('foo baz')
  })

  it('merges Tailwind classes correctly', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4')
  })

  it('handles objects', () => {
    expect(cn('foo', { bar: true, baz: false })).toBe('foo bar')
  })

  it('handles arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar')
  })
})

describe('formatDateISO', () => {
  it('formats Date object to ISO string', () => {
    const date = new Date('2026-01-25T12:00:00Z')
    expect(formatDateISO(date)).toBe('2026-01-25')
  })

  it('formats date string to ISO string', () => {
    expect(formatDateISO('2026-01-25T12:00:00Z')).toBe('2026-01-25')
  })

  it('returns null for null input', () => {
    expect(formatDateISO(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(formatDateISO(undefined)).toBeNull()
  })
})

describe('formatDateDisplay', () => {
  it('formats date for Hebrew locale', () => {
    const date = new Date('2026-01-25')
    const result = formatDateDisplay(date)
    // Should be in DD/MM/YYYY format
    expect(result).toMatch(/25.*01.*2026/)
  })

  it('returns - for null input', () => {
    expect(formatDateDisplay(null)).toBe('-')
  })

  it('returns - for undefined input', () => {
    expect(formatDateDisplay(undefined)).toBe('-')
  })
})

describe('parseDate', () => {
  it('parses ISO date string to Date', () => {
    const result = parseDate('2026-01-25')
    expect(result).toBeInstanceOf(Date)
    expect(result?.toISOString().split('T')[0]).toBe('2026-01-25')
  })

  it('returns null for null input', () => {
    expect(parseDate(null)).toBeNull()
  })

  it('returns null for undefined input', () => {
    expect(parseDate(undefined)).toBeNull()
  })
})

describe('getHebrewDayName', () => {
  it('returns correct Hebrew day names', () => {
    expect(getHebrewDayName(0)).toBe('ראשון')
    expect(getHebrewDayName(1)).toBe('שני')
    expect(getHebrewDayName(2)).toBe('שלישי')
    expect(getHebrewDayName(3)).toBe('רביעי')
    expect(getHebrewDayName(4)).toBe('חמישי')
    expect(getHebrewDayName(5)).toBe('שישי')
    expect(getHebrewDayName(6)).toBe('שבת')
  })

  it('returns empty string for invalid index', () => {
    expect(getHebrewDayName(7)).toBe('')
    expect(getHebrewDayName(-1)).toBe('')
  })
})

describe('formatWorkDays', () => {
  it('formats Sun-Thu as א\'-ה\'', () => {
    expect(formatWorkDays([0, 1, 2, 3, 4])).toBe("א'-ה'")
  })

  it('formats Sun-Wed as א\'-ד\'', () => {
    expect(formatWorkDays([0, 1, 2, 3])).toBe("א'-ד'")
  })

  it('returns - for empty array', () => {
    expect(formatWorkDays([])).toBe('-')
  })

  it('handles custom work days', () => {
    const result = formatWorkDays([0, 2, 4])
    expect(result).toBeTruthy()
  })
})

describe('calculatePercentage', () => {
  it('calculates percentage correctly', () => {
    expect(calculatePercentage(50, 100)).toBe(50)
    expect(calculatePercentage(25, 100)).toBe(25)
    expect(calculatePercentage(3, 4)).toBe(75)
  })

  it('returns 0 when total is 0', () => {
    expect(calculatePercentage(5, 0)).toBe(0)
  })

  it('rounds to nearest integer', () => {
    expect(calculatePercentage(1, 3)).toBe(33)
    expect(calculatePercentage(2, 3)).toBe(67)
  })
})

describe('getPriorityColor', () => {
  it('returns correct colors for priorities', () => {
    expect(getPriorityColor('critical')).toContain('red')
    expect(getPriorityColor('high')).toContain('orange')
    expect(getPriorityColor('medium')).toContain('yellow')
    expect(getPriorityColor('low')).toContain('gray')
  })

  it('returns default color for unknown priority', () => {
    expect(getPriorityColor('unknown')).toContain('gray')
  })
})

describe('getStatusColor', () => {
  it('returns correct colors for statuses', () => {
    expect(getStatusColor('done')).toContain('green')
    expect(getStatusColor('completed')).toContain('green')
    expect(getStatusColor('in_progress')).toContain('blue')
    expect(getStatusColor('active')).toContain('blue')
    expect(getStatusColor('pending')).toContain('gray')
  })

  it('returns default color for unknown status', () => {
    expect(getStatusColor('unknown')).toContain('gray')
  })
})

describe('getSeverityColor', () => {
  it('returns correct colors for severities', () => {
    expect(getSeverityColor('critical')).toContain('red')
    expect(getSeverityColor('high')).toContain('red')
    expect(getSeverityColor('medium')).toContain('yellow')
    expect(getSeverityColor('low')).toContain('blue')
  })

  it('returns default color for unknown severity', () => {
    expect(getSeverityColor('unknown')).toContain('gray')
  })
})

describe('truncate', () => {
  it('truncates text longer than maxLength', () => {
    expect(truncate('Hello World', 8)).toBe('Hello...')
  })

  it('does not truncate text shorter than maxLength', () => {
    expect(truncate('Hello', 10)).toBe('Hello')
  })

  it('does not truncate text equal to maxLength', () => {
    expect(truncate('Hello', 5)).toBe('Hello')
  })
})

describe('debounce', () => {
  it('delays function execution', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn()
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).not.toHaveBeenCalled()

    vi.advanceTimersByTime(50)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })

  it('only calls function once for rapid calls', async () => {
    vi.useFakeTimers()
    const fn = vi.fn()
    const debouncedFn = debounce(fn, 100)

    debouncedFn()
    debouncedFn()
    debouncedFn()

    vi.advanceTimersByTime(100)
    expect(fn).toHaveBeenCalledTimes(1)

    vi.useRealTimers()
  })
})

describe('generateId', () => {
  it('generates a string', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
  })

  it('generates unique IDs', () => {
    const id1 = generateId()
    const id2 = generateId()
    expect(id1).not.toBe(id2)
  })

  it('generates UUID format', () => {
    const id = generateId()
    // UUID format: 8-4-4-4-12 hex characters
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
  })
})

describe('safeJsonParse', () => {
  it('parses valid JSON', () => {
    const result = safeJsonParse('{"foo": "bar"}', {})
    expect(result).toEqual({ foo: 'bar' })
  })

  it('returns fallback for invalid JSON', () => {
    const fallback = { default: true }
    const result = safeJsonParse('invalid json', fallback)
    expect(result).toEqual(fallback)
  })

  it('returns fallback for empty string', () => {
    const fallback = []
    const result = safeJsonParse('', fallback)
    expect(result).toEqual(fallback)
  })
})
