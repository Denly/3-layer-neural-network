# What if all the ice melted? (TikTok, 1080×1920)

Code-rendered 3D short with voiceover. Output: `what-if-ice-melted.mp4`.

| File | Role |
|---|---|
| `script.json` | Voiceover lines (edit this to change the narration) |
| `voiceover.py` | Kokoro-82M TTS → `voiceover.wav` + `timeline.json` (per-line timings) |
| `music.py` | Original synthesized music bed + whooshes, ducked under the voice → `music.wav` |
| `scene.html` | Canvas scene: per-pixel lit globe, glass, rising ocean, captions |
| `land.js` | Land polygons decoded from Natural Earth 110m (`world-atlas`) by `topo2land.py` |
| `render.js` | Playwright frame renderer (`--stills 1,5,10 <dir>` for previews) |
| `make.sh` | Full build |

## Voice model
Kokoro-82M (Apache-2.0): `model_quantized.onnx` from the npm package `kokoro-q8-shards`
(join `kokoro-q8.part0..5.bin`, sha256 `fbae9257…a1478`), voices from `kokoro-js/voices/*.bin`
packed into an `.npz`, run with `pip install kokoro-onnx soundfile` and system `espeak-ng`.

```bash
./make.sh kokoro-q8.onnx voices.npz /path/to/venv/bin/python
```

Facts used: ~70 m total sea-level rise if all land ice melted (Greenland ~7 m, Antarctica ~58 m);
~90% of Earth's ice is in Antarctica; ~10 cm global mean rise since 1993 (satellite record).
The sea-level graph is an approximate curve, not plotted data.
