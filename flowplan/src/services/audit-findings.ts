/**
 * Audit Findings Service
 *
 * CRUD operations for audit findings using Supabase.
 */

import { supabase } from '@/lib/supabase'
import type { AuditFinding, FindingSeverity, FindingStatus } from '@/types/entities'
import type { InsertTables } from '@/types/database'

const VALID_SEVERITIES: FindingSeverity[] = ['critical', 'high', 'medium', 'low']
const VALID_STATUSES: FindingStatus[] = ['open', 'in_progress', 'closed']

export interface CreateAuditFindingInput {
  task_id: string
  severity: FindingSeverity
  finding: string
  root_cause?: string | null
  capa?: string | null
  due_date?: string | null
}

export interface UpdateAuditFindingInput {
  severity?: FindingSeverity
  finding?: string
  root_cause?: string | null
  capa?: string | null
  due_date?: string | null
  status?: FindingStatus
}

export interface AuditFindingsFilter {
  severity?: FindingSeverity
  status?: FindingStatus
}

interface ServiceResult<T> {
  data: T | null
  error: { message: string; code?: string } | null
}

// Validation helpers
function validateCreateInput(input: CreateAuditFindingInput): string | null {
  if (!input.task_id) {
    return 'Task ID is required (task_id)'
  }

  if (!input.finding || input.finding.trim() === '') {
    return 'Finding description is required (finding)'
  }

  if (!VALID_SEVERITIES.includes(input.severity)) {
    return `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`
  }

  return null
}

function validateUpdateInput(input: UpdateAuditFindingInput): string | null {
  if (input.severity !== undefined && !VALID_SEVERITIES.includes(input.severity)) {
    return `Invalid severity. Must be one of: ${VALID_SEVERITIES.join(', ')}`
  }

  if (input.status !== undefined && !VALID_STATUSES.includes(input.status)) {
    return `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}`
  }

  if (input.finding !== undefined && input.finding.trim() === '') {
    return 'Finding description cannot be empty (finding)'
  }

  return null
}

/**
 * Create a new audit finding
 */
export async function createAuditFinding(
  input: CreateAuditFindingInput
): Promise<ServiceResult<AuditFinding>> {
  // Validate input
  const validationError = validateCreateInput(input)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  // Set defaults
  const findingData: InsertTables<'audit_findings'> = {
    task_id: input.task_id,
    severity: input.severity,
    finding: input.finding.trim(),
    root_cause: input.root_cause ?? null,
    capa: input.capa ?? null,
    due_date: input.due_date ?? null,
    status: 'open',
  }

  const { data, error } = await supabase
    .from('audit_findings')
    .insert(findingData as never)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as AuditFinding, error: null }
}

/**
 * Get an audit finding by ID
 */
export async function getAuditFinding(
  id: string
): Promise<ServiceResult<AuditFinding>> {
  const { data, error } = await supabase
    .from('audit_findings')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as AuditFinding | null, error: null }
}

/**
 * Get all audit findings for a project (via tasks)
 */
export async function getAuditFindings(
  projectId: string,
  filter?: AuditFindingsFilter
): Promise<ServiceResult<AuditFinding[]>> {
  // Query through the tasks table to get findings for a project
  let query = supabase
    .from('audit_findings')
    .select('*, tasks!inner(project_id)')
    .eq('tasks.project_id', projectId)

  if (filter?.severity) {
    query = query.eq('severity', filter.severity)
  }

  if (filter?.status) {
    query = query.eq('status', filter.status)
  }

  const { data, error } = await query.order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as AuditFinding[]) ?? [], error: null }
}

/**
 * Get all audit findings for a specific task
 */
export async function getAuditFindingsByTask(
  taskId: string
): Promise<ServiceResult<AuditFinding[]>> {
  const { data, error } = await supabase
    .from('audit_findings')
    .select('*')
    .eq('task_id', taskId)
    .order('created_at', { ascending: false })

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: (data as AuditFinding[]) ?? [], error: null }
}

/**
 * Update an audit finding
 */
export async function updateAuditFinding(
  id: string,
  updates: UpdateAuditFindingInput
): Promise<ServiceResult<AuditFinding>> {
  // Validate input
  const validationError = validateUpdateInput(updates)
  if (validationError) {
    return { data: null, error: { message: validationError } }
  }

  const { data, error } = await supabase
    .from('audit_findings')
    .update(updates as never)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: data as AuditFinding, error: null }
}

/**
 * Delete an audit finding
 */
export async function deleteAuditFinding(id: string): Promise<ServiceResult<void>> {
  const { error } = await supabase.from('audit_findings').delete().eq('id', id)

  if (error) {
    return { data: null, error: { message: error.message, code: error.code } }
  }

  return { data: null, error: null }
}
