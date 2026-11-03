// Autoprueba sin pantalla: sirve el juego en un puerto local, lo abre en Chromium
// (Playwright) con ?selftest=1 y escribe el informe. Sale con código 1 si falla.
//
//   npm install            (una vez: instala Playwright)
//   npx playwright install chromium
//   npm test               (o: node tools/selftest.mjs [minutos] [héroe])
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.glb': 'model/gltf-binary', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const minutes = Number(process.argv[2]) || 4;
const hero = process.argv[3] || 'kouji';

const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^([\\/])+/, '');
  try {
    const body = await readFile(join(ROOT, path || 'index.html'));
    res.writeHead(200, { 'content-type': TYPES[extname(path || '.html')] || 'application/octet-stream' });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch {
    res.writeHead(404); res.end();
  }
}).listen(0);
const port = server.address().port;

let chromium;
try { ({ chromium } = await import('playwright')); } catch {
  console.error('Falta Playwright: ejecuta "npm install" y "npx playwright install chromium".');
  process.exit(2);
}
const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage();
page.on('pageerror', (e) => console.error('[página]', e.message));
await page.goto(`http://localhost:${port}/?selftest=1&minutes=${minutes}&hero=${hero}`);
await page.waitForFunction(() => document.title.startsWith('SELFTEST ') && document.title !== 'SELFTEST RUNNING', null, { timeout: 10 * 60 * 1000 });
const report = await page.$eval('#selftest', (e) => e.textContent);
console.log(report);
const ok = (await page.title()) === 'SELFTEST OK';
await browser.close();
server.close();
process.exit(ok ? 0 : 1);
