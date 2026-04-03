---
name: claude-code-remote
description: Launch a Claude Code remote control session via claude-code-remote-control. Use when the user wants to start a remote Claude Code session in a specific project directory, control Claude Code from a browser/mobile, or mentions claude-code-remote-control.
---
# Claude Code Remote Control

Start a browser-accessible Claude Code session in a specified project directory.

## Workflow

1. **Determine the project directory** — User specifies `--cwd` path, or default to workspace
2. **Start the server** in background using `exec`
3. **Parse the output** to get URL and token
4. **Generate a QR code** with the auto-connect URL
5. **Construct auto-connect URL**（带 token + expires 参数）
6. **Report the URL + QR code to the user**

## Start a Session

```bash
npx claude-code-remote-control serve --cwd <project-dir> [options]
```

Options:

- `--cwd <dir>` — Claude Code working directory (required)
- `-p, --port <port>` — Port (default: 3456)
- `-t, --token <token>` — Auth token (auto-generated if omitted)
- `--model <model>` — Claude model name
- `--permission-mode <mode>` — `default` | `accept-edits` | `bypass-permissions`
- `--tunnel` — Auto-start cloudflared tunnel for public access (requires `cloudflared`)
- `--token-expires <minutes>` — Token 有效期（分钟），默认使用 `10`

## Step-by-Step Execution

### 1. Start the server

使用 `exec` 的 background 模式启动：

```bash
npx claude-code-remote-control serve --cwd /path/to/project --tunnel --token-expires 10
```

默认参数：

- `--token-expires 10`（token 有效期 10 分钟）
- `--tunnel`（开启公网隧道，除非用户不需要公网访问）

如果端口被占用，先 kill 再启动：

```bash
lsof -ti:<port> | xargs kill -9 2>/dev/null; sleep 1; npx ...
```

### 2. Wait and parse output

Poll the process output to提取 URL（本地地址 + tunnel 公网地址）和 token。服务端输出的 QR code 也是基于自动连接 URL 生成的，可直接使用。

### 3. Generate QR code

服务端启动时会自动输出 QR code。如果需要自定义（比如带 token+expires 的 URL），可以用 qrencode：

```bash
qrencode -o /tmp/openclaw/claude-remote-qr.png "<base-url>?token=<token>&expires=<unix-timestamp-ms>"
```

如果 `qrencode` 不可用：`brew install qrencode`

然后通过 `image` 工具展示 QR code 给用户。

**飞书场景**：如果当前在飞书 channel 中，需要额外将 QR code 图片上传到飞书并发送：

1. 用 qrencode 生成图片：`qrencode -o /tmp/openclaw/claude-remote-qr.png "<auto-connect-url>"`
2. 使用飞书 IM 上传图片 API（以机器人身份）上传图片获取 `image_key`
3. 发送图片消息给用户预览

```bash
# 上传图片到飞书（需要 bot access token）
# POST https://open.feishu.cn/open-apis/im/v1/images
# Content-Type: multipart/form-data
# image_type: message
# image: <binary file>
```

上传成功后拿到 `image_key`，然后发送 `image` 类型消息给用户。

### 4. Construct auto-connect URL

**必须**将 token 和 expires 参数拼接到 URL 上，否则用户需要手动输入 token。

计算 expires 时间戳（当前 UTC 时间 + 10 分钟，**单位为毫秒**）：

```bash
date -u -v+10M +%s%3N
```

最终 URL 格式：

```
<base-url>?token=<token>&expires=<unix-timestamp-ms>
```

例如（毫秒级时间戳，13位）：

```
https://xxx.trycloudflare.com?token=mniyk4w-xxx&expires=1775208720000
```

页面加载时会自动解析 URL 参数，验证 token 后直接建立 WebSocket 连接，跳过手动输入。

### 4. Report to user

**必须使用以下固定格式回复用户：**

```
✅ Claude Code 已启动

📂 工作目录：/path/to/project
🔗 访问地址：<完整 trycloudflare.com URL?token=xxx&expires=xxx>
⏳ 链接 10 分钟内有效
```

**规则：**

- 必须包含工作目录完整路径
- 必须包含带 token+expires 参数的完整 URL
- 必须提示有效期
- 不要省略任何信息，不要只发 localhost:port

### 5. Stop the server

直接 kill 端口即可，无需额外清理：

```bash
lsof -ti:<port> | xargs kill -9
```

## Important Notes

- **URL 必须带参数**：报告给用户的 URL 必须包含 `?token=<token>&expires=<unix-timestamp-ms>`（**毫秒级**），这样打开页面会自动连接，无需手动输入 token
- **默认权限模式**：不要使用 `--permission-mode bypass-permissions`，除非用户明确要求。默认不传该参数即可
- **端口冲突处理**：如果端口被占用，**默认先 kill 掉占用该端口的旧进程再启动**（`lsof -ti:<port> | xargs kill -9`），除非用户明确要求保留旧实例并开启新的（此时才换端口）
- **Token 过期**：token 有效期 10 分钟（`--token-expires 10`），过期后需 kill 旧进程重新启动
- Server runs as a background process; use `process` tool to manage it
