# Grok API 流式代理服务

这是一个专为X.ai的Grok API设计的流式代理服务，部署在Vercel上，可以解决：

1. 某些地区无法访问Grok API的问题
2. 确保API响应以流式方式返回，避免大型响应导致Vercel超时问题

## 功能特点

- ✅ 支持Grok API的完整功能
- ✅ 自动处理流式响应，确保聊天内容逐字返回
- ✅ 自动处理CORS问题，支持跨域请求
- ✅ 可在Vercel免费版本上稳定运行
- ✅ 提供低延迟的全球访问体验

## 部署说明

### 在Vercel上部署

1. Fork本仓库
2. 在Vercel控制台中导入此项目
3. 配置环境变量：
   - `GROK_TARGET_URL`: Grok API的URL (默认为 https://api.x.ai)
4. 部署应用

### 本地开发

```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

## 使用示例

### Grok API调用

```
curl https://your-vercel-app.vercel.app/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key" \
  -d '{
    "messages": [{"role": "user", "content": "Say hello!"}],
    "model": "grok-2-latest",
    "stream": true
  }'
```

### 在OpenWebUI中使用

1. 进入OpenWebUI的API管理界面
2. 添加新的API提供商（选择OpenAI兼容类型）
3. 在提供商名称中输入：`Grok (X.ai)`
4. 在URL字段中输入：`https://your-vercel-app.vercel.app`
5. 在模型字段中输入：`grok-2-latest`
6. 输入你的X.ai API密钥
7. 保存并使用

## 注意事项

- 此服务仅用于个人学习和研究
- 请确保您有合法的API密钥和使用权限
- 所有API请求都会自动启用流式传输，无需额外配置
