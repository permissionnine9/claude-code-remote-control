# claude-code-remote-control

通过浏览器（包括手机）远程控制本地 Claude Code CLI。

## 快速开始——远程访问（手机）

### 方式一：一键扫码连接（推荐）

> 前提：电脑本地需要安装cloudflare [https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)

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

如果 cloudflared 未安装或启动超时，会自动降级为本地模式（不影响正常使用）。

### 方式二：手动分步启动

#### 1：启动Bridge Server http://localhost:3456

```bash
npx claude-code-remote-control serve
```

![本机启动bridge server](./docs/images/bridge_server.png)

#### 2：启动cloudflared 隧道

```bash
cloudflared tunnel --url http://localhost:3456
```

![本机启动cloudflare tunnel服务](./docs/images/cloudflare_server.png)手机浏览器打开上面划红线的地址

#### 3：cloudflare链接你电脑的bridge server

![cloudflare链接你电脑的bridge server](./docs/images/connect_to_bridge.png)
Bridge URL自动获取，不需要输入手动修改！！   ，输入Bridge server的token ，点击Connect。

#### 4：开始远程对话

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
