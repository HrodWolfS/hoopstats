#!/usr/bin/env bash
# Exporte les PNG et icônes web depuis design/logo/final/*.svg (lancer build.py avant).
# Nécessite le script render_png.py du skill logo-design (RENDER=chemin/vers/render_png.py).
set -euo pipefail
cd "$(dirname "$0")/.."
RENDER=${RENDER:?chemin de render_png.py}
r() { python3 "$RENDER" "$@" </dev/null >/dev/null 2>&1; }

mkdir -p final/web final/png
python3 "$RENDER" final/favicon.svg --ico final/web/favicon.ico --ico-sizes 16 32 48 </dev/null
for s in 16 32 48; do r final/favicon.svg -o "final/web/favicon-$s.png" --size "$s"; done
r final/icone-appli.svg -o final/web/apple-touch-icon.png --size 180 --bg "#0A0A0B"
for s in 192 512; do r final/icone-appli.svg -o "final/web/icon-$s.png" --size "$s"; done
r final/icone-masquable.svg -o final/web/maskable-512.png --size 512
cp final/favicon.svg final/web/favicon.svg

for f in final/*.svg; do
  b=$(basename "$f" .svg)
  case $b in
    horizontal*|mot*) r "$f" -o "final/png/$b.png" --width 1600 ;;
    empile*) r "$f" -o "final/png/$b.png" --width 1200 ;;
    *) r "$f" -o "final/png/$b-1024.png" --size 1024 ;;
  esac
done
ls final/web final/png
