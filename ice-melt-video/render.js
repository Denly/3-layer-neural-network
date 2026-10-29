// usage: node render.js out.mp4            -> full video (silent; mux audio with make.sh)
//        node render.js --stills 1,5,10 dir -> PNG previews at those seconds
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const fs = require('fs');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1920 } });
  p.on('pageerror', e => console.error('PAGE ERROR', e.message));
  await p.goto('file://' + __dirname + '/scene.html');
  await p.evaluate(tl => prepare(tl), JSON.parse(fs.readFileSync(__dirname + '/timeline.json')));
  const el = await p.$('#c');
  if (process.argv[2] === '--stills') {
    for (const s of process.argv[3].split(',')) {
      await p.evaluate(f => render(f), Math.round(+s * 30));
      await el.screenshot({ path: `${process.argv[4]}/still_${s}.png` });
    }
  } else {
    const n = await p.evaluate(() => Math.ceil(DUR * FPS));
    const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', '30', '-i', '-', '-c:v', 'libx264', '-preset', 'medium',
      '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-crf', '18', process.argv[2]], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let i = 0; i < n; i++) {
      await p.evaluate(f => render(f), i);
      if (!ff.stdin.write(await el.screenshot({ type: 'jpeg', quality: 93 }))) await new Promise(r => ff.stdin.once('drain', r));
      if (i % 150 === 0) console.log('frame', i, '/', n);
    }
    ff.stdin.end(); await new Promise(r => ff.on('close', r));
  }
  await b.close();
})();
