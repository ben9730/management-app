'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { RAGResponse, SourceCitation } from '@/services/rag'

// Types
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  sources?: SourceCitation[]
  usage?: {
    inputTokens: number
    outputTokens: number
    contextChunksUsed: number
  }
  error?: boolean
  timestamp: Date
}

interface RAGService {
  query: (query: string, projectId: string) => Promise<RAGResponse>
}

interface AIChatProps {
  projectId: string
  ragService: RAGService
  title?: string
  placeholder?: string
  className?: string
  showUsage?: boolean
  disabled?: boolean
  disabledMessage?: string
  onMessageSent?: (message: string) => void
  onResponseReceived?: (response: RAGResponse) => void
}

// Source Citation Item Component
function SourceCitationItem({
  source,
  isExpanded,
  onToggle,
}: {
  source: SourceCitation
  isExpanded: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-gray-300 rounded-sm bg-gray-50">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-2 text-right hover:bg-gray-100 transition-colors"
        aria-expanded={isExpanded}
      >
        <span className="text-xs text-gray-500">{Math.round(source.relevanceScore * 100)}%</span>
        <span className="font-medium text-sm truncate flex-1 mx-2">{source.documentName}</span>
        <svg
          className={cn('w-4 h-4 transition-transform', isExpanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isExpanded && (
        <div className="p-2 pt-0 text-sm text-gray-600 border-t border-gray-200">
          <p className="italic">&quot;{source.excerpt}&quot;</p>
          <p className="text-xs text-gray-400 mt-1">Chunk #{source.chunkIndex}</p>
        </div>
      )}
    </div>
  )
}

// Message Component
function ChatMessageItem({
  message,
  showUsage,
}: {
  message: ChatMessage
  showUsage: boolean
}) {
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set())

  const toggleSource = (index: number) => {
    setExpandedSources((prev) => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }

  const isUser = message.role === 'user'

  return (
    <div
      className={cn('flex flex-col max-w-[85%] gap-1', isUser ? 'self-start' : 'self-end')}
      data-message-role={message.role}
      data-error={message.error || undefined}
    >
      {/* Role label */}
      <span className="text-xs font-bold text-gray-500 uppercase">
        {isUser ? 'אתה' : 'AI'}
      </span>

      {/* Message content */}
      <div
        className={cn(
          'rounded-md p-3 border-2',
          isUser
            ? 'bg-gray-100 border-gray-300'
            : message.error
            ? 'bg-red-50 border-red-300 text-red-700'
            : 'bg-white border-black'
        )}
      >
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>

      {/* Sources */}
      {!isUser && message.sources && message.sources.length > 0 && (
        <div className="mt-2 space-y-1">
          <span className="text-xs font-bold text-gray-500 uppercase">מקורות</span>
          {message.sources.map((source, index) => (
            <SourceCitationItem
              key={`${source.documentId}-${source.chunkIndex}`}
              source={source}
              isExpanded={expandedSources.has(index)}
              onToggle={() => toggleSource(index)}
            />
          ))}
        </div>
      )}

      {/* Token usage */}
      {showUsage && !isUser && message.usage && (
        <span className="text-xs text-gray-400">
          {message.usage.inputTokens + message.usage.outputTokens} tokens
        </span>
      )}
    </div>
  )
}

// Loading indicator
function LoadingIndicator() {
  return (
    <div
      className="flex items-center gap-2 text-gray-500"
      role="status"
      aria-busy="true"
      aria-label="ממתין לתשובה"
    >
      <div className="flex gap-1">
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      <span className="text-sm">ממתין לתשובה...</span>
    </div>
  )
}

// Main AIChat Component
export function AIChat({
  projectId,
  ragService,
  title,
  placeholder = 'שאל שאלה על המסמכים...',
  className,
  showUsage = false,
  disabled = false,
  disabledMessage,
  onMessageSent,
  onResponseReceived,
}: AIChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const chatLogRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Auto-scroll to bottom
  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight
    }
  }, [messages, isLoading])

  // Generate unique ID
  const generateId = () => `msg-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // Send message
  const sendMessage = useCallback(async () => {
    const trimmedInput = input.trim()
    if (!trimmedInput || isLoading || disabled) return

    // Add user message
    const userMessage: ChatMessage = {
      id: generateId(),
      role: 'user',
      content: trimmedInput,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Callback
    onMessageSent?.(trimmedInput)

    try {
      const response = await ragService.query(trimmedInput, projectId)

      // Add assistant message
      const assistantMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: response.error || response.answer,
        sources: response.sources,
        usage: response.usage,
        error: !!response.error,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, assistantMessage])
      onResponseReceived?.(response)
    } catch (error) {
      // Handle network/unexpected errors
      const errorMessage: ChatMessage = {
        id: generateId(),
        role: 'assistant',
        content: 'שגיאה בחיבור לשירות AI. נסה שוב.',
        error: true,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, disabled, projectId, ragService, onMessageSent, onResponseReceived])

  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  // Clear history
  const clearHistory = () => {
    setMessages([])
  }

  const hasMessages = messages.length > 0
  const canSend = input.trim().length > 0 && !isLoading && !disabled

  return (
    <div
      dir="rtl"
      className={cn(
        'flex flex-col h-full border-2 border-black bg-white',
        className
      )}
    >
      {/* Header */}
      {(title || hasMessages) && (
        <div className="flex items-center justify-between px-4 py-2 border-b-2 border-black bg-gray-50">
          {title && <h2 className="font-bold text-lg">{title}</h2>}
          {hasMessages && (
            <button
              onClick={clearHistory}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
              aria-label="נקה היסטוריה"
            >
              נקה היסטוריה
            </button>
          )}
        </div>
      )}

      {/* Messages area */}
      <div
        ref={chatLogRef}
        role="log"
        aria-live="polite"
        aria-label="הודעות צ'אט"
        data-chat-log
        className="flex-1 overflow-y-auto p-4 space-y-4"
      >
        {/* Empty state */}
        {!hasMessages && !disabled && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>שאל שאלה על המסמכים שהועלו לפרויקט</p>
          </div>
        )}

        {/* Disabled message */}
        {disabled && disabledMessage && (
          <div className="flex items-center justify-center h-full text-gray-400">
            <p>{disabledMessage}</p>
          </div>
        )}

        {/* Messages */}
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} showUsage={showUsage} />
        ))}

        {/* Loading indicator */}
        {isLoading && <LoadingIndicator />}
      </div>

      {/* Input area */}
      <div className="border-t-2 border-black p-4">
        <div className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isLoading || disabled}
            aria-label="שאלה"
            className={cn(
              'flex-1 px-3 py-2 border-2 border-black',
              'focus:outline-none focus:ring-2 focus:ring-black focus:ring-offset-1',
              'disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed'
            )}
          />
          <button
            onClick={sendMessage}
            disabled={!canSend}
            aria-label={isLoading ? 'שולח...' : 'שלח'}
            className={cn(
              'px-4 py-2 font-bold border-2 border-black',
              'transition-colors',
              canSend
                ? 'bg-black text-white hover:bg-gray-800'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            )}
          >
            {isLoading ? 'שולח...' : 'שלח'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default AIChat
