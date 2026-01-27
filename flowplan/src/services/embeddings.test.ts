/**
 * Vector Embeddings Service Tests (TDD)
 *
 * Phase 6: Grounded AI - Vector Embeddings for Semantic Search
 * PRD Reference: Section 7 - RAG Implementation
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  EmbeddingsService,
  createEmbeddingsService,
  EmbeddingResult,
  SearchResult,
  DocumentEmbedding,
} from './embeddings'

// Mock OpenAI client
const mockOpenAI = {
  embeddings: {
    create: vi.fn(),
  },
}

// Mock Supabase client
const mockSupabase = {
  from: vi.fn(),
  rpc: vi.fn(),
}

describe('EmbeddingsService', () => {
  let service: EmbeddingsService

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for OpenAI embeddings
    mockOpenAI.embeddings.create.mockResolvedValue({
      data: [{ embedding: new Array(1536).fill(0.1) }],
      usage: { total_tokens: 10 },
    })

    // Default mock for Supabase
    mockSupabase.from.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockResolvedValue({ data: [{ id: 'emb-123' }], error: null }),
      }),
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    })

    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null,
    })

    service = createEmbeddingsService(mockOpenAI as any, mockSupabase as any)
  })

  describe('embedding generation', () => {
    it('generates embeddings for text using OpenAI', async () => {
      const text = 'This is a sample document text'

      const result = await service.generateEmbedding(text)

      expect(result.success).toBe(true)
      expect(result.embedding).toBeDefined()
      expect(result.embedding?.length).toBe(1536) // OpenAI embedding dimension
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledWith({
        model: 'text-embedding-3-small',
        input: text,
      })
    })

    it('handles empty text input', async () => {
      const result = await service.generateEmbedding('')

      expect(result.success).toBe(false)
      expect(result.error).toContain('empty')
    })

    it('returns error when OpenAI API fails', async () => {
      mockOpenAI.embeddings.create.mockRejectedValue(new Error('API rate limit'))

      const result = await service.generateEmbedding('test text')

      expect(result.success).toBe(false)
      expect(result.error).toContain('rate limit')
    })

    it('tracks token usage in result', async () => {
      mockOpenAI.embeddings.create.mockResolvedValue({
        data: [{ embedding: new Array(1536).fill(0.1) }],
        usage: { total_tokens: 25 },
      })

      const result = await service.generateEmbedding('test text')

      expect(result.tokensUsed).toBe(25)
    })

    it('truncates very long text before embedding', async () => {
      const longText = 'word '.repeat(10000) // Very long text

      await service.generateEmbedding(longText)

      const callArgs = mockOpenAI.embeddings.create.mock.calls[0][0]
      // Should be truncated to fit within token limits
      expect(callArgs.input.length).toBeLessThan(longText.length)
    })
  })

  describe('storing embeddings', () => {
    it('stores embedding in Supabase with document reference', async () => {
      const embedding = new Array(1536).fill(0.1)
      const documentId = 'doc-123'
      const chunkIndex = 0
      const chunkText = 'Sample chunk text'

      const result = await service.storeEmbedding({
        embedding,
        documentId,
        chunkIndex,
        chunkText,
      })

      expect(result.success).toBe(true)
      expect(result.embeddingId).toBeDefined()
      expect(mockSupabase.from).toHaveBeenCalledWith('document_embeddings')
    })

    it('includes chunk text for reference', async () => {
      let insertedData: any = null
      mockSupabase.from.mockReturnValue({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn().mockResolvedValue({ data: [{ id: 'emb-123' }], error: null }),
          }
        }),
      })

      await service.storeEmbedding({
        embedding: new Array(1536).fill(0.1),
        documentId: 'doc-123',
        chunkIndex: 0,
        chunkText: 'Chunk content here',
      })

      expect(insertedData.chunk_text).toBe('Chunk content here')
    })

    it('stores chunk metadata with embedding', async () => {
      let insertedData: any = null
      mockSupabase.from.mockReturnValue({
        insert: vi.fn((data) => {
          insertedData = data
          return {
            select: vi.fn().mockResolvedValue({ data: [{ id: 'emb-123' }], error: null }),
          }
        }),
      })

      await service.storeEmbedding({
        embedding: new Array(1536).fill(0.1),
        documentId: 'doc-123',
        chunkIndex: 5,
        chunkText: 'Text',
        metadata: { pageNumber: 3 },
      })

      expect(insertedData.chunk_index).toBe(5)
      expect(insertedData.metadata).toEqual({ pageNumber: 3 })
    })

    it('returns error when storage fails', async () => {
      mockSupabase.from.mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Storage error' },
          }),
        }),
      })

      const result = await service.storeEmbedding({
        embedding: new Array(1536).fill(0.1),
        documentId: 'doc-123',
        chunkIndex: 0,
        chunkText: 'Text',
      })

      expect(result.success).toBe(false)
      expect(result.error).toBe('Storage error')
    })
  })

  describe('semantic search', () => {
    it('searches for similar documents using vector similarity', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          { id: 'emb-1', document_id: 'doc-1', chunk_text: 'Relevant text', similarity: 0.95 },
          { id: 'emb-2', document_id: 'doc-2', chunk_text: 'Also relevant', similarity: 0.85 },
        ],
        error: null,
      })

      const results = await service.search('query text', { projectId: 'project-123' })

      expect(results).toHaveLength(2)
      expect(results[0].similarity).toBeGreaterThan(results[1].similarity)
      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.objectContaining({
          query_embedding: expect.any(Array),
          match_threshold: expect.any(Number),
          match_count: expect.any(Number),
        })
      )
    })

    it('filters by project ID', async () => {
      await service.search('query', { projectId: 'project-456' })

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.objectContaining({
          filter_project_id: 'project-456',
        })
      )
    })

    it('limits number of results', async () => {
      await service.search('query', { projectId: 'project-123', limit: 5 })

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.objectContaining({
          match_count: 5,
        })
      )
    })

    it('uses configurable similarity threshold', async () => {
      await service.search('query', { projectId: 'project-123', threshold: 0.8 })

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        'match_documents',
        expect.objectContaining({
          match_threshold: 0.8,
        })
      )
    })

    it('returns empty array when no matches found', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [],
        error: null,
      })

      const results = await service.search('query', { projectId: 'project-123' })

      expect(results).toHaveLength(0)
    })

    it('includes document metadata in search results', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: [
          {
            id: 'emb-1',
            document_id: 'doc-1',
            chunk_text: 'Content',
            similarity: 0.95,
            document_name: 'report.pdf',
            chunk_index: 3,
          },
        ],
        error: null,
      })

      const results = await service.search('query', { projectId: 'project-123' })

      expect(results[0].documentName).toBe('report.pdf')
      expect(results[0].chunkIndex).toBe(3)
    })

    it('handles search errors gracefully', async () => {
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Search failed' },
      })

      const results = await service.search('query', { projectId: 'project-123' })

      expect(results).toHaveLength(0)
    })
  })

  describe('batch embedding', () => {
    it('generates embeddings for multiple chunks', async () => {
      const chunks = [
        { text: 'Chunk 1', index: 0 },
        { text: 'Chunk 2', index: 1 },
        { text: 'Chunk 3', index: 2 },
      ]

      const results = await service.generateBatchEmbeddings(chunks)

      expect(results).toHaveLength(3)
      expect(mockOpenAI.embeddings.create).toHaveBeenCalledTimes(3)
    })

    it('handles partial failures in batch', async () => {
      mockOpenAI.embeddings.create
        .mockResolvedValueOnce({
          data: [{ embedding: new Array(1536).fill(0.1) }],
          usage: { total_tokens: 10 },
        })
        .mockRejectedValueOnce(new Error('API error'))
        .mockResolvedValueOnce({
          data: [{ embedding: new Array(1536).fill(0.1) }],
          usage: { total_tokens: 10 },
        })

      const chunks = [
        { text: 'Chunk 1', index: 0 },
        { text: 'Chunk 2', index: 1 },
        { text: 'Chunk 3', index: 2 },
      ]

      const results = await service.generateBatchEmbeddings(chunks)

      expect(results[0].success).toBe(true)
      expect(results[1].success).toBe(false)
      expect(results[2].success).toBe(true)
    })

    it('respects rate limiting between requests', async () => {
      const startTime = Date.now()
      const chunks = [
        { text: 'Chunk 1', index: 0 },
        { text: 'Chunk 2', index: 1 },
      ]

      await service.generateBatchEmbeddings(chunks, { rateLimitMs: 100 })

      const elapsed = Date.now() - startTime
      // Should have at least one delay
      expect(elapsed).toBeGreaterThanOrEqual(90) // Allow some tolerance
    })
  })

  describe('document embedding lifecycle', () => {
    it('embeds entire document from chunks', async () => {
      const documentId = 'doc-123'
      const chunks = [
        { text: 'First chunk content', index: 0 },
        { text: 'Second chunk content', index: 1 },
      ]

      const result = await service.embedDocument(documentId, chunks)

      expect(result.success).toBe(true)
      expect(result.embeddingsCreated).toBe(2)
    })

    it('deletes existing embeddings before re-embedding', async () => {
      const deleteMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      })

      mockSupabase.from.mockReturnValue({
        delete: deleteMock,
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockResolvedValue({ data: [{ id: 'emb-123' }], error: null }),
        }),
      })

      await service.embedDocument('doc-123', [{ text: 'Content', index: 0 }], {
        replaceExisting: true,
      })

      expect(deleteMock).toHaveBeenCalled()
    })

    it('deletes all embeddings for a document', async () => {
      const result = await service.deleteDocumentEmbeddings('doc-123')

      expect(result.success).toBe(true)
      expect(mockSupabase.from).toHaveBeenCalledWith('document_embeddings')
    })

    it('returns embedding statistics for a document', async () => {
      mockSupabase.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: 'emb-1', chunk_index: 0 },
              { id: 'emb-2', chunk_index: 1 },
              { id: 'emb-3', chunk_index: 2 },
            ],
            error: null,
          }),
        }),
      })

      const stats = await service.getDocumentEmbeddingStats('doc-123')

      expect(stats.totalChunks).toBe(3)
      expect(stats.isFullyEmbedded).toBe(true)
    })
  })
})
