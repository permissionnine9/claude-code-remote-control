# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `yarn build` — compile TypeScript (src/ → dist/)
- `yarn dev` — run via tsx without pre-compiling (starts bridge server)
- `yarn start` — run compiled output (node dist/cli.js serve)
- `yarn clean` — remove dist/
- No tests or linter configured

## Architecture

Bridge server that lets you remotely control a locally running Claude Code CLI from a browser or Feishu bot.

```
[Browser/Mobile] <--WebSocket--> [BridgeServer] <--PTY--> [claude CLI]
[Feishu Bot]     <--WebSocket--^
```

### Core files (src/)

- **cli.ts** — CLI entry point (commander). Commands: `serve` (start bridge), `token` (generate token)
- **server.ts** — `BridgeServer` class. Express HTTP server serves `public/` + WebSocket at `/ws`. Handles auth (token-based), routes client messages to ClaudeProcess, broadcasts events to clients. REST: `/health`, `/verify-token`. Optional cloudflared tunnel with QR code generation
- **claude-process.ts** — `ClaudeProcess` class. Spawns `claude` CLI as PTY subprocess via `@lydell/node-pty`. Emits: `raw`, `stream`, `permission-request`, `status`, `exit`, `error`. Accepts input via `sendMessage()`, `write()`, `handlePermissionResponse()`
- **message-parser.ts** — `OutputParser` class (line-buffered). Parses Claude terminal output into `stream-event`, `permission-prompt`, or `plain-text`
- **types.ts** — All protocol types: `ClientMessage`, `ServerMessage`, `StreamEvent`, `BridgeConfig`, `BridgeStatus`
- **utils.ts** — `Logger`, `generateToken()`, `safeJsonParse()`, `delay()`

### Web client (public/)

- **index.html** — Single-page app with xterm.js terminal. Vendored deps in `public/refers/` (xterm, WebGL renderer, fit addon, web-links addon). Two connection modes: manual (user fills URL+token) and QR auto-connect (URL params → verify-token → WebSocket). Mobile-friendly with virtual keyboard bar.

### Protocol

- Client authenticates via first WS message: `{ type: 'auth', token }`
- Client → Server types: `send_message`, `input`, `resize`, `interrupt`, `session_new`, `session_resume`, `permission_response`, `ping`
- Server → Client types: `connected`, `stream`, `raw_output`, `permission_request`, `status`, `pong`, `error`

### Feishu adapter (feishu-adapter/)

Separate standalone module (git-ignored). Connects to BridgeServer as a WebSocket client, translates between Feishu chat messages and Claude Code interactions.

## Key conventions

- ESM modules (`"type": "module"`), imports use `.js` extension
- TypeScript strict mode, target ES2022
- Yarn for package management
- Node >= 18.0.0
- QR code token flow: token never fills the input box — URL params → form hidden → verify-token API → direct WebSocket connect
