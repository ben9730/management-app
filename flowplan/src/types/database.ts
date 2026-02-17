/**
 * Database Types for Supabase
 *
 * This file contains TypeScript types that match our database schema.
 * These types are used by the Supabase client for type safety.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string
          name: string
          description: string | null
          status: 'active' | 'completed' | 'archived'
          start_date: string | null
          end_date: string | null
          created_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          status?: 'active' | 'completed' | 'archived'
          start_date?: string | null
          end_date?: string | null
          created_by?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      project_phases: {
        Row: {
          id: string
          project_id: string
          name: string
          description: string | null
          phase_order: number
          status: 'pending' | 'active' | 'completed'
          start_date: string | null
          end_date: string | null
          total_tasks: number
          completed_tasks: number
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          name: string
          description?: string | null
          phase_order: number
          status?: 'pending' | 'active' | 'completed'
          start_date?: string | null
          end_date?: string | null
          total_tasks?: number
          completed_tasks?: number
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          name?: string
          description?: string | null
          phase_order?: number
          status?: 'pending' | 'active' | 'completed'
          start_date?: string | null
          end_date?: string | null
          total_tasks?: number
          completed_tasks?: number
          created_at?: string
        }
      }
      tasks: {
        Row: {
          id: string
          project_id: string
          phase_id: string | null
          title: string
          description: string | null
          status: 'pending' | 'in_progress' | 'done'
          priority: 'low' | 'medium' | 'high' | 'critical'
          assignee_id: string | null
          duration: number
          estimated_hours: number | null
          start_date: string | null
          end_date: string | null
          es: string | null
          ef: string | null
          ls: string | null
          lf: string | null
          slack: number
          is_critical: boolean
          constraint_type: string | null
          constraint_date: string | null
          scheduling_mode: string
          percent_complete: number
          actual_start_date: string | null
          actual_finish_date: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          project_id: string
          phase_id?: string | null
          title: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          assignee_id?: string | null
          duration?: number
          estimated_hours?: number | null
          start_date?: string | null
          end_date?: string | null
          es?: string | null
          ef?: string | null
          ls?: string | null
          lf?: string | null
          slack?: number
          is_critical?: boolean
          constraint_type?: string | null
          constraint_date?: string | null
          scheduling_mode?: string
          percent_complete?: number
          actual_start_date?: string | null
          actual_finish_date?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          phase_id?: string | null
          title?: string
          description?: string | null
          status?: 'pending' | 'in_progress' | 'done'
          priority?: 'low' | 'medium' | 'high' | 'critical'
          assignee_id?: string | null
          duration?: number
          estimated_hours?: number | null
          start_date?: string | null
          end_date?: string | null
          es?: string | null
          ef?: string | null
          ls?: string | null
          lf?: string | null
          slack?: number
          is_critical?: boolean
          constraint_type?: string | null
          constraint_date?: string | null
          scheduling_mode?: string
          percent_complete?: number
          actual_start_date?: string | null
          actual_finish_date?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      dependencies: {
        Row: {
          id: string
          predecessor_id: string
          successor_id: string
          type: 'FS' | 'SS' | 'FF' | 'SF'
          lag_days: number
          created_at: string
        }
        Insert: {
          id?: string
          predecessor_id: string
          successor_id: string
          type?: 'FS' | 'SS' | 'FF' | 'SF'
          lag_days?: number
          created_at?: string
        }
        Update: {
          id?: string
          predecessor_id?: string
          successor_id?: string
          type?: 'FS' | 'SS' | 'FF' | 'SF'
          lag_days?: number
          created_at?: string
        }
      }
      audit_findings: {
        Row: {
          id: string
          task_id: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          finding: string
          root_cause: string | null
          capa: string | null
          due_date: string | null
          status: 'open' | 'in_progress' | 'closed'
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          severity: 'critical' | 'high' | 'medium' | 'low'
          finding: string
          root_cause?: string | null
          capa?: string | null
          due_date?: string | null
          status?: 'open' | 'in_progress' | 'closed'
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          severity?: 'critical' | 'high' | 'medium' | 'low'
          finding?: string
          root_cause?: string | null
          capa?: string | null
          due_date?: string | null
          status?: 'open' | 'in_progress' | 'closed'
          created_at?: string
        }
      }
      calendar_exceptions: {
        Row: {
          id: string
          project_id: string
          date: string // start_date for date ranges
          end_date: string | null // end_date for multi-day exceptions
          type: 'holiday' | 'non_working'
          name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          project_id: string
          date: string
          end_date?: string | null
          type: 'holiday' | 'non_working'
          name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          project_id?: string
          date?: string
          end_date?: string | null
          type?: 'holiday' | 'non_working'
          name?: string | null
          created_at?: string
        }
      }
      team_members: {
        Row: {
          id: string
          user_id: string
          project_id: string
          employment_type: 'full_time' | 'part_time' | 'contractor'
          work_hours_per_day: number
          work_days: number[]
          role: 'admin' | 'member'
          hourly_rate: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          project_id: string
          employment_type?: 'full_time' | 'part_time' | 'contractor'
          work_hours_per_day?: number
          work_days?: number[]
          role?: 'admin' | 'member'
          hourly_rate?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          project_id?: string
          employment_type?: 'full_time' | 'part_time' | 'contractor'
          work_hours_per_day?: number
          work_days?: number[]
          role?: 'admin' | 'member'
          hourly_rate?: number | null
          created_at?: string
        }
      }
      employee_time_off: {
        Row: {
          id: string
          user_id: string
          start_date: string
          end_date: string
          type: 'vacation' | 'sick' | 'personal' | 'other'
          status: 'pending' | 'approved' | 'rejected'
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          start_date: string
          end_date: string
          type: 'vacation' | 'sick' | 'personal' | 'other'
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          start_date?: string
          end_date?: string
          type?: 'vacation' | 'sick' | 'personal' | 'other'
          status?: 'pending' | 'approved' | 'rejected'
          notes?: string | null
          created_at?: string
        }
      }
      task_assignments: {
        Row: {
          id: string
          task_id: string
          user_id: string
          allocated_hours: number
          actual_hours: number
          start_date: string | null
          end_date: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          task_id: string
          user_id: string
          allocated_hours: number
          actual_hours?: number
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          task_id?: string
          user_id?: string
          allocated_hours?: number
          actual_hours?: number
          start_date?: string | null
          end_date?: string | null
          notes?: string | null
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
  }
}

// Helper types for easier access
export type Tables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Row']

export type InsertTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Insert']

export type UpdateTables<T extends keyof Database['public']['Tables']> =
  Database['public']['Tables'][T]['Update']
