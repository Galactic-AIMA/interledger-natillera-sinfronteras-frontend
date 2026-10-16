// Recorre el camino del pitch en la app (modo de ejemplo) con Edge sin ventana y guarda capturas a 2x
// en docs/pitch/pantallas/ (las usa docs/pitch/presentacion.html).
// Uso:
//   EXPO_PUBLIC_USE_MOCKS=1 npx expo export --platform web --output-dir dist
//   node scripts/capturar-pantallas.mjs dist docs/pitch/pantallas
import http from 'node:http';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIST = path.resolve(process.argv[2] || 'dist');
const OUT = path.resolve(process.argv[3] || 'docs/pitch/pantallas');
const BASE = 'http://127.0.0.1:8766/';
// Servidor estático con respaldo a index.html (la app es de una sola página)
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let file = path.join(DIST, decodeURIComponent(req.url.split('?')[0]));
  if (!file.startsWith(DIST) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) file = path.join(DIST, 'index.html');
  res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(file).on('error', () => res.end()).pipe(res);
}).listen(8766, '127.0.0.1');
fs.mkdirSync(OUT, { recursive: true });
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const PORT = 9333;
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'nsf-edge-'));
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`, '--no-first-run', '--disable-extensions', 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let ws, seq = 0;
const pending = new Map();
const listeners = [];
function send(method, params = {}) {
  const id = ++seq;
  ws.send(JSON.stringify({ id, method, params }));
  return new Promise((res, rej) => pending.set(id, { res, rej }));
}
async function connect() {
  for (let i = 0; i < 50; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) {
        ws = new WebSocket(page.webSocketDebuggerUrl);
        await new Promise((r) => (ws.onopen = r));
        ws.onmessage = (e) => {
          const m = JSON.parse(e.data);
          if (m.id && pending.has(m.id)) { const p = pending.get(m.id); pending.delete(m.id); m.error ? p.rej(new Error(m.error.message)) : p.res(m.result); }
          else if (m.method) listeners.forEach((l) => l(m));
        };
        return;
      }
    } catch {}
    await sleep(200);
  }
  throw new Error('Edge no respondió');
}
const evaluate = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result.value;

async function waitText(text, ms = 15000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (await evaluate(`document.body && document.body.innerText.includes(${JSON.stringify(text)})`)) return;
    await sleep(150);
  }
  throw new Error('No apareció: ' + text);
}
// Centro del último elemento visible cuyo texto propio es exactamente `text`.
async function clickText(text, { last = false } = {}) {
  const box = await evaluate(`(() => {
    const els = [...document.querySelectorAll('div,span,a,button')].filter(e => {
      const own = [...e.childNodes].filter(n => n.nodeType === 3).map(n => n.textContent).join('').trim();
      if (own !== ${JSON.stringify(text)}) return false;
      const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0;
    });
    const e = ${last ? 'els[els.length - 1]' : 'els[0]'}; if (!e) return null;
    e.scrollIntoView({ block: 'center' });
    const r = e.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  })()`);
  if (!box) throw new Error('No encontré: ' + text);
  await sleep(150);
  for (const type of ['mousePressed', 'mouseReleased']) await send('Input.dispatchMouseEvent', { type, x: box.x, y: box.y, button: 'left', clickCount: 1 });
  await sleep(350);
}
async function typeInto(index, value) {
  await evaluate(`(() => { const i = document.querySelectorAll('input')[${index}]; i.focus(); i.select && i.select(); })()`);
  await send('Input.insertText', { text: value });
  await sleep(150);
}
async function shot(name) {
  await evaluate(`window.scrollTo(0,0); document.querySelectorAll('*').forEach(e => { if (e.scrollTop) e.scrollTop = 0; })`);
  await sleep(500);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(data, 'base64'));
  console.log('ok', name);
}

let dialogAnswer = true;
try {
  await connect();
  await send('Page.enable');
  await send('Runtime.enable');
  listeners.push((m) => { if (m.method === 'Page.javascriptDialogOpening') send('Page.handleJavaScriptDialog', { accept: dialogAnswer }); });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await send('Emulation.setTouchEmulationEnabled', { enabled: false });
  await send('Page.navigate', { url: BASE });
  await waitText('Ahorre en familia');
  await sleep(1200);
  await shot('01-bienvenida');

  await clickText('Ya tengo cuenta');
  await waitText('Contraseña');
  await typeInto(0, 'andres');
  await typeInto(1, 'demo'); // en modo de ejemplo cualquier contraseña sirve
  await shot('03-entrar');
  await clickText('Entrar', { last: true });
  await waitText('Entre todos llevan');
  await sleep(800);
  await shot('10-mi-natillera');

  await clickText('Poner la cuota');
  await waitText('Sale de su billetera');
  await sleep(800);
  await shot('11-poner-cuota');

  await clickText('Poner la cuota', { last: true });
  await waitText('Ir a la billetera');
  await sleep(500);
  await shot('28-va-a-su-billetera');

  dialogAnswer = true;
  await clickText('Ir a la billetera');
  await waitText('Cuota puesta', 20000);
  await sleep(800);
  await shot('34-cuota-puesta');

  await clickText('Listo');
  await waitText('Entre todos llevan');
  await sleep(800);
  await shot('10-despues');

  // Rechazo: no sale plata (pantalla 32)
  await clickText('Poner la cuota');
  await waitText('Sale de su billetera');
  await sleep(500);
  await clickText('Poner la cuota', { last: true });
  await waitText('Ir a la billetera');
  dialogAnswer = false;
  await clickText('Ir a la billetera');
  await sleep(2500);
  await shot('32-permiso-rechazado');
  console.log('texto 32:', (await evaluate('document.body.innerText')).slice(0, 200).replace(/\n/g, ' | '));

  // Letra grande con A+ (inclusión)
  await send('Page.navigate', { url: BASE });
  await waitText('Ahorre en familia');
  await sleep(1000);
  await clickText('A+');
  await clickText('A+');
  await sleep(600);
  await shot('01-letra-grande');
} catch (e) {
  console.error('ERROR', e.message);
  try { const { data } = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, '_error.png'), Buffer.from(data, 'base64')); } catch {}
  process.exitCode = 1;
} finally {
  try { ws && ws.close(); } catch {}
  edge.kill();
  server.close();
  setTimeout(() => process.exit(), 300);
}
