'use client'

import { useState, useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { SourceCitation } from '@/services/rag'

interface SourceCitationsPanelProps {
  citations: SourceCitation[]
  title?: string
  className?: string
  emptyMessage?: string
  sortBy?: 'relevance' | 'name'
  onDocumentClick?: (documentId: string) => void
  compact?: boolean
  showStats?: boolean
}

// Relevance level helper
function getRelevanceLevel(score: number): 'high' | 'medium' | 'low' {
  if (score >= 0.85) return 'high'
  if (score >= 0.7) return 'medium'
  return 'low'
}

// Relevance color classes
const relevanceColors = {
  high: 'text-green-600 bg-green-50',
  medium: 'text-yellow-600 bg-yellow-50',
  low: 'text-red-600 bg-red-50',
}

// Citation Item Component
function CitationItem({
  citation,
  isExpanded,
  onToggle,
  onDocumentClick,
}: {
  citation: SourceCitation
  isExpanded: boolean
  onToggle: () => void
  onDocumentClick?: (documentId: string) => void
}) {
  const relevanceLevel = getRelevanceLevel(citation.relevanceScore)
  const relevancePercent = Math.round(citation.relevanceScore * 100)

  return (
    <div className="border border-gray-200 rounded bg-white">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 p-3 text-right hover:bg-gray-50 transition-colors"
        aria-expanded={isExpanded}
        aria-label={`${citation.documentName} - ${relevancePercent}% רלוונטיות`}
      >
        {/* Expand icon */}
        <svg
          data-testid="expand-icon"
          className={cn('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', isExpanded && 'rotate-180')}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>

        {/* Document name */}
        <span className="font-medium text-sm flex-1 truncate">{citation.documentName}</span>

        {/* Relevance score */}
        <span
          data-relevance={relevanceLevel}
          className={cn(
            'text-xs font-bold px-2 py-0.5 rounded',
            relevanceColors[relevanceLevel]
          )}
        >
          {relevancePercent}%
        </span>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-3 pb-3 border-t border-gray-100">
          {/* Excerpt */}
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600 italic">
            &quot;{citation.excerpt}&quot;
          </div>

          {/* Metadata */}
          <div className="mt-2 flex items-center justify-between text-xs text-gray-400">
            <span>Chunk #{citation.chunkIndex}</span>

            {onDocumentClick && (
              <a
                href="#"
                role="link"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onDocumentClick(citation.documentId)
                }}
                className="text-blue-600 hover:text-blue-800 underline"
              >
                צפה במסמך
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// Statistics Component
function StatsSection({
  citations,
}: {
  citations: SourceCitation[]
}) {
  const stats = useMemo(() => {
    if (citations.length === 0) return null

    const avgRelevance = citations.reduce((sum, c) => sum + c.relevanceScore, 0) / citations.length
    const uniqueDocs = new Set(citations.map((c) => c.documentId)).size

    return {
      avgRelevance: Math.round(avgRelevance * 100),
      uniqueDocs,
    }
  }, [citations])

  if (!stats) return null

  return (
    <div className="flex items-center gap-4 text-xs text-gray-500 mb-2 pb-2 border-b border-gray-200">
      <span>
        <strong>{stats.uniqueDocs}</strong> מסמכים
      </span>
      <span>
        ממוצע רלוונטיות: <strong>{stats.avgRelevance}%</strong>
      </span>
    </div>
  )
}

// Compact View Component
function CompactView({
  citations,
  onExpand,
}: {
  citations: SourceCitation[]
  onExpand: () => void
}) {
  return (
    <button
      data-testid="compact-panel"
      onClick={onExpand}
      className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-800"
    >
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
        />
      </svg>
      <span>{citations.length} מקורות</span>
    </button>
  )
}

// Main SourceCitationsPanel Component
export function SourceCitationsPanel({
  citations,
  title = 'מקורות',
  className,
  emptyMessage = 'אין מקורות להצגה',
  sortBy = 'relevance',
  onDocumentClick,
  compact = false,
  showStats = false,
}: SourceCitationsPanelProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [isCompactExpanded, setIsCompactExpanded] = useState(!compact)

  // Sort citations
  const sortedCitations = useMemo(() => {
    const sorted = [...citations]
    if (sortBy === 'relevance') {
      sorted.sort((a, b) => b.relevanceScore - a.relevanceScore)
    } else if (sortBy === 'name') {
      sorted.sort((a, b) => a.documentName.localeCompare(b.documentName))
    }
    return sorted
  }, [citations, sortBy])

  // Toggle item expansion
  const toggleItem = (key: string) => {
    setExpandedItems((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Create unique key for citation
  const getCitationKey = (citation: SourceCitation) =>
    `${citation.documentId}-${citation.chunkIndex}`

  // Compact mode - show collapsed view
  if (compact && !isCompactExpanded) {
    return (
      <CompactView
        citations={citations}
        onExpand={() => setIsCompactExpanded(true)}
      />
    )
  }

  return (
    <section
      role="region"
      aria-label={title}
      className={cn('space-y-2', className)}
    >
      {/* Title */}
      <h3 className="font-bold text-sm uppercase text-gray-500">{title}</h3>

      {/* Statistics */}
      {showStats && citations.length > 0 && <StatsSection citations={citations} />}

      {/* Empty state */}
      {citations.length === 0 ? (
        <p className="text-sm text-gray-400 italic">{emptyMessage}</p>
      ) : (
        /* Citation list */
        <div className="space-y-1">
          {sortedCitations.map((citation) => {
            const key = getCitationKey(citation)
            return (
              <CitationItem
                key={key}
                citation={citation}
                isExpanded={expandedItems.has(key)}
                onToggle={() => toggleItem(key)}
                onDocumentClick={onDocumentClick}
              />
            )
          })}
        </div>
      )}
    </section>
  )
}

export default SourceCitationsPanel
