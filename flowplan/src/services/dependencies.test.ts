/**
 * Dependencies Service Tests (TDD)
 *
 * Tests for task dependency CRUD operations service layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createDependency,
  getDependency,
  getDependencies,
  updateDependency,
  deleteDependency,
  getDependenciesForTask,
  type CreateDependencyInput,
  type UpdateDependencyInput,
} from './dependencies'
import type { Dependency } from '@/types/entities'

// Mock Supabase client - use vi.hoisted to properly hoist the mock
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  or: vi.fn(),
  order: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
}))

// Setup chainable mock methods
mockSupabase.from.mockReturnValue(mockSupabase)
mockSupabase.select.mockReturnValue(mockSupabase)
mockSupabase.insert.mockReturnValue(mockSupabase)
mockSupabase.update.mockReturnValue(mockSupabase)
mockSupabase.delete.mockReturnValue(mockSupabase)
mockSupabase.eq.mockReturnValue(mockSupabase)
mockSupabase.or.mockReturnValue(mockSupabase)
mockSupabase.order.mockReturnValue(mockSupabase)

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockDependency: Dependency = {
  id: 'dep-1',
  predecessor_id: 'task-1',
  successor_id: 'task-2',
  dependency_type: 'finish_to_start',
  lag_days: 0,
  created_at: '2026-01-15T10:00:00Z',
}

describe('Dependencies Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chainable mocks
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.or.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
  })

  describe('createDependency', () => {
    it('creates a dependency with required fields', async () => {
      const input: CreateDependencyInput = {
        predecessor_id: 'task-1',
        successor_id: 'task-2',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockDependency, ...input },
        error: null,
      })

      const result = await createDependency(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('task_dependencies')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          predecessor_id: 'task-1',
          successor_id: 'task-2',
        })
      )
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('creates a dependency with all optional fields', async () => {
      const input: CreateDependencyInput = {
        predecessor_id: 'task-1',
        successor_id: 'task-3',
        dependency_type: 'start_to_start',
        lag_days: 2,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockDependency, ...input, id: 'dep-2' },
        error: null,
      })

      const result = await createDependency(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          dependency_type: 'start_to_start',
          lag_days: 2,
        })
      )
      expect(result.data?.dependency_type).toBe('start_to_start')
    })

    it('returns error when creation fails', async () => {
      const input: CreateDependencyInput = {
        predecessor_id: 'task-1',
        successor_id: 'task-2',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      const result = await createDependency(input)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database error')
    })

    it('sets default values for optional fields', async () => {
      const input: CreateDependencyInput = {
        predecessor_id: 'task-1',
        successor_id: 'task-2',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockDependency,
        error: null,
      })

      await createDependency(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          dependency_type: 'finish_to_start',
          lag_days: 0,
        })
      )
    })

    it('validates predecessor_id is provided', async () => {
      const input = {
        successor_id: 'task-2',
      } as CreateDependencyInput

      const result = await createDependency(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('predecessor')
    })

    it('validates successor_id is provided', async () => {
      const input = {
        predecessor_id: 'task-1',
      } as CreateDependencyInput

      const result = await createDependency(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('successor')
    })

    it('validates predecessor and successor are different', async () => {
      const input: CreateDependencyInput = {
        predecessor_id: 'task-1',
        successor_id: 'task-1',
      }

      const result = await createDependency(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('different')
    })

    it('validates dependency_type is valid', async () => {
      const input: CreateDependencyInput = {
        predecessor_id: 'task-1',
        successor_id: 'task-2',
        dependency_type: 'invalid_type' as Dependency['dependency_type'],
      }

      const result = await createDependency(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('dependency_type')
    })
  })

  describe('getDependency', () => {
    it('retrieves a dependency by ID', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockDependency,
        error: null,
      })

      const result = await getDependency('dep-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('task_dependencies')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'dep-1')
      expect(result.data).toEqual(mockDependency)
    })

    it('returns null when dependency not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await getDependency('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns error on database failure', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection error', code: '500' },
      })

      const result = await getDependency('dep-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('getDependencies', () => {
    it('retrieves all dependencies for a project', async () => {
      const dependencies = [
        mockDependency,
        { ...mockDependency, id: 'dep-2', successor_id: 'task-3' },
      ]

      mockSupabase.order.mockResolvedValueOnce({
        data: dependencies,
        error: null,
      })

      const result = await getDependencies('proj-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('task_dependencies')
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no dependencies exist', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getDependencies('proj-1')

      expect(result.data).toEqual([])
    })
  })

  describe('getDependenciesForTask', () => {
    it('retrieves dependencies where task is predecessor', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockDependency],
        error: null,
      })

      const result = await getDependenciesForTask('task-1')

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'predecessor_id.eq.task-1,successor_id.eq.task-1'
      )
      expect(result.data).toHaveLength(1)
    })

    it('retrieves dependencies where task is successor', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockDependency],
        error: null,
      })

      const result = await getDependenciesForTask('task-2')

      expect(mockSupabase.or).toHaveBeenCalledWith(
        'predecessor_id.eq.task-2,successor_id.eq.task-2'
      )
      expect(result.data).toHaveLength(1)
    })

    it('returns empty array when task has no dependencies', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getDependenciesForTask('task-5')

      expect(result.data).toEqual([])
    })
  })

  describe('updateDependency', () => {
    it('updates dependency fields', async () => {
      const updates: UpdateDependencyInput = {
        dependency_type: 'finish_to_finish',
        lag_days: 3,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockDependency, ...updates },
        error: null,
      })

      const result = await updateDependency('dep-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('task_dependencies')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          dependency_type: 'finish_to_finish',
          lag_days: 3,
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'dep-1')
      expect(result.data?.dependency_type).toBe('finish_to_finish')
    })

    it('updates only lag_days', async () => {
      const updates: UpdateDependencyInput = {
        lag_days: 5,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockDependency, lag_days: 5 },
        error: null,
      })

      const result = await updateDependency('dep-1', updates)

      expect(result.data?.lag_days).toBe(5)
    })

    it('returns error when update fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: '500' },
      })

      const result = await updateDependency('dep-1', { lag_days: 2 })

      expect(result.error).toBeDefined()
    })

    it('validates dependency_type on update', async () => {
      const result = await updateDependency('dep-1', {
        dependency_type: 'invalid' as Dependency['dependency_type'],
      })

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('dependency_type')
    })
  })

  describe('deleteDependency', () => {
    it('deletes a dependency by ID', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await deleteDependency('dep-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('task_dependencies')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'dep-1')
      expect(result.error).toBeNull()
    })

    it('returns error when delete fails', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: '500' },
      })

      const result = await deleteDependency('dep-1')

      expect(result.error).toBeDefined()
    })
  })
})
