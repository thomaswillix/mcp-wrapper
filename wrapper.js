// WS <-> Streamable HTTP wrapper
// - Expone WebSocket en ws://localhost:<WRAPPER_WS_PORT>/mcp
// - Reenvía JSON-RPC por HTTP streaming (SSE) a <WRAPPER_TARGET_URL>
// - Añade /__health y /__shutdown vía HTTP para control desde Maven

import http from 'http';
import { WebSocketServer } from 'ws';

const WS_PORT = parseInt(process.env.WRAPPER_WS_PORT || process.argv.find(a => a.startsWith('--wsPort='))?.split('=')[1] || '9001', 10);
const TARGET_URL = process.env.WRAPPER_TARGET_URL || process.argv.find(a => a.startsWith('--target='))?.split('=')[1] || 'http://localhost:8000/mcp';
const LOG = !!process.env.WRAPPER_LOG || process.argv.includes('--log');

function log(...args) { if (LOG) console.log('[WRAPPER]', ...args); }

// 1) HTTP server (para health/shutdown y base del WS)
const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/__health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, target: TARGET_URL, wsPort: WS_PORT }));
    return;
  }
  if (req.method === 'POST' && req.url === '/__shutdown') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ shuttingDown: true }));
    // Cerrar server y salir
    setTimeout(() => {
      try { wss.clients.forEach(c => c.close()); } catch {}
      server.close(() => process.exit(0));
    }, 100);
    return;
  }
  // Default
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('MCP WS Wrapper running');
});

// 2) WebSocket Server montado sobre el HTTP server (ruta /mcp)
const wss = new WebSocketServer({ server, path: '/mcp' });

wss.on('connection', ws => {
  log('Karate connected via WS');

  ws.on('message', async message => {
    try {
      const json = JSON.parse(message.toString());
      log('→ WS JSON-RPC:', json);

      // 3) POST al streamable-http con Accept: text/event-stream
      const resp = await fetch(TARGET_URL, {
        method: 'POST',
        headers: {
          'Accept': 'text/event-stream',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(json)
      });

      // 4) Leer SSE y reenviar cada "data:" como mensaje WS
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        // Los eventos SSE suelen estar separados por doble salto de línea
        for (const block of chunk.split('\n\n')) {
          const line = block.trim();
          if (!line) continue;
          if (line.startsWith('data:')) {
            const data = line.substring(5).trim();
            log('← SSE data:', data);
            ws.send(data);
          }
        }
      }
    } catch (e) {
      console.error('Wrapper error:', e);
      try { ws.send(JSON.stringify({ jsonrpc: '2.0', error: { message: String(e) } })); } catch {}
    }
  });

  ws.on('close', () => log('WS client disconnected'));
});

// Arranque
server.listen(WS_PORT, () => {
  console.log(`MCP WS Wrapper listening at ws://localhost:${WS_PORT}/mcp -> ${TARGET_URL}`);
  console.log(`Health:  http://localhost:${WS_PORT}/__health`);
  console.log(`Shutdown:http://localhost:${WS_PORT}/__shutdown`);
});
