import { createServer as createHttpServer, type IncomingMessage } from 'http'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import cors from 'cors'
import express from 'express'
import { WebSocketServer, WebSocket } from 'ws'
import { ClaudeProcess } from './claude-process.js'
import { Logger, generateToken } from './utils.js'
import type { BridgeConfig, ClientMessage, ServerMessage, BridgeStatus } from './types.js'

const __dirname = dirname(fileURLToPath(import.meta.url))

export class BridgeServer {
  private wss: WebSocketServer | null = null
  private httpServer: ReturnType<typeof createHttpServer> | null = null
  private app = express()
  private claudeProcess: ClaudeProcess
  private clients = new Set<WebSocket>()
  private authToken: string
  private logger = new Logger('info')
  private tunnelUrl = ''
  private config: BridgeConfig

  constructor(config: BridgeConfig) {
    this.config = config
    this.authToken = config.token || generateToken()
    this.claudeProcess = new ClaudeProcess({
      cwd: config.claudeCwd,
      model: config.claudeModel,
      permissionMode: config.claudePermissionMode,
    })

    if (config.logLevel) {
      this.logger = new Logger(config.logLevel)
    }
    this.claudeProcess.setLogger(this.logger)
  }

  getAuthToken(): string {
    return this.authToken
  }

  getPort(): number {
    return this.config.port
  }

  async start(): Promise<void> {
    // 1. Setup Express for static files
    this.app.use(cors())
    this.app.use(express.static(resolve(__dirname, '../public')))

    // Health check endpoint
    this.app.get('/health', (_req, res) => {
      res.json({ status: 'ok', sessionId: this.claudeProcess.getSessionId() })
    })

    // 2. Create HTTP server
    this.httpServer = createHttpServer(this.app)

    // 3. Setup WebSocket server
    this.wss = new WebSocketServer({ server: this.httpServer, path: '/ws' })

    // 4. Wire Claude process events → broadcast to viewers
    this.claudeProcess.on('stream', (event) => {
      this.broadcast({ type: 'stream', event })
    })

    this.claudeProcess.on('raw', (data) => {
      this.broadcast({ type: 'raw_output', data })
    })

    this.claudeProcess.on('permission-request', (info) => {
      this.broadcast({
        type: 'permission_request',
        tool_use_id: info.tool_use_id,
        tool_name: info.tool_name,
        description: info.description,
        input: info.input,
      })
    })

    this.claudeProcess.on('status', (status: BridgeStatus, detail?: string) => {
      this.broadcast({ type: 'status', status, detail })
    })

    this.claudeProcess.on('error', (err: Error) => {
      this.broadcast({ type: 'error', message: err.message })
    })

    this.claudeProcess.on('exit', (code) => {
      this.broadcast({ type: 'status', status: 'idle', detail: `Process exited with code ${code}` })
    })

    // 5. Handle WebSocket connections
    this.wss.on('connection', (ws, req) => {
      this.handleConnection(ws, req)
    })

    // 6. Start listening
    await new Promise<void>((resolve, reject) => {
      this.httpServer!.listen(this.config.port, this.config.host, () => {
        resolve()
      })
      this.httpServer!.on('error', reject)
    })

    // 7. Start Claude Code process
    try {
      await this.claudeProcess.start()
    } catch (err) {
      this.logger.error('Failed to start Claude Code:', err)
      // Server still starts, just Claude is not running
    }

    // Print banner
    this.printBanner()
  }

  private handleConnection(ws: WebSocket, _req: IncomingMessage): void {
    let authenticated = false
    this.logger.info('New WebSocket connection')

    ws.on('message', (data: Buffer) => {
      const msgStr = data.toString()
      const msg = this.parseMessage(msgStr)
      if (!msg) return

      // First message must be auth
      if (!authenticated) {
        if (msg.type === 'auth' && (msg as any).token === this.authToken) {
          authenticated = true
          this.clients.add(ws)
          ws.send(JSON.stringify({
            type: 'connected',
            sessionId: this.claudeProcess.getSessionId(),
          }))
          this.logger.info('Client authenticated')
        } else {
          ws.close(4001, 'Authentication failed')
        }
        return
      }

      // Route messages
      this.routeMessage(ws, msg as ClientMessage)
    })

    ws.on('close', () => {
      this.clients.delete(ws)
      this.logger.info('Client disconnected')
    })

    ws.on('error', (err) => {
      this.logger.error('WebSocket error:', err)
      this.clients.delete(ws)
    })
  }

  private parseMessage(data: string): ClientMessage | null {
    try {
      return JSON.parse(data) as ClientMessage
    } catch {
      this.logger.warn('Invalid JSON message:', data.slice(0, 100))
      return null
    }
  }

  private routeMessage(ws: WebSocket, msg: ClientMessage): void {
    switch (msg.type) {
      case 'send_message':
        this.claudeProcess.sendMessage(msg.content)
        break

      case 'permission_response':
        this.claudeProcess.handlePermissionResponse(msg)
        break

      case 'interrupt':
        this.claudeProcess.interrupt()
        break

      case 'input':
        this.claudeProcess.write(msg.data)
        break

      case 'resize':
        this.claudeProcess.resize(msg.cols, msg.rows)
        break

      case 'session_new':
        this.claudeProcess.restart().catch((err) => {
          ws.send(JSON.stringify({ type: 'error', message: `Restart failed: ${err.message}` }))
        })
        break

      case 'session_resume':
        // Resume not fully supported in subprocess mode
        this.claudeProcess.restart().catch((err) => {
          ws.send(JSON.stringify({ type: 'error', message: `Resume failed: ${err.message}` }))
        })
        break

      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }))
        break

      default:
        this.logger.warn('Unknown message type:', (msg as any).type)
    }
  }

  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg)
    for (const client of this.clients) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data)
      }
    }
  }

  private printBanner(): void {
    const host = this.config.host === '0.0.0.0' ? 'localhost' : this.config.host
    const lines = [
      '',
      '╔════════════════════════════════════════════════════════╗',
      '║   Claude Code Remote Control Bridge                    ║',
      '╠════════════════════════════════════════════════════════╣',
      `║   Web:    http://${host}:${this.config.port}${' '.repeat(Math.max(0, 37 - host.length - String(this.config.port).length))}║`,
      `║   Token:  ${this.authToken}${' '.repeat(Math.max(0, 33 - this.authToken.length))}║`,
    ]
    if (this.tunnelUrl) {
      lines.push(`║   Tunnel: ${this.tunnelUrl}${' '.repeat(Math.max(0, 32 - this.tunnelUrl.length))}║`)
    }
    lines.push('╚════════════════════════════════════════════════════════╝')
    console.log(lines.join('\n'))
  }

  async stop(): Promise<void> {
    // Close all WebSocket clients
    for (const client of this.clients) {
      client.close(1001, 'Server shutting down')
    }
    this.clients.clear()

    // Stop Claude process
    await this.claudeProcess.stop()

    // Close servers
    this.wss?.close()
    this.httpServer?.close()
  }
}
