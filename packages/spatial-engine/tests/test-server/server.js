import { createServer } from 'http';
import { readFile, readdir, stat } from 'fs/promises';
import { join, extname, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.ts': 'text/typescript',
  '.map': 'application/json',
};

async function serveFile(filePath, res) {
  try {
    const content = await readFile(filePath);
    const ext = extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    
    res.writeHead(200, {
      'Content-Type': mimeType,
      'Cache-Control': 'no-cache',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    
    res.end(content);
  } catch (error) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File not found');
  }
}

async function handleRequest(req, res) {
  let url = req.url;
  
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.writeHead(200, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.end();
    return;
  }
  
  // Root path serves test page
  if (url === '/' || url === '/test-spatial-engine') {
    await serveFile(join(__dirname, 'index.html'), res);
    return;
  }
  
  // Remove leading slash and resolve path
  url = url.substring(1);
  
  // Handle source files from src directory
  if (url.startsWith('src/')) {
    const srcPath = join(__dirname, '../..', url);
    await serveFile(srcPath, res);
    return;
  }
  
  // Handle node_modules for dependencies
  if (url.startsWith('node_modules/')) {
    const modulePath = join(__dirname, '../../../..', url);
    await serveFile(modulePath, res);
    return;
  }
  
  // Handle static files
  const staticPath = join(__dirname, url);
  try {
    const stats = await stat(staticPath);
    if (stats.isFile()) {
      await serveFile(staticPath, res);
      return;
    }
  } catch (error) {
    // File doesn't exist, continue to 404
  }
  
  // 404 for everything else
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
}

const server = createServer(handleRequest);

server.listen(PORT, () => {
  console.log(`Test server running on http://localhost:${PORT}`);
  console.log('Endpoints:');
  console.log('  /                     - Main test page');
  console.log('  /test-spatial-engine  - Spatial engine test page');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down test server...');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\nShutting down test server...');
  server.close(() => {
    process.exit(0);
  });
});