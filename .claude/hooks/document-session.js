#!/usr/bin/env node
/**
 * Session Documentation Hook
 * Runs after each Claude response to document what was done
 */

const fs = require('fs')
const path = require('path')

// Read stdin (hook input)
let inputData = ''
process.stdin.on('data', chunk => {
  inputData += chunk
})

process.stdin.on('end', () => {
  try {
    // Parse the hook input
    const hookData = JSON.parse(inputData)

    // Extract relevant information
    const timestamp = new Date().toISOString()
    const tool = hookData.tool || 'unknown'
    const toolInput = hookData.tool_input || {}

    // Prepare log entry
    const logEntry = formatLogEntry(timestamp, tool, toolInput)

    // Write to session log
    const logPath = path.join(process.cwd(), '.claude', 'session-log.md')
    appendToLog(logPath, logEntry)

    // Pass through the original input
    console.log(inputData)
  } catch (error) {
    // On error, just pass through
    console.log(inputData)
  }
})

/**
 * Format a log entry based on tool and input
 */
function formatLogEntry(timestamp, tool, input) {
  const time = new Date(timestamp).toLocaleTimeString('he-IL')

  switch (tool) {
    case 'Edit':
      return `- ${time} ✏️ ערך: \`${input.file_path || 'unknown'}\`\n`

    case 'Write':
      return `- ${time} 📝 יצר/כתב: \`${input.file_path || 'unknown'}\`\n`

    case 'Read':
      return `- ${time} 👁️ קרא: \`${input.file_path || 'unknown'}\`\n`

    case 'Bash':
      const cmd = input.command || 'unknown'
      const shortCmd = cmd.length > 50 ? cmd.substring(0, 50) + '...' : cmd
      return `- ${time} 🔧 הריץ: \`${shortCmd}\`\n`

    case 'Glob':
      return `- ${time} 🔍 חיפש קבצים: \`${input.pattern || 'unknown'}\`\n`

    case 'Grep':
      return `- ${time} 🔎 חיפש בקוד: \`${input.pattern || 'unknown'}\`\n`

    default:
      return `- ${time} 🛠️ ${tool}\n`
  }
}

/**
 * Append entry to log file
 */
function appendToLog(logPath, entry) {
  try {
    // Ensure directory exists
    const dir = path.dirname(logPath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }

    // Create or append to log
    if (!fs.existsSync(logPath)) {
      const header = `# Session Log\n\nתיעוד אוטומטי של פעולות Claude Code\n\n---\n\n## ${new Date().toLocaleDateString('he-IL')}\n\n`
      fs.writeFileSync(logPath, header, 'utf8')
    }

    // Check if we need a new date header
    const content = fs.readFileSync(logPath, 'utf8')
    const today = new Date().toLocaleDateString('he-IL')
    if (!content.includes(`## ${today}`)) {
      fs.appendFileSync(logPath, `\n## ${today}\n\n`, 'utf8')
    }

    // Append the entry
    fs.appendFileSync(logPath, entry, 'utf8')
  } catch (error) {
    // Silently fail - don't break the workflow
  }
}
