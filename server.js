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

// 创建Grok API代理
const grokProxy = createProxyMiddleware({
  target: grokTargetUrl,
  changeOrigin: true,
  pathRewrite: (pathReq, req) => {
    // 确保路径以/v1开头
    return pathReq.startsWith('/v1') ? pathReq : `/v1${pathReq}`;
  },
  onProxyReq: (proxyReq, req) => {
    // 确保请求体中包含stream=true
    if (req.body && req.method === 'POST') {
      if (req.body.stream === undefined) {
        req.body.stream = true;
        
        // 如果请求体已被解析，需要重新写入
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    }
  },
  onProxyRes: (proxyRes, req, res) => {
    // 处理流式响应，设置适当的头部
    if (req.body && req.body.stream === true) {
      proxyRes.headers['Cache-Control'] = 'no-cache';
      proxyRes.headers['Connection'] = 'keep-alive';
      proxyRes.headers['Content-Type'] = 'text/event-stream';
    }
  },
  onError: (err, req, res) => {
    console.error('代理错误:', err);
    if (!res.headersSent) {
      res.status(500).send({
        error: {
          message: `代理请求失败: ${err.message}`,
          type: 'proxy_error'
        }
      });
    }
  },
  selfHandleResponse: false // 让响应直接流式传输
});

// 将所有请求代理到Grok API
app.use('/', grokProxy);

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});

module.exports = app;
