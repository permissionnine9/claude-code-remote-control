# claude-code-remote-control

通过浏览器（包括手机）远程控制本地 Claude Code CLI。

## 快速开始——远程访问（手机）

> 前提：电脑本地需要安装cloudflare，加速方法请看文档最后部分 [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

```bash
# 检查cloudflared是否已经安装好
cloudflared -v
```

只需一条命令：

```bash
npx claude-code-remote-control serve --tunnel
```

终端会自动启动 cloudflared 隧道并输出 QR 码：

```
╔════════════════════════════════════════════════════════╗
║   Claude Code Remote Control Bridge                    ║
╠════════════════════════════════════════════════════════╣
║   Web:    http://localhost:3456                        ║
║   Token:  a1b2c3d4e5f6                                ║
║   Tunnel: https://xxx.trycloudflare.com                ║
╚════════════════════════════════════════════════════════╝

Scan QR code to connect (expires in 5 min):
█████████████████████████████
██ ▄▄▄▄▄ █▀▄▀▀█ ▄▄▄▄▄ ██
██ █   █ ██▀ ▀█ █   █ ██
██ █▄▄▄█ █▄▀▀▀█ █▄▄▄█ ██
...
```

手机扫码 → 自动连接，无需手动输入 Token。QR 码 5 分钟内有效，过期后需重新启动服务。

<img src="./docs/images/remote_web_view.png" alt="链接成功" width="400" />

如果 cloudflared 未安装或启动超时，会自动降级为本地模式（不影响正常使用）。

## OpenClaw接入

复制s kill_for_openclaw/claude-code-remote到你电脑本地 ～/.openclaw/skills目录下，然后就可以在openclaw中唤起claude-code-remote，比如你可以说：“帮我在XX目录下开启claude code remote，...”

## CLI 命令参考

### `serve` — 启动 Bridge Server

```bash
npx claude-code-remote-control serve [options]
```

| 选项                         | 说明                                                                | 默认值      |
| ---------------------------- | ------------------------------------------------------------------- | ----------- |
| `-p, --port <port>`        | 服务端口                                                            | `3456`    |
| `-h, --host <host>`        | 服务主机地址                                                        | `0.0.0.0` |
| `--cwd <dir>`              | Claude Code 工作目录                                                | 当前目录    |
| `--model <model>`          | 指定 Claude 模型                                                    | 默认模型    |
| `--permission-mode <mode>` | 权限模式：`default` \| `accept-edits` \| `bypass-permissions` | `default` |
| `--tunnel`                 | 自动启动 cloudflared 隧道，提供公网访问                             | 关闭        |
| `-l, --log-level <level>`  | 日志级别：`debug` \| `info` \| `warn` \| `error`            | `info`    |

示例：

```bash
# 默认启动
npx claude-code-remote-control serve

# 指定端口和模型，开启隧道
npx claude-code-remote-control serve --port 8080 --model claude-sonnet-4-6 --tunnel

# 自定义工作目录
npx claude-code-remote-control serve --cwd /path/to/project

# 调试模式
npx claude-code-remote-control serve --log-level debug
```

## Clouldflare安装

#### 方式一、国内加速

```bash
# 步骤1 Homebrew 国内镜像加速配置（2026年更新）
export HOMEBREW_BREW_GIT_REMOTE="https://mirrors.ustc.edu.cn/brew.git"
export HOMEBREW_CORE_GIT_REMOTE="https://mirrors.ustc.edu.cn/homebrew-core.git"
export HOMEBREW_BOTTLE_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles"
export HOMEBREW_API_DOMAIN="https://mirrors.ustc.edu.cn/homebrew-bottles/api"
export HOMEBREW_NO_ENV_HINTS="1"

# 步骤2 再执行Clouldflare安装脚本（如 brew install cloudflared ），看官方文档：
# https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads

# 步骤3
cloudflared --version
```

#### 方式二、安装二进制安装包

```bash
# 步骤1
进入https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads 安装官方提供的releae包

# 步骤2
把Cloudflare安装路径移动到user/local/bin目录，或者加入系统环境变量，这一步建议直接让AI执行

# 步骤3
cloudflared --version
```

## 编程使用

```ts
import { BridgeServer } from 'claude-code-remote-control'

const server = new BridgeServer({
  port: 3456,
  token: 'my-secret',
  claudeCwd: '/path/to/project',
})
await server.start()
```

## License

MIT
