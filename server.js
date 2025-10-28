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
  // Serve homepage at root
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  });

  // API endpoint to list available tools
  app.get('/api/tools', async (req, res) => {
    try {
      const fs = require('fs').promises;
      const toolsDir = path.join(__dirname, 'src', 'tools');
      
      const files = await fs.readdir(toolsDir);
      const tsFiles = files.filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      
      const tools = [];
      
      for (const file of tsFiles) {
        try {
          const toolPath = path.join(toolsDir, file);
          const content = await fs.readFile(toolPath, 'utf8');
          
          // Extract tool name from filename
          const toolName = file.replace(/\.(ts|js)$/, '');
          
          // Try to extract description from metadata
          const descMatch = content.match(/description:\s*["']([^"']+)["']/);
          const description = descMatch ? descMatch[1] : '';
          
          tools.push({
            name: toolName,
            description: description
          });
        } catch (err) {
          console.error(`Error reading tool file ${file}:`, err);
        }
      }
      
      res.json(tools);
    } catch (error) {
      console.error('Error loading tools:', error);
      res.status(500).json({ error: 'Failed to load tools' });
    }
  });

  // API endpoint to list available prompts
  app.get('/api/prompts', async (req, res) => {
    try {
      const fs = require('fs').promises;
      const promptsDir = path.join(__dirname, 'src', 'prompts');
      
      const files = await fs.readdir(promptsDir);
      const tsFiles = files.filter(file => file.endsWith('.ts') || file.endsWith('.js'));
      
      const prompts = [];
      
      for (const file of tsFiles) {
        try {
          const promptPath = path.join(promptsDir, file);
          const content = await fs.readFile(promptPath, 'utf8');
          
          // Extract metadata
          const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
          const descMatch = content.match(/description:\s*["']([^"']+)["']/);
          
          const name = nameMatch ? nameMatch[1] : file.replace(/\.(ts|js)$/, '');
          const description = descMatch ? descMatch[1] : '';
          
          prompts.push({
            name: name,
            description: description
          });
        } catch (err) {
          console.error(`Error reading prompt file ${file}:`, err);
        }
      }
      
      res.json(prompts);
    } catch (error) {
      console.error('Error loading prompts:', error);
      res.status(500).json({ error: 'Failed to load prompts' });
    }
  });

  // API endpoint to list available resources
  app.get('/api/resources', async (req, res) => {
    try {
      const fs = require('fs').promises;
      const resourcesDir = path.join(__dirname, 'src', 'resources');
      
      const resources = [];
      
      async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDir(fullPath);
          } else if ((entry.name === 'index.ts' || entry.name === 'index.js' || entry.name.endsWith('.ts') || entry.name.endsWith('.js')) && !entry.name.includes('.test.')) {
            try {
              const content = await fs.readFile(fullPath, 'utf8');
              
              // Extract metadata
              const nameMatch = content.match(/name:\s*["']([^"']+)["']/);
              const descMatch = content.match(/description:\s*["']([^"']+)["']/);
              
              if (nameMatch) {
                const name = nameMatch[1];
                const description = descMatch ? descMatch[1] : '';
                
                resources.push({
                  name: name,
                  description: description
                });
              }
            } catch (err) {
              console.error(`Error reading resource file ${fullPath}:`, err);
            }
          }
        }
      }
      
      await scanDir(resourcesDir);
      
      res.json(resources);
    } catch (error) {
      console.error('Error loading resources:', error);
      res.status(500).json({ error: 'Failed to load resources' });
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
