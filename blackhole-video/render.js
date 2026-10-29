// usage: node render.js out.mp4             -> full video (silent; make.sh adds audio)
//        node render.js --stills 1,5,10 dir  -> PNG previews at those seconds
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const http = require('http'), fs = require('fs'), path = require('path');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(__dirname, decodeURIComponent(req.url.split('?')[0]));
  if (!f.startsWith(__dirname) || !fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
}).listen(0, '127.0.0.1');
(async () => {
  const b = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  p.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') console.error('console:', m.text()); });
  await p.goto(`http://127.0.0.1:${server.address().port}/index.html`);
  await p.waitForFunction(() => window.READY);
  await p.evaluate(tl => prepare(tl), JSON.parse(fs.readFileSync(path.join(__dirname, 'timeline.json'))));
  const shotAt = async (frame, opts) => { await p.evaluate(f => renderFrame(f), frame); return p.screenshot({ clip: { x: 0, y: 0, width: 1080, height: 1920 }, ...opts }); };
  if (process.argv[2] === '--stills') {
    for (const s of process.argv[3].split(',')) { const t0 = Date.now(); await shotAt(Math.round(+s * 30), { path: `${process.argv[4]}/s_${s}.png` }); console.log(s, Date.now() - t0, 'ms'); }
  } else {
    const n = await p.evaluate(() => Math.ceil(DUR * FPS));
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'medium',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '17', process.argv[2]], { stdio: ['pipe', 'inherit', 'inherit'] });
    const t0 = Date.now();
    for (let i = 0; i < n; i++) {
      if (!ff.stdin.write(await shotAt(i, { type: 'jpeg', quality: 94 }))) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 100 === 0) console.log('frame', i, '/', n, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close(); server.close();
})();
