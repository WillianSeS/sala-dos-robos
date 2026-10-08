#!/usr/bin/env bash
# Gera texturas -> modela a sala no Blender -> otimiza (1K e 2K). Uso: BPY_PYTHON=<python com bpy> ferramentas/gerar_sala.sh
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${TMP_SALA:-/tmp/sala-dos-robos-sala}"
PY="${BPY_PYTHON:-python3}"
mkdir -p "$TMP/tex"
python3 ferramentas/texturas/gerar.py "$TMP/tex"
"$PY" ferramentas/blender/sala_fase1.py "$TMP/tex" "$TMP/sala_raw.glb" > "$TMP/blender.log" 2>&1 || { tail -30 "$TMP/blender.log"; exit 1; }
grep '^OK' "$TMP/blender.log"
node ferramentas/otimizar.mjs "$TMP/sala_raw.glb" public/modelos/sala.glb --geo draco --tex ktx2 --max 1024 | tail -1
node ferramentas/otimizar.mjs "$TMP/sala_raw.glb" public/modelos/sala_2k.glb --geo draco --tex ktx2 --max 2048 | tail -1
