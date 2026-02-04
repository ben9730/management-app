/**
 * AI Chat API Route
 *
 * Server-side endpoint for AI chat functionality using Google Gemini.
 * This keeps the API key secure on the server side.
 *
 * Features:
 * - Retry logic with exponential backoff for rate limits
 * - Response caching to reduce API calls
 * - Token limits to conserve quota
 */

import { NextRequest, NextResponse } from 'next/server'
import { GoogleGenerativeAI, GenerativeModel } from '@google/generative-ai'

const SYSTEM_PROMPT = `אתה עוזר AI חכם למערכת ניהול פרויקטים בעברית.

הנחיות:
1. ענה בעברית תמיד, אלא אם המשתמש כותב באנגלית
2. היה מועיל, תמציתי ומדויק
3. אם אינך יודע משהו, אמור זאת בכנות
4. עזור למשתמשים עם שאלות על ניהול פרויקטים, משימות, לוחות זמנים וצוותים
5. השתמש בפורמט נקי וקריא
6. שמור על תשובות קצרות - עד 3-4 משפטים אלא אם נדרש יותר

אתה עוזר AI למערכת FlowPlan - מערכת ניהול ביקורת חכמה.`

// Rate limit configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY_MS = 5000 // Start with 5 seconds (increased)
const MAX_RETRY_DELAY_MS = 120000 // Max 2 minutes

// Token limits to conserve quota
const MAX_OUTPUT_TOKENS = 256 // Limit response length

// Simple in-memory cache (TTL: 5 minutes)
const responseCache = new Map<string, { answer: string; timestamp: number }>()
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Get cached response if exists and not expired
 */
function getCachedResponse(query: string): string | null {
  const normalizedQuery = query.trim().toLowerCase()
  const cached = responseCache.get(normalizedQuery)

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.answer
  }

  // Clean up expired entry
  if (cached) {
    responseCache.delete(normalizedQuery)
  }

  return null
}

/**
 * Cache a response
 */
function cacheResponse(query: string, answer: string): void {
  const normalizedQuery = query.trim().toLowerCase()
  responseCache.set(normalizedQuery, { answer, timestamp: Date.now() })

  // Limit cache size to 100 entries
  if (responseCache.size > 100) {
    const firstKey = responseCache.keys().next().value
    if (firstKey) {
      responseCache.delete(firstKey)
    }
  }
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extract retry delay from error message if available
 */
function extractRetryDelay(errorMessage: string): number | null {
  // Try to extract "retry in Xs" pattern
  const match = errorMessage.match(/retry\s+in\s+(\d+(?:\.\d+)?)\s*s/i)
  if (match) {
    return Math.ceil(parseFloat(match[1]) * 1000)
  }
  return null
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    return message.includes('429') ||
           message.includes('too many requests') ||
           message.includes('quota') ||
           message.includes('rate limit') ||
           message.includes('resource exhausted')
  }
  return false
}

/**
 * Generate content with retry logic
 */
async function generateWithRetry(
  model: GenerativeModel,
  query: string
): Promise<{ answer: string; usage?: { inputTokens: number; outputTokens: number }; fromCache?: boolean }> {
  // Check cache first
  const cachedAnswer = getCachedResponse(query)
  if (cachedAnswer) {
    return { answer: cachedAnswer, fromCache: true }
  }

  let lastError: Error | null = null

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(query)
      const response = result.response
      const answer = response.text()
      const usageMetadata = response.usageMetadata

      // Cache successful response
      cacheResponse(query, answer)

      return {
        answer,
        usage: usageMetadata ? {
          inputTokens: usageMetadata.promptTokenCount || 0,
          outputTokens: usageMetadata.candidatesTokenCount || 0,
        } : undefined,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Only retry on rate limit errors
      if (!isRateLimitError(error)) {
        throw error
      }

      // Calculate delay with exponential backoff
      const suggestedDelay = extractRetryDelay(lastError.message)
      const exponentialDelay = INITIAL_RETRY_DELAY_MS * Math.pow(2, attempt)
      const delay = Math.min(
        suggestedDelay || exponentialDelay,
        MAX_RETRY_DELAY_MS
      )

      console.log(`Rate limit hit, attempt ${attempt + 1}/${MAX_RETRIES}. Retrying in ${delay}ms...`)

      // Don't sleep on the last attempt
      if (attempt < MAX_RETRIES - 1) {
        await sleep(delay)
      }
    }
  }

  // All retries exhausted
  throw lastError || new Error('Max retries exceeded')
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body
    // projectId will be used for RAG context when implemented

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return NextResponse.json(
        { error: 'השאלה ריקה' },
        { status: 400 }
      )
    }

    // Check for API key
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json(
        { error: 'מפתח API לא מוגדר. אנא הגדר GOOGLE_GENERATIVE_AI_API_KEY' },
        { status: 500 }
      )
    }

    // Initialize Gemini with token limits
    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: {
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        temperature: 0.7,
      },
    })

    // Generate response with retry logic
    const { answer, usage, fromCache } = await generateWithRetry(model, query.trim())

    return NextResponse.json({
      answer,
      sources: [], // No RAG sources in simple mode
      usage: usage ? {
        ...usage,
        contextChunksUsed: 0,
      } : undefined,
      fromCache,
    })
  } catch (error) {
    console.error('AI Chat API error:', error)

    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('API_KEY') || error.message.includes('invalid')) {
        return NextResponse.json(
          { error: 'מפתח API לא תקין. אנא בדוק את ההגדרות.' },
          { status: 401 }
        )
      }

      // Rate limit errors with helpful message
      if (isRateLimitError(error)) {
        const suggestedDelay = extractRetryDelay(error.message)
        const waitTime = suggestedDelay ? Math.ceil(suggestedDelay / 1000) : 60

        return NextResponse.json(
          {
            error: `🕐 מגבלת הבקשות של Gemini הושגה. המכסה היומית מוגבלת ב-Free tier.\n\nנסה שוב בעוד ${waitTime} שניות, או שאל שאלות קצרות יותר.`,
            retryAfter: waitTime,
          },
          {
            status: 429,
            headers: {
              'Retry-After': String(waitTime),
            },
          }
        )
      }

      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'שגיאה לא צפויה. נסה שוב.' },
      { status: 500 }
    )
  }
}
