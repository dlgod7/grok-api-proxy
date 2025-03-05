# 多功能反向代理服务器

这是一个基于 Node.js 的反向代理服务器，可部署在 Vercel 平台上，有两个主要用途：

1. **反代 WordPress 等网站**：可以反代您的 WordPress 博客或其他网站，白嫖 Vercel 的全球 CDN，提升访问速度。
2. **反代 Grok API**：对于国内用户，可以通过此服务访问被封锁的 Grok API，支持流式输出，完美适配 OpenWebUI 等开源客户端。（也支持其他API如OpenAI、Claude等）

## 特点

- 自动替换所有返回内容中的网址，确保链接正常工作
- 支持各种压缩格式 (gzip, deflate, br)
- 针对 Grok API 优化，支持流式响应，解决超时问题
- 完全免费，利用 Vercel 的服务器和 CDN 资源
- 简单易用，无需编程知识，只需几步设置
- **通用性强**：无需修改代码即可反代 Grok API 及其他类似 API

## 部署方法（二选一）

您可以选择以下两种部署方式中的任意一种：

### 方法一：Vercel 部署（推荐小白用户）

这种方法完全免费，只需几分钟即可完成，无需任何编程知识。

#### 第一步：Fork 本项目

1. 在本页面顶部，点击 "Fork" 按钮
2. 选择 "Create a new fork"
3. 保持默认设置，点击 "Create fork"
4. 等待几秒钟，项目就会被复制到您的 GitHub 账号下

#### 第二步：在 Vercel 上部署

1. 注册/登录 [Vercel](https://vercel.com)（可直接用 GitHub 账号登录）
2. 点击 "Add New..." -> "Project"
3. 在项目列表中找到您刚才 Fork 的项目，点击 "Import"
4. 保持默认设置，点击 "Deploy"
5. 等待部署完成

#### 第三步：设置环境变量（重要！）

部署后还需要设置目标网址，否则代理无法正常工作：

1. 在 Vercel 项目页面，点击顶部的 "Settings" 标签
2. 在左侧菜单找到 "Environment Variables"
3. 添加新的环境变量：
   - **名称**：`TARGET_URL`
   - **值**：填入您要反代的目标网址
     - 反代 WordPress：例如 `https://您的博客地址.com`
     - 反代 Grok API：`https://api.x.ai`（X公司的Grok API）
     - 其他API（如需要）：
       - OpenAI API：`https://api.openai.com`
       - Claude API：`https://api.anthropic.com`
4. 点击 "Save" 保存
5. 回到 "Deployments" 标签，找到最新部署，点击右边的 "..." 按钮，选择 "Redeploy"
6. 等待重新部署完成

#### 第四步：绑定自己的域名（必须！）

Vercel提供的默认域名（格式为`https://您的项目名-用户名.vercel.app`）**在国内已被屏蔽**，因此必须绑定自己的域名才能在国内正常访问：

1. 在Vercel控制台进入您的项目
2. 点击"Settings" → 左侧选择"Domains" 
3. 输入您的域名并点击"Add"
   - 如果您还没有域名，可以在[阿里云](https://wanwang.aliyun.com/domain/)、[腾讯云](https://dnspod.cloud.tencent.com/)等注册商购买
4. 按照Vercel提供的指引，到您的域名注册商那里添加相应的DNS记录
5. 等待验证成功，您的域名就可以正常访问了

#### 第五步：使用您的代理服务

部署和域名设置完成后，就可以开始使用您的代理服务了：

- **反代网站**：直接访问您的域名即可访问被代理的源站内容
- **反代 Grok API**：在客户端中，将API基础URL设置为您的域名+"/v1"
  - 例如：`https://您的域名/v1`
  - 在OpenWebUI等开源客户端中，选择"OpenAI"类型，并正确设置为`https://您的域名/v1`

### 方法二：VPS部署（适合有经验用户）

如果您有自己的VPS或云主机，可以选择这种方式部署，拥有更大的控制权和稳定性。

> **为什么需要Nginx？** 虽然Node.js应用可以直接运行，但使用Nginx作为前置代理有以下优势：
> - **安全性增强**：Nginx可以隐藏Node.js应用的具体细节，减少直接暴露的风险
> - **SSL/HTTPS支持**：更容易配置SSL证书，提供加密连接
> - **负载均衡**：如果将来需要扩展，可以轻松配置多个后端
> - **静态资源处理**：更高效地处理静态文件
> - **缓存**：可以配置缓存提高性能
> - **防DDoS**：提供一定的防护能力
>
> 如果您不想使用Nginx，也可以仅完成步骤1-4，然后使用防火墙开放3000端口，直接访问`http://您的IP:3000`，但不推荐在生产环境中这样做。

#### Ubuntu/Debian 系统部署步骤

1. **准备工作：更新系统并安装基础软件**
   ```bash
   # 更新系统包
   sudo apt update
   sudo apt upgrade -y
   
   # 安装 Node.js 和 npm
   sudo apt install -y nodejs npm git
   
   # 检查安装的版本
   node -v  # 应该显示 v10.x 或更高版本
   npm -v   # 应该显示 v6.x 或更高版本
   ```

2. **克隆项目代码**
   ```bash
   # 创建一个文件夹用于存放项目
   mkdir -p ~/proxy-server
   cd ~/proxy-server
   
   # 克隆项目代码
   git clone https://github.com/您的用户名/您fork的项目名.git .
   # 如果您没有fork，可以直接克隆原始项目
   # git clone https://github.com/原作者/原项目名.git .
   
   # 安装依赖
   npm install
   ```

3. **配置目标网址**
   ```bash
   # 编辑server.js文件
   nano server.js
   ```
   
   找到第6行左右的这一行代码：
   ```javascript
   const targetUrl = process.env.TARGET_URL || 'https://targetUrl.com';
   ```
   
   将`'https://targetUrl.com'`替换为您要反代的目标网址，例如：
   ```javascript
   const targetUrl = process.env.TARGET_URL || 'https://api.x.ai';
   ```
   
   保存并退出（在nano编辑器中按Ctrl+X，然后按Y确认保存，最后按Enter）

4. **启动服务**
   ```bash
   # 安装 PM2 用于进程管理
   sudo npm install -g pm2
   
   # 启动服务
   pm2 start server.js --name "proxy-server"
   
   # 设置开机自启
   pm2 startup
   pm2 save
   ```

5. **配置 Nginx 反向代理（可选，但推荐）**
   ```bash
   # 安装 Nginx
   sudo apt install -y nginx
   
   # 创建 Nginx 配置文件
   sudo nano /etc/nginx/sites-available/proxy-server
   ```
   
   在编辑器中粘贴以下内容（替换域名为您自己的）：
   ```
   server {
       listen 80;
       server_name your-domain.com;  # 替换成您的域名
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   保存并启用站点：
   ```bash
   sudo ln -s /etc/nginx/sites-available/proxy-server /etc/nginx/sites-enabled/
   sudo nginx -t  # 测试配置是否有错
   sudo systemctl restart nginx
   ```

6. **配置 SSL（可选，但强烈推荐）**
   ```bash
   # 安装 Certbot
   sudo apt install -y certbot python3-certbot-nginx
   
   # 获取并安装证书
   sudo certbot --nginx -d your-domain.com
   
   # 证书会自动续期
   ```

完成VPS部署后，您可以通过您的域名访问服务，使用方式与Vercel部署相同。

#### CentOS/RHEL 系统部署步骤

1. **准备工作：更新系统并安装基础软件**
   ```bash
   # 更新系统包
   sudo yum update -y
   
   # 安装 Node.js 和 npm
   sudo yum install -y epel-release
   sudo yum install -y nodejs npm git
   
   # 检查安装的版本
   node -v  # 确保版本在 v10 以上
   npm -v   # 确保版本在 v6 以上
   ```

2. **克隆项目代码**
   ```bash
   # 创建一个文件夹用于存放项目
   mkdir -p ~/proxy-server
   cd ~/proxy-server
   
   # 克隆项目代码
   git clone https://github.com/您的用户名/您fork的项目名.git .
   
   # 安装依赖
   npm install
   ```

3. **配置目标网址**
   ```bash
   # 编辑server.js文件
   nano server.js
   ```
   
   找到第6行左右的这一行代码：
   ```javascript
   const targetUrl = process.env.TARGET_URL || 'https://targetUrl.com';
   ```
   
   将`'https://targetUrl.com'`替换为您要反代的目标网址，例如：
   ```javascript
   const targetUrl = process.env.TARGET_URL || 'https://api.x.ai';
   ```
   
   保存并退出（在nano编辑器中按Ctrl+X，然后按Y确认保存，最后按Enter）

4. **启动服务**
   ```bash
   # 安装 PM2 用于进程管理
   sudo npm install -g pm2
   
   # 启动服务
   pm2 start server.js --name "proxy-server"
   
   # 设置开机自启
   pm2 startup
   sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $(whoami) --hp $(echo $HOME)
   pm2 save
   ```

5. **配置防火墙**
   ```bash
   # 开放 80 和 443 端口
   sudo firewall-cmd --permanent --add-service=http
   sudo firewall-cmd --permanent --add-service=https
   sudo firewall-cmd --reload
   ```

6. **配置 Nginx 反向代理（可选，但推荐）**
   ```bash
   # 安装 Nginx
   sudo yum install -y nginx
   
   # 启动 Nginx 并设置开机自启
   sudo systemctl start nginx
   sudo systemctl enable nginx
   
   # 创建 Nginx 配置文件
   sudo nano /etc/nginx/conf.d/proxy-server.conf
   ```
   
   在编辑器中粘贴以下内容（替换域名为您自己的）：
   ```
   server {
       listen 80;
       server_name your-domain.com;  # 替换成您的域名
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```
   
   保存并重启 Nginx：
   ```bash
   sudo nginx -t  # 测试配置是否有错
   sudo systemctl restart nginx
   ```

7. **配置 SSL（可选，但强烈推荐）**
   ```bash
   # 安装 Certbot
   sudo yum install -y certbot python3-certbot-nginx
   
   # 获取并安装证书
   sudo certbot --nginx -d your-domain.com
   
   # 证书会自动续期
   ```

完成VPS部署后，您可以通过您的域名访问服务，使用方式与Vercel部署相同。

## 注意事项

- Vercel 免费计划有一定的带宽和函数执行时间限制（例如超时时间10秒）
- 不要将此服务用于违法用途
- 使用 Grok API 时，请确保您拥有合法的 API 使用权
- 部分网站可能有反代理机制，效果可能不理想
- **使用Grok API需注意**：使用时需要正确填写模型名称（如`grok-2`），建议参考[官方文档](https://docs.x.ai/)了解最新模型信息

## 常见问题

**Q: 部署后访问显示错误或白屏？**  
A: 检查环境变量是否设置正确，确保 TARGET_URL 没有多余的空格和斜杠。

**Q: Grok API 响应很慢或超时？**  
A: 这可能是网络问题或 Vercel 节点限制，可尝试不同时间重试或使用VPS部署。

**Q: 可以同时反代多个不同的 API 吗？**  
A: 单个部署只能反代一个目标地址。如需反代多个服务，请创建多个项目部署。

**Q: WordPress 登录后跳转有问题？**  
A: 本项目已优化常见的 WordPress 登录问题，如仍有异常，可尝试使用源站管理。

**Q: VPS 部署后无法通过域名访问？**  
A: 请检查域名DNS是否正确指向您的VPS IP，以及Nginx配置和防火墙设置是否正确。

**Q: 如何在Vercel上绑定自己的域名？**  
A: 在Vercel控制台进入您的项目 → 点击"Settings" → 左侧选择"Domains" → 输入您的域名并点击"Add"。然后根据Vercel提供的指引，到您的域名注册商那里添加相应的DNS记录。验证成功后，您的域名就可以正常访问了。
