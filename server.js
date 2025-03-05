const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const bodyParser = require('body-parser');
const app = express();

// 解析JSON请求体，限制大小为10mb
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

// Grok API的目标URL
const grokTargetUrl = process.env.GROK_TARGET_URL || 'https://api.x.ai';

// 处理CORS预检请求
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-api-key, anthropic-version');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

// 所有请求都转发到Grok API，无需前缀过滤
app.use('/', createProxyMiddleware({
  target: grokTargetUrl,
  changeOrigin: true,
  selfHandleResponse: false, // 不缓冲响应，允许流式传输
  pathRewrite: (path, req) => {
    // 如果目标URL不包含/v1，则添加
    if (!grokTargetUrl.endsWith('/v1') && !path.startsWith('/v1')) {
      return '/v1' + path;
    }
    return path;
  },
  onProxyReq: (proxyReq, req, res) => {
    // 确保请求体具有stream=true参数
    if (req.body) {
      const modifiedBody = { ...req.body };
      
      // 强制启用流式传输
      if (path.includes('/chat/completions')) {
        modifiedBody.stream = true;
      }
      
      const bodyData = JSON.stringify(modifiedBody);
      
      // 更新内容长度
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      
      // 写入修改后的请求体
      proxyReq.write(bodyData);
      proxyReq.end();
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // 设置正确的响应头以支持流式传输
    const contentType = proxyRes.headers['content-type'] || '';
    
    // 对于SSE流式响应，确保设置正确的头信息
    if (contentType.includes('text/event-stream')) {
      proxyRes.headers['Cache-Control'] = 'no-cache';
      proxyRes.headers['Connection'] = 'keep-alive';
      
      // 确保使用chunked传输编码
      if (!proxyRes.headers['transfer-encoding']) {
        proxyRes.headers['transfer-encoding'] = 'chunked';
      }
    }
  },
  onError: (err, req, res) => {
    console.error('Grok API代理错误:', err);
    
    // 检查是否是流式请求
    const isEventStream = req.headers.accept && req.headers.accept.includes('text/event-stream');
    
    if (isEventStream && !res.headersSent) {
      // 对于流式请求，以SSE格式返回错误
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.write(`data: ${JSON.stringify({ error: '代理服务器错误', message: err.message })}\n\n`);
      res.write('data: [DONE]\n\n');
      res.end();
    } else if (!res.headersSent) {
      // 对于非流式请求，以JSON格式返回错误
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: '代理服务器错误', message: err.message }));
    }
  }
}));

// 在开发环境中启动服务器
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Grok API代理服务运行在 http://localhost:${PORT}`);
  });
}

module.exports = app;
