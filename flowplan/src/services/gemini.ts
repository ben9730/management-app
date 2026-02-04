/**
 * Gemini AI Service
 *
 * Google Gemini integration for AI chat functionality.
 * Uses the free tier of Gemini 1.5 Flash.
 */

import { GoogleGenerativeAI } from '@google/generative-ai'
import type { RAGResponse, RAGService, SourceCitation } from './rag'

export interface GeminiConfig {
  model?: string
  maxTokens?: number
}

const DEFAULT_CONFIG: Required<GeminiConfig> = {
  model: 'gemini-2.0-flash',
  maxTokens: 1024,
}

const SYSTEM_PROMPT = `אתה עוזר AI חכם למערכת ניהול פרויקטים בעברית.

הנחיות:
1. ענה בעברית תמיד, אלא אם המשתמש כותב באנגלית
2. היה מועיל, תמציתי ומדויק
3. אם אינך יודע משהו, אמור זאת בכנות
4. עזור למשתמשים עם שאלות על ניהול פרויקטים, משימות, לוחות זמנים וצוותים
5. השתמש בפורמט נקי וקריא

אתה עוזר AI למערכת FlowPlan - מערכת ניהול ביקורת חכמה.`

/**
 * Creates a Gemini-based RAG service
 * This is a simplified version that provides general AI assistance
 * without document retrieval (RAG functionality requires embeddings setup)
 */
export function createGeminiService(
  apiKey: string,
  config?: GeminiConfig
): RAGService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: finalConfig.model,
    systemInstruction: SYSTEM_PROMPT,
  })

  return {
    async query(query: string, _projectId: string): Promise<RAGResponse> {
      // Validate input
      if (!query || query.trim().length === 0) {
        return {
          answer: '',
          sources: [],
          error: 'השאלה ריקה',
        }
      }

      try {
        // Generate response with Gemini
        const result = await model.generateContent(query)
        const response = result.response
        const answer = response.text()

        // Get token usage if available
        const usageMetadata = response.usageMetadata

        return {
          answer,
          sources: [], // No RAG sources in simple mode
          usage: usageMetadata ? {
            inputTokens: usageMetadata.promptTokenCount || 0,
            outputTokens: usageMetadata.candidatesTokenCount || 0,
            contextChunksUsed: 0,
          } : undefined,
        }
      } catch (error) {
        console.error('Gemini API error:', error)

        // Handle specific error types
        if (error instanceof Error) {
          if (error.message.includes('API_KEY')) {
            return {
              answer: '',
              sources: [],
              error: 'מפתח API לא תקין. אנא בדוק את ההגדרות.',
            }
          }
          if (error.message.includes('quota') || error.message.includes('limit')) {
            return {
              answer: '',
              sources: [],
              error: 'חרגת ממכסת השימוש. נסה שוב מאוחר יותר.',
            }
          }
          return {
            answer: '',
            sources: [],
            error: error.message,
          }
        }

        return {
          answer: '',
          sources: [],
          error: 'שגיאה לא צפויה. נסה שוב.',
        }
      }
    },
  }
}

/**
 * Creates a Gemini service with RAG capabilities
 * Requires embeddings service for document retrieval
 */
export function createGeminiRAGService(
  apiKey: string,
  // embeddingsService: EmbeddingsService, // TODO: Add when embeddings are set up
  config?: GeminiConfig
): RAGService {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const genAI = new GoogleGenerativeAI(apiKey)
  const model = genAI.getGenerativeModel({
    model: finalConfig.model,
    systemInstruction: `${SYSTEM_PROMPT}

כללים קריטיים למצב RAG:
1. ענה רק על סמך ההקשר שסופק
2. אל תמציא מידע שלא קיים בהקשר
3. ציין מקורות בפורמט [מקור X]
4. אם אין מידע רלוונטי, אמור זאת בבירור`,
  })

  return {
    async query(query: string, projectId: string): Promise<RAGResponse> {
      if (!query || query.trim().length === 0) {
        return {
          answer: '',
          sources: [],
          error: 'השאלה ריקה',
        }
      }

      try {
        // TODO: Add embeddings search when set up
        // const searchResults = await embeddingsService.search(query, { projectId })

        // For now, use simple generation without RAG
        const result = await model.generateContent(query)
        const response = result.response
        const answer = response.text()

        return {
          answer,
          sources: [],
          usage: response.usageMetadata ? {
            inputTokens: response.usageMetadata.promptTokenCount || 0,
            outputTokens: response.usageMetadata.candidatesTokenCount || 0,
            contextChunksUsed: 0,
          } : undefined,
        }
      } catch (error) {
        return {
          answer: '',
          sources: [],
          error: error instanceof Error ? error.message : 'שגיאה לא צפויה',
        }
      }
    },
  }
}
