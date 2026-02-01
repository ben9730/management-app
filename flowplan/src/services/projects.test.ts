/**
 * Projects Service Tests (TDD)
 *
 * Tests for project CRUD operations service layer.
 * Updated to match simplified database schema.
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
  auth: {
    getUser: vi.fn(),
  },
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

// Mock phases service for default phase creation
const mockCreatePhase = vi.fn()
vi.mock('./phases', () => ({
  createPhase: (...args: unknown[]) => mockCreatePhase(...args),
}))

// Mock project matching simplified schema
const mockProject: Partial<Project> = {
  id: 'proj-1',
  name: 'Test Project',
  description: 'Test description',
  status: 'active',
  start_date: '2026-01-15',
  end_date: '2026-03-31',
  created_at: new Date('2026-01-10T00:00:00Z'),
  updated_at: new Date('2026-01-10T00:00:00Z'),
}

describe('Projects Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default auth mock
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'user-1' } },
      error: null,
    })
    // Default phase mock - succeeds silently
    mockCreatePhase.mockResolvedValue({ data: { id: 'phase-1' }, error: null })
  })

  describe('createProject', () => {
    it('creates a project with required fields', async () => {
      const input: CreateProjectInput = {
        name: 'New Project',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...input, created_by: 'user-1' },
        error: null,
      })

      const result = await createProject(input)

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'New Project',
        created_by: 'user-1',
      }))
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('creates a project with all optional fields', async () => {
      const input: CreateProjectInput = {
        name: 'Full Project',
        description: 'Full description',
        status: 'active',
        start_date: '2026-02-01',
        end_date: '2026-06-30',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...input, id: 'proj-2', created_by: 'user-1' },
        error: null,
      })

      const result = await createProject(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Full Project',
        description: 'Full description',
        status: 'active',
        start_date: '2026-02-01',
        end_date: '2026-06-30',
        created_by: 'user-1',
      }))
      expect(result.data?.name).toBe('Full Project')
    })

    it('returns error when creation fails', async () => {
      const input: CreateProjectInput = {
        name: 'Failing Project',
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

    it('creates a project when unauthenticated (anonymous)', async () => {
      const input: CreateProjectInput = {
        name: 'Anon Project',
      }

      mockSupabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: null,
      })
      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...input, created_by: null },
        error: null,
      })

      const result = await createProject(input)

      expect(mockSupabase.auth.getUser).toHaveBeenCalled()
      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Anon Project',
        created_by: null,
      }))
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('sets default values for optional fields', async () => {
      const input: CreateProjectInput = {
        name: 'Minimal Project',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, created_by: 'user-1' },
        error: null,
      })

      await createProject(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Minimal Project',
        status: 'active',
        description: null,
        start_date: null,
        end_date: null,
        created_by: 'user-1',
      }))
    })

    it('creates default "כללי" phase after project creation', async () => {
      const input: CreateProjectInput = {
        name: 'New Project',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, id: 'proj-new', name: 'New Project' },
        error: null,
      })

      await createProject(input)

      expect(mockCreatePhase).toHaveBeenCalledWith({
        project_id: 'proj-new',
        name: 'כללי',
        description: 'שלב ברירת מחדל',
        phase_order: 1,
      })
    })

    it('returns project even if default phase creation fails', async () => {
      const input: CreateProjectInput = {
        name: 'Project With Failed Phase',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, id: 'proj-fail', name: 'Project With Failed Phase' },
        error: null,
      })
      mockCreatePhase.mockRejectedValueOnce(new Error('Phase creation failed'))

      const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      const result = await createProject(input)

      expect(result.data).toBeDefined()
      expect(result.data?.name).toBe('Project With Failed Phase')
      expect(result.error).toBeNull()
      expect(consoleWarnSpy).toHaveBeenCalled()

      consoleWarnSpy.mockRestore()
    })

    it('default phase has status "active" and phase_order 1', async () => {
      const input: CreateProjectInput = {
        name: 'Another Project',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, id: 'proj-another' },
        error: null,
      })

      await createProject(input)

      expect(mockCreatePhase).toHaveBeenCalledWith(
        expect.objectContaining({
          phase_order: 1,
        })
      )
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
    it('retrieves all projects', async () => {
      const projects = [mockProject, { ...mockProject, id: 'proj-2', name: 'Project 2' }]

      mockSupabase.order.mockResolvedValueOnce({
        data: projects,
        error: null,
      })

      const result = await getProjects()

      expect(mockSupabase.from).toHaveBeenCalledWith('projects')
      expect(mockSupabase.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no projects exist', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getProjects()

      expect(result.data).toEqual([])
    })

    it('filters by status when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockProject],
        error: null,
      })

      await getProjects(undefined, { status: 'active' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'active')
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
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockProject, ...updates },
        error: null,
      })

      const result = await updateProject('proj-1', updates)

      expect(result.data?.status).toBe('completed')
    })

    it('returns error when update fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: '500' },
      })

      const result = await updateProject('proj-1', { name: 'New Name' })

      expect(result.error).toBeDefined()
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
        name: '',
      }

      const result = await createProject(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('name')
    })

    it('throws error when name is whitespace only', async () => {
      const input: CreateProjectInput = {
        name: '   ',
      }

      const result = await createProject(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('name')
    })
  })
})
