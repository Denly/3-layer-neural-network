#!/usr/bin/env bash
# Full build: voiceover -> music -> three.js frames -> final TikTok MP4. Run `npm install` first.
# usage: ./make.sh <kokoro.onnx> <voices.npz> [python]
set -euo pipefail
cd "$(dirname "$0")"
PY=${3:-python3}
"$PY" voiceover.py "$1" "$2" af_heart
"$PY" music.py
NODE_PATH=$(npm root -g) node render.js video_silent.mp4
ffmpeg -y -loglevel error -i video_silent.mp4 -i voiceover.wav -i music.wav \
  -filter_complex "[1:a]aresample=44100,volume=1.0[v];[2:a]volume=0.55[m];[v][m]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11[a]" \
  -map 0:v -map "[a]" -c:v copy -c:a aac -b:a 192k -ar 44100 -movflags +faststart -shortest fall-into-black-hole.mp4
rm video_silent.mp4
echo "done: fall-into-black-hole.mp4"
