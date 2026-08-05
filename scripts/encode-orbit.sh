#!/usr/bin/env bash
#
# Re-encode the Coffee Orbit scrub clips from the camera master.
#
# Both encodes are ALL-INTRA (every frame a keyframe, `keyint=1`). That is the
# non-negotiable property for scroll scrubbing: each `video.currentTime = t`
# lands on a frame the decoder can produce on its own, with no back-reference
# to hunt for. A normal GOP encode makes every seek decode a run of frames and
# the scrub visibly stutters.
#
# The phone encode is deliberately 15 fps, not 30. Mobile gets ~160svh of
# scroll room for the whole turn — around 8px of scroll per frame at 15 fps,
# and only ~4px at 30 fps. At 4px/frame a normal flick asks for more distinct
# frames than any phone can seek to, so the browser drops most of them and the
# orbit reads as stepping. Halving the frame count halves the seek demand for
# the same gesture; 150 frames over 180° is still 1.2°/frame, finer than the
# eye tracks during a scrub.
#
# Frame rates here MUST stay in sync with FPS_DESKTOP / FPS_MOBILE in
# src/components/CoffeeOrbit.tsx — the scrub quantises its seeks to that grid.
#
# Usage: bash scripts/encode-orbit.sh path/to/master.mp4
set -euo pipefail

SRC="${1:-}"
OUT_DIR="public/media"

if [ -z "$SRC" ]; then
  echo "usage: bash scripts/encode-orbit.sh path/to/master.mp4" >&2
  exit 2
fi
# The outputs live in public/media; encoding a file onto itself would shred the
# only copy of the source. Refuse rather than truncate.
for guard in fusion-orbit.mp4 fusion-orbit-720.mp4; do
  if [ "$(cd "$(dirname "$SRC")" && pwd)/$(basename "$SRC")" = "$(cd "$OUT_DIR" && pwd)/$guard" ]; then
    echo "refusing: $SRC is an output of this script — pass the camera master" >&2
    exit 2
  fi
done

encode() {
  local out="$1" fps="$2" scale="$3" crf="$4"
  echo "→ $out  (${scale}, ${fps}fps, crf ${crf})"
  ffmpeg -v error -y -i "$SRC" -an \
    -vf "fps=${fps},scale=${scale}:flags=lanczos" \
    -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf "$crf" \
    -x264-params "keyint=1:min-keyint=1:scenecut=0" \
    -movflags +faststart "$out"
}

# Desktop / tablet master: 1080p, 30fps. Desktop has ~340vh of scroll room and
# fast seeks, so it can afford the full frame count.
encode "$OUT_DIR/fusion-orbit.mp4" 30 1920:1080 21

# Phones (<768px): same 720p framing as the desktop clip so object-cover crops
# identically, at half the frame rate.
encode "$OUT_DIR/fusion-orbit-720.mp4" 15 1280:720 25

# Poster = first frame, the still shown before the clip loads and the entire
# picture under prefers-reduced-motion.
ffmpeg -v error -y -i "$SRC" -frames:v 1 -q:v 3 "$OUT_DIR/fusion-orbit-poster.jpg"

ls -la "$OUT_DIR"
