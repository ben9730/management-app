/**
 * Projects Service Tests (TDD)
 *
 * Tests for project CRUD operations service layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createProject,
  getProject,
  getProjects,
  updateProject,
  deleteProject,
  type CreateProjectInput,
  type UpdateProjectInput,
} from './projects'
import type { Project } from '@/types/entities'

// Mock Supabase client - use vi.hoisted to properly hoist the mock
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
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
mockSupabase.order.mockReturnValue(mockSupabase)

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockProject: Project = {
  id: 'proj-1',
  organization_id: 'org-1',
  name: 'Test Project',
  description: 'Test description',
  status: 'active',
  methodology: 'waterfall',
  start_date: '2026-01-15',
  target_end_date: '2026-03-31',
  actual_end_date: null,
  budget_amount: 100000,
  budget_currency: 'ILS',
  owner_id: 'user-1',
  working_days: [0, 1, 2, 3, 4],
  default_work_hours: 9,
  created_at: '2026-01-10T00:00:00Z',
  updated_at: '2026-01-10T00:00:00Z',
}

describe('Projects Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createProject', () => {
    it('creates a project with required fields', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: 'New Project',
        owner_id: 'user-1',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...input },
        error: null,
      })

      const result = await createProject(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        organization_id: 'org-1',
        name: 'New Project',
        owner_id: 'user-1',
      }))
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('creates a project with all optional fields', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: 'Full Project',
        description: 'Full description',
        status: 'planning',
        methodology: 'agile',
        start_date: '2026-02-01',
        target_end_date: '2026-06-30',
        budget_amount: 200000,
        budget_currency: 'USD',
        owner_id: 'user-1',
        working_days: [1, 2, 3, 4, 5],
        default_work_hours: 8,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...input, id: 'proj-2' },
        error: null,
      })

      const result = await createProject(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        description: 'Full description',
        methodology: 'agile',
        budget_amount: 200000,
      }))
      expect(result.data?.name).toBe('Full Project')
    })

    it('returns error when creation fails', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: 'Failing Project',
        owner_id: 'user-1',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      const result = await createProject(input)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database error')
    })

    it('sets default values for optional fields', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: 'Minimal Project',
        owner_id: 'user-1',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

      await createProject(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        status: 'planning',
        working_days: [0, 1, 2, 3, 4],
        default_work_hours: 9,
      }))
    })
  })

  describe('getProject', () => {
    it('retrieves a project by ID', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

      const result = await getProject('proj-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'proj-1')
      expect(result.data).toEqual(mockProject)
    })

    it('returns null when project not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await getProject('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns error on database failure', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection error', code: '500' },
      })

      const result = await getProject('proj-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('getProjects', () => {
    it('retrieves all projects for an organization', async () => {
      const projects = [mockProject, { ...mockProject, id: 'proj-2', name: 'Project 2' }]

      mockSupabase.order.mockResolvedValueOnce({
        data: projects,
        error: null,
      })

      const result = await getProjects('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no projects exist', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getProjects('org-1')

      expect(result.data).toEqual([])
    })

    it('filters by status when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockProject],
        error: null,
      })

      await getProjects('org-1', { status: 'active' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
    })

    it('filters by owner when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockProject],
        error: null,
      })

      await getProjects('org-1', { owner_id: 'user-1' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('owner_id', 'user-1')
    })
  })

  describe('updateProject', () => {
    it('updates project fields', async () => {
      const updates: UpdateProjectInput = {
        name: 'Updated Name',
        description: 'Updated description',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...updates },
        error: null,
      })

      const result = await updateProject('proj-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.update).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Updated Name',
        description: 'Updated description',
      }))
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'proj-1')
      expect(result.data?.name).toBe('Updated Name')
    })

    it('updates project status', async () => {
      const updates: UpdateProjectInput = {
        status: 'completed',
        actual_end_date: '2026-03-15',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...updates },
        error: null,
      })

      const result = await updateProject('proj-1', updates)

      expect(result.data?.status).toBe('completed')
      expect(result.data?.actual_end_date).toBe('2026-03-15')
    })

    it('returns error when update fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: '500' },
      })

      const result = await updateProject('proj-1', { name: 'New Name' })

      expect(result.error).toBeDefined()
    })

    it('sets updated_at timestamp', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

      await updateProject('proj-1', { name: 'New Name' })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })
  })

  describe('deleteProject', () => {
    it('deletes a project by ID', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await deleteProject('proj-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'proj-1')
      expect(result.error).toBeNull()
    })

    it('returns error when delete fails', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: '500' },
      })

      const result = await deleteProject('proj-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('Validation', () => {
    it('throws error when name is empty', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: '',
        owner_id: 'user-1',
      }

      const result = await createProject(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('name')
    })

    it('throws error when organization_id is missing', async () => {
      const input = {
        name: 'Test',
        owner_id: 'user-1',
      } as CreateProjectInput

      const result = await createProject(input)

      expect(result.error).toBeDefined()
    })

    it('validates working_days array values', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: 'Test Project',
        owner_id: 'user-1',
        working_days: [0, 1, 2, 7], // 7 is invalid
      }

      const result = await createProject(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('working_days')
    })

    it('validates budget_amount is positive', async () => {
      const input: CreateProjectInput = {
        organization_id: 'org-1',
        name: 'Test Project',
        owner_id: 'user-1',
        budget_amount: -1000,
      }

      const result = await createProject(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('budget')
    })
  })
})
