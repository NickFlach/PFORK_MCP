const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = 5000;
const XMCP_PORT = 3000;

let xmcpServer;

// Start xmcp server in the background
console.log('Starting xmcp server...');
xmcpServer = spawn('node', ['dist/http.js'], {
  stdio: 'pipe',
  env: process.env
});

xmcpServer.stdout.on('data', (data) => {
  console.log(`[xmcp] ${data.toString().trim()}`);
});

xmcpServer.stderr.on('data', (data) => {
  console.error(`[xmcp] ${data.toString().trim()}`);
});

xmcpServer.on('error', (err) => {
  console.error('Failed to start xmcp server:', err);
  process.exit(1);
});

// Wait for xmcp to start
setTimeout(() => {
  // Serve static files from public directory
  app.use(express.static(path.join(__dirname, 'public')));

  // Serve homepage at root
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // Helper function to query the MCP server
  async function queryMCP(method) {
    const response = await fetch(`http://localhost:${XMCP_PORT}/mcp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': process.env.SESSION_SECRET || '',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: {}
      })
    });
    
    if (!response.ok) {
      throw new Error(`MCP request failed: ${response.statusText}`);
    }
    
    return await response.json();
  }

  // API endpoint to list available tools
  app.get('/api/tools', async (req, res) => {
    try {
      const mcpResponse = await queryMCP('tools/list');
      
      if (mcpResponse.error) {
        throw new Error(mcpResponse.error.message);
      }
      
      const tools = mcpResponse.result.tools.map(tool => ({
        name: tool.name,
        description: tool.description || ''
      }));
      
      res.json(tools);
    } catch (error) {
      console.error('Error loading tools:', error);
      res.status(500).json({ error: 'Failed to load tools' });
    }
  });

  // API endpoint to list available prompts
  app.get('/api/prompts', async (req, res) => {
    try {
      const mcpResponse = await queryMCP('prompts/list');
      
      if (mcpResponse.error) {
        throw new Error(mcpResponse.error.message);
      }
      
      const prompts = mcpResponse.result.prompts.map(prompt => ({
        name: prompt.name,
        description: prompt.description || ''
      }));
      
      res.json(prompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      res.status(500).json({ error: 'Failed to load prompts' });
    }
  });

  // API endpoint to list available resources
  app.get('/api/resources', async (req, res) => {
    try {
      const mcpResponse = await queryMCP('resources/list');
      
      if (mcpResponse.error) {
        // Resources might not be available, return empty array
        console.log('Resources not available:', mcpResponse.error.message);
        return res.json([]);
      }
      
      const resources = (mcpResponse.result?.resources || []).map(resource => ({
        name: resource.name,
        description: resource.description || ''
      }));
      
      res.json(resources);
    } catch (error) {
      console.error('Error loading resources:', error);
      // Return empty array instead of error to prevent frontend issues
      res.json([]);
    }
  });

  // Proxy all /mcp requests to xmcp server
  app.use('/mcp', createProxyMiddleware({
    target: `http://localhost:${XMCP_PORT}/mcp`,
    changeOrigin: true,
    ws: true,
    logLevel: 'silent',
    pathRewrite: {
      '^/mcp': '',
    },
  }));

  // 404 for any other routes
  app.use((req, res) => {
    res.status(404).send('Not Found');
  });

  // Start Express server
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
