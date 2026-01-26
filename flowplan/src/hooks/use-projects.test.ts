/**
 * useProjects Hook Tests (TDD)
 *
 * Tests for React Query hooks for projects data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useProjects,
  useProject,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
} from './use-projects'
import * as projectsService from '@/services/projects'
import type { Project } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the projects service
vi.mock('@/services/projects')

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

// Create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return createElement(QueryClientProvider, { client: queryClient }, children)
  }
}

describe('useProjects Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useProjects', () => {
    it('fetches projects for an organization', async () => {
      const projects = [mockProject, { ...mockProject, id: 'proj-2', name: 'Project 2' }]
      vi.mocked(projectsService.getProjects).mockResolvedValueOnce({
        data: projects,
        error: null,
      })

      const { result } = renderHook(() => useProjects('org-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(projectsService.getProjects).toHaveBeenCalledWith('org-1', undefined)
    })

    it('applies filters when provided', async () => {
      vi.mocked(projectsService.getProjects).mockResolvedValueOnce({
        data: [mockProject],
        error: null,
      })

      const { result } = renderHook(
        () => useProjects('org-1', { status: 'active' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(projectsService.getProjects).toHaveBeenCalledWith('org-1', {
        status: 'active',
      })
    })

    it('handles error state', async () => {
      vi.mocked(projectsService.getProjects).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch' },
      })

      const { result } = renderHook(() => useProjects('org-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })

    it('returns empty array when no projects', async () => {
      vi.mocked(projectsService.getProjects).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useProjects('org-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })
  })

  describe('useProject', () => {
    it('fetches a single project by ID', async () => {
      vi.mocked(projectsService.getProject).mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

      const { result } = renderHook(() => useProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockProject)
      expect(projectsService.getProject).toHaveBeenCalledWith('proj-1')
    })

    it('returns null for non-existent project', async () => {
      vi.mocked(projectsService.getProject).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useProject('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => useProject(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })
  })

  describe('useCreateProject', () => {
    it('creates a new project', async () => {
      vi.mocked(projectsService.createProject).mockResolvedValueOnce({
        data: mockProject,
        error: null,
      })

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        organization_id: 'org-1',
        name: 'New Project',
        owner_id: 'user-1',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(projectsService.createProject).toHaveBeenCalledWith({
        organization_id: 'org-1',
        name: 'New Project',
        owner_id: 'user-1',
      })
    })

    it('handles creation error', async () => {
      vi.mocked(projectsService.createProject).mockResolvedValueOnce({
        data: null,
        error: { message: 'Creation failed' },
      })

      const { result } = renderHook(() => useCreateProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        organization_id: 'org-1',
        name: 'Failing Project',
        owner_id: 'user-1',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateProject', () => {
    it('updates an existing project', async () => {
      const updatedProject = { ...mockProject, name: 'Updated Name' }
      vi.mocked(projectsService.updateProject).mockResolvedValueOnce({
        data: updatedProject,
        error: null,
      })

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'proj-1',
        updates: { name: 'Updated Name' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(projectsService.updateProject).toHaveBeenCalledWith('proj-1', {
        name: 'Updated Name',
      })
    })

    it('handles update error', async () => {
      vi.mocked(projectsService.updateProject).mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      })

      const { result } = renderHook(() => useUpdateProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'proj-1',
        updates: { name: 'New Name' },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteProject', () => {
    it('deletes a project', async () => {
      vi.mocked(projectsService.deleteProject).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('proj-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(projectsService.deleteProject).toHaveBeenCalledWith('proj-1')
    })

    it('handles delete error', async () => {
      vi.mocked(projectsService.deleteProject).mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed' },
      })

      const { result } = renderHook(() => useDeleteProject(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('proj-1')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})
