"""Synthesize an original music bed + sound effects timed to timeline.json, ducked under the voice -> music.wav"""
import json
import numpy as np, soundfile as sf

SR = 44100
tl = json.load(open("timeline.json")); D = tl["duration"]; L = {l["id"]: l for l in tl["lines"]}
n = int(D * SR); t = np.arange(n) / SR
rng = np.random.default_rng(3)

def lowpass(x, a):  # one-pole
    y = np.empty_like(x); acc = 0.0
    for i in range(len(x)): acc += a * (x[i] - acc); y[i] = acc
    return y

# pad: Am - F - C - G, 4 s per chord, detuned sines with slow attack
chords = [[50, 53, 57], [46, 50, 53], [43, 50, 55], [45, 49, 52]]  # Dm - Bb - Gm - A: darker, cinematic
pad = np.zeros(n)
for k in range(int(D / 4) + 1):
    s0, s1 = int(k * 4 * SR), min(n, int((k + 1) * 4 * SR + SR))
    if s0 >= n: break
    tt = t[s0:s1] - k * 4; env = np.minimum(1, tt / 1.2) * np.minimum(1, np.maximum(0, (5 - tt) / 1.0))
    for m in chords[k % 4]:
        f = 440 * 2 ** ((m - 69) / 12)
        for det in (-.12, .12):
            pad[s0:s1] += env * (np.sin(2 * np.pi * f * (1 + det / 100) * tt) + .3 * np.sin(2 * np.pi * 2 * f * tt)) / 6
    pad[s0:s1] += env * np.sin(2 * np.pi * 440 * 2 ** ((chords[k % 4][0] - 12 - 69) / 12) * tt) * .5  # bass
# soft pulse at 100 bpm
beat = 60 / 100; pulse = np.zeros(n)
for bt in np.arange(L["fall"]["start"], L["noway"]["end"], beat):
    s = int(bt * SR); m = min(n - s, int(.25 * SR)); tt = np.arange(m) / SR
    pulse[s:s + m] += np.sin(2 * np.pi * (55 + 60 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 14)
# whooshes at scene cuts, boom on "All of it"
fx = np.zeros(n)
for sid in ["disk", "lens", "fall", "tidal", "big", "freeze", "noway", "cta"]:
    c = L[sid]["start"] - .15; s = int((c - .35) * SR); m = int(.6 * SR); tt = np.arange(m) / SR
    noise = lowpass(rng.standard_normal(m), .08); fx[s:s + m] += noise * np.sin(np.pi * tt / .6) ** 2 * 1.4
b0 = L["noway"]["start"]; s = int(b0 * SR); m = int(1.6 * SR); tt = np.arange(m) / SR
fx[s:s + m] += np.sin(2 * np.pi * (38 + 80 * np.exp(-tt * 9)) * tt) * np.exp(-tt * 2.6) * 1.6

mus = .55 * pad + .5 * pulse
# duck music under speech
duck = np.ones(n)
for l in tl["lines"]: duck[int(l["start"] * SR):int(l["end"] * SR)] = .45
duck = lowpass(duck, 0.0008)
fade = np.minimum(1, t / .8) * np.minimum(1, (D - t) / 1.5)
out = (mus * duck + fx) * fade
sf.write("music.wav", (out / np.abs(out).max() * .5).astype(np.float32), SR)
print("music.wav", D)
