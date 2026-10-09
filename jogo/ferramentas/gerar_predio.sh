#!/usr/bin/env bash
# Fase 2: gera texturas -> modela no Blender -> otimiza os modelos do prédio.
# Uso: BPY_PYTHON=<python com bpy> ferramentas/gerar_predio.sh [andar40 andar41 ... andar44 elevador predio]
# Sem argumentos gera tudo.
set -euo pipefail
cd "$(dirname "$0")/.."
TMP="${TMP_PREDIO:-/tmp/sala-dos-robos-predio}"
PY="${BPY_PYTHON:-python3}"
ALVOS=("$@")
[ ${#ALVOS[@]} -eq 0 ] && ALVOS=(andar40 andar41 andar42 andar43 andar44 elevador predio)
mkdir -p "$TMP/tex"
[ -f "$TMP/tex/.pronto" ] || { python3 ferramentas/texturas/gerar.py "$TMP/tex" && touch "$TMP/tex/.pronto"; }
otimizar() { node ferramentas/otimizar.mjs "$1" "$2" --geo draco --tex ktx2 --max "$3" | tail -1; }
for alvo in "${ALVOS[@]}"; do
  case "$alvo" in
    andar4[0-4]) "$PY" ferramentas/blender/andares.py "${alvo#andar}" "$TMP/tex" "$TMP/$alvo.glb" > "$TMP/$alvo.log" 2>&1 ;;
    elevador|predio) "$PY" "ferramentas/blender/$alvo.py" "$TMP/tex" "$TMP/$alvo.glb" > "$TMP/$alvo.log" 2>&1 ;;
    *) echo "alvo desconhecido: $alvo"; exit 1 ;;
  esac || { tail -30 "$TMP/$alvo.log"; exit 1; }
  grep '^OK' "$TMP/$alvo.log" || true
  otimizar "$TMP/$alvo.glb" "public/modelos/$alvo.glb" 1024
  [ "$alvo" = andar40 ] && otimizar "$TMP/$alvo.glb" public/modelos/andar40_2k.glb 2048
done
