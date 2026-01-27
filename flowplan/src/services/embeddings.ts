/**
 * Vector Embeddings Service
 *
 * Phase 6: Grounded AI - Vector Embeddings for Semantic Search
 * PRD Reference: Section 7 - RAG Implementation
 *
 * Uses OpenAI's text-embedding-3-small model for generating embeddings
 * and Supabase with pgvector for storage and similarity search.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import OpenAI from 'openai'

export interface EmbeddingResult {
  success: boolean
  embedding?: number[]
  error?: string
  tokensUsed?: number
}

export interface SearchResult {
  id: string
  documentId: string
  documentName?: string
  chunkText: string
  chunkIndex: number
  similarity: number
  metadata?: Record<string, unknown>
}

export interface DocumentEmbedding {
  id: string
  documentId: string
  chunkIndex: number
  chunkText: string
  embedding: number[]
  metadata?: Record<string, unknown>
}

export interface StoreEmbeddingInput {
  embedding: number[]
  documentId: string
  chunkIndex: number
  chunkText: string
  metadata?: Record<string, unknown>
}

export interface SearchOptions {
  projectId: string
  limit?: number
  threshold?: number
}

export interface BatchEmbeddingOptions {
  rateLimitMs?: number
}

export interface EmbedDocumentOptions {
  replaceExisting?: boolean
}

export interface EmbeddingStats {
  totalChunks: number
  isFullyEmbedded: boolean
}

export interface EmbeddingsService {
  generateEmbedding(text: string): Promise<EmbeddingResult>
  generateBatchEmbeddings(
    chunks: Array<{ text: string; index: number }>,
    options?: BatchEmbeddingOptions
  ): Promise<EmbeddingResult[]>
  storeEmbedding(input: StoreEmbeddingInput): Promise<{ success: boolean; embeddingId?: string; error?: string }>
  search(query: string, options: SearchOptions): Promise<SearchResult[]>
  embedDocument(
    documentId: string,
    chunks: Array<{ text: string; index: number }>,
    options?: EmbedDocumentOptions
  ): Promise<{ success: boolean; embeddingsCreated: number; errors: string[] }>
  deleteDocumentEmbeddings(documentId: string): Promise<{ success: boolean; error?: string }>
  getDocumentEmbeddingStats(documentId: string): Promise<EmbeddingStats>
}

const EMBEDDING_MODEL = 'text-embedding-3-small'
const EMBEDDING_DIMENSION = 1536
const MAX_INPUT_TOKENS = 8000 // Conservative limit for embedding model
const DEFAULT_SIMILARITY_THRESHOLD = 0.7
const DEFAULT_MATCH_COUNT = 10

// Rough estimate: 4 chars per token
function truncateToTokenLimit(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) {
    return text
  }
  return text.slice(0, maxChars)
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function createEmbeddingsService(
  openai: OpenAI,
  supabase: SupabaseClient
): EmbeddingsService {
  return {
    async generateEmbedding(text: string): Promise<EmbeddingResult> {
      if (!text || text.trim().length === 0) {
        return {
          success: false,
          error: 'Input text is empty',
        }
      }

      try {
        // Truncate long text to fit within token limits
        const truncatedText = truncateToTokenLimit(text.trim(), MAX_INPUT_TOKENS)

        const response = await openai.embeddings.create({
          model: EMBEDDING_MODEL,
          input: truncatedText,
        })

        return {
          success: true,
          embedding: response.data[0].embedding,
          tokensUsed: response.usage?.total_tokens,
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to generate embedding',
        }
      }
    },

    async generateBatchEmbeddings(
      chunks: Array<{ text: string; index: number }>,
      options?: BatchEmbeddingOptions
    ): Promise<EmbeddingResult[]> {
      const results: EmbeddingResult[] = []
      const rateLimitMs = options?.rateLimitMs || 0

      for (let i = 0; i < chunks.length; i++) {
        const result = await this.generateEmbedding(chunks[i].text)
        results.push(result)

        // Apply rate limiting between requests (except after last one)
        if (rateLimitMs > 0 && i < chunks.length - 1) {
          await delay(rateLimitMs)
        }
      }

      return results
    },

    async storeEmbedding(
      input: StoreEmbeddingInput
    ): Promise<{ success: boolean; embeddingId?: string; error?: string }> {
      const { embedding, documentId, chunkIndex, chunkText, metadata } = input

      const { data, error } = await supabase
        .from('document_embeddings')
        .insert({
          document_id: documentId,
          chunk_index: chunkIndex,
          chunk_text: chunkText,
          embedding,
          metadata: metadata || {},
        })
        .select()

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return {
        success: true,
        embeddingId: data?.[0]?.id,
      }
    },

    async search(query: string, options: SearchOptions): Promise<SearchResult[]> {
      // First generate embedding for the query
      const embeddingResult = await this.generateEmbedding(query)

      if (!embeddingResult.success || !embeddingResult.embedding) {
        console.error('Failed to generate query embedding:', embeddingResult.error)
        return []
      }

      // Search using Supabase RPC function (requires pgvector setup)
      const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: embeddingResult.embedding,
        match_threshold: options.threshold || DEFAULT_SIMILARITY_THRESHOLD,
        match_count: options.limit || DEFAULT_MATCH_COUNT,
        filter_project_id: options.projectId,
      })

      if (error) {
        console.error('Search error:', error)
        return []
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        documentId: item.document_id,
        documentName: item.document_name,
        chunkText: item.chunk_text,
        chunkIndex: item.chunk_index,
        similarity: item.similarity,
        metadata: item.metadata,
      }))
    },

    async embedDocument(
      documentId: string,
      chunks: Array<{ text: string; index: number }>,
      options?: EmbedDocumentOptions
    ): Promise<{ success: boolean; embeddingsCreated: number; errors: string[] }> {
      const errors: string[] = []
      let embeddingsCreated = 0

      // Delete existing embeddings if requested
      if (options?.replaceExisting) {
        await supabase
          .from('document_embeddings')
          .delete()
          .eq('document_id', documentId)
      }

      // Generate and store embeddings for each chunk
      for (const chunk of chunks) {
        const embeddingResult = await this.generateEmbedding(chunk.text)

        if (!embeddingResult.success || !embeddingResult.embedding) {
          errors.push(`Failed to embed chunk ${chunk.index}: ${embeddingResult.error}`)
          continue
        }

        const storeResult = await this.storeEmbedding({
          embedding: embeddingResult.embedding,
          documentId,
          chunkIndex: chunk.index,
          chunkText: chunk.text,
        })

        if (storeResult.success) {
          embeddingsCreated++
        } else {
          errors.push(`Failed to store chunk ${chunk.index}: ${storeResult.error}`)
        }
      }

      return {
        success: errors.length === 0,
        embeddingsCreated,
        errors,
      }
    },

    async deleteDocumentEmbeddings(
      documentId: string
    ): Promise<{ success: boolean; error?: string }> {
      const { error } = await supabase
        .from('document_embeddings')
        .delete()
        .eq('document_id', documentId)

      if (error) {
        return {
          success: false,
          error: error.message,
        }
      }

      return { success: true }
    },

    async getDocumentEmbeddingStats(documentId: string): Promise<EmbeddingStats> {
      const { data, error } = await supabase
        .from('document_embeddings')
        .select('id, chunk_index')
        .eq('document_id', documentId)

      if (error || !data) {
        return {
          totalChunks: 0,
          isFullyEmbedded: false,
        }
      }

      // Check if chunks are sequential (0, 1, 2, ...)
      const indices = data.map(d => d.chunk_index).sort((a, b) => a - b)
      const isSequential = indices.every((idx, i) => idx === i)

      return {
        totalChunks: data.length,
        isFullyEmbedded: isSequential && data.length > 0,
      }
    },
  }
}
