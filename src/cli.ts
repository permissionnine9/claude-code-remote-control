#!/usr/bin/env node

import { Command } from 'commander'
import { BridgeServer } from './server.js'
import { generateToken } from './utils.js'
import type { BridgeConfig } from './types.js'

const program = new Command()

program
  .name('claude-code-remote-control')
  .description('Remote control bridge for Claude Code CLI')
  .version('2.0.0')

program
  .command('serve')
  .description('Start the bridge server')
  .option('-p, --port <port>', 'Server port', '3456')
  .option('-h, --host <host>', 'Server host', '0.0.0.0')
  .option('-t, --token <token>', 'Auth token (auto-generated if not provided)')
  .option('--cwd <dir>', 'Working directory for Claude Code')
  .option('--model <model>', 'Claude model to use')
  .option('--permission-mode <mode>', 'Permission mode: default | accept-edits | bypass-permissions', 'default')
  .option('--tunnel', 'Auto-start cloudflared tunnel for public access')
  .option('-l, --log-level <level>', 'Log level: debug | info | warn | error', 'info')
  .option('--token-expires <minutes>', 'Token expiration time in minutes (default: 5)', '5')
  .action(async (options) => {
    const config: BridgeConfig = {
      port: parseInt(options.port),
      host: options.host,
      token: options.token,
      claudeCwd: options.cwd,
      claudeModel: options.model,
      claudePermissionMode: options.permissionMode,
      tunnel: options.tunnel,
      logLevel: options.logLevel,
      tokenExpiresMinutes: parseInt(options.tokenExpires),
    }

    const server = new BridgeServer(config)

    // Graceful shutdown
    const shutdown = async () => {
      console.log('\nShutting down...')
      await server.stop()
      process.exit(0)
    }
    process.on('SIGINT', shutdown)
    process.on('SIGTERM', shutdown)

    try {
      await server.start()
    } catch (err: any) {
      console.error('Failed to start server:', err.message)
      process.exit(1)
    }
  })

program
  .command('token')
  .description('Generate a random auth token')
  .action(() => {
    console.log(generateToken())
  })

program.parse()
