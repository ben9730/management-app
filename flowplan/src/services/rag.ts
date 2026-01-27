/**
 * RAG (Retrieval Augmented Generation) Service
 *
 * Phase 6: Grounded AI - RAG with Source Attribution
 * PRD Reference: FR-031 Natural language queries, FR-032 Source Attribution (CRITICAL)
 *
 * This service provides grounded AI responses based on uploaded documents.
 * All responses include source citations - the AI never makes up information.
 */

import Anthropic from '@anthropic-ai/sdk'
import { EmbeddingsService, SearchResult } from './embeddings'

export interface SourceCitation {
  documentId: string
  documentName: string
  excerpt: string
  chunkIndex: number
  relevanceScore: number
}

export interface RAGUsage {
  inputTokens: number
  outputTokens: number
  contextChunksUsed: number
}

export interface RAGResponse {
  answer: string
  sources: SourceCitation[]
  usage?: RAGUsage
  error?: string
}

export interface RAGConfig {
  maxContextChunks?: number
  similarityThreshold?: number
  model?: string
}

export interface RAGService {
  query(query: string, projectId: string): Promise<RAGResponse>
}

const DEFAULT_CONFIG: Required<RAGConfig> = {
  maxContextChunks: 10,
  similarityThreshold: 0.7,
  model: 'claude-3-5-sonnet-20241022',
}

const SYSTEM_PROMPT = `You are a helpful assistant for an audit management system. Your role is to answer questions based ONLY on the provided document context.

CRITICAL RULES:
1. ONLY use information from the provided context to answer questions
2. NEVER make up or invent information that is not in the context
3. If the context doesn't contain relevant information, say so clearly
4. Always cite your sources by referencing the source numbers [1], [2], etc.
5. Be precise and accurate in your responses
6. If asked about something not in the documents, respond that the information is not available in the provided documents

When responding:
- Cite sources inline using [Source X] format
- Be concise but complete
- Use the same language as the user's query (Hebrew or English)
- Format your response clearly with paragraphs if needed`

const NO_INFO_MESSAGE_HE = `לא נמצא מידע רלוונטי במסמכי הפרויקט.
אנא העלה מסמכים נוספים או נסח את השאלה מחדש.`

const NO_INFO_MESSAGE_EN = `No relevant information was found in the project documents.
Please upload additional documents or rephrase your question.`

function isHebrewQuery(query: string): boolean {
  // Check if query contains Hebrew characters
  return /[\u0590-\u05FF]/.test(query)
}

function formatContext(results: SearchResult[]): string {
  return results
    .map((result, index) => {
      return `[Source ${index + 1}] [${result.documentName}]\n${result.chunkText}`
    })
    .join('\n\n---\n\n')
}

function extractCitations(results: SearchResult[]): SourceCitation[] {
  return results.map((result) => ({
    documentId: result.documentId,
    documentName: result.documentName || 'Unknown',
    excerpt: result.chunkText.slice(0, 200) + (result.chunkText.length > 200 ? '...' : ''),
    chunkIndex: result.chunkIndex,
    relevanceScore: result.similarity,
  }))
}

export function createRAGService(
  embeddingsService: EmbeddingsService,
  anthropic: Anthropic,
  config?: RAGConfig
): RAGService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }

  return {
    async query(query: string, projectId: string): Promise<RAGResponse> {
      // Validate input
      if (!query || query.trim().length === 0) {
        return {
          answer: '',
          sources: [],
          error: 'Query is empty',
        }
      }

      const isHebrew = isHebrewQuery(query)

      try {
        // Step 1: Retrieve relevant context
        const searchResults = await embeddingsService.search(query, {
          projectId,
          limit: finalConfig.maxContextChunks,
          threshold: finalConfig.similarityThreshold,
        })

        // Step 2: Handle no results
        if (searchResults.length === 0) {
          return {
            answer: isHebrew ? NO_INFO_MESSAGE_HE : NO_INFO_MESSAGE_EN,
            sources: [],
          }
        }

        // Step 3: Format context for Claude
        const context = formatContext(searchResults)
        const citations = extractCitations(searchResults)

        // Step 4: Create prompt with context
        const userMessage = `Context from project documents:

${context}

---

User question: ${query}

Please answer the question based ONLY on the provided context. Cite your sources using [Source X] format.`

        // Step 5: Call Claude API
        const response = await anthropic.messages.create({
          model: finalConfig.model,
          max_tokens: 1024,
          system: SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: userMessage,
            },
          ],
        })

        // Step 6: Extract answer
        const answerContent = response.content.find((c) => c.type === 'text')
        const answer = answerContent?.type === 'text' ? answerContent.text : ''

        return {
          answer,
          sources: citations,
          usage: {
            inputTokens: response.usage?.input_tokens || 0,
            outputTokens: response.usage?.output_tokens || 0,
            contextChunksUsed: searchResults.length,
          },
        }
      } catch (error) {
        return {
          answer: '',
          sources: [],
          error: error instanceof Error ? error.message : 'Unknown error occurred',
        }
      }
    },
  }
}
