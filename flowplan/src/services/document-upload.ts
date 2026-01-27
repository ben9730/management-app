/**
 * Document Upload Service
 *
 * Phase 6: Grounded AI - Document Upload to Supabase Storage
 * PRD Reference: FR-030 - Document upload to project (CORE)
 */

import { SupabaseClient } from '@supabase/supabase-js'

export interface DocumentMetadata {
  description?: string
  tags?: string[]
}

export interface UploadResult {
  success: boolean
  documentId?: string
  error?: string
}

export interface UploadProgress {
  percentage: number
  fileName: string
  bytesUploaded?: number
  totalBytes?: number
}

export interface DocumentRecord {
  id: string
  name: string
  mime_type: string
  size: number
  storage_path: string
  project_id: string
  description?: string
  tags?: string[]
  created_at: string
  updated_at: string
}

export interface DocumentUploadService {
  uploadDocument(
    file: File,
    projectId: string,
    metadata?: DocumentMetadata,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<UploadResult>

  uploadDocuments(
    files: File[],
    projectId: string,
    onBatchProgress?: (current: number, total: number) => void
  ): Promise<UploadResult[]>

  listDocuments(projectId: string): Promise<DocumentRecord[]>

  deleteDocument(documentId: string): Promise<{ success: boolean; error?: string }>

  getDocumentUrl(documentId: string): Promise<string | null>
}

// Supported file types and their MIME types
const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel', // .xls
  'text/plain',
  'text/csv',
  'application/octet-stream', // Generic, will validate by extension
])

const SUPPORTED_EXTENSIONS = new Set([
  '.pdf',
  '.docx',
  '.doc',
  '.xlsx',
  '.xls',
  '.txt',
  '.csv',
])

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB

function getFileExtension(filename: string): string {
  const lastDot = filename.lastIndexOf('.')
  if (lastDot === -1) return ''
  return filename.slice(lastDot).toLowerCase()
}

function isFileTypeSupported(file: File): boolean {
  // Check MIME type
  if (SUPPORTED_MIME_TYPES.has(file.type) && file.type !== 'application/octet-stream') {
    return true
  }

  // For generic MIME type, validate by extension
  const extension = getFileExtension(file.name)
  return SUPPORTED_EXTENSIONS.has(extension)
}

function generateStoragePath(projectId: string, filename: string): string {
  const timestamp = Date.now()
  const randomSuffix = Math.random().toString(36).substring(2, 8)
  const extension = getFileExtension(filename)
  const baseName = filename.replace(extension, '').replace(/[^a-zA-Z0-9-_]/g, '_')
  return `${projectId}/${timestamp}-${randomSuffix}-${baseName}${extension}`
}

export function createDocumentUploadService(
  supabase: SupabaseClient
): DocumentUploadService {
  return {
    async uploadDocument(
      file: File,
      projectId: string,
      metadata?: DocumentMetadata,
      onProgress?: (progress: UploadProgress) => void
    ): Promise<UploadResult> {
      // Report initial progress
      if (onProgress) {
        onProgress({
          percentage: 0,
          fileName: file.name,
          bytesUploaded: 0,
          totalBytes: file.size,
        })
      }

      // Validate file type
      if (!isFileTypeSupported(file)) {
        return {
          success: false,
          error: `Unsupported file type: ${file.type || getFileExtension(file.name)}`,
        }
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        return {
          success: false,
          error: `File size exceeds maximum allowed (50MB)`,
        }
      }

      // Generate unique storage path
      const storagePath = generateStoragePath(projectId, file.name)

      // Upload to Supabase Storage
      const { data: storageData, error: storageError } = await supabase.storage
        .from('documents')
        .upload(storagePath, file)

      if (storageError) {
        return {
          success: false,
          error: storageError.message,
        }
      }

      // Report progress after storage upload
      if (onProgress) {
        onProgress({
          percentage: 50,
          fileName: file.name,
          bytesUploaded: file.size,
          totalBytes: file.size,
        })
      }

      // Store metadata in database
      const documentRecord = {
        name: file.name,
        mime_type: file.type || 'application/octet-stream',
        size: file.size,
        storage_path: storageData.path,
        project_id: projectId,
        ...metadata,
      }

      const { data: dbData, error: dbError } = await supabase
        .from('documents')
        .insert(documentRecord)
        .select()
        .single()

      if (dbError) {
        // Cleanup: remove from storage if db insert failed
        await supabase.storage.from('documents').remove([storagePath])
        return {
          success: false,
          error: dbError.message,
        }
      }

      // Report completion
      if (onProgress) {
        onProgress({
          percentage: 100,
          fileName: file.name,
          bytesUploaded: file.size,
          totalBytes: file.size,
        })
      }

      return {
        success: true,
        documentId: dbData.id,
      }
    },

    async uploadDocuments(
      files: File[],
      projectId: string,
      onBatchProgress?: (current: number, total: number) => void
    ): Promise<UploadResult[]> {
      const results: UploadResult[] = []

      for (let i = 0; i < files.length; i++) {
        const result = await this.uploadDocument(files[i], projectId)
        results.push(result)

        if (onBatchProgress) {
          onBatchProgress(i + 1, files.length)
        }
      }

      return results
    },

    async listDocuments(projectId: string): Promise<DocumentRecord[]> {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error listing documents:', error)
        return []
      }

      return data || []
    },

    async deleteDocument(
      documentId: string
    ): Promise<{ success: boolean; error?: string }> {
      // First get the document to find storage path
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single()

      if (fetchError || !document) {
        return {
          success: false,
          error: fetchError?.message || 'Document not found',
        }
      }

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_path])

      if (storageError) {
        console.error('Storage delete error:', storageError)
        // Continue with database deletion anyway
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId)

      if (dbError) {
        return {
          success: false,
          error: dbError.message,
        }
      }

      return { success: true }
    },

    async getDocumentUrl(documentId: string): Promise<string | null> {
      // Get document record
      const { data: document, error } = await supabase
        .from('documents')
        .select('storage_path')
        .eq('id', documentId)
        .single()

      if (error || !document) {
        return null
      }

      // Get public URL from storage
      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(document.storage_path)

      return data.publicUrl
    },
  }
}
