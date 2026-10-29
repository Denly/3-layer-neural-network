// "What happens if you fall into a black hole?" - three.js scene.
// Layer 1: full-screen ray-traced black hole (photon paths bent around a Schwarzschild mass).
// Layer 2: a three.js astronaut sharing the same camera.
// Layer 3: 2D canvas with titles and word-by-word captions.
// render.js calls window.prepare(timeline) once, then window.renderFrame(frame) per frame.
import * as THREE from 'three';

const W = 1080, H = 1920, FPS = 30;
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const seg = (t, a, b) => clamp((t - a) / (b - a));
const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const lerp = (a, b, t) => a + (b - a) * t;

const renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('gl'), antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H, false);
renderer.autoClear = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;

const camera = new THREE.PerspectiveCamera(50, W / H, .01, 500);

// ---------- black hole (units: Schwarzschild radius = 1) ----------
const BH_SCALE = 0.5;   // the shader renders at half resolution, then upscales
const bhTarget = new THREE.WebGLRenderTarget(W * BH_SCALE, H * BH_SCALE, { type: THREE.HalfFloatType });
const bhMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 }, uCamPos: { value: new THREE.Vector3() }, uCamMat: { value: new THREE.Matrix3() },
    uTanFov: { value: Math.tan(THREE.MathUtils.degToRad(25)) }, uAspect: { value: W / H }, uDisk: { value: 1 },
  },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `
    precision highp float;
    varying vec2 vUv;
    uniform float uTime, uTanFov, uAspect, uDisk;
    uniform vec3 uCamPos; uniform mat3 uCamMat;
    float hash(vec3 p){ p = fract(p * .3183099 + .1); p *= 17.; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3. - 2. * f);
      return mix(mix(hash2(i), hash2(i + vec2(1, 0)), f.x), mix(hash2(i + vec2(0, 1)), hash2(i + vec2(1, 1)), f.x), f.y); }
    vec3 stars(vec3 d){
      vec3 c = vec3(0.);
      for (int k = 0; k < 2; k++) {
        float sc = k == 0 ? 90. : 220.;
        vec3 p = d * sc, i = floor(p), f = fract(p) - .5;
        float h = hash(i);
        if (h > .965) { float s = smoothstep(.12, 0., length(f)); c += s * mix(vec3(.6,.75,1.), vec3(1.,.85,.6), hash(i + 3.)) * (k == 0 ? 2.2 : 1.); }
      }
      float neb = noise(d.xy * 3. + d.z * 2.) * noise(d.yz * 5. - 1.3);
      c += vec3(.25, .1, .45) * pow(neb, 2.) * .5 + vec3(.05, .12, .3) * pow(noise(d.zx * 4.), 3.) * .4;
      return c;
    }
    vec3 diskColor(vec3 p, vec3 rd, out float a){
      float r = length(p.xz);
      if (r < 2.6 || r > 11.) { a = 0.; return vec3(0.); }
      float phi = atan(p.z, p.x), om = 1.6 * pow(r, -1.5);
      float ang = phi + om * uTime * 6.;
      float n = noise(vec2(r * 2.2, ang * 4.)) * .6 + noise(vec2(r * 7., ang * 12.)) * .4;
      float ring = .55 + .45 * sin(r * 6. + n * 4.);
      float temp = pow(2.6 / r, .9);
      vec3 col = mix(vec3(1., .35, .08), vec3(1., .85, .55), temp);
      col = mix(col, vec3(.85, .9, 1.), pow(temp, 3.));
      // Doppler beaming: the side spinning toward us is brighter and bluer
      vec3 vel = normalize(vec3(-p.z, 0., p.x)) * sqrt(.5 / max(r - 1., .5));
      float dop = 1. / (1. - dot(vel, -rd) * 1.1);
      float edge = smoothstep(2.6, 3.2, r) * smoothstep(11., 6., r);
      a = clamp(edge * (.35 + .65 * n) * ring * 1.6, 0., 1.) * uDisk;
      return col * pow(clamp(dop, .3, 2.2), 2.5) * (.45 + 1.6 * temp) * (.6 + .8 * n);
    }
    void main(){
      vec2 sp = (vUv * 2. - 1.) * vec2(uAspect, 1.) * uTanFov;
      vec3 rd = normalize(uCamMat * normalize(vec3(sp, -1.)));
      vec3 pos = uCamPos, vel = rd;
      vec3 h = cross(pos, vel); float h2 = dot(h, h);
      vec3 col = vec3(0.); float trans = 1.;
      bool captured = false;
      for (int i = 0; i < 160; i++) {
        float r = length(pos);
        float dt = clamp(.06 * r, .02, 1.2);
        vec3 prev = pos;
        vel += -1.5 * h2 * pos / pow(r, 5.) * dt;   // photon geodesic (Schwarzschild, rs = 1)
        pos += vel * dt;
        if (prev.y * pos.y < 0.) {                   // crossed the disk plane
          vec3 hit = mix(prev, pos, prev.y / (prev.y - pos.y));
          float a; vec3 dc = diskColor(hit, normalize(vel), a);
          col += trans * dc * a; trans *= 1. - a;
          if (trans < .02) break;
        }
        if (length(pos) < 1.) { captured = true; break; }
        if (r > 60.) break;
      }
      if (!captured) col += trans * stars(normalize(vel));
      // thin photon-ring glow
      gl_FragColor = vec4(col, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), bhMat);
const bhScene = new THREE.Scene(); bhScene.add(quad);
const ortho = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
// upscale pass
const blitMat = new THREE.ShaderMaterial({
  uniforms: { tex: { value: bhTarget.texture }, uFade: { value: 1 }, uTint: { value: new THREE.Vector3(1, 1, 1) } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }`,
  fragmentShader: `varying vec2 vUv; uniform sampler2D tex; uniform float uFade; uniform vec3 uTint;
    void main(){
      vec3 c = texture2D(tex, vUv).rgb;
      // cheap bloom: a few wide taps
      vec3 b = vec3(0.); float s = 0.;
      for (int i = -3; i <= 3; i++) for (int j = -3; j <= 3; j++) { vec2 o = vec2(float(i), float(j)) * .006; float w = exp(-float(i*i + j*j) * .25); b += max(texture2D(tex, vUv + o * vec2(1., .5625)).rgb - 1.1, 0.) * w; s += w; }
      c += b / s * 1.6;
      c = clamp(c * (2.51 * c + .03) / (c * (2.43 * c + .59) + .14), 0., 1.);   // ACES fit
      gl_FragColor = vec4(pow(c * uTint, vec3(1. / 2.2)) * uFade, 1.);
    }`,
  depthTest: false, depthWrite: false,
});
const blitScene = new THREE.Scene(); blitScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), blitMat));

// ---------- astronaut ----------
const astroScene = new THREE.Scene();
astroScene.add(new THREE.HemisphereLight(0x7f9cff, 0x1a0c05, .9));
const diskLight = new THREE.PointLight(0xffa04a, 60, 0, 1.2); diskLight.position.set(0, -2, 0); astroScene.add(diskLight);
const key = new THREE.DirectionalLight(0xffffff, 1.6); key.position.set(3, 4, 5); astroScene.add(key);
const astro = new THREE.Group(), body = new THREE.Group(); astro.add(body); astroScene.add(astro);
{
  const suit = new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: .55 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x8a8f99, roughness: .7 });
  const visor = new THREE.MeshStandardMaterial({ color: 0xffb347, metalness: 1, roughness: .12, emissive: 0x331800 });
  const orange = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: .5 });
  const cap = (r, l, m, x, y, z, rz = 0, rx = 0) => { const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 8, 16), m); o.position.set(x, y, z); o.rotation.set(rx, 0, rz); body.add(o); return o; };
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(.34, 32, 24), suit); helmet.position.y = 1.02; body.add(helmet);
  const vis = new THREE.Mesh(new THREE.SphereGeometry(.27, 32, 24, -Math.PI * .45, Math.PI * .9, Math.PI * .28, Math.PI * .42), visor); vis.position.set(0, 1.03, .1); body.add(vis);
  cap(.32, .45, suit, 0, .45, 0);                                   // torso
  const pack = new THREE.Mesh(new THREE.BoxGeometry(.55, .65, .28), dark); pack.position.set(0, .5, -.3); body.add(pack);
  const badge = new THREE.Mesh(new THREE.BoxGeometry(.16, .1, .02), orange); badge.position.set(.12, .62, .31); body.add(badge);
  cap(.11, .42, suit, -.45, .45, 0, .5); cap(.11, .42, suit, .45, .45, 0, -.6);   // arms
  cap(.13, .5, suit, -.17, -.25, 0, .12); cap(.13, .5, suit, .17, -.25, 0, -.18); // legs
  const boot = new THREE.MeshStandardMaterial({ color: 0x555a66, roughness: .8 });
  cap(.14, .1, boot, -.2, -.6, .04, 0, 1.4); cap(.14, .1, boot, .22, -.6, .04, 0, 1.4);
}
// force arrows for the tidal shot
const arrows = new THREE.Group(); astroScene.add(arrows);
const mkArrow = (col) => { const g = new THREE.Group(), m = new THREE.MeshBasicMaterial({ color: col });
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.05, .05, 1, 12), m), head = new THREE.Mesh(new THREE.ConeGeometry(.14, .3, 16), m);
  head.rotation.x = Math.PI; g.add(shaft, head); g.userData = { shaft, head }; arrows.add(g); return g; };
const arrowHead = mkArrow(0x7fd3ff), arrowFeet = mkArrow(0xff5d5d);
function setArrow(a, x, yTop, len) { a.position.set(x, 0, 0); a.userData.shaft.scale.y = len; a.userData.shaft.position.y = yTop - len / 2; a.userData.head.position.y = yTop - len - .1; }

// ---------- 2D overlay ----------
const ui = document.getElementById('ui').getContext('2d');
const FONT = "Impact, 'Arial Black', sans-serif";
function txt(s, x, y, size, col = '#fff', a = 1) {
  ui.globalAlpha = a; ui.font = `900 ${size}px ${FONT}`; ui.textAlign = 'center';
  const mw = ui.measureText(s).width; if (mw > 940) { size *= 940 / mw; ui.font = `900 ${size}px ${FONT}`; }
  ui.lineJoin = 'round'; ui.lineWidth = size * .18; ui.strokeStyle = 'rgba(0,0,0,.92)'; ui.strokeText(s, x, y);
  ui.fillStyle = col; ui.fillText(s, x, y); ui.globalAlpha = 1;
}
function title(s, t, t0, col = '#fff', y = 330, size = 104, sub, subCol = '#ffb35c') {
  if (t < t0) return;
  const a = seg(t, t0, t0 + .25), pop = 1 + .25 * (1 - easeOut(seg(t, t0, t0 + .35)));
  ui.save(); ui.translate(W / 2, y); ui.scale(pop, pop); txt(s, 0, 0, size, col, a);
  if (sub) txt(sub, 0, size * .85, size * .5, subCol, a);
  ui.restore();
}
let TL;
function captions(t) {
  const ln = TL.lines.find(l => t >= l.start - .05 && t <= l.end + .3); if (!ln) return;
  let ch = ln.chunks[0]; for (const c of ln.chunks) if (t >= c[0].start - .02) ch = c;
  const pop = easeOut(seg(t, ch[0].start, ch[0].start + .14)), size = 92;
  ui.font = `900 ${size}px ${FONT}`;
  const sp = ui.measureText(' ').width, ws = ch.map(w => ({ ...w, ww: ui.measureText(w.w).width + sp }));
  const total = ws.reduce((s, w) => s + w.ww, 0) - sp, fit = Math.min(1, 940 / total);
  ui.save(); ui.translate(W / 2, 1480); ui.scale(fit * (.85 + .15 * pop), fit * (.85 + .15 * pop));
  let x = -total / 2;
  for (const w of ws) {
    const cur = t >= w.start && t < w.end + .02;
    ui.textAlign = 'left'; ui.lineJoin = 'round'; ui.lineWidth = 18; ui.strokeStyle = '#000'; ui.strokeText(w.w, x, 0);
    ui.fillStyle = cur ? '#ffe14d' : '#fff'; ui.fillText(w.w, x, 0); x += w.ww;
  }
  ui.restore();
}

// ---------- camera helpers ----------
function lookFrom(pos, target, roll = 0) {
  camera.position.copy(pos); camera.up.set(Math.sin(roll), Math.cos(roll), 0); camera.lookAt(target); camera.updateMatrixWorld();
}
const sph = (r, az, el) => new THREE.Vector3(r * Math.cos(el) * Math.sin(az), r * Math.sin(el), r * Math.cos(el) * Math.cos(az));

// ---------- shots ----------
// Each shot sets the camera, black-hole uniforms, astronaut pose and overlay text for time t.
function shot(t) {
  const L = TL.L;
  let fade = 1, tint = [1, 1, 1], showAstro = false, showArrows = false;
  astro.scale.set(1, 1, 1); body.position.set(0, 0, 0); astro.rotation.set(0, 0, 0);
  bhMat.uniforms.uDisk.value = 1;
  const O = new THREE.Vector3(0, 0, 0);

  if (t < L.disk.start) {                                  // hook: approach from deep space
    const k = ease(seg(t, 0, L.disk.start));
    lookFrom(sph(lerp(46, 26, k), .3 + t * .05, lerp(.32, .2, k)), O);
    fade = seg(t, 0, .6);
    title('WHAT IF YOU FELL', t, .1, '#fff', 300, 108);
    title('INTO A BLACK HOLE?', t, .5, '#ffb35c', 420, 108);
  } else if (t < L.lens.start) {                           // the disk
    const k = ease(seg(t, L.disk.start, L.lens.start));
    lookFrom(sph(lerp(26, 18, k), .5 + t * .06, lerp(.2, .12, k)), O);
    title('GAS AT ~SPEED OF LIGHT', t, L.disk.start + .1, '#fff', 300, 84, 'MILLIONS OF DEGREES HOT', '#ffb35c');
  } else if (t < L.fall.start) {                           // lensing: go edge-on
    const k = ease(seg(t, L.lens.start, L.lens.start + 2.5));
    lookFrom(sph(lerp(18, 15, k), .9 + t * .04, lerp(.12, .035, k)), O);
    title('GRAVITY BENDS LIGHT', t, L.lens.start + .1, '#fff', 300, 92, 'THE FAR SIDE WRAPS OVER THE TOP', '#7fd3ff');
  } else if (t < L.tidal.start) {                          // start to fall: chase cam behind the astronaut
    const k = seg(t, L.fall.start, L.tidal.start);
    showAstro = true;
    const ap = sph(lerp(12, 10.5, k), .2, .55);
    astro.position.copy(ap); astro.lookAt(O); astro.rotateX(-Math.PI / 2);      // feet toward the hole
    astro.rotateZ(t * .15);
    astro.scale.setScalar(.55);
    lookFrom(ap.clone().add(ap.clone().normalize().multiplyScalar(3)).add(new THREE.Vector3(.9, 1.4, 0)), ap.clone().lerp(O, .12));
    title('NOW YOU FALL', t, L.fall.start + .05, '#fff', 300, 120);
  } else if (t < L.big.start) {                            // tidal stretch: side view
    showAstro = true; showArrows = t < L.small.start;
    const st = ease(seg(t, L.tidal.start + .5, L.big.start - .2));
    const sy = lerp(1, 6, st), sx = 1 / Math.sqrt(sy);
    astro.position.set(0, 0, 0); astro.rotation.set(0, 0, Math.sin(t * .7) * .06);
    astro.scale.set(sx, sy, sx); body.position.y = -.2;
    lookFrom(new THREE.Vector3(0, -.5 - sy * .1, 4.2 + sy * .9), new THREE.Vector3(0, -.3 - sy * .15, 0));
    // the black hole lies below the feet; give the shader a matching far camera
    bhMat.uniforms.uDisk.value = 1;
    if (showArrows) {
      const a = easeOut(seg(t, L.tidal.start + .1, L.tidal.start + .5));
      setArrow(arrowHead, -1.1, 1.3 * sy * .5 + .3, .6 * a); setArrow(arrowFeet, 1.1, -.2, 1.8 * a);
    }
    if (t < L.spag.start) title('FEET PULLED HARDER', t, L.tidal.start + .05, '#ff6b6b', 300, 100, 'THAN YOUR HEAD', '#7fd3ff');
    else if (t < L.small.start) title('SPAGHETTIFICATION', t, L.spag.start, '#ffd84a', 300, 104);
    else title('SMALL BLACK HOLE', t, L.small.start, '#fff', 300, 100, 'STRETCHED LIKE A NOODLE 🍝', '#ffd84a');
  } else if (t < L.freeze.start) {                         // supermassive: drift across the horizon, unharmed
    showAstro = true;
    const k = seg(t, L.big.start, L.freeze.start);
    const ap = sph(lerp(3.2, 1.0, ease(k)), .1, .45);
    astro.position.copy(ap); astro.lookAt(O); astro.rotateX(-Math.PI / 2); astro.rotateZ(t * .3);
    astro.scale.setScalar(.32);
    lookFrom(sph(8.5, .75, .3), ap.clone().lerp(O, .35));
    title('GIANT BLACK HOLE', t, L.big.start + .05, '#fff', 300, 100, 'YOU FEEL… NOTHING', '#7dffb0');
  } else if (t < L.noway.start) {                          // outside view: slow down, redden, freeze
    showAstro = true;
    const k = seg(t, L.freeze.start, L.noway.start);
    const rr = 1.05 + 2.4 * Math.exp(-k * 4.5);           // asymptotic approach to the horizon
    const ap = sph(rr, .4, .25);
    astro.position.copy(ap); astro.lookAt(O); astro.rotateX(-Math.PI / 2); astro.scale.setScalar(.38);
    lookFrom(sph(7, .55 + .1 * k, .32), ap.clone().multiplyScalar(.5));
    const red = clamp(k * 1.3);
    astro.traverse(o => { if (o.material && o.material.color) { o.material.userData.base ??= o.material.color.clone(); o.material.color.copy(o.material.userData.base).lerp(new THREE.Color(0x8a0000), red); o.material.opacity = 1 - red * .85; o.material.transparent = true; } });
    title("FRIEND'S VIEW", t, L.freeze.start + .05, '#fff', 300, 100, 'YOU SLOW… REDDEN… FREEZE', '#ff6b6b');
  } else if (t < L.cta.start) {                            // no way back: plunge in
    const k = ease(seg(t, L.noway.start, L.cta.start));
    lookFrom(sph(lerp(7, 1.2, k), .4, lerp(.3, .6, k)), O);
    fade = 1 - seg(t, L.cta.start - .9, L.cta.start) * .9;
    title('NO WAY BACK', t, L.noway.start + .05, '#ff4d4d', 300, 120, 'NOT EVEN LIGHT ESCAPES', '#fff');
  } else {                                                 // CTA
    const k = seg(t, L.cta.start, TL.duration);
    lookFrom(sph(lerp(30, 22, k), t * .08, .22), O);
    fade = seg(t, L.cta.start, L.cta.start + .5) * (1 - seg(t, TL.duration - .4, TL.duration));
    title('FOLLOW', t, L.cta.start, '#fff', 300, 130, 'FOR MORE WHAT-IFS', '#ffb35c');
  }
  if (!(t >= L.freeze.start && t < L.noway.start)) astro.traverse(o => { if (o.material?.userData.base) { o.material.color.copy(o.material.userData.base); o.material.opacity = 1; o.material.transparent = false; } });
  astro.visible = showAstro; arrows.visible = showArrows;
  return { fade, tint };
}

function prepare(tl) {
  TL = tl; TL.L = {};
  for (const l of tl.lines) {
    TL.L[l.id] = l;
    const ws = l.text.split(/\s+/), wts = ws.map(w => w.replace(/[^\w]/g, '').length + 2), sum = wts.reduce((a, b) => a + b, 0);
    let s = l.start; l.words = ws.map((w, i) => { const d = (l.end - l.start) * wts[i] / sum, o = { w: w.toUpperCase(), start: s, end: s + d }; s += d; return o; });
    l.chunks = [[]];
    for (const w of l.words) { const c = l.chunks.at(-1); c.push(w); if (c.length >= 3 || /[.?!,]$/.test(w.w)) l.chunks.push([]); }
    l.chunks = l.chunks.filter(c => c.length);
  }
  window.DUR = tl.duration;
}

function renderFrame(frame) {
  const t = frame / FPS;
  ui.clearRect(0, 0, W, H);
  // legibility bands behind titles and captions
  const top = ui.createLinearGradient(0, 0, 0, 560); top.addColorStop(0, 'rgba(0,0,0,.6)'); top.addColorStop(1, 'rgba(0,0,0,0)');
  ui.fillStyle = top; ui.fillRect(0, 0, W, 560);
  const bot = ui.createLinearGradient(0, 1300, 0, 1640); bot.addColorStop(0, 'rgba(0,0,0,0)'); bot.addColorStop(.5, 'rgba(0,0,0,.5)'); bot.addColorStop(1, 'rgba(0,0,0,0)');
  ui.fillStyle = bot; ui.fillRect(0, 1300, W, 340);
  const { fade, tint } = shot(t);
  // tidal shot: the shader camera hovers above the hole looking down past the astronaut
  const bhCam = camera.clone();
  if (t >= TL.L.tidal.start && t < TL.L.big.start) { const p = sph(15, .3 + t * .05, .22); bhCam.position.copy(p); bhCam.up.set(0, 1, 0); bhCam.lookAt(0, 4.5, 0); bhCam.updateMatrixWorld(); }
  bhMat.uniforms.uTime.value = t;
  bhMat.uniforms.uCamPos.value.copy(bhCam.position);
  bhMat.uniforms.uCamMat.value.setFromMatrix4(bhCam.matrixWorld);
  blitMat.uniforms.uFade.value = fade; blitMat.uniforms.uTint.value.set(...tint);
  renderer.setRenderTarget(bhTarget); renderer.clear(); renderer.render(bhScene, ortho);
  renderer.setRenderTarget(null); renderer.clear(); renderer.render(blitScene, ortho);
  renderer.clearDepth(); renderer.render(astroScene, camera);
  captions(t);
  // vignette
  const v = ui.createRadialGradient(W / 2, H / 2, H * .3, W / 2, H / 2, H * .75); v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,.4)');
  ui.fillStyle = v; ui.fillRect(0, 0, W, H);
  return true;
}
window.prepare = prepare; window.renderFrame = renderFrame; window.FPS = FPS; window.READY = true;
