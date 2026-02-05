/**
 * Team Members Service Tests (TDD)
 *
 * Tests for team member CRUD operations service layer.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  createTeamMember,
  getTeamMember,
  getTeamMembers,
  updateTeamMember,
  deleteTeamMember,
  getTeamMembersByProject,
  type CreateTeamMemberInput,
  type UpdateTeamMemberInput,
} from './team-members'
import type { TeamMember } from '@/types/entities'

// Mock Supabase client - use vi.hoisted to properly hoist the mock
const mockSupabase = vi.hoisted(() => ({
  from: vi.fn(),
  select: vi.fn(),
  insert: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  eq: vi.fn(),
  lte: vi.fn(),
  gte: vi.fn(),
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
mockSupabase.lte.mockReturnValue(mockSupabase)
mockSupabase.gte.mockReturnValue(mockSupabase)
mockSupabase.order.mockReturnValue(mockSupabase)

vi.mock('@/lib/supabase', () => ({
  supabase: mockSupabase,
}))

const mockTeamMember: TeamMember = {
  id: 'member-1',
  organization_id: 'org-1',
  user_id: 'user-1',
  display_name: 'John Doe',
  email: 'john@example.com',
  avatar_url: null,
  role: 'member',
  hourly_rate: 100,
  weekly_capacity_hours: 40,
  skills: ['TypeScript', 'React'],
  is_active: true,
  created_at: '2026-01-15T10:00:00Z',
  updated_at: '2026-01-15T10:00:00Z',
}

describe('Team Members Service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset chainable mocks
    mockSupabase.from.mockReturnValue(mockSupabase)
    mockSupabase.select.mockReturnValue(mockSupabase)
    mockSupabase.insert.mockReturnValue(mockSupabase)
    mockSupabase.update.mockReturnValue(mockSupabase)
    mockSupabase.delete.mockReturnValue(mockSupabase)
    mockSupabase.eq.mockReturnValue(mockSupabase)
    mockSupabase.lte.mockReturnValue(mockSupabase)
    mockSupabase.gte.mockReturnValue(mockSupabase)
    mockSupabase.order.mockReturnValue(mockSupabase)
  })

  describe('createTeamMember', () => {
    it('creates a team member with required fields', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: 'Jane Doe',
        email: 'jane@example.com',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTeamMember, ...input },
        error: null,
      })

      const result = await createTeamMember(input)

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members')
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          organization_id: 'org-1',
          display_name: 'Jane Doe',
          email: 'jane@example.com',
        })
      )
      expect(result.data).toBeDefined()
      expect(result.error).toBeNull()
    })

    it('creates a team member with all optional fields', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        user_id: 'user-2',
        display_name: 'Bob Smith',
        email: 'bob@example.com',
        avatar_url: 'https://example.com/avatar.jpg',
        role: 'admin',
        hourly_rate: 150,
        weekly_capacity_hours: 35,
        skills: ['Node.js', 'PostgreSQL'],
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTeamMember, ...input, id: 'member-2' },
        error: null,
      })

      const result = await createTeamMember(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'admin',
          hourly_rate: 150,
          skills: ['Node.js', 'PostgreSQL'],
        })
      )
      expect(result.data?.display_name).toBe('Bob Smith')
    })

    it('returns error when creation fails', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: 'Test Member',
        email: 'test@example.com',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      const result = await createTeamMember(input)

      expect(result.data).toBeNull()
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database error')
    })

    it('sets default values for optional fields', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: 'Minimal Member',
        email: 'minimal@example.com',
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: mockTeamMember,
        error: null,
      })

      await createTeamMember(input)

      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          role: 'member',
          weekly_capacity_hours: 40,
          is_active: true,
          skills: [],
        })
      )
    })

    it('validates organization_id is provided', async () => {
      const input = {
        display_name: 'Test',
        email: 'test@example.com',
      } as CreateTeamMemberInput

      const result = await createTeamMember(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('organization')
    })

    it('validates display_name is not empty', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: '',
        email: 'test@example.com',
      }

      const result = await createTeamMember(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('display_name')
    })

    it('validates email format', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: 'Test Member',
        email: 'invalid-email',
      }

      const result = await createTeamMember(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('email')
    })

    it('validates hourly_rate is positive', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: 'Test Member',
        email: 'test@example.com',
        hourly_rate: -50,
      }

      const result = await createTeamMember(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('hourly_rate')
    })

    it('validates weekly_capacity_hours is positive', async () => {
      const input: CreateTeamMemberInput = {
        organization_id: 'org-1',
        display_name: 'Test Member',
        email: 'test@example.com',
        weekly_capacity_hours: -10,
      }

      const result = await createTeamMember(input)

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('weekly_capacity')
    })
  })

  describe('getTeamMember', () => {
    it('retrieves a team member by ID', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: mockTeamMember,
        error: null,
      })

      const result = await getTeamMember('member-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members')
      expect(mockSupabase.select).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'member-1')
      expect(result.data).toEqual(mockTeamMember)
    })

    it('returns null when team member not found', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await getTeamMember('non-existent')

      expect(result.data).toBeNull()
      expect(result.error).toBeNull()
    })

    it('returns error on database failure', async () => {
      mockSupabase.maybeSingle.mockResolvedValueOnce({
        data: null,
        error: { message: 'Connection error', code: '500' },
      })

      const result = await getTeamMember('member-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('getTeamMembers', () => {
    it('retrieves all team members for an organization', async () => {
      const members = [
        mockTeamMember,
        { ...mockTeamMember, id: 'member-2', display_name: 'Jane Doe' },
      ]

      mockSupabase.order.mockResolvedValueOnce({
        data: members,
        error: null,
      })

      const result = await getTeamMembers('org-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members')
      expect(mockSupabase.eq).toHaveBeenCalledWith('organization_id', 'org-1')
      expect(mockSupabase.order).toHaveBeenCalledWith('display_name', {
        ascending: true,
      })
      expect(result.data).toHaveLength(2)
    })

    it('returns empty array when no team members exist', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const result = await getTeamMembers('org-1')

      expect(result.data).toEqual([])
    })

    it('filters by is_active when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTeamMember],
        error: null,
      })

      await getTeamMembers('org-1', { is_active: true })

      expect(mockSupabase.eq).toHaveBeenCalledWith('is_active', true)
    })

    it('filters by role when provided', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTeamMember],
        error: null,
      })

      await getTeamMembers('org-1', { role: 'admin' })

      expect(mockSupabase.eq).toHaveBeenCalledWith('role', 'admin')
    })
  })

  describe('getTeamMembersByProject', () => {
    it('retrieves team members assigned to a project', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTeamMember],
        error: null,
      })

      const result = await getTeamMembersByProject('proj-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('project_members')
      expect(mockSupabase.eq).toHaveBeenCalledWith('project_id', 'proj-1')
      expect(result.data).toHaveLength(1)
    })
  })

  describe('updateTeamMember', () => {
    it('updates team member fields', async () => {
      const updates: UpdateTeamMemberInput = {
        display_name: 'Updated Name',
        hourly_rate: 120,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTeamMember, ...updates },
        error: null,
      })

      const result = await updateTeamMember('member-1', updates)

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members')
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          display_name: 'Updated Name',
          hourly_rate: 120,
        })
      )
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'member-1')
      expect(result.data?.display_name).toBe('Updated Name')
    })

    it('updates skills array', async () => {
      const updates: UpdateTeamMemberInput = {
        skills: ['Python', 'Django', 'PostgreSQL'],
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTeamMember, ...updates },
        error: null,
      })

      const result = await updateTeamMember('member-1', updates)

      expect(result.data?.skills).toEqual(['Python', 'Django', 'PostgreSQL'])
    })

    it('deactivates a team member', async () => {
      const updates: UpdateTeamMemberInput = {
        is_active: false,
      }

      mockSupabase.single.mockResolvedValueOnce({
        data: { ...mockTeamMember, is_active: false },
        error: null,
      })

      const result = await updateTeamMember('member-1', updates)

      expect(result.data?.is_active).toBe(false)
    })

    it('returns error when update fails', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed', code: '500' },
      })

      const result = await updateTeamMember('member-1', { display_name: 'New Name' })

      expect(result.error).toBeDefined()
    })

    it('sets updated_at timestamp', async () => {
      mockSupabase.single.mockResolvedValueOnce({
        data: mockTeamMember,
        error: null,
      })

      await updateTeamMember('member-1', { display_name: 'New Name' })

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          updated_at: expect.any(String),
        })
      )
    })

    it('validates email format on update', async () => {
      const result = await updateTeamMember('member-1', { email: 'invalid' })

      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('email')
    })
  })

  describe('deleteTeamMember', () => {
    it('deletes a team member by ID', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: null,
      })

      const result = await deleteTeamMember('member-1')

      expect(mockSupabase.from).toHaveBeenCalledWith('team_members')
      expect(mockSupabase.delete).toHaveBeenCalled()
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'member-1')
      expect(result.error).toBeNull()
    })

    it('returns error when delete fails', async () => {
      mockSupabase.eq.mockResolvedValueOnce({
        data: null,
        error: { message: 'Delete failed', code: '500' },
      })

      const result = await deleteTeamMember('member-1')

      expect(result.error).toBeDefined()
    })
  })

  describe('checkMemberAvailability', () => {
    // Import the function dynamically to avoid issues with hoisted mocks
    const getCheckMemberAvailability = async () => {
      const module = await import('./team-members')
      return module.checkMemberAvailability
    }

    it('returns available true when no time off exists in date range', async () => {
      // Mock the employee_time_off query to return empty array
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(true)
      expect(result.conflictingTimeOff).toBeUndefined()
    })

    it('returns available false when approved vacation overlaps date range', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: '2026-02-05',
        end_date: '2026-02-08',
        type: 'vacation',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(false)
      expect(result.conflictingTimeOff).toBeDefined()
      expect(result.conflictingTimeOff?.id).toBe('timeoff-1')
    })

    it('returns available true when time off is pending (not approved)', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: '2026-02-05',
        end_date: '2026-02-08',
        type: 'vacation',
        status: 'pending',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      // The query should filter by status='approved', so return empty
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(true)
    })

    it('returns available true when time off is outside date range (before)', async () => {
      // Mock returns empty because dates don't overlap
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-15'),
        new Date('2026-02-20')
      )

      expect(result.available).toBe(true)
    })

    it('returns available true when time off is outside date range (after)', async () => {
      // Mock returns empty because dates don't overlap
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-01-01'),
        new Date('2026-01-10')
      )

      expect(result.available).toBe(true)
    })

    it('handles time off that starts during task range', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: '2026-02-08',
        end_date: '2026-02-15',
        type: 'vacation',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(false)
      expect(result.conflictingTimeOff?.start_date).toBe('2026-02-08')
    })

    it('handles time off that ends during task range', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: '2026-01-25',
        end_date: '2026-02-03',
        type: 'vacation',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(false)
    })

    it('handles time off that fully contains task range', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: '2026-01-15',
        end_date: '2026-02-28',
        type: 'vacation',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(false)
    })

    it('returns first conflicting time off when multiple exist', async () => {
      const mockTimeOffs = [
        {
          id: 'timeoff-1',
          team_member_id: 'member-1',
          start_date: '2026-02-03',
          end_date: '2026-02-05',
          type: 'vacation',
          status: 'approved',
          notes: null,
          created_at: '2026-01-15T10:00:00Z',
        },
        {
          id: 'timeoff-2',
          team_member_id: 'member-1',
          start_date: '2026-02-08',
          end_date: '2026-02-09',
          type: 'sick',
          status: 'approved',
          notes: null,
          created_at: '2026-01-16T10:00:00Z',
        },
      ]

      mockSupabase.order.mockResolvedValueOnce({
        data: mockTimeOffs,
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(false)
      // Should return the first conflicting time off
      expect(result.conflictingTimeOff?.id).toBe('timeoff-1')
    })

    it('queries employee_time_off table with correct parameters', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: [],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(mockSupabase.from).toHaveBeenCalledWith('employee_time_off')
      expect(mockSupabase.eq).toHaveBeenCalledWith('team_member_id', 'member-1')
      expect(mockSupabase.eq).toHaveBeenCalledWith('status', 'approved')
    })

    it('handles database error gracefully', async () => {
      mockSupabase.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error', code: '500' },
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      // On error, treat as available (fail-open for usability)
      expect(result.available).toBe(true)
      expect(result.error).toBeDefined()
      expect(result.error?.message).toBe('Database error')
    })

    it('handles different time off types (sick, personal, other)', async () => {
      const mockTimeOff = {
        id: 'timeoff-1',
        team_member_id: 'member-1',
        start_date: '2026-02-05',
        end_date: '2026-02-08',
        type: 'sick',
        status: 'approved',
        notes: null,
        created_at: '2026-01-15T10:00:00Z',
      }

      mockSupabase.order.mockResolvedValueOnce({
        data: [mockTimeOff],
        error: null,
      })

      const checkMemberAvailability = await getCheckMemberAvailability()
      const result = await checkMemberAvailability(
        'member-1',
        new Date('2026-02-01'),
        new Date('2026-02-10')
      )

      expect(result.available).toBe(false)
      expect(result.conflictingTimeOff?.type).toBe('sick')
    })
  })
})
