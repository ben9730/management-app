/**
 * CapaTracker Component Tests (TDD)
 *
 * Displays CAPA (Corrective Action / Preventive Action) tracking statistics
 * for audit findings. Hebrew RTL support with dark mode styling.
 */

import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CapaTracker } from './CapaTracker'
import type { AuditFinding } from '@/types/entities'

// Helper to create mock findings
const createMockFinding = (overrides: Partial<AuditFinding> = {}): AuditFinding => ({
  id: `finding-${Math.random().toString(36).slice(2)}`,
  task_id: 'task-1',
  severity: 'medium',
  finding: 'Test finding',
  root_cause: null,
  capa: null,
  due_date: null,
  status: 'open',
  created_at: new Date('2024-01-15'),
  ...overrides,
})

// Mock findings with various CAPA states
const mockFindingsWithCapa: AuditFinding[] = [
  createMockFinding({
    id: 'f1',
    severity: 'critical',
    capa: 'Implement new controls',
    status: 'open',
  }),
  createMockFinding({
    id: 'f2',
    severity: 'high',
    capa: 'Update documentation',
    status: 'in_progress',
  }),
  createMockFinding({
    id: 'f3',
    severity: 'medium',
    capa: null,
    status: 'open',
  }),
  createMockFinding({
    id: 'f4',
    severity: 'low',
    capa: '',
    status: 'closed',
  }),
  createMockFinding({
    id: 'f5',
    severity: 'critical',
    capa: 'Training program',
    status: 'closed',
  }),
]

// Mock findings with overdue items
const mockFindingsWithOverdue: AuditFinding[] = [
  createMockFinding({
    id: 'f1',
    capa: 'Fix issue',
    due_date: new Date('2020-01-01'), // Past date
    status: 'open', // Not closed = overdue
  }),
  createMockFinding({
    id: 'f2',
    capa: null,
    due_date: new Date('2020-01-01'), // Past date
    status: 'in_progress', // Not closed = overdue
  }),
  createMockFinding({
    id: 'f3',
    capa: 'Done',
    due_date: new Date('2020-01-01'), // Past date
    status: 'closed', // Closed = not overdue
  }),
]

describe('CapaTracker', () => {
  // ===========================================
  // Basic Rendering
  // ===========================================
  describe('rendering', () => {
    it('renders component with Hebrew title', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByText('CAPA מעקב')).toBeInTheDocument()
    })

    it('renders RTL direction', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      const container = screen.getByTestId('capa-tracker')
      expect(container).toHaveAttribute('dir', 'rtl')
    })

    it('applies custom className', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} className="custom-class" />)
      const container = screen.getByTestId('capa-tracker')
      expect(container).toHaveClass('custom-class')
    })
  })

  // ===========================================
  // Statistics Calculation
  // ===========================================
  describe('statistics calculation', () => {
    it('displays correct total findings count', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByTestId('total-count')).toHaveTextContent('5')
    })

    it('displays correct findings with CAPA count', () => {
      // f1, f2, f5 have non-null, non-empty capa = 3
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByTestId('with-capa-count')).toHaveTextContent('3')
    })

    it('displays correct findings without CAPA count', () => {
      // f3 has null capa, f4 has empty string = 2 without CAPA
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByTestId('without-capa-count')).toHaveTextContent('2')
    })

    it('calculates CAPA completion percentage correctly', () => {
      // 3 with CAPA / 5 total = 60%
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('60%')
    })

    it('counts overdue findings correctly', () => {
      // 2 findings are overdue (past due_date and not closed)
      render(<CapaTracker findings={mockFindingsWithOverdue} />)
      expect(screen.getByTestId('overdue-count')).toHaveTextContent('2')
    })

    it('treats empty string capa as missing CAPA', () => {
      const findings = [
        createMockFinding({ capa: '' }),
        createMockFinding({ capa: '   ' }), // Whitespace only
      ]
      render(<CapaTracker findings={findings} />)
      expect(screen.getByTestId('without-capa-count')).toHaveTextContent('2')
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('0%')
    })
  })

  // ===========================================
  // Progress Bar
  // ===========================================
  describe('progress bar', () => {
    it('renders progress bar with correct percentage', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toBeInTheDocument()
      // 60% = 3/5
      expect(progressBar).toHaveStyle({ width: '60%' })
    })

    it('shows green color when completion > 80%', () => {
      const highCompletionFindings = [
        createMockFinding({ capa: 'Done 1' }),
        createMockFinding({ capa: 'Done 2' }),
        createMockFinding({ capa: 'Done 3' }),
        createMockFinding({ capa: 'Done 4' }),
        createMockFinding({ capa: null }), // 4/5 = 80%
      ]
      render(<CapaTracker findings={highCompletionFindings} />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveClass(/bg-green|bg-emerald|success/)
    })

    it('shows yellow/amber color when completion is 50-80%', () => {
      // mockFindingsWithCapa has 60% completion
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveClass(/bg-yellow|bg-amber|warning/)
    })

    it('shows red color when completion < 50%', () => {
      const lowCompletionFindings = [
        createMockFinding({ capa: 'Done' }),
        createMockFinding({ capa: null }),
        createMockFinding({ capa: null }),
        createMockFinding({ capa: null }),
        createMockFinding({ capa: null }), // 1/5 = 20%
      ]
      render(<CapaTracker findings={lowCompletionFindings} />)
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveClass(/bg-red|bg-rose|danger|critical/)
    })
  })

  // ===========================================
  // Overdue Warning
  // ===========================================
  describe('overdue warning', () => {
    it('shows overdue badge when there are overdue findings', () => {
      render(<CapaTracker findings={mockFindingsWithOverdue} />)
      const badge = screen.getByTestId('overdue-badge')
      expect(badge).toBeInTheDocument()
      // Badge should show count + "באיחור" (e.g., "2 באיחור")
      expect(badge).toHaveTextContent('2')
      expect(badge).toHaveTextContent('באיחור')
    })

    it('does not show overdue badge when no overdue findings', () => {
      const noOverdueFindings = [
        createMockFinding({
          capa: 'Done',
          due_date: new Date('2030-01-01'), // Future date
          status: 'open',
        }),
      ]
      render(<CapaTracker findings={noOverdueFindings} />)
      expect(screen.queryByTestId('overdue-badge')).not.toBeInTheDocument()
    })

    it('does not count closed findings as overdue even if past due date', () => {
      const closedOverdueFindings = [
        createMockFinding({
          capa: 'Done',
          due_date: new Date('2020-01-01'), // Past
          status: 'closed', // Closed
        }),
      ]
      render(<CapaTracker findings={closedOverdueFindings} />)
      expect(screen.getByTestId('overdue-count')).toHaveTextContent('0')
    })
  })

  // ===========================================
  // Severity Breakdown
  // ===========================================
  describe('severity breakdown', () => {
    it('shows severity breakdown section when there are findings without CAPA', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByTestId('severity-breakdown')).toBeInTheDocument()
    })

    it('does not show severity breakdown when all findings have CAPA', () => {
      const allWithCapa = [
        createMockFinding({ capa: 'Done 1', severity: 'critical' }),
        createMockFinding({ capa: 'Done 2', severity: 'high' }),
      ]
      render(<CapaTracker findings={allWithCapa} />)
      expect(screen.queryByTestId('severity-breakdown')).not.toBeInTheDocument()
    })

    it('displays count of findings without CAPA by severity', () => {
      const mixedFindings = [
        createMockFinding({ severity: 'critical', capa: null }),
        createMockFinding({ severity: 'critical', capa: null }),
        createMockFinding({ severity: 'high', capa: null }),
        createMockFinding({ severity: 'medium', capa: 'Done' }),
        createMockFinding({ severity: 'low', capa: null }),
      ]
      render(<CapaTracker findings={mixedFindings} />)

      expect(screen.getByTestId('severity-critical-count')).toHaveTextContent('2')
      expect(screen.getByTestId('severity-high-count')).toHaveTextContent('1')
      expect(screen.getByTestId('severity-low-count')).toHaveTextContent('1')
    })

    it('only shows severities that have findings without CAPA', () => {
      const criticalOnly = [
        createMockFinding({ severity: 'critical', capa: null }),
        createMockFinding({ severity: 'high', capa: 'Done' }),
      ]
      render(<CapaTracker findings={criticalOnly} />)

      expect(screen.getByTestId('severity-critical-count')).toBeInTheDocument()
      expect(screen.queryByTestId('severity-high-count')).not.toBeInTheDocument()
      expect(screen.queryByTestId('severity-medium-count')).not.toBeInTheDocument()
      expect(screen.queryByTestId('severity-low-count')).not.toBeInTheDocument()
    })

    it('displays Hebrew severity labels', () => {
      const mixedFindings = [
        createMockFinding({ severity: 'critical', capa: null }),
        createMockFinding({ severity: 'high', capa: null }),
        createMockFinding({ severity: 'medium', capa: null }),
        createMockFinding({ severity: 'low', capa: null }),
      ]
      render(<CapaTracker findings={mixedFindings} />)

      expect(screen.getByText('קריטי')).toBeInTheDocument()
      expect(screen.getByText('גבוה')).toBeInTheDocument()
      expect(screen.getByText('בינוני')).toBeInTheDocument()
      expect(screen.getByText('נמוך')).toBeInTheDocument()
    })
  })

  // ===========================================
  // Hebrew Labels
  // ===========================================
  describe('Hebrew labels', () => {
    it('displays Hebrew label for total findings', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByText("סה״כ ממצאים")).toBeInTheDocument()
    })

    it('displays Hebrew label for with CAPA', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByText('עם CAPA')).toBeInTheDocument()
    })

    it('displays Hebrew label for without CAPA', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByText('ללא CAPA')).toBeInTheDocument()
    })

    it('displays Hebrew label for completion rate', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByText('שיעור השלמה')).toBeInTheDocument()
    })

    it('displays Hebrew label for overdue findings', () => {
      render(<CapaTracker findings={mockFindingsWithOverdue} />)
      expect(screen.getByText('ממצאים באיחור')).toBeInTheDocument()
    })
  })

  // ===========================================
  // Loading State
  // ===========================================
  describe('loading state', () => {
    it('shows skeleton when isLoading is true', () => {
      render(<CapaTracker findings={[]} isLoading />)
      expect(screen.getByTestId('capa-tracker-skeleton')).toBeInTheDocument()
    })

    it('does not show content when loading', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} isLoading />)
      expect(screen.queryByTestId('total-count')).not.toBeInTheDocument()
    })

    it('skeleton has animation', () => {
      render(<CapaTracker findings={[]} isLoading />)
      const skeleton = screen.getByTestId('capa-tracker-skeleton')
      expect(skeleton).toHaveClass('animate-pulse')
    })
  })

  // ===========================================
  // Empty State
  // ===========================================
  describe('empty state', () => {
    it('shows empty state when no findings', () => {
      render(<CapaTracker findings={[]} />)
      expect(screen.getByTestId('capa-tracker-empty')).toBeInTheDocument()
    })

    it('displays helpful message in empty state', () => {
      render(<CapaTracker findings={[]} />)
      expect(screen.getByText(/אין ממצאים/)).toBeInTheDocument()
    })

    it('does not show statistics in empty state', () => {
      render(<CapaTracker findings={[]} />)
      expect(screen.queryByTestId('total-count')).not.toBeInTheDocument()
      expect(screen.queryByTestId('progress-bar')).not.toBeInTheDocument()
    })
  })

  // ===========================================
  // Edge Cases
  // ===========================================
  describe('edge cases', () => {
    it('handles single finding', () => {
      const singleFinding = [createMockFinding({ capa: 'Done' })]
      render(<CapaTracker findings={singleFinding} />)
      expect(screen.getByTestId('total-count')).toHaveTextContent('1')
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('100%')
    })

    it('handles 100% completion', () => {
      const allComplete = [
        createMockFinding({ capa: 'Done 1' }),
        createMockFinding({ capa: 'Done 2' }),
      ]
      render(<CapaTracker findings={allComplete} />)
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('100%')
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveStyle({ width: '100%' })
    })

    it('handles 0% completion', () => {
      const noneComplete = [
        createMockFinding({ capa: null }),
        createMockFinding({ capa: '' }),
      ]
      render(<CapaTracker findings={noneComplete} />)
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('0%')
      const progressBar = screen.getByTestId('progress-bar')
      expect(progressBar).toHaveStyle({ width: '0%' })
    })

    it('handles due_date as string type', () => {
      const stringDateFinding = [
        createMockFinding({
          due_date: '2020-01-01' as unknown as Date,
          status: 'open',
        }),
      ]
      render(<CapaTracker findings={stringDateFinding} />)
      expect(screen.getByTestId('overdue-count')).toHaveTextContent('1')
    })

    it('handles null due_date gracefully', () => {
      const nullDateFindings = [
        createMockFinding({ due_date: null, status: 'open' }),
      ]
      render(<CapaTracker findings={nullDateFindings} />)
      // Should not count as overdue if no due_date
      expect(screen.getByTestId('overdue-count')).toHaveTextContent('0')
    })

    it('rounds percentage to nearest integer', () => {
      const threeFindings = [
        createMockFinding({ capa: 'Done' }),
        createMockFinding({ capa: null }),
        createMockFinding({ capa: null }),
      ]
      // 1/3 = 33.33...%
      render(<CapaTracker findings={threeFindings} />)
      expect(screen.getByTestId('completion-percentage')).toHaveTextContent('33%')
    })
  })

  // ===========================================
  // Dark Mode
  // ===========================================
  describe('dark mode styling', () => {
    it('has dark mode classes for background', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      const container = screen.getByTestId('capa-tracker')
      expect(container).toHaveClass(/dark:bg-slate|dark:bg-gray/)
    })

    it('has dark mode classes for text', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      const container = screen.getByTestId('capa-tracker')
      expect(container.innerHTML).toMatch(/dark:text/)
    })
  })

  // ===========================================
  // Accessibility
  // ===========================================
  describe('accessibility', () => {
    it('has appropriate role', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByRole('region')).toBeInTheDocument()
    })

    it('has accessible name', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      expect(screen.getByRole('region', { name: /capa|מעקב/i })).toBeInTheDocument()
    })

    it('progress bar has appropriate aria attributes', () => {
      render(<CapaTracker findings={mockFindingsWithCapa} />)
      const progressContainer = screen.getByRole('progressbar')
      expect(progressContainer).toHaveAttribute('aria-valuenow', '60')
      expect(progressContainer).toHaveAttribute('aria-valuemin', '0')
      expect(progressContainer).toHaveAttribute('aria-valuemax', '100')
    })
  })
})
