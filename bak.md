### 方式二：手动分步启动

#### 1：启动Bridge Server http://localhost:3456

```bash

npxclaude-code-remote-controlserve

```

![本机启动bridge server](./docs/images/bridge_server.png)

#### 2：启动cloudflared 隧道

```bash

cloudflaredtunnel--urlhttp://localhost:3456

```

![本机启动cloudflare tunnel服务](./docs/images/cloudflare_server.png)手机浏览器打开上面划红线的地址

#### 3：cloudflare链接你电脑的bridge server

![cloudflare链接你电脑的bridge server](./docs/images/connect_to_bridge.png)

Bridge URL自动获取，不需要输入手动修改！！   ，输入Bridge server的token ，点击Connect。

#### 4：开始远程对话

进入链接成功的界面，开始对话！到这里你已经成功了！你可以把这个网站发到你手机上操作啦。

![链接成功](./docs/images/remote_web_view.png)
