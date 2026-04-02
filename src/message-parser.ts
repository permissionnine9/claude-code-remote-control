import stripAnsi from 'strip-ansi'
import { safeJsonParse } from './utils.js'
import type { StreamEvent } from './types.js'

export interface ParsedOutput {
  kind: 'stream-event' | 'permission-prompt' | 'plain-text'
  event?: StreamEvent
  permission?: {
    tool_use_id: string
    tool_name: string
    description: string
    input: Record<string, unknown>
  }
  raw?: string
}

// Permission prompt patterns from Claude Code terminal UI
const PERMISSION_PATTERNS = [
  /Do you want to (allow|deny)\s+.*?(\w+)\s+tool/i,
  /\[y\/n\]/i,
  /\[Y\/n\]/,
  /allow.*\?.*\[y\/n\]/i,
  /\(y\/n\)/i,
]

/**
 * Parse a line of Claude Code terminal output.
 * May be a stream-json line (when using --output-format stream-json)
 * or a raw terminal line (when using PTY mode).
 */
export function parseOutputLine(line: string): ParsedOutput {
  // Try stream-json first
  const clean = stripAnsi(line).trim()
  if (clean.startsWith('{')) {
    const event = safeJsonParse<StreamEvent>(clean)
    if (event && event.type) {
      return { kind: 'stream-event', event }
    }
  }

  // Check for permission prompts
  for (const pattern of PERMISSION_PATTERNS) {
    if (pattern.test(clean)) {
      return {
        kind: 'permission-prompt',
        permission: extractPermissionInfo(clean),
      }
    }
  }

  return { kind: 'plain-text', raw: line }
}

/**
 * Extract tool permission info from a Claude Code permission prompt.
 */
function extractPermissionInfo(text: string): {
  tool_use_id: string
  tool_name: string
  description: string
  input: Record<string, unknown>
} {
  // Try to extract tool name from common patterns
  const toolMatch = text.match(/(\w+)\s+tool/i) || text.match(/tool:\s*(\w+)/i)
  const toolName = toolMatch?.[1] || 'unknown'

  // Try to extract the command/description
  const descMatch = text.match(/(?:execute|run|use|allow|write|edit|read).*?:\s*(.+)/i)
  const description = descMatch?.[1]?.trim() || text.slice(0, 200)

  // Extract command if present
  const cmdMatch = text.match(/command:\s*`?([^`\n]+)`?/i)
  const input: Record<string, unknown> = {}
  if (cmdMatch) {
    input.command = cmdMatch[1].trim()
  }

  return {
    tool_use_id: `perm-${Date.now()}`,
    tool_name: toolName,
    description,
    input,
  }
}

/**
 * Buffer-based parser for PTY output that may receive partial lines.
 */
export class OutputParser {
  private buffer = ''

  feed(data: string): ParsedOutput[] {
    this.buffer += data
    const results: ParsedOutput[] = []

    let idx: number
    while ((idx = this.buffer.indexOf('\n')) !== -1) {
      const line = this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 1)
      if (line.trim()) {
        results.push(parseOutputLine(line))
      }
    }

    return results
  }

  /** Flush any remaining buffer content. */
  flush(): ParsedOutput[] {
    if (this.buffer.trim()) {
      const results = [parseOutputLine(this.buffer)]
      this.buffer = ''
      return results
    }
    this.buffer = ''
    return []
  }
}
