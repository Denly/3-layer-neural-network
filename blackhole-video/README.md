# What happens if you fall into a black hole? (TikTok, 1080×1920)

three.js short with voiceover. Output: `fall-into-black-hole.mp4`.

- `main.js`: three.js scene. The black hole is a full-screen fragment shader that integrates
  photon paths around a Schwarzschild mass (`a = -1.5·h²·r/|r|⁵`, units of the Schwarzschild radius),
  so the lensed far side of the disk, the photon ring and the shadow come out of the physics.
  The disk has Doppler beaming and a temperature gradient. The astronaut is a three.js mesh
  sharing the same camera; titles and captions are drawn on a 2D canvas on top.
- `script.json` → `voiceover.py` (Kokoro-82M TTS, see `../ice-melt-video/README.md`) → `timeline.json`.
- `music.py`: synthesized music bed and whooshes, ducked under the voice.
- `render.js`: serves the folder locally, renders each frame in headless Chromium (WebGL), pipes to ffmpeg.

```bash
npm install
./make.sh kokoro-q8.onnx voices.npz /path/to/venv/bin/python
NODE_PATH=$(npm root -g) node render.js --stills 2,10,20 /tmp/previews   # quick previews
```

Physics shown: tidal stretching ("spaghettification") is lethal outside the horizon of a stellar-mass
black hole but negligible at the horizon of a supermassive one; a distant observer sees an infalling
object redshift and appear to freeze at the horizon.
