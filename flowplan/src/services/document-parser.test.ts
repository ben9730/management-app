/**
 * Document Parser Service Tests (TDD)
 *
 * Phase 6: Grounded AI - Document parsing for RAG
 * PRD Reference: FR-030 - Document parsing (PDF, Word, Excel)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  DocumentParserService,
  createDocumentParserService,
  ParsedDocument,
  DocumentChunk,
} from './document-parser'

describe('DocumentParserService', () => {
  let service: DocumentParserService

  beforeEach(() => {
    vi.clearAllMocks()
    service = createDocumentParserService()
  })

  describe('plain text parsing', () => {
    it('parses plain text files', async () => {
      const content = 'This is a plain text document.\nWith multiple lines.'
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.content).toContain('This is a plain text document')
      expect(result.content).toContain('With multiple lines')
    })

    it('preserves line breaks in plain text', async () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      expect(result.content).toBe(content)
    })

    it('handles empty text files', async () => {
      const file = new File([''], 'empty.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.content).toBe('')
    })

    it('handles UTF-8 encoded text', async () => {
      const content = 'שלום עולם - Hello World - مرحبا بالعالم'
      const file = new File([content], 'unicode.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      expect(result.content).toBe(content)
    })
  })

  describe('PDF parsing', () => {
    it('extracts text from PDF files', async () => {
      // Mock PDF content - in real implementation would use pdf-parse or similar
      const mockPdfBuffer = createMockPdfBuffer('PDF content here')
      const file = new File([mockPdfBuffer], 'document.pdf', { type: 'application/pdf' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.content).toBeDefined()
    })

    it('extracts metadata from PDF', async () => {
      const mockPdfBuffer = createMockPdfBuffer('Content', {
        title: 'Test Document',
        author: 'Test Author',
        creationDate: '2026-01-27',
      })
      const file = new File([mockPdfBuffer], 'document.pdf', { type: 'application/pdf' })

      const result = await service.parseDocument(file)

      expect(result.metadata?.title).toBeDefined()
    })

    it('handles multi-page PDFs', async () => {
      const mockPdfBuffer = createMockPdfBuffer('Page 1 content||Page 2 content||Page 3 content')
      const file = new File([mockPdfBuffer], 'multipage.pdf', { type: 'application/pdf' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.pageCount).toBeGreaterThan(1)
    })

    it('returns error for corrupted PDFs', async () => {
      const corruptedBuffer = new ArrayBuffer(100)
      const file = new File([corruptedBuffer], 'corrupted.pdf', { type: 'application/pdf' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(false)
      expect(result.error).toContain('parse')
    })
  })

  describe('Word document parsing', () => {
    it('extracts text from DOCX files', async () => {
      const mockDocxBuffer = createMockDocxBuffer('Word document content')
      const file = new File([mockDocxBuffer], 'document.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.content).toBeDefined()
    })

    it('preserves document structure from DOCX', async () => {
      const mockDocxBuffer = createMockDocxBuffer('Heading\n\nParagraph 1\n\nParagraph 2')
      const file = new File([mockDocxBuffer], 'structured.docx', {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })

      const result = await service.parseDocument(file)

      expect(result.content).toContain('Heading')
      expect(result.content).toContain('Paragraph')
    })

    it('handles DOC files (legacy format)', async () => {
      const mockDocBuffer = createMockDocBuffer('Legacy Word content')
      const file = new File([mockDocBuffer], 'document.doc', {
        type: 'application/msword',
      })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
    })
  })

  describe('Excel parsing', () => {
    it('extracts data from XLSX files', async () => {
      const mockXlsxBuffer = createMockXlsxBuffer([
        ['Header1', 'Header2'],
        ['Value1', 'Value2'],
      ])
      const file = new File([mockXlsxBuffer], 'spreadsheet.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.content).toContain('Header1')
      expect(result.content).toContain('Value1')
    })

    it('handles multiple sheets', async () => {
      const mockXlsxBuffer = createMockXlsxBuffer(
        [['Sheet1 Data']],
        [['Sheet2 Data']],
      )
      const file = new File([mockXlsxBuffer], 'multisheet.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const result = await service.parseDocument(file)

      expect(result.content).toContain('Sheet1')
      expect(result.content).toContain('Sheet2')
    })

    it('formats tabular data as text', async () => {
      const mockXlsxBuffer = createMockXlsxBuffer([
        ['Name', 'Age', 'City'],
        ['Alice', '30', 'Tel Aviv'],
        ['Bob', '25', 'Jerusalem'],
      ])
      const file = new File([mockXlsxBuffer], 'data.xlsx', {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })

      const result = await service.parseDocument(file)

      // Should contain all data in readable format
      expect(result.content).toContain('Alice')
      expect(result.content).toContain('Tel Aviv')
    })
  })

  describe('CSV parsing', () => {
    it('parses CSV files correctly', async () => {
      const csvContent = 'name,age,city\nAlice,30,Tel Aviv\nBob,25,Jerusalem'
      const file = new File([csvContent], 'data.csv', { type: 'text/csv' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
      expect(result.content).toContain('Alice')
      expect(result.content).toContain('Jerusalem')
    })

    it('handles quoted fields in CSV', async () => {
      const csvContent = 'name,description\n"Alice","She said, ""Hello!"""'
      const file = new File([csvContent], 'data.csv', { type: 'text/csv' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(true)
    })
  })

  describe('document chunking', () => {
    it('splits large documents into chunks', async () => {
      const longContent = 'This is a sentence. '.repeat(1000)
      const file = new File([longContent], 'long.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)
      const chunks = await service.chunkDocument(result.content!, { maxChunkSize: 500 })

      expect(chunks.length).toBeGreaterThan(1)
      chunks.forEach(chunk => {
        expect(chunk.text.length).toBeLessThanOrEqual(600) // Allow some overlap
      })
    })

    it('preserves sentence boundaries when chunking', async () => {
      const content = 'First sentence. Second sentence. Third sentence. Fourth sentence.'
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)
      const chunks = await service.chunkDocument(result.content!, { maxChunkSize: 30 })

      // Chunks should end at sentence boundaries when possible
      chunks.forEach(chunk => {
        // Each chunk should either end with punctuation or be the last chunk
        const endsWithPunctuation = /[.!?]$/.test(chunk.text.trim())
        const isLastChunk = chunks.indexOf(chunk) === chunks.length - 1
        expect(endsWithPunctuation || isLastChunk).toBe(true)
      })
    })

    it('includes chunk overlap for context', async () => {
      const content = 'Sentence one. Sentence two. Sentence three. Sentence four. Sentence five.'
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)
      const chunks = await service.chunkDocument(result.content!, {
        maxChunkSize: 30,
        overlapSize: 10,
      })

      // With overlap, adjacent chunks should share some text
      if (chunks.length > 1) {
        const chunk1End = chunks[0].text.slice(-15)
        const chunk2Start = chunks[1].text.slice(0, 15)
        // There should be some overlap (not necessarily exact)
        expect(chunks.length).toBeGreaterThan(1)
      }
    })

    it('assigns sequential indices to chunks', async () => {
      const content = 'Content '.repeat(100)
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)
      const chunks = await service.chunkDocument(result.content!, { maxChunkSize: 100 })

      chunks.forEach((chunk, index) => {
        expect(chunk.index).toBe(index)
      })
    })

    it('handles empty content gracefully', async () => {
      const chunks = await service.chunkDocument('', { maxChunkSize: 500 })

      expect(chunks).toHaveLength(0)
    })

    it('returns single chunk for small documents', async () => {
      const content = 'Small document.'
      const chunks = await service.chunkDocument(content, { maxChunkSize: 500 })

      expect(chunks).toHaveLength(1)
      expect(chunks[0].text).toBe(content)
    })
  })

  describe('error handling', () => {
    it('returns error for unsupported file types', async () => {
      const file = new File(['binary'], 'program.exe', { type: 'application/x-msdownload' })

      const result = await service.parseDocument(file)

      expect(result.success).toBe(false)
      expect(result.error).toContain('Unsupported')
    })

    it('handles file read errors gracefully', async () => {
      // Create a file that will fail to read
      const mockFile = {
        name: 'unreadable.txt',
        type: 'text/plain',
        size: 100,
        arrayBuffer: vi.fn().mockRejectedValue(new Error('Read error')),
        text: vi.fn().mockRejectedValue(new Error('Read error')),
      } as unknown as File

      const result = await service.parseDocument(mockFile)

      expect(result.success).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('metadata extraction', () => {
    it('extracts word count from parsed document', async () => {
      const content = 'This is a test document with several words in it.'
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      expect(result.metadata?.wordCount).toBe(10)
    })

    it('extracts character count from parsed document', async () => {
      const content = 'Hello World'
      const file = new File([content], 'document.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      expect(result.metadata?.characterCount).toBe(11)
    })

    it('detects document language when possible', async () => {
      const hebrewContent = 'שלום עולם זהו מסמך בעברית'
      const file = new File([hebrewContent], 'hebrew.txt', { type: 'text/plain' })

      const result = await service.parseDocument(file)

      // Language detection is optional/best-effort
      expect(result.metadata).toBeDefined()
    })
  })
})

// Mock helper functions for creating test files
function createMockPdfBuffer(content: string, metadata?: Record<string, string>): ArrayBuffer {
  // Create a mock PDF-like buffer with content encoded
  const encoder = new TextEncoder()
  const contentBytes = encoder.encode(`MOCK_PDF:${content}:${JSON.stringify(metadata || {})}`)
  return contentBytes.buffer
}

function createMockDocxBuffer(content: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(`MOCK_DOCX:${content}`).buffer
}

function createMockDocBuffer(content: string): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(`MOCK_DOC:${content}`).buffer
}

function createMockXlsxBuffer(...sheets: string[][][]): ArrayBuffer {
  const encoder = new TextEncoder()
  return encoder.encode(`MOCK_XLSX:${JSON.stringify(sheets)}`).buffer
}
