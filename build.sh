#!/bin/bash
# Gera o index.html (o site completo) juntando as partes de src/ em ordem.
# Edite só os arquivos de src/; o index.html é sempre recriado por este script.
set -e
export LC_ALL=C
cd "$(dirname "$0")"
{
  echo '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="description" content="Sala de trading em 3D: robôs como traders, sinuca, chat de texto e de voz com quem estiver na sala.">'
  cat src/00_head.html
  for f in src/*.js; do cat "$f"; echo; done
  cat src/99_tail.html
  echo '</html>'
} > index.html
echo "index.html: $(wc -c < index.html) bytes"
