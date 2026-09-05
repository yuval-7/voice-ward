import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

async function loadDotEnv() {
  try {
    const lines = (await readFile(join(process.cwd(), '.env'), 'utf8')).split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*)\s*$/);
      if (match && !process.env[match[1]]) process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

await loadDotEnv();

const port = Number(process.env.PORT || 3000);
const publicDir = join(process.cwd(), 'public');
const MAX_TEXT_LENGTH = 500;

const mime = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8' };

function responseFor(text) {
  const clean = text.replace(/\s+/g, ' ').trim().replace(/[.!?]+$/, '');
  if (/cancel|stop|never mind/i.test(clean)) return 'Understood. I have stopped the previous task. What should I do instead?';
  if (/safety|hazard|danger/i.test(clean)) return 'Safety check started. Tell me the location and the immediate hazard, and I will keep the response brief.';
  return `I heard: ${clean}. I am checking that now. You can interrupt me at any time to revise or cancel it.`;
}

async function body(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 10_000) throw new Error('Request too large');
  }
  return JSON.parse(raw || '{}');
}

async function rimeAudio(text, signal) {
  const apiKey = process.env.RIME_API_KEY;
  if (!apiKey) return null;
  const endpoint = process.env.RIME_ENDPOINT || 'https://users.rime.ai/v1/rime-tts';
  const payload = {
    text,
    modelId: process.env.RIME_MODEL_ID || 'mistv3',
    speaker: process.env.RIME_SPEAKER || 'astra',
    lang: process.env.RIME_LANG || 'eng',
    samplingRate: 22050
  };
  const result = await fetch(endpoint, {
    method: 'POST', signal,
    headers: { Authorization: `Bearer ${apiKey}`, Accept: 'audio/mpeg', 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!result.ok) throw new Error(`Rime returned ${result.status}`);
  return Buffer.from(await result.arrayBuffer()).toString('base64');
}

function rimeConfig() {
  return {
    configured: Boolean(process.env.RIME_API_KEY),
    provider: process.env.RIME_API_KEY ? 'Rime' : 'Local development fallback',
    endpoint: process.env.RIME_ENDPOINT || 'https://users.rime.ai/v1/rime-tts',
    modelId: process.env.RIME_MODEL_ID || 'mistv3',
    speaker: process.env.RIME_SPEAKER || 'astra',
    lang: process.env.RIME_LANG || 'eng',
    audioFormat: 'audio/mpeg'
  };
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && req.url === '/api/health') {
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(JSON.stringify(rimeConfig()));
    return;
  }
  if (req.method === 'POST' && req.url === '/api/respond') {
    const controller = new AbortController();
    res.on('close', () => {
      // A normal request body completing is not a cancellation. Abort only if
      // the client disconnected before this response was written.
      if (!res.writableEnded) controller.abort();
    });
    try {
      const { text, generation } = await body(req);
      if (typeof text !== 'string' || !text.trim() || text.length > MAX_TEXT_LENGTH) throw new Error('Enter 1 to 500 characters.');
      const spokenText = responseFor(text);
      console.log('[voice-ward] synthesis started', { generation, usingRime: Boolean(process.env.RIME_API_KEY) });
      const audioBase64 = await rimeAudio(spokenText, controller.signal);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(JSON.stringify({ generation, text: spokenText, provider: audioBase64 ? 'Rime' : 'Local development fallback', audioBase64 }));
      console.log('[voice-ward] synthesis completed', { generation, provider: audioBase64 ? 'Rime' : 'fallback' });
    } catch (error) {
      if (controller.signal.aborted) return;
      console.error('[voice-ward] synthesis failed', { message: error.message });
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
    return;
  }
  const requested = req.url === '/' ? 'index.html' : req.url.split('?')[0].replace(/^\//, '');
  const file = normalize(join(publicDir, requested));
  if (!file.startsWith(publicDir)) { res.writeHead(403); res.end(); return; }
  try {
    const content = await readFile(file);
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream' });
    res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});

server.listen(port, () => console.log(`Voice Ward listening at http://localhost:${port}`));
