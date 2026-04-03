# claude-code-remote-control

通过浏览器（包括手机）远程控制本地 Claude Code CLI。

## 正在研发中的能力

- openclaw控制 claude-code-remote-control，解决code agent黑盒coding的问题、可随时介入、终端claude code的运行过程
- 移动端im工具接入

## 快速开始

```bash
npx claude-code-remote-control serve
```

启动后终端会显示访问地址和 token，浏览器打开即可。

## CLI

```bash
claude-code-remote-control serve [options]

  -p, --port <port>              端口 (默认: 3456)
  -t, --token <token>            认证 token (不指定则自动生成)
  --cwd <dir>                    Claude Code 工作目录
  --model <model>                模型名称
  --permission-mode <mode>       权限模式: default | accept-edits | bypass-permissions
  --tunnel                       自动启动 cloudflared 隧道，生成公网地址

claude-code-remote-control token  # 生成随机 token
```

## 远程访问（手机）

```bash
# 安装 cloudflared
brew install cloudflared   # macOS
# 或参考 https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/

# 启动时加 --tunnel 自动创建公网地址
npx claude-code-remote-control serve --tunnel
```

或手动启动隧道：

```bash
# 终端 1：启动服务
npx claude-code-remote-control serve
```

![本机启动bridge server](./docs/images/bridge_server.png)

```bash
# 终端 2：启动隧道
cloudflared tunnel --url http://localhost:3456
```

![本机启动cloudflare tunnel服务](./docs/images/cloudflare_server.png)手机浏览器打开上面划红线的地址

![cloudflare链接你电脑的bridge server](./docs/images/connect_to_bridge.png)
输入 ws://localhost:3456/ws   和Bridge server的token ，点击Connect。

进入链接成功的界面，开始对话！到这里你已经成功了！你可以把这个网站发到你手机上操作啦。
![链接成功](./docs/images/remote_web_view.png)

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
