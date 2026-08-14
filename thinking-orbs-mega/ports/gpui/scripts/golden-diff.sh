#!/usr/bin/env bash
# Visual-fidelity check: render the golden grid (all states x 2 sizes, frozen
# at the deterministic reduced-motion timestamp) under each paint path, then
# diff the captures pixel-for-pixel against the pre-optimization reference.
#
#   ORB_NO_LAYER=1 -> skip the paint_layer wrap (pre-optimization behaviour)
#
# `control` re-runs the reference with identical settings. Its diff is the noise
# floor of this whole method — compositor placement, dithering, GPU raster
# nondeterminism. A variant at or below the control is indistinguishable from an
# identical build.
#
# Requires Hyprland + grim + ImageMagick.
#
# SAFETY: the capture region is always read back from `hyprctl clients` AFTER
# the window has been floated and resized, and the window is verified to be
# focused. Never hardcode screen coordinates here — an earlier version did, the
# window was not where it was assumed to be, and grim captured unrelated desktop
# content instead of the app.
set -euo pipefail

OUT="${1:?usage: golden-diff.sh <output-dir>}"
mkdir -p "$OUT"
cd "$(dirname "$0")/.."

W=1100
H=660

cargo build --release --example stress >/dev/null 2>&1

# Query one field of the window belonging to $1, via hyprctl.
win_field() {
  hyprctl clients -j | python3 -c '
import json,sys
want=int(sys.argv[1]); field=sys.argv[2]
for c in json.load(sys.stdin):
    if c.get("pid")==want:
        v=c[field]
        print(" ".join(map(str,v)) if isinstance(v,list) else v); break
' "$1" "$2"
}

capture() {
  local tag="$1"; shift
  env "$@" ./target/release/examples/stress --golden >/dev/null 2>&1 &
  local pid=$!
  sleep 3

  local addr; addr=$(win_field "$pid" address)
  if [ -z "$addr" ]; then
    kill "$pid" 2>/dev/null || true
    echo "could not locate window for pid $pid" >&2; exit 1
  fi

  # Float first, then size it: Hyprland ignores pixel resizes on tiled windows.
  # Always go through --batch; a bare quoted "dispatch ..." string is one argv
  # entry and hyprctl blocks on it.
  hyprctl --batch "dispatch setfloating address:$addr" >/dev/null
  sleep 1
  hyprctl --batch "dispatch resizewindowpixel exact $W $H,address:$addr ;\
 dispatch focuswindow address:$addr" >/dev/null
  sleep 3

  # Read the geometry back rather than assuming the dispatch landed.
  local at sz fpid
  at=$(win_field "$pid" at); sz=$(win_field "$pid" size)
  fpid=$(hyprctl activewindow -j | python3 -c 'import json,sys; print(json.load(sys.stdin).get("pid",""))')
  if [ "$fpid" != "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    echo "app window is not focused (active pid=$fpid, want $pid); refusing to capture" >&2
    exit 1
  fi
  local geo="${at// /,} ${sz// /x}"
  printf '  %-12s %s\n' "$tag" "$geo"
  grim -g "$geo" "$OUT/$tag.png"

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  sleep 1
}

echo "capturing..."
capture reference  ORB_NO_LAYER=1   # pre-optimization
capture control    ORB_NO_LAYER=1   # identical -> noise floor
capture shipped    ORB_DUMMY=0      # paint_layer, as shipped

echo
total=$(magick identify -format '%[fx:w*h]' "$OUT/reference.png")
printf '%-10s %10s %9s %7s  %s\n' variant "diff px" share "max d" bbox
for tag in control shipped; do
  # `compare` exits non-zero whenever the images differ, which is the normal
  # case here — don't let `set -e` treat that as a script failure.
  ae=$( { compare -metric AE "$OUT/reference.png" "$OUT/$tag.png" "$OUT/diff_$tag.png" 2>&1 || true; } \
         | tr -d '()' | awk '{print int($1+0.5)}')
  maxd=$(magick "$OUT/reference.png" "$OUT/$tag.png" -compose difference -composite \
            -colorspace gray -format "%[fx:int(maxima*255+0.5)]" info:)
  bbox=$(magick "$OUT/reference.png" "$OUT/$tag.png" -compose difference -composite \
            -colorspace gray -threshold 5% -format "%@" info: 2>/dev/null || echo "-")
  share=$(awk -v a="$ae" -v t="$total" 'BEGIN{printf "%.4f%%", a/t*100}')
  printf '%-10s %10s %9s %7s  %s\n' "$tag" "$ae" "$share" "$maxd" "$bbox"
done
echo
echo "captures + diffs in $OUT"
