# Conversão das pessoas 3D (Microsoft Rocketbox → glTF)

Só precisa disto para trocar ou adicionar pessoas. Os arquivos prontos já estão em `people/`, e estes scripts geram exatamente os mesmos arquivos.

## Preparar (uma vez, dentro desta pasta)

1. Baixe só os arquivos usados do Rocketbox (licença MIT, cerca de 1,3 GB). A lista está em `rocketbox_arquivos.txt`:

   ```bash
   git clone --depth 1 --filter=blob:none --no-checkout https://github.com/microsoft/Microsoft-Rocketbox rb
   git -C rb sparse-checkout set --no-cone --stdin < rocketbox_arquivos.txt
   git -C rb checkout
   ```

2. Instale as dependências:
   - `npm i three@0.160.0`
   - `pip install pillow numpy`

## Uma pessoa

Use `CAT=Adults` para as pessoas da pasta Adults. O padrão é Professions.

```bash
node conv_avatar.mjs Business_Male_01 out                        # FBX -> out/Business_Male_01.raw.glb + .tex.json
python3 inject_tex.py Business_Male_01 out out/Business_Male_01.glb   # põe as texturas (JPG/PNG) no GLB
python3 glb2json.py out/Business_Male_01.glb ../../people         # -> people/Business_Male_01.json + _tN.jpg/png
```

## Animações

Saem em `people/anim_m.json` e `people/anim_f.json`.

```bash
mkdir -p out
node conv_anims.mjs m && python3 glb2json.py out/anim_m.glb ../../people
node conv_anims.mjs f && python3 glb2json.py out/anim_f.glb ../../people
```

## Usar a pessoa na sala

Depois de converter, coloque o nome do arquivo na lista certa:
- `AV_FILES` em `src/55_avatars.js`, para os traders;
- `VISITOR_FILES` em `src/78_multi.js`, para os visitantes.

Variáveis de ambiente:
- `RB`: pasta do Rocketbox (padrão `rb`).
- `OUT`: saída das animações (padrão `out`).
