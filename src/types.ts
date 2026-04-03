// === Claude Code stream-json output events ===

export interface ContentBlock {
  type: 'text' | 'tool_use' | 'tool_result'
  text?: string
  id?: string
  name?: string
  input?: Record<string, unknown>
  tool_use_id?: string
  content?: string | ContentBlock[]
  is_error?: boolean
}

export interface StreamEvent {
  type: 'assistant' | 'user' | 'system' | 'result'
  subtype?: string
  // assistant messages
  message?: {
    id: string
    role: 'assistant'
    content: ContentBlock[]
    model?: string
    stop_reason?: string
    usage?: { input_tokens: number; output_tokens: number }
  }
  // system messages
  session_id?: string
  tools?: string[]
  permission_mode?: string
  // result messages
  result?: string
  cost_usd?: number
  duration_ms?: number
  duration_api_ms?: number
  is_error?: boolean
  num_turns?: number
}

// === Client → Bridge protocol ===

export type ClientMessage =
  | { type: 'auth'; token: string; expires?: number }
  | { type: 'send_message'; content: string; uuid?: string }
  | { type: 'permission_response'; tool_use_id: string; behavior: 'allow' | 'deny'; updated_input?: Record<string, unknown>; feedback?: string }
  | { type: 'interrupt' }
  | { type: 'session_new' }
  | { type: 'session_resume'; sessionId?: string }
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number }
  | { type: 'ping' }

// === Bridge → Client protocol ===

export type ServerMessage =
  | { type: 'connected'; sessionId: string }
  | { type: 'stream'; event: StreamEvent }
  | { type: 'raw_output'; data: string }
  | { type: 'permission_request'; tool_use_id: string; tool_name: string; description: string; input: Record<string, unknown> }
  | { type: 'status'; status: BridgeStatus; detail?: string }
  | { type: 'pong' }
  | { type: 'error'; message: string }

export type BridgeStatus = 'idle' | 'running' | 'waiting_permission' | 'error'

// === Config ===

export interface BridgeConfig {
  port: number
  host: string
  token?: string
  tlsCert?: string
  tlsKey?: string
  claudeCwd?: string
  claudeModel?: string
  claudePermissionMode?: 'default' | 'accept-edits' | 'bypass-permissions'
  tunnel?: boolean
  logLevel?: 'debug' | 'info' | 'warn' | 'error'
  tokenExpiresMinutes?: number
}
