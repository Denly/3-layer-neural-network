"""Generate the voiceover with Kokoro-82M and write voiceover.wav + timeline.json.

usage: python voiceover.py <kokoro.onnx> <voices.npz> [voice]
"""
import json, sys
import numpy as np, soundfile as sf
from kokoro_onnx import Kokoro, EspeakConfig

model, voices = sys.argv[1], sys.argv[2]
voice = sys.argv[3] if len(sys.argv) > 3 else "af_heart"
k = Kokoro(model, voices, espeak_config=EspeakConfig(
    lib_path="/usr/lib/x86_64-linux-gnu/libespeak-ng.so.1",
    data_path="/usr/lib/x86_64-linux-gnu/espeak-ng-data"))

SR, LEAD, GAP = 24000, 0.35, 0.28
lines = json.load(open("script.json"))
out, t, timeline = [np.zeros(int(LEAD * SR), np.float32)], LEAD, []
for ln in lines:
    a, _ = k.create(ln["text"], voice=voice, speed=1.08, lang="en-us")
    a = a.astype(np.float32)
    # trim leading/trailing silence so captions line up with speech
    nz = np.where(np.abs(a) > 0.01)[0]
    a = a[max(0, nz[0] - 600):nz[-1] + 1200]
    dur = len(a) / SR
    timeline.append({**ln, "start": round(t, 3), "end": round(t + dur, 3)})
    out += [a, np.zeros(int(GAP * SR), np.float32)]
    t += dur + GAP
    print(f'{ln["id"]:8s} {dur:5.2f}s')
audio = np.concatenate(out + [np.zeros(int(1.2 * SR), np.float32)])
sf.write("voiceover.wav", audio / max(1e-6, np.abs(audio).max()) * 0.9, SR)
json.dump({"duration": round(len(audio) / SR, 3), "lines": timeline}, open("timeline.json", "w"), indent=1)
print("total", len(audio) / SR)
