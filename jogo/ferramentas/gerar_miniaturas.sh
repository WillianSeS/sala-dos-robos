#!/usr/bin/env bash
# Miniaturas do mapa: renderiza cada andar no Cycles (previa.py) e grava public/mapa/andarNN.webp (640×360).
# Uso: BPY_PYTHON=<python com bpy> ferramentas/gerar_miniaturas.sh   (usa os GLB brutos de gerar_predio.sh)
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${TMP_PREDIO:-/tmp/sala-dos-robos-predio}"
PY="${BPY_PYTHON:-python3}"
mkdir -p public/mapa "$TMP/tex"
[ -f "$TMP/tex/.pronto" ] || { python3 ferramentas/texturas/gerar.py "$TMP/tex" && touch "$TMP/tex/.pronto"; }
declare -A CAMERA=(
  [40]="6.0 2.4 3.5 -2.5 0.8 -4.0"
  [41]="5.6 1.9 3.3 -3.0 0.9 -4.8"
  [42]="5.8 2.2 3.0 -1.0 0.5 -4.0"
  [43]="5.6 1.8 3.3 -3.0 0.8 -4.5"
  [44]="4.6 2.0 3.3 -0.6 1.1 -6.4"
)
for n in 40 41 42 43 44; do
  if [ ! -f "$TMP/andar$n.glb" ]; then
    if [ "$n" = 40 ]; then "$PY" ferramentas/blender/andar40.py "$TMP/tex" "$TMP/andar$n.glb" > "$TMP/andar$n.log" 2>&1
    else "$PY" ferramentas/blender/andares.py "$n" "$TMP/tex" "$TMP/andar$n.glb" > "$TMP/andar$n.log" 2>&1; fi
  fi
  # shellcheck disable=SC2086
  "$PY" ferramentas/blender/previa.py "$TMP/andar$n.glb" "$TMP/mini$n.png" ${CAMERA[$n]} > "$TMP/mini$n.log" 2>&1
  node -e "require('sharp')(process.argv[1]).resize(640, 360).webp({ quality: 78 }).toFile(process.argv[2]).then(i => console.log('andar$n', i.size, 'bytes'))" "$TMP/mini$n.png" "public/mapa/andar$n.webp"
done
