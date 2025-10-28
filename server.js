const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');

const app = express();
const PORT = 5000;
const XMCP_PORT = 3000; // xmcp default port

// Get MCP URL for the homepage
const mcpUrl = process.env.REPLIT_DEV_DOMAIN 
  ? `https://${process.env.REPLIT_DEV_DOMAIN}/mcp`
  : `http://localhost:${PORT}/mcp`;

const homepageHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MCP Server</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            max-width: 680px;
            margin: 0 auto;
            padding: 80px 24px;
            background: #ffffff;
            min-height: 100vh;
            color: #1a1a1a;
            line-height: 1.6;
        }
        
        h1 { 
            margin: 0 0 12px 0; 
            font-size: 2.5em; 
            font-weight: 600;
            letter-spacing: -0.03em;
            color: #000;
        }
        
        .subtitle {
            font-size: 1.1em;
            color: #666;
            margin-bottom: 48px;
            font-weight: 400;
        }
        
        h2 { 
            font-size: 0.75em; 
            font-weight: 600; 
            text-transform: uppercase; 
            letter-spacing: 0.15em; 
            color: #888;
            margin: 48px 0 16px 0;
        }
        
        p { 
            margin: 12px 0; 
            color: #555; 
            line-height: 1.7;
        }
        
        .endpoint-container {
            position: relative;
            margin: 16px 0 24px 0;
        }
        
        .endpoint {
            background: #f8f8f8;
            padding: 14px 16px;
            padding-right: 90px;
            border-radius: 8px;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 0.9em;
            color: #1a1a1a;
            word-break: break-all;
            border: 1px solid #e8e8e8;
        }
        
        .copy-btn {
            position: absolute;
            right: 12px;
            top: 50%;
            transform: translateY(-50%);
            background: #000;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 0.85em;
            cursor: pointer;
            font-weight: 500;
            transition: all 0.2s ease;
        }
        
        .copy-btn:hover {
            background: #333;
        }
        
        .copy-btn:active {
            transform: translateY(-50%) scale(0.95);
        }
        
        .copy-btn.copied {
            background: #10b981;
        }
        
        a { 
            color: #000; 
            text-decoration: none; 
            border-bottom: 1px solid #ddd;
            transition: border-color 0.2s ease;
        }
        
        a:hover { 
            border-bottom-color: #000;
        }
        
        .tool-list {
            list-style: none;
            margin: 16px 0;
        }
        
        .tool-list li {
            padding: 12px 0;
            border-bottom: 1px solid #f0f0f0;
        }
        
        .tool-list li:last-child {
            border-bottom: none;
        }
        
        .tool-name {
            font-weight: 600;
            color: #000;
            font-family: 'SF Mono', Monaco, 'Courier New', monospace;
            font-size: 0.9em;
        }
        
        .tool-desc {
            color: #666;
            font-size: 0.95em;
            margin-top: 4px;
        }
        
        .info-box {
            background: #f8f9fa;
            border-left: 3px solid #000;
            padding: 16px;
            margin: 24px 0;
            border-radius: 4px;
            font-size: 0.95em;
        }
        
        .info-box strong {
            color: #000;
        }
        
        .auth-note {
            background: #fef3c7;
            border-left: 3px solid #f59e0b;
        }
        
        .docs-links {
            display: flex;
            gap: 24px;
            flex-wrap: wrap;
            margin-top: 16px;
        }
        
        .docs-links a {
            color: #666;
            font-size: 0.95em;
        }
        
        @media (max-width: 600px) {
            body {
                padding: 48px 20px;
            }
            
            h1 {
                font-size: 2em;
            }
            
            .endpoint {
                padding-right: 16px;
                padding-bottom: 50px;
            }
            
            .copy-btn {
                right: 12px;
                top: auto;
                bottom: 12px;
                transform: none;
            }
            
            .copy-btn:active {
                transform: scale(0.95);
            }
        }
    </style>
</head>
<body>
    <h1>MCP Server</h1>
    <p class="subtitle">Model Context Protocol server built with xmcp</p>
    
    <h2>Endpoint</h2>
    <div class="endpoint-container">
        <div class="endpoint" id="mcp-url">${mcpUrl}</div>
        <button class="copy-btn" onclick="copyToClipboard('mcp-url', this)">Copy</button>
    </div>
    
    <div class="info-box auth-note">
        <strong>Authentication Required:</strong> This server uses API key authentication. 
        Include your API key in the <code>x-api-key</code> header when connecting.
    </div>
    
    <h2>Available Tools</h2>
    <ul class="tool-list">
        <li>
            <div class="tool-name">greet</div>
            <div class="tool-desc">Greet a user by name</div>
        </li>
        <li>
            <div class="tool-name">homepage</div>
            <div class="tool-desc">Display this homepage with server information</div>
        </li>
    </ul>
    
    <h2>Configuration</h2>
    <p>Add this server to your MCP client configuration:</p>
    <div class="endpoint-container">
        <div class="endpoint" id="config-json" style="white-space: pre; font-size: 0.85em; padding-right: 16px;">{
  "mcpServers": {
    "my-xmcp-app": {
      "url": "${mcpUrl}",
      "headers": {
        "x-api-key": "your-session-secret"
      }
    }
  }
}</div>
    </div>
    
    <h2>Documentation</h2>
    <div class="docs-links">
        <a href="https://xmcp.dev/docs" target="_blank">xmcp Docs</a>
        <a href="https://modelcontextprotocol.io/" target="_blank">MCP Spec</a>
        <a href="https://mcpui.dev/" target="_blank">MCP UI</a>
    </div>

    <script>
        function copyToClipboard(elementId, button) {
            const element = document.getElementById(elementId);
            const text = element.textContent.trim();
            
            navigator.clipboard.writeText(text).then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.classList.add('copied');
                
                setTimeout(() => {
                    button.textContent = originalText;
                    button.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy:', err);
                button.textContent = 'Error';
                setTimeout(() => {
                    button.textContent = 'Copy';
                }, 2000);
            });
        }
    </script>
</body>
</html>
`;

let xmcpServer;

// Start xmcp server first
console.log('Starting xmcp server...');
xmcpServer = spawn('node', ['dist/http.js'], {
  stdio: 'pipe',
  env: process.env
});

xmcpServer.stdout.on('data', (data) => {
  console.log(`[xmcp] ${data.toString().trim()}`);
});

xmcpServer.stderr.on('data', (data) => {
  console.error(`[xmcp Error] ${data.toString().trim()}`);
});

xmcpServer.on('error', (err) => {
  console.error('Failed to start xmcp server:', err);
  process.exit(1);
});

// Wait a bit for xmcp to start, then start Express
setTimeout(() => {
  // Serve custom homepage at root - this route is defined FIRST
  app.get('/', (req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Cache-Control', 'no-cache');
    res.send(homepageHtml);
  });

  // Proxy all /mcp requests to the xmcp server
  app.use('/mcp', createProxyMiddleware({
    target: `http://localhost:${XMCP_PORT}/mcp`,
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    pathRewrite: {
      '^/mcp': '', // Remove /mcp prefix when forwarding to target
    },
  }));

  // Catch-all for any other routes
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  // Start the Express server
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`✔ Express server running on http://0.0.0.0:${PORT}`);
    console.log(`✔ Homepage: http://0.0.0.0:${PORT}/`);
    console.log(`✔ MCP endpoint: http://0.0.0.0:${PORT}/mcp`);
  });
}, 2000);

// Handle process termination
process.on('SIGINT', () => {
  console.log('\nShutting down...');
  if (xmcpServer) xmcpServer.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('\nShutting down...');
  if (xmcpServer) xmcpServer.kill();
  process.exit();
});
