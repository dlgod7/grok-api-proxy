# Grok API 代理服务

这是一个部署在Vercel上的反向代理服务器，主要用于：

1. 反向代理任意网站，提供更好的全球访问体验
2. 反向代理Grok、Claude和OpenAI等AI API，实现流式响应，解决API访问问题

## 功能特点

- ✅ 支持任意网站内容的反向代理和CDN加速
- ✅ 支持Grok、Claude和OpenAI API的流式代理
- ✅ 自动处理CORS问题，支持跨域请求
- ✅ 可在Vercel免费版本上运行
- ✅ 提供低延迟的全球访问体验

## 部署说明

### 在Vercel上部署

1. Fork本仓库
2. 在Vercel控制台中导入此项目
3. 配置以下环境变量（按需设置）：
   - `TARGET_URL`: 需要反向代理的目标网站URL
   - `GROK_TARGET_URL`: Grok API的URL (默认为 https://api.groq.com)
   - `CLAUDE_TARGET_URL`: Claude API的URL (默认为 https://api.anthropic.com)
   - `OPENAI_TARGET_URL`: OpenAI API的URL (默认为 https://api.openai.com)
4. 部署应用

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 使用示例

### WordPress博客访问

直接通过您的Vercel部署URL访问，例如：`https://your-vercel-app.vercel.app/`

### Grok API调用

```
curl https://your-vercel-app.vercel.app/grok/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello!"}],
    "model": "llama3-70b-8192",
    "stream": true
  }'
```

### Claude API调用

```
curl https://your-vercel-app.vercel.app/claude/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-opus-20240229",
    "messages": [{"role": "user", "content": "Say hello!"}],
    "stream": true
  }'
```

### OpenAI API调用

```
curl https://your-vercel-app.vercel.app/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Say hello!"}],
    "stream": true
  }'
```

## 在OpenWebUI中使用

1. 进入OpenWebUI的API管理界面
2. 添加新的API提供商
3. 在URL字段中输入：`https://your-vercel-app.vercel.app/grok`
4. 输入你的Grok API密钥
5. 保存并使用

## 注意事项

- 此服务仅用于个人学习和研究
- 请确保您有合法的API密钥和使用权限
- Vercel免费版有函数执行时间限制，对于大型请求可能会有超时问题
