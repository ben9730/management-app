/**
 * Document Upload Service Tests (TDD)
 *
 * Phase 6: Grounded AI - Document Upload to Supabase Storage
 * PRD Reference: FR-030 - Document upload to project (CORE)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DocumentUploadService,
  createDocumentUploadService,
  DocumentMetadata,
  UploadResult,
  UploadProgress,
} from './document-upload'

// Mock Supabase client
const mockSupabaseStorage = {
  from: vi.fn(),
}

const mockSupabaseDb = {
  from: vi.fn(),
}

const mockSupabase = {
  storage: mockSupabaseStorage,
  from: mockSupabaseDb.from,
}

describe('DocumentUploadService', () => {
  let service: DocumentUploadService

  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default mock behavior
    mockSupabaseStorage.from.mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test-path' } }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
    })

    mockSupabaseDb.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'doc-123', name: 'test.pdf' },
            error: null,
          }),
        }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    service = createDocumentUploadService(mockSupabase as any)
  })

  describe('file upload', () => {
    it('uploads a file to Supabase storage', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const projectId = 'project-123'

      const result = await service.uploadDocument(file, projectId)

      expect(result.success).toBe(true)
      expect(result.documentId).toBeDefined()
      expect(mockSupabaseStorage.from).toHaveBeenCalledWith('documents')
    })

    it('generates unique file path with project ID prefix', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const projectId = 'project-123'

      const storageFrom = mockSupabaseStorage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/test-path' } }),
      })

      await service.uploadDocument(file, projectId)

      const uploadCall = storageFrom().upload.mock.calls[0]
      expect(uploadCall[0]).toContain(projectId)
    })

    it('stores document metadata in database after upload', async () => {
      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const projectId = 'project-123'

      await service.uploadDocument(file, projectId)

      expect(mockSupabaseDb.from).toHaveBeenCalledWith('documents')
    })

    it('returns error when storage upload fails', async () => {
      mockSupabaseStorage.from.mockReturnValue({
        upload: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Storage error' },
        }),
      })

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage error')
    })

    it('returns error when database insert fails', async () => {
      mockSupabaseDb.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Database error' },
            }),
          }),
        }),
      })

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(false)
      expect(result.error).toBe('Database error')
    })
  })

  describe('supported file types', () => {
    it('accepts PDF files', async () => {
      const file = new File(['pdf content'], 'document.pdf', { type: 'application/pdf' })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })

    it('accepts Word documents (.docx)', async () => {
      const file = new File(['docx content'], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })

    it('accepts Word documents (.doc)', async () => {
      const file = new File(['doc content'], 'document.doc', {
        type: 'application/msword',
      })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })

    it('accepts Excel files (.xlsx)', async () => {
      const file = new File(['xlsx content'], 'spreadsheet.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })

    it('accepts plain text files', async () => {
      const file = new File(['text content'], 'notes.txt', { type: 'text/plain' })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })

    it('rejects unsupported file types', async () => {
      const file = new File(['binary content'], 'program.exe', {
        type: 'application/x-msdownload',
      })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported file type')
    })

    it('validates file type by extension when MIME type is generic', async () => {
      const file = new File(['content'], 'document.pdf', {
        type: 'application/octet-stream',
      })
      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })
  })

  describe('file size limits', () => {
    it('accepts files under 50MB', async () => {
      const content = new Array(10 * 1024 * 1024).fill('a').join('') // 10MB
      const file = new File([content], 'large.pdf', { type: 'application/pdf' })

      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(true)
    })

    it('rejects files over 50MB', async () => {
      // Create a mock file with size > 50MB
      const file = {
        name: 'huge.pdf',
        type: 'application/pdf',
        size: 60 * 1024 * 1024, // 60MB
      } as File

      const result = await service.uploadDocument(file, 'project-123')

      expect(result.success).toBe(false)
      expect(result.error).toContain('File size exceeds')
    })
  })

  describe('document metadata', () => {
    it('extracts and stores file metadata', async () => {
      const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' })

      let insertedData: any = null
      mockSupabaseDb.from.mockReturnValue({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'doc-123', ...data },
                error: null,
              }),
            }),
          }
        }),
      })

      await service.uploadDocument(file, 'project-123')

      expect(insertedData).toMatchObject({
        name: 'report.pdf',
        mime_type: 'application/pdf',
        project_id: 'project-123',
      })
      expect(insertedData.size).toBeDefined()
    })

    it('allows custom metadata to be provided', async () => {
      const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' })
      const customMetadata = {
        description: 'Annual audit report',
        tags: ['audit', '2026'],
      }

      let insertedData: any = null
      mockSupabaseDb.from.mockReturnValue({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'doc-123', ...data },
                error: null,
              }),
            }),
          }
        }),
      })

      await service.uploadDocument(file, 'project-123', customMetadata)

      expect(insertedData.description).toBe('Annual audit report')
      expect(insertedData.tags).toEqual(['audit', '2026'])
    })
  })

  describe('document listing', () => {
    it('lists all documents for a project', async () => {
      const mockDocuments = [
        { id: 'doc-1', name: 'file1.pdf', created_at: '2026-01-27T10:00:00Z' },
        { id: 'doc-2', name: 'file2.docx', created_at: '2026-01-27T11:00:00Z' },
      ]

      mockSupabaseDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockDocuments,
              error: null,
            }),
          }),
        }),
      })

      const result = await service.listDocuments('project-123')

      expect(result).toHaveLength(2)
      expect(result[0].name).toBe('file1.pdf')
    })

    it('returns empty array when no documents exist', async () => {
      mockSupabaseDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      })

      const result = await service.listDocuments('project-123')

      expect(result).toHaveLength(0)
    })

    it('orders documents by creation date descending', async () => {
      const selectMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      })

      mockSupabaseDb.from.mockReturnValue({ select: selectMock })

      await service.listDocuments('project-123')

      const orderCall = selectMock().eq().order
      expect(orderCall).toHaveBeenCalledWith('created_at', { ascending: false })
    })
  })

  describe('document deletion', () => {
    it('deletes document from storage and database', async () => {
      const storageRemove = vi.fn().mockResolvedValue({ data: null, error: null })
      mockSupabaseStorage.from.mockReturnValue({
        remove: storageRemove,
      })

      const dbDelete = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })
      mockSupabaseDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'doc-123', storage_path: 'project-123/file.pdf' },
              error: null,
            }),
          }),
        }),
        delete: dbDelete,
      })

      const result = await service.deleteDocument('doc-123')

      expect(result.success).toBe(true)
      expect(storageRemove).toHaveBeenCalled()
      expect(dbDelete).toHaveBeenCalled()
    })

    it('returns error when document not found', async () => {
      mockSupabaseDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const result = await service.deleteDocument('non-existent')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Not found')
    })
  })

  describe('upload progress tracking', () => {
    it('reports upload progress via callback', async () => {
      const progressUpdates: UploadProgress[] = []
      const onProgress = (progress: UploadProgress) => {
        progressUpdates.push({ ...progress })
      }

      const file = new File(['test content'], 'test.pdf', { type: 'application/pdf' })

      await service.uploadDocument(file, 'project-123', undefined, onProgress)

      // Should have at least start and complete
      expect(progressUpdates.length).toBeGreaterThanOrEqual(2)
      expect(progressUpdates[0].percentage).toBe(0)
      expect(progressUpdates[progressUpdates.length - 1].percentage).toBe(100)
    })

    it('includes file name in progress updates', async () => {
      let lastProgress: UploadProgress | null = null
      const onProgress = (progress: UploadProgress) => {
        lastProgress = progress
      }

      const file = new File(['test content'], 'report.pdf', { type: 'application/pdf' })

      await service.uploadDocument(file, 'project-123', undefined, onProgress)

      expect(lastProgress?.fileName).toBe('report.pdf')
    })
  })

  describe('document URL retrieval', () => {
    it('returns public URL for a document', async () => {
      mockSupabaseDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'doc-123', storage_path: 'project-123/file.pdf' },
              error: null,
            }),
          }),
        }),
      })

      mockSupabaseStorage.from.mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({
          data: { publicUrl: 'https://storage.example.com/project-123/file.pdf' },
        }),
      })

      const url = await service.getDocumentUrl('doc-123')

      expect(url).toBe('https://storage.example.com/project-123/file.pdf')
    })

    it('returns null when document not found', async () => {
      mockSupabaseDb.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      })

      const url = await service.getDocumentUrl('non-existent')

      expect(url).toBeNull()
    })
  })

  describe('batch upload', () => {
    it('uploads multiple files in sequence', async () => {
      const files = [
        new File(['content 1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content 2'], 'file2.pdf', { type: 'application/pdf' }),
        new File(['content 3'], 'file3.pdf', { type: 'application/pdf' }),
      ]

      const results = await service.uploadDocuments(files, 'project-123')

      expect(results).toHaveLength(3)
      expect(results.every((r) => r.success)).toBe(true)
    })

    it('continues uploading even if one file fails', async () => {
      const files = [
        new File(['content 1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content 2'], 'file2.exe', { type: 'application/x-msdownload' }), // Invalid
        new File(['content 3'], 'file3.pdf', { type: 'application/pdf' }),
      ]

      const results = await service.uploadDocuments(files, 'project-123')

      expect(results).toHaveLength(3)
      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })

    it('reports overall progress for batch uploads', async () => {
      const progressUpdates: { current: number; total: number }[] = []
      const onBatchProgress = (current: number, total: number) => {
        progressUpdates.push({ current, total })
      }

      const files = [
        new File(['content 1'], 'file1.pdf', { type: 'application/pdf' }),
        new File(['content 2'], 'file2.pdf', { type: 'application/pdf' }),
      ]

      await service.uploadDocuments(files, 'project-123', onBatchProgress)

      expect(progressUpdates).toContainEqual({ current: 1, total: 2 })
      expect(progressUpdates).toContainEqual({ current: 2, total: 2 })
    })
  })
})
