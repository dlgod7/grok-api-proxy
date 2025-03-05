const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const zlib = require('zlib');
const bodyParser = require('body-parser');
const app = express();

// 解析JSON请求体
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// 支持多个目标URL的配置
const targetUrl = process.env.TARGET_URL || 'https://targetUrl.com';
const grokTargetUrl = process.env.GROK_TARGET_URL || 'https://api.x.ai';
const claudeTargetUrl = process.env.CLAUDE_TARGET_URL || 'https://api.anthropic.com';
const openaiTargetUrl = process.env.OPENAI_TARGET_URL || 'https://api.openai.com';

// 辅助函数：直接从请求中获取新的基础网址
function getNewBaseUrl(req) {
  return `https://${req.headers.host}`;
}

function modifyResponseBody(proxyRes, req, res) {
  const chunks = [];
  // 收集响应数据块
  proxyRes.on('data', (chunk) => {
    chunks.push(chunk);
  });

  proxyRes.on('end', () => {
    const bodyBuffer = Buffer.concat(chunks);
    // 复制响应头，后续会修改
    const headers = Object.assign({}, proxyRes.headers);
    // 更新 location 头（重定向链接）中的网址
    if (headers.location) {
      headers.location = headers.location.replace(new RegExp(targetUrl, 'g'), getNewBaseUrl(req));
    }
    // 删除 content-length，因为替换后可能会改变数据长度
    delete headers['content-length'];

    // 检查内容类型，只对文本类型内容进行替换，防止修改二进制数据（如图片）
    const contentType = headers['content-type'] || '';
    const isText = contentType.includes('text') ||
                   contentType.includes('json') ||
                   contentType.includes('xml') ||
                   contentType.includes('javascript') ||
                   contentType.includes('css');
    if (!isText) {
      res.writeHead(proxyRes.statusCode, headers);
      return res.end(bodyBuffer);
    }

    const encoding = headers['content-encoding'];
    if (encoding === 'gzip') {
      // 处理 gzip 编码
      zlib.gunzip(bodyBuffer, (err, decodedBuffer) => {
        if (err) {
          console.error('Gunzip error:', err);
          res.writeHead(proxyRes.statusCode, headers);
          return res.end(bodyBuffer);
        }
        let bodyText = decodedBuffer.toString('utf8');
        // 替换所有目标网址为新网址
        bodyText = bodyText.replace(new RegExp(targetUrl, 'g'), getNewBaseUrl(req));
        let modifiedBuffer = Buffer.from(bodyText, 'utf8');
        // 再次压缩
        zlib.gzip(modifiedBuffer, (err, compressedBuffer) => {
          if (err) {
            console.error('Gzip error:', err);
            res.writeHead(proxyRes.statusCode, headers);
            return res.end(modifiedBuffer);
          }
          headers['content-length'] = Buffer.byteLength(compressedBuffer);
          res.writeHead(proxyRes.statusCode, headers);
          res.end(compressedBuffer);
        });
      });
    } else if (encoding === 'deflate') {
      // 处理 deflate 编码
      zlib.inflate(bodyBuffer, (err, decodedBuffer) => {
        if (err) {
          console.error('Inflate error:', err);
          res.writeHead(proxyRes.statusCode, headers);
          return res.end(bodyBuffer);
        }
        let bodyText = decodedBuffer.toString('utf8');
        bodyText = bodyText.replace(new RegExp(targetUrl, 'g'), getNewBaseUrl(req));
        let modifiedBuffer = Buffer.from(bodyText, 'utf8');
        // 再次压缩
        zlib.deflate(modifiedBuffer, (err, compressedBuffer) => {
          if (err) {
            console.error('Deflate error:', err);
            res.writeHead(proxyRes.statusCode, headers);
            return res.end(modifiedBuffer);
          }
          headers['content-length'] = Buffer.byteLength(compressedBuffer);
          res.writeHead(proxyRes.statusCode, headers);
          res.end(compressedBuffer);
        });
      });
    } else if (encoding === 'br') {
      // 处理 Brotli (br) 编码
      zlib.brotliDecompress(bodyBuffer, (err, decodedBuffer) => {
        if (err) {
          console.error('Brotli Decompress error:', err);
          res.writeHead(proxyRes.statusCode, headers);
          return res.end(bodyBuffer);
        }
        let bodyText = decodedBuffer.toString('utf8');
        bodyText = bodyText.replace(new RegExp(targetUrl, 'g'), getNewBaseUrl(req));
        let modifiedBuffer = Buffer.from(bodyText, 'utf8');
        // 再次压缩 Brotli
        zlib.brotliCompress(modifiedBuffer, (err, compressedBuffer) => {
          if (err) {
            console.error('Brotli Compress error:', err);
            res.writeHead(proxyRes.statusCode, headers);
            return res.end(modifiedBuffer);
          }
          headers['content-length'] = Buffer.byteLength(compressedBuffer);
          res.writeHead(proxyRes.statusCode, headers);
          res.end(compressedBuffer);
        });
      });
    } else {
      // 未压缩的内容或不支持的编码
      let bodyText = bodyBuffer.toString('utf8');
      bodyText = bodyText.replace(new RegExp(targetUrl, 'g'), getNewBaseUrl(req));
      let modifiedBuffer = Buffer.from(bodyText, 'utf8');
      headers['content-length'] = Buffer.byteLength(modifiedBuffer);
      res.writeHead(proxyRes.statusCode, headers);
      res.end(modifiedBuffer);
    }
  });

  proxyRes.on('error', (err) => {
    console.error('Proxy response error:', err);
    res.end();
  });
}

// 创建支持流式传输的AI API代理配置
function createStreamingAIProxy(targetUrl) {
  return createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    selfHandleResponse: false, // 关键设置：不自己处理响应，让代理自动流式传输
    pathRewrite: (path, req) => {
      // 从路径中移除前缀，例如将 /grok/v1/chat/completions 转为 /v1/chat/completions
      if (path.startsWith('/grok/')) {
        // 针对X.ai API的特殊处理，判断目标URL是否已包含/v1
        if (targetUrl.endsWith('/v1')) {
          // 如果目标URL已经包含/v1，则直接去掉/grok
          return path.replace('/grok', '');
        } else {
          // 如果目标URL不包含/v1，则去掉/grok/v1并添加/v1
          return '/v1' + path.replace('/grok/v1', '');
        }
      } else if (path.startsWith('/claude/')) {
        return path.replace('/claude', '');
      } else if (path.startsWith('/openai/')) {
        return path.replace('/openai', '');
      }
      return path;
    },
    onProxyReq: (proxyReq, req, res) => {
      // 确保流式请求的正确处理
      if (req.body && req.body.stream === true) {
        // 确保客户端请求中的stream参数为true
        const modifiedBody = { ...req.body, stream: true };
        const bodyData = JSON.stringify(modifiedBody);
        
        // 更新内容长度
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        
        // 写入请求体
        proxyReq.write(bodyData);
        proxyReq.end();
      } else if (req.body) {
        // 对于非流式请求，正常处理
        const bodyData = JSON.stringify(req.body);
        proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
        proxyReq.write(bodyData);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      // 处理流式响应的特殊头
      const contentType = proxyRes.headers['content-type'] || '';
      
      // 确保CORS头和流式传输所需的头
      proxyRes.headers['Access-Control-Allow-Origin'] = '*';
      proxyRes.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
      proxyRes.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, x-api-key, anthropic-version';
      
      // 针对SSE (Server-Sent Events)流式响应的特殊处理
      if (contentType.includes('text/event-stream')) {
        // 确保不会缓存SSE响应
        proxyRes.headers['Cache-Control'] = 'no-cache';
        proxyRes.headers['Connection'] = 'keep-alive';
        
        // 保留transfer-encoding: chunked，确保流式传输
        if (!proxyRes.headers['transfer-encoding']) {
          proxyRes.headers['transfer-encoding'] = 'chunked';
        }
      } else {
        // 对于非流式响应，正常处理
        if (proxyRes.headers['content-length']) {
          // 保留内容长度
        }
      }
    },
    // 增强的错误处理
    onError: (err, req, res) => {
      console.error('代理错误:', err);
      
      // 检查是否是流式请求
      const isStreamRequest = req.body && req.body.stream === true;
      
      if (isStreamRequest && !res.headersSent) {
        // 对于流式请求的错误，以SSE格式返回错误
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.write(`data: ${JSON.stringify({ error: '代理服务器错误', message: err.message })}\n\n`);
        res.write('data: [DONE]\n\n');
        res.end();
      } else if (!res.headersSent) {
        // 对于非流式请求或已发送头的情况，以JSON格式返回错误
        res.writeHead(500, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({ error: '代理服务器错误', message: err.message }));
      }
    }
  });
}

// Grok API 流式代理路由
app.use('/grok/v1/chat/completions', createStreamingAIProxy(grokTargetUrl));

// Claude API 流式代理路由
app.use('/claude/v1/messages', createStreamingAIProxy(claudeTargetUrl));

// OpenAI API 流式代理路由
app.use('/openai/v1/completions', createStreamingAIProxy(openaiTargetUrl));
app.use('/openai/v1/chat/completions', createStreamingAIProxy(openaiTargetUrl));

// 预处理OPTIONS请求，支持CORS
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    return res.status(200).end();
  }
  next();
});

// WordPress特定逻辑的路由处理（仅当目标是WordPress网站时有效）
app.use('/wp-login.php', createProxyMiddleware({
  target: targetUrl,
  changeOrigin: true,
  selfHandleResponse: true,
  // 强制请求不使用压缩编码
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('accept-encoding', 'identity');
  },
  onProxyRes: (proxyRes, req, res) => {
    if (req.url.includes('action=postpass')) {
      // 当请求中包含 action=postpass 时，从后端获取 Set-Cookie，
      // 将 cookie 中的 domain 属性去掉（或修改为新域），再返回302重定向到原始页面
      const referer = req.headers.referer || getNewBaseUrl(req);
      let setCookie = proxyRes.headers['set-cookie'];
      if (setCookie) {
        if (!Array.isArray(setCookie)) {
          setCookie = [setCookie];
        }
        // 去除 cookie 中的 domain 属性，确保 cookie 默认作用于当前域
        setCookie = setCookie.map(cookie => cookie.replace(/;?\s*domain=[^;]+/i, ''));
      }
      const headers = {
        'Location': referer,
        'Content-Type': 'text/html'
      };
      if (setCookie) {
        headers['Set-Cookie'] = setCookie;
      }
      res.writeHead(302, headers);
      res.end(`<html>
  <head>
    <meta http-equiv="refresh" content="0;url=${referer}">
  </head>
  <body>验证成功，正在重定向...</body>
</html>`);
    } else {
      // 对于其他情况，直接转发响应数据，并修正 location 头中的目标网址
      let chunks = [];
      proxyRes.on('data', (chunk) => chunks.push(chunk));
      proxyRes.on('end', () => {
        const bodyBuffer = Buffer.concat(chunks);
        const headers = Object.assign({}, proxyRes.headers);
        if (headers.location) {
          headers.location = headers.location.replace(new RegExp(targetUrl, 'g'), getNewBaseUrl(req));
        }
        res.writeHead(proxyRes.statusCode, headers);
        res.end(bodyBuffer);
      });
    }
  }
}));

// 通用网站代理
app.use('/', createProxyMiddleware({
  target: targetUrl,
  changeOrigin: true,
  selfHandleResponse: true,
  // 强制请求不使用压缩编码
  onProxyReq: (proxyReq, req, res) => {
    proxyReq.setHeader('accept-encoding', 'identity');
  },
  onProxyRes: modifyResponseBody
}));

// 如果不在 Vercel 环境中，则启动本地服务器
if (!process.env.VERCEL) {
  app.listen(3000, () => {
    console.log('Proxy server is running on http://localhost:3000');
  });
}

module.exports = app;
