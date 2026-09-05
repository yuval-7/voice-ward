import { readFile } from 'node:fs/promises';

let envText = '';
try { envText = await readFile('.env', 'utf8'); } catch {}
const configured = Boolean(process.env.RIME_API_KEY || /^\s*RIME_API_KEY\s*=\s*[^\s#]+/m.test(envText));
const placeholders = /RIME_API_KEY\s*=\s*(YOUR_|REPLACE_|<)/i.test(envText);

if (!configured || placeholders) {
  console.error('Rime preflight failed: add a real RIME_API_KEY to .env. Do not commit .env.');
  process.exit(1);
}
console.log('Rime preflight passed: server-side key detected. Verify the selected model and speaker against the live catalog before recording.');
