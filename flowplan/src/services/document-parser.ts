/**
 * Document Parser Service
 *
 * Phase 6: Grounded AI - Document parsing for RAG
 * PRD Reference: FR-030 - Document parsing (PDF, Word, Excel)
 *
 * Note: This service uses mock parsing for binary formats (PDF, DOCX, XLSX)
 * in development/testing. In production, integrate with:
 * - pdf-parse for PDFs
 * - mammoth for DOCX
 * - xlsx for Excel files
 */

export interface ParsedDocument {
  success: boolean
  content?: string
  error?: string
  pageCount?: number
  metadata?: DocumentParseMetadata
}

export interface DocumentParseMetadata {
  title?: string
  author?: string
  creationDate?: string
  wordCount?: number
  characterCount?: number
  language?: string
}

export interface DocumentChunk {
  text: string
  index: number
  startOffset: number
  endOffset: number
}

export interface ChunkOptions {
  maxChunkSize: number
  overlapSize?: number
}

export interface DocumentParserService {
  parseDocument(file: File): Promise<ParsedDocument>
  chunkDocument(content: string, options: ChunkOptions): Promise<DocumentChunk[]>
}

const SUPPORTED_TYPES = new Set([
  'text/plain',
  'text/csv',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
])

function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(word => word.length > 0).length
}

function extractMetadata(content: string): DocumentParseMetadata {
  return {
    wordCount: countWords(content),
    characterCount: content.length,
  }
}

// Parse mock PDF format (for testing)
function parseMockPdf(buffer: ArrayBuffer): ParsedDocument {
  try {
    const decoder = new TextDecoder()
    const data = decoder.decode(buffer)

    if (!data.startsWith('MOCK_PDF:')) {
      // Real PDF - would need actual parser in production
      return {
        success: false,
        error: 'Unable to parse PDF - parser not available',
      }
    }

    // Split only on first two colons to preserve JSON
    const withoutPrefix = data.slice('MOCK_PDF:'.length)
    const firstColonIndex = withoutPrefix.indexOf(':')
    const content = firstColonIndex >= 0 ? withoutPrefix.slice(0, firstColonIndex) : withoutPrefix
    const metadataStr = firstColonIndex >= 0 ? withoutPrefix.slice(firstColonIndex + 1) : '{}'
    let parsedMetadata: Record<string, string> = {}

    try {
      parsedMetadata = JSON.parse(metadataStr)
    } catch {
      // Ignore metadata parse errors
    }

    // Handle multi-page simulation
    const pages = content.split('||')
    const pageCount = pages.length

    return {
      success: true,
      content: pages.join('\n\n'),
      pageCount,
      metadata: {
        title: parsedMetadata.title,
        author: parsedMetadata.author,
        creationDate: parsedMetadata.creationDate,
        ...extractMetadata(content),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse PDF: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Parse mock DOCX format (for testing)
function parseMockDocx(buffer: ArrayBuffer): ParsedDocument {
  try {
    const decoder = new TextDecoder()
    const data = decoder.decode(buffer)

    if (!data.startsWith('MOCK_DOCX:')) {
      // Real DOCX - would need actual parser in production
      return {
        success: false,
        error: 'Unable to parse DOCX - parser not available',
      }
    }

    const content = data.replace('MOCK_DOCX:', '')

    return {
      success: true,
      content,
      metadata: extractMetadata(content),
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Parse mock DOC format (for testing)
function parseMockDoc(buffer: ArrayBuffer): ParsedDocument {
  try {
    const decoder = new TextDecoder()
    const data = decoder.decode(buffer)

    if (!data.startsWith('MOCK_DOC:')) {
      // Real DOC - would need actual parser in production
      return {
        success: false,
        error: 'Unable to parse DOC - parser not available',
      }
    }

    const content = data.replace('MOCK_DOC:', '')

    return {
      success: true,
      content,
      metadata: extractMetadata(content),
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse DOC: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Parse mock XLSX format (for testing)
function parseMockXlsx(buffer: ArrayBuffer): ParsedDocument {
  try {
    const decoder = new TextDecoder()
    const data = decoder.decode(buffer)

    if (!data.startsWith('MOCK_XLSX:')) {
      // Real XLSX - would need actual parser in production
      return {
        success: false,
        error: 'Unable to parse XLSX - parser not available',
      }
    }

    const jsonStr = data.replace('MOCK_XLSX:', '')
    const sheets = JSON.parse(jsonStr) as string[][][]

    // Convert sheets to readable text format
    const textParts: string[] = []

    sheets.forEach((sheet, sheetIndex) => {
      textParts.push(`--- Sheet${sheetIndex + 1} ---`)
      sheet.forEach(row => {
        textParts.push(row.join('\t'))
      })
      textParts.push('')
    })

    const content = textParts.join('\n')

    return {
      success: true,
      content,
      metadata: extractMetadata(content),
    }
  } catch (error) {
    return {
      success: false,
      error: `Failed to parse XLSX: ${error instanceof Error ? error.message : 'Unknown error'}`,
    }
  }
}

// Split text into chunks at sentence boundaries
function splitIntoChunks(
  text: string,
  maxChunkSize: number,
  overlapSize: number = 0
): DocumentChunk[] {
  if (!text || text.length === 0) {
    return []
  }

  if (text.length <= maxChunkSize) {
    return [{
      text,
      index: 0,
      startOffset: 0,
      endOffset: text.length,
    }]
  }

  const chunks: DocumentChunk[] = []
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [text]

  let currentChunk = ''
  let chunkStartOffset = 0
  let currentOffset = 0

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()

    if (currentChunk.length + trimmedSentence.length + 1 > maxChunkSize) {
      // Save current chunk if it has content
      if (currentChunk.length > 0) {
        chunks.push({
          text: currentChunk.trim(),
          index: chunks.length,
          startOffset: chunkStartOffset,
          endOffset: currentOffset,
        })

        // Start new chunk with overlap
        if (overlapSize > 0 && currentChunk.length > overlapSize) {
          currentChunk = currentChunk.slice(-overlapSize) + ' ' + trimmedSentence
        } else {
          currentChunk = trimmedSentence
        }
        chunkStartOffset = currentOffset - (overlapSize > 0 ? overlapSize : 0)
      } else {
        // Sentence itself is larger than maxChunkSize, add it anyway
        currentChunk = trimmedSentence
      }
    } else {
      currentChunk = currentChunk ? currentChunk + ' ' + trimmedSentence : trimmedSentence
    }

    currentOffset += sentence.length
  }

  // Don't forget the last chunk
  if (currentChunk.length > 0) {
    chunks.push({
      text: currentChunk.trim(),
      index: chunks.length,
      startOffset: chunkStartOffset,
      endOffset: text.length,
    })
  }

  return chunks
}

export function createDocumentParserService(): DocumentParserService {
  return {
    async parseDocument(file: File): Promise<ParsedDocument> {
      // Check if file type is supported
      if (!SUPPORTED_TYPES.has(file.type)) {
        return {
          success: false,
          error: `Unsupported file type: ${file.type}`,
        }
      }

      try {
        // Handle plain text and CSV
        if (file.type === 'text/plain' || file.type === 'text/csv') {
          const content = await file.text()
          return {
            success: true,
            content,
            metadata: extractMetadata(content),
          }
        }

        // Handle binary formats
        const buffer = await file.arrayBuffer()

        if (file.type === 'application/pdf') {
          return parseMockPdf(buffer)
        }

        if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          return parseMockDocx(buffer)
        }

        if (file.type === 'application/msword') {
          return parseMockDoc(buffer)
        }

        if (
          file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
          file.type === 'application/vnd.ms-excel'
        ) {
          return parseMockXlsx(buffer)
        }

        return {
          success: false,
          error: `No parser available for type: ${file.type}`,
        }
      } catch (error) {
        return {
          success: false,
          error: `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }
      }
    },

    async chunkDocument(content: string, options: ChunkOptions): Promise<DocumentChunk[]> {
      return splitIntoChunks(content, options.maxChunkSize, options.overlapSize || 0)
    },
  }
}
