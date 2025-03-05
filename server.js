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

// 创建Grok API代理，简化配置以减少超时风险
const grokProxy = createProxyMiddleware({
  target: grokTargetUrl,
  changeOrigin: true,
  followRedirects: true, // 自动跟随重定向
  pathRewrite: (pathReq) => {
    return pathReq.startsWith('/v1') ? pathReq : `/v1${pathReq}`;
  },
  onProxyReq: (proxyReq, req) => {
    // 只对POST请求进行处理
    if (req.body && req.method === 'POST' && req.body.stream === undefined) {
      // 添加stream参数
      req.body.stream = true;
      
      // 重写请求体
      const bodyData = JSON.stringify(req.body);
      proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
      proxyReq.write(bodyData);
    }
  },
  selfHandleResponse: false, // 不缓冲响应，直接流式传输
  proxyTimeout: 60000, // 增加代理超时时间到60秒
  timeout: 60000, // 增加socket超时时间到60秒
  buffer: {
    pipe: false // 确保数据不被完全缓冲
  }
});

// 将所有请求代理到Grok API
app.use('/', grokProxy);

// 启动服务器
const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`服务器运行在端口 ${port}`);
});

module.exports = app;
