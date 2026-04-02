import { EventEmitter } from 'events'
import pty from '@lydell/node-pty'
import stripAnsi from 'strip-ansi'
import { Logger } from './utils.js'
import { OutputParser, type ParsedOutput } from './message-parser.js'
import type { StreamEvent, BridgeStatus } from './types.js'

export interface ClaudeProcessOptions {
  cwd?: string
  model?: string
  permissionMode?: 'default' | 'accept-edits' | 'bypass-permissions'
  systemPrompt?: string
}

export interface ClaudeProcessEvents {
  'stream': (event: StreamEvent) => void
  'raw': (data: string) => void
  'permission-request': (info: { tool_use_id: string; tool_name: string; description: string; input: Record<string, unknown> }) => void
  'status': (status: BridgeStatus, detail?: string) => void
  'exit': (code: number | null) => void
  'error': (err: Error) => void
}

export class ClaudeProcess extends EventEmitter {
  private ptyProc: pty.IPty | null = null
  private logger = new Logger('info')
  private sessionId = ''
  private status: BridgeStatus = 'idle'
  private outputParser = new OutputParser()

  constructor(private options: ClaudeProcessOptions = {}) {
    super()
  }

  getSessionId(): string {
    return this.sessionId
  }

  getStatus(): BridgeStatus {
    return this.status
  }

  setLogger(logger: Logger): void {
    this.logger = logger
  }

  async start(): Promise<void> {
    if (this.ptyProc) {
      throw new Error('Claude process already running')
    }

    const args: string[] = []
    if (this.options.model) {
      args.push('--model', this.options.model)
    }
    if (this.options.permissionMode === 'bypass-permissions' || this.options.permissionMode === 'accept-edits') {
      args.push('--dangerously-skip-permissions')
    }

    // Resolve claude binary path — compiled dist may not inherit shell PATH
    const claudeBin = process.env.CLAUDE_BIN || 'claude'

    this.logger.info('Starting Claude Code (PTY):', claudeBin, args.join(' '))
    this.setStatus('running')

    try {
      this.ptyProc = pty.spawn(claudeBin, args, {
        name: 'xterm-256color',
        cols: 120,
        rows: 40,
        cwd: this.options.cwd || process.cwd(),
        env: process.env as Record<string, string>,
      })
    } catch (err) {
      this.setStatus('error', `Failed to start claude: ${err}`)
      throw err
    }

    this.ptyProc.onData((data: string) => {
      this.emit('raw', data)

      const clean = stripAnsi(data)
      const parsed = this.outputParser.feed(clean)
      for (const item of parsed) {
        this.handleParsedOutput(item)
      }
    })

    this.ptyProc.onExit(({ exitCode }) => {
      this.logger.info('Claude process exited with code', exitCode)
      this.setStatus('idle')
      this.ptyProc = null
      this.emit('exit', exitCode)
    })
  }

  private handleParsedOutput(parsed: ParsedOutput): void {
    if (parsed.kind === 'stream-event' && parsed.event) {
      this.handleStreamEvent(parsed.event)
    } else if (parsed.kind === 'permission-prompt' && parsed.permission) {
      this.setStatus('waiting_permission')
      this.emit('permission-request', parsed.permission)
    } else if (parsed.kind === 'plain-text' && parsed.raw) {
      // Forward raw terminal text as a synthetic stream event
      this.emit('stream', {
        type: 'assistant',
        message: {
          id: `raw-${Date.now()}`,
          role: 'assistant',
          content: [{ type: 'text', text: parsed.raw }],
        },
      } as StreamEvent)
    }
  }

  private handleStreamEvent(event: StreamEvent): void {
    if (event.session_id) {
      this.sessionId = event.session_id
    }
    this.emit('stream', event)
    if (event.type === 'result') {
      this.setStatus('idle')
    }
  }

  sendMessage(content: string): void {
    if (!this.ptyProc) {
      this.logger.error('Cannot send message: process not running')
      return
    }
    this.setStatus('running')
    this.ptyProc.write(content + '\r')
  }

  handlePermissionResponse(msg: {
    tool_use_id: string
    behavior: 'allow' | 'deny'
    updated_input?: Record<string, unknown>
    feedback?: string
  }): void {
    if (!this.ptyProc) {
      this.logger.error('Cannot handle permission: process not running')
      return
    }
    if (msg.behavior === 'allow') {
      this.ptyProc.write('y\r')
    } else {
      this.ptyProc.write('n\r')
    }
    this.setStatus('running')
  }

  interrupt(): void {
    if (!this.ptyProc) {
      this.logger.warn('Cannot interrupt: process not running')
      return
    }
    this.ptyProc.write('\x03') // Ctrl-C
  }

  write(data: string): void {
    if (!this.ptyProc) {
      this.logger.warn('Cannot write: process not running')
      return
    }
    this.ptyProc.write(data)
  }

  resize(cols: number, rows: number): void {
    if (!this.ptyProc) {
      this.logger.warn('Cannot resize: process not running')
      return
    }
    this.ptyProc.resize(cols, rows)
  }

  async stop(): Promise<void> {
    if (!this.ptyProc) return
    this.ptyProc.kill()
    this.ptyProc = null
    this.setStatus('idle')
  }

  async restart(): Promise<void> {
    await this.stop()
    this.outputParser = new OutputParser()
    await this.start()
  }

  private setStatus(status: BridgeStatus, detail?: string): void {
    if (this.status !== status || detail) {
      this.status = status
      this.emit('status', status, detail)
    }
  }
}
