/**
 * RAG (Retrieval Augmented Generation) Service Tests (TDD)
 *
 * Phase 6: Grounded AI - RAG with Source Attribution
 * PRD Reference: FR-031 Natural language queries, FR-032 Source Attribution (CRITICAL)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  RAGService,
  createRAGService,
  RAGResponse,
  SourceCitation,
  RAGConfig,
} from './rag'

// Mock embeddings service
const mockEmbeddingsService = {
  search: vi.fn(),
  generateEmbedding: vi.fn(),
}

// Mock Anthropic client
const mockAnthropic = {
  messages: {
    create: vi.fn(),
  },
}

describe('RAGService', () => {
  let service: RAGService

  beforeEach(() => {
    vi.clearAllMocks()

    // Default mock for embeddings search
    mockEmbeddingsService.search.mockResolvedValue([
      {
        id: 'emb-1',
        documentId: 'doc-1',
        documentName: 'ISO_Requirements.pdf',
        chunkText: 'Safety requirements include regular inspections every 6 months.',
        chunkIndex: 0,
        similarity: 0.95,
      },
      {
        id: 'emb-2',
        documentId: 'doc-1',
        documentName: 'ISO_Requirements.pdf',
        chunkText: 'All incidents must be documented within 24 hours.',
        chunkIndex: 1,
        similarity: 0.85,
      },
    ])

    // Default mock for Anthropic response
    mockAnthropic.messages.create.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: 'Based on the provided documents, safety requirements include regular inspections every 6 months. Additionally, all incidents must be documented within 24 hours.',
        },
      ],
      usage: {
        input_tokens: 500,
        output_tokens: 50,
      },
    })

    service = createRAGService(mockEmbeddingsService as any, mockAnthropic as any)
  })

  describe('query processing', () => {
    it('retrieves relevant context from documents', async () => {
      const query = 'What are the safety requirements?'
      const projectId = 'project-123'

      await service.query(query, projectId)

      expect(mockEmbeddingsService.search).toHaveBeenCalledWith(query, {
        projectId,
        limit: expect.any(Number),
        threshold: expect.any(Number),
      })
    })

    it('calls Claude API with retrieved context', async () => {
      const query = 'What are the safety requirements?'

      await service.query(query, 'project-123')

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({
          model: expect.any(String),
          messages: expect.arrayContaining([
            expect.objectContaining({
              role: 'user',
              content: expect.stringContaining(query),
            }),
          ]),
        })
      )
    })

    it('includes context in the prompt', async () => {
      await service.query('What are the safety requirements?', 'project-123')

      const call = mockAnthropic.messages.create.mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      // Should include context from retrieved documents
      expect(userMessage.content).toContain('Safety requirements')
      expect(userMessage.content).toContain('inspections')
    })

    it('returns response with answer text', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.answer).toBeDefined()
      expect(response.answer).toContain('safety requirements')
    })
  })

  describe('source attribution', () => {
    it('includes source citations in response', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.sources).toBeDefined()
      expect(response.sources.length).toBeGreaterThan(0)
    })

    it('citation includes document name', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.sources[0].documentName).toBe('ISO_Requirements.pdf')
    })

    it('citation includes relevant text excerpt', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.sources[0].excerpt).toBeDefined()
      expect(response.sources[0].excerpt.length).toBeGreaterThan(0)
    })

    it('citation includes document ID for linking', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.sources[0].documentId).toBe('doc-1')
    })

    it('citation includes chunk index for precise location', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.sources[0].chunkIndex).toBe(0)
    })

    it('includes similarity score in citation', async () => {
      const response = await service.query('What are the safety requirements?', 'project-123')

      expect(response.sources[0].relevanceScore).toBe(0.95)
    })
  })

  describe('no information found', () => {
    it('returns appropriate message when no relevant documents found', async () => {
      mockEmbeddingsService.search.mockResolvedValue([])

      const response = await service.query('What is the meaning of life?', 'project-123')

      expect(response.answer).toContain('No relevant information')
      // Should suggest user action
      expect(response.answer.toLowerCase()).toMatch(/upload|documents/)
    })

    it('returns empty sources when no documents found', async () => {
      mockEmbeddingsService.search.mockResolvedValue([])

      const response = await service.query('What is the meaning of life?', 'project-123')

      expect(response.sources).toHaveLength(0)
    })

    it('does not call Claude API when no context available', async () => {
      mockEmbeddingsService.search.mockResolvedValue([])

      await service.query('What is the meaning of life?', 'project-123')

      expect(mockAnthropic.messages.create).not.toHaveBeenCalled()
    })
  })

  describe('grounding enforcement', () => {
    it('includes system prompt that enforces grounding', async () => {
      await service.query('What are the requirements?', 'project-123')

      const call = mockAnthropic.messages.create.mock.calls[0][0]

      // Should have a system prompt enforcing grounding
      expect(call.system).toBeDefined()
      expect(call.system.toLowerCase()).toContain('provided')
      expect(call.system.toLowerCase()).toMatch(/document|context|source/)
    })

    it('system prompt instructs to cite sources', async () => {
      await service.query('What are the requirements?', 'project-123')

      const call = mockAnthropic.messages.create.mock.calls[0][0]

      expect(call.system.toLowerCase()).toMatch(/cite|source|reference/)
    })

    it('system prompt prevents hallucination', async () => {
      await service.query('What are the requirements?', 'project-123')

      const call = mockAnthropic.messages.create.mock.calls[0][0]

      // Should instruct not to make up information
      expect(call.system.toLowerCase()).toMatch(/only|based on|provided|do not/)
    })
  })

  describe('error handling', () => {
    it('handles search errors gracefully', async () => {
      mockEmbeddingsService.search.mockRejectedValue(new Error('Search failed'))

      const response = await service.query('test query', 'project-123')

      expect(response.error).toBeDefined()
      expect(response.answer).toBe('')
    })

    it('handles Claude API errors gracefully', async () => {
      mockAnthropic.messages.create.mockRejectedValue(new Error('API error'))

      const response = await service.query('test query', 'project-123')

      expect(response.error).toBeDefined()
    })

    it('handles empty query', async () => {
      const response = await service.query('', 'project-123')

      expect(response.error).toBeDefined()
      expect(response.error).toContain('empty')
    })
  })

  describe('configuration', () => {
    it('allows customizing number of context chunks', async () => {
      const customService = createRAGService(
        mockEmbeddingsService as any,
        mockAnthropic as any,
        { maxContextChunks: 5 }
      )

      await customService.query('test', 'project-123')

      expect(mockEmbeddingsService.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ limit: 5 })
      )
    })

    it('allows customizing similarity threshold', async () => {
      const customService = createRAGService(
        mockEmbeddingsService as any,
        mockAnthropic as any,
        { similarityThreshold: 0.9 }
      )

      await customService.query('test', 'project-123')

      expect(mockEmbeddingsService.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ threshold: 0.9 })
      )
    })

    it('allows customizing Claude model', async () => {
      const customService = createRAGService(
        mockEmbeddingsService as any,
        mockAnthropic as any,
        { model: 'claude-3-opus-20240229' }
      )

      await customService.query('test', 'project-123')

      expect(mockAnthropic.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-3-opus-20240229' })
      )
    })

    it('uses sensible defaults', async () => {
      await service.query('test', 'project-123')

      expect(mockEmbeddingsService.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          limit: 10, // Default max chunks
          threshold: 0.7, // Default threshold
        })
      )
    })
  })

  describe('usage tracking', () => {
    it('includes token usage in response', async () => {
      const response = await service.query('test query', 'project-123')

      expect(response.usage).toBeDefined()
      expect(response.usage?.inputTokens).toBe(500)
      expect(response.usage?.outputTokens).toBe(50)
    })

    it('tracks context chunks used', async () => {
      const response = await service.query('test query', 'project-123')

      expect(response.usage?.contextChunksUsed).toBe(2)
    })
  })

  describe('Hebrew language support', () => {
    it('handles Hebrew queries', async () => {
      mockAnthropic.messages.create.mockResolvedValue({
        content: [
          {
            type: 'text',
            text: 'על פי המסמכים, דרישות הבטיחות כוללות בדיקות תקופתיות כל 6 חודשים.',
          },
        ],
        usage: { input_tokens: 500, output_tokens: 50 },
      })

      const response = await service.query('מה דרישות הבטיחות?', 'project-123')

      expect(response.answer).toContain('בטיחות')
      expect(mockEmbeddingsService.search).toHaveBeenCalledWith(
        'מה דרישות הבטיחות?',
        expect.any(Object)
      )
    })

    it('returns Hebrew no-info message for Hebrew queries', async () => {
      mockEmbeddingsService.search.mockResolvedValue([])

      const response = await service.query('מה דרישות הבטיחות?', 'project-123')

      // Should return Hebrew message
      expect(response.answer).toContain('לא נמצא מידע')
    })
  })

  describe('context formatting', () => {
    it('formats context with source references', async () => {
      await service.query('test', 'project-123')

      const call = mockAnthropic.messages.create.mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      // Context should include source labels
      expect(userMessage.content).toMatch(/\[.*ISO_Requirements\.pdf.*\]/)
    })

    it('numbers context chunks for reference', async () => {
      await service.query('test', 'project-123')

      const call = mockAnthropic.messages.create.mock.calls[0][0]
      const userMessage = call.messages.find((m: any) => m.role === 'user')

      // Should have numbered references
      expect(userMessage.content).toMatch(/\[1\]|\[Source 1\]|מקור 1/)
    })
  })
})
