/**
 * useTeamMembers Hook Tests (TDD)
 *
 * Tests for React Query hooks for team members data fetching.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement } from 'react'
import {
  useTeamMembers,
  useTeamMember,
  useTeamMembersByProject,
  useCreateTeamMember,
  useUpdateTeamMember,
  useDeleteTeamMember,
} from './use-team-members'
import * as teamMembersService from '@/services/team-members'
import type { TeamMember } from '@/types/entities'

// Mock the Supabase client to prevent env var errors
vi.mock('@/lib/supabase', () => ({
  supabase: {},
}))

// Mock the team members service
vi.mock('@/services/team-members')

const mockTeamMember: TeamMember = {
  id: 'member-1',
  organization_id: 'org-1',
  user_id: 'user-1',
  display_name: 'יוסי כהן',
  email: 'yossi@example.com',
  avatar_url: null,
  role: 'member',
  hourly_rate: 150,
  weekly_capacity_hours: 40,
  skills: ['audit', 'compliance'],
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
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

describe('useTeamMembers Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('useTeamMembers', () => {
    it('fetches all team members for an organization', async () => {
      const members = [
        mockTeamMember,
        { ...mockTeamMember, id: 'member-2', display_name: 'דנה לוי' },
      ]
      vi.mocked(teamMembersService.getTeamMembers).mockResolvedValueOnce({
        data: members,
        error: null,
      })

      const { result } = renderHook(() => useTeamMembers('org-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(teamMembersService.getTeamMembers).toHaveBeenCalledWith('org-1', undefined)
    })

    it('applies filters when provided', async () => {
      vi.mocked(teamMembersService.getTeamMembers).mockResolvedValueOnce({
        data: [mockTeamMember],
        error: null,
      })

      const { result } = renderHook(
        () => useTeamMembers('org-1', { is_active: true, role: 'admin' }),
        { wrapper: createWrapper() }
      )

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(teamMembersService.getTeamMembers).toHaveBeenCalledWith('org-1', {
        is_active: true,
        role: 'admin',
      })
    })

    it('returns empty array when no team members exist', async () => {
      vi.mocked(teamMembersService.getTeamMembers).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useTeamMembers('org-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('handles error state', async () => {
      vi.mocked(teamMembersService.getTeamMembers).mockResolvedValueOnce({
        data: null,
        error: { message: 'Failed to fetch team members' },
      })

      const { result } = renderHook(() => useTeamMembers('org-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))

      expect(result.current.error).toBeDefined()
    })
  })

  describe('useTeamMember', () => {
    it('fetches a single team member by ID', async () => {
      vi.mocked(teamMembersService.getTeamMember).mockResolvedValueOnce({
        data: mockTeamMember,
        error: null,
      })

      const { result } = renderHook(() => useTeamMember('member-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual(mockTeamMember)
      expect(teamMembersService.getTeamMember).toHaveBeenCalledWith('member-1')
    })

    it('is disabled when ID is not provided', () => {
      const { result } = renderHook(() => useTeamMember(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('handles not found state', async () => {
      vi.mocked(teamMembersService.getTeamMember).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useTeamMember('non-existent'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toBeNull()
    })
  })

  describe('useTeamMembersByProject', () => {
    it('fetches team members for a specific project', async () => {
      const members = [
        mockTeamMember,
        { ...mockTeamMember, id: 'member-2', display_name: 'רונית שרון' },
      ]
      vi.mocked(teamMembersService.getTeamMembersByProject).mockResolvedValueOnce({
        data: members,
        error: null,
      })

      const { result } = renderHook(() => useTeamMembersByProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(2)
      expect(teamMembersService.getTeamMembersByProject).toHaveBeenCalledWith('proj-1')
    })

    it('is disabled when project ID is not provided', () => {
      const { result } = renderHook(() => useTeamMembersByProject(''), {
        wrapper: createWrapper(),
      })

      expect(result.current.fetchStatus).toBe('idle')
    })

    it('returns empty array when no members assigned', async () => {
      vi.mocked(teamMembersService.getTeamMembersByProject).mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const { result } = renderHook(() => useTeamMembersByProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toEqual([])
    })

    it('handles error state', async () => {
      vi.mocked(teamMembersService.getTeamMembersByProject).mockResolvedValueOnce({
        data: null,
        error: { message: 'Project not found' },
      })

      const { result } = renderHook(() => useTeamMembersByProject('proj-1'), {
        wrapper: createWrapper(),
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useCreateTeamMember', () => {
    it('creates a new team member', async () => {
      vi.mocked(teamMembersService.createTeamMember).mockResolvedValueOnce({
        data: mockTeamMember,
        error: null,
      })

      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        organization_id: 'org-1',
        display_name: 'יוסי כהן',
        email: 'yossi@example.com',
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(teamMembersService.createTeamMember).toHaveBeenCalledWith({
        organization_id: 'org-1',
        display_name: 'יוסי כהן',
        email: 'yossi@example.com',
      })
    })

    it('creates team member with all optional fields', async () => {
      const fullMember = {
        ...mockTeamMember,
        role: 'admin' as const,
        hourly_rate: 200,
        skills: ['leadership', 'compliance'],
      }
      vi.mocked(teamMembersService.createTeamMember).mockResolvedValueOnce({
        data: fullMember,
        error: null,
      })

      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        organization_id: 'org-1',
        display_name: 'יוסי כהן',
        email: 'yossi@example.com',
        role: 'admin',
        hourly_rate: 200,
        skills: ['leadership', 'compliance'],
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(teamMembersService.createTeamMember).toHaveBeenCalledWith({
        organization_id: 'org-1',
        display_name: 'יוסי כהן',
        email: 'yossi@example.com',
        role: 'admin',
        hourly_rate: 200,
        skills: ['leadership', 'compliance'],
      })
    })

    it('handles creation error - invalid email', async () => {
      vi.mocked(teamMembersService.createTeamMember).mockResolvedValueOnce({
        data: null,
        error: { message: 'Valid email is required' },
      })

      const { result } = renderHook(() => useCreateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        organization_id: 'org-1',
        display_name: 'Test',
        email: 'invalid-email',
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useUpdateTeamMember', () => {
    it('updates an existing team member', async () => {
      const updatedMember = { ...mockTeamMember, display_name: 'יוסי כהן-לוי' }
      vi.mocked(teamMembersService.updateTeamMember).mockResolvedValueOnce({
        data: updatedMember,
        error: null,
      })

      const { result } = renderHook(() => useUpdateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'member-1',
        updates: { display_name: 'יוסי כהן-לוי' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(teamMembersService.updateTeamMember).toHaveBeenCalledWith('member-1', {
        display_name: 'יוסי כהן-לוי',
      })
    })

    it('updates team member role', async () => {
      const updatedMember = { ...mockTeamMember, role: 'admin' as const }
      vi.mocked(teamMembersService.updateTeamMember).mockResolvedValueOnce({
        data: updatedMember,
        error: null,
      })

      const { result } = renderHook(() => useUpdateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'member-1',
        updates: { role: 'admin' },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(teamMembersService.updateTeamMember).toHaveBeenCalledWith('member-1', {
        role: 'admin',
      })
    })

    it('deactivates team member', async () => {
      const deactivatedMember = { ...mockTeamMember, is_active: false }
      vi.mocked(teamMembersService.updateTeamMember).mockResolvedValueOnce({
        data: deactivatedMember,
        error: null,
      })

      const { result } = renderHook(() => useUpdateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'member-1',
        updates: { is_active: false },
      })

      await waitFor(() => expect(result.current.isSuccess).toBe(true))
    })

    it('handles update error', async () => {
      vi.mocked(teamMembersService.updateTeamMember).mockResolvedValueOnce({
        data: null,
        error: { message: 'Invalid email format' },
      })

      const { result } = renderHook(() => useUpdateTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate({
        id: 'member-1',
        updates: { email: 'invalid' },
      })

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })

  describe('useDeleteTeamMember', () => {
    it('deletes a team member', async () => {
      vi.mocked(teamMembersService.deleteTeamMember).mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const { result } = renderHook(() => useDeleteTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('member-1')

      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(teamMembersService.deleteTeamMember).toHaveBeenCalledWith('member-1')
    })

    it('handles delete error', async () => {
      vi.mocked(teamMembersService.deleteTeamMember).mockResolvedValueOnce({
        data: null,
        error: { message: 'Member not found' },
      })

      const { result } = renderHook(() => useDeleteTeamMember(), {
        wrapper: createWrapper(),
      })

      result.current.mutate('non-existent')

      await waitFor(() => expect(result.current.isError).toBe(true))
    })
  })
})
