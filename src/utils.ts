export function generateToken(): string {
  return `${Date.now().toString(36)}-${crypto.randomUUID()}`
}

export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function safeJsonParse<T>(data: string): T | null {
  try {
    return JSON.parse(data) as T
  } catch {
    return null
  }
}

export class Logger {
  constructor(private level: 'debug' | 'info' | 'warn' | 'error' = 'info') {}

  private shouldLog(level: string): boolean {
    const levels = ['debug', 'info', 'warn', 'error']
    return levels.indexOf(level) >= levels.indexOf(this.level)
  }

  debug(...args: unknown[]): void {
    if (this.shouldLog('debug')) console.log('[DEBUG]', ...args)
  }

  info(...args: unknown[]): void {
    if (this.shouldLog('info')) console.log('[INFO]', ...args)
  }

  warn(...args: unknown[]): void {
    if (this.shouldLog('warn')) console.warn('[WARN]', ...args)
  }

  error(...args: unknown[]): void {
    if (this.shouldLog('error')) console.error('[ERROR]', ...args)
  }
}
