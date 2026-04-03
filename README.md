# claude-code-remote-control

通过浏览器（包括手机）远程控制本地 Claude Code CLI。

## 快速开始——远程访问（手机）

#### 1：启动Bridge Server http://localhost:3456
```bash
npx claude-code-remote-control serve --tunnel
```
![本机启动bridge server](./docs/images/bridge_server.png)

#### 2：启动cloudflared 隧道
```bash
cloudflared tunnel --url http://localhost:3456
```
![本机启动cloudflare tunnel服务](./docs/images/cloudflare_server.png)手机浏览器打开上面划红线的地址

#### 3：cloudflare链接你电脑的bridge server
![cloudflare链接你电脑的bridge server](./docs/images/connect_to_bridge.png)
输入 ws://localhost:3456/ws   和Bridge server的token ，点击Connect。

#### 4：cloudflare链接你电脑的bridge server
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
