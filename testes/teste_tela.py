"""Abre a sala no navegador, executa passos e tira fotos (para conferir o visual).

Uso, na raiz do repositório (com `python3 -m http.server 8766` rodando):
  python3 testes/teste_tela.py '[{"name":"entrada","js":"__sala.enterRoom(); 1","wait":4000}]' 1280 760
Cada passo aceita: click (seletor CSS), keys ([[tecla, ms], ...]), js (código; o resultado é impresso),
wait (ms antes da foto) e name (arquivo testes/saida/<name>.png).
Variáveis: HASH (padrão #debug), MOCK=1 (simula o claude.ai), FAKESB=1 (Supabase falso),
MOBILE=1 (celular com toque), NOLOCK=1 (sem trava do mouse), URL e THREE_DIR (ver comum.py).
"""
import json, os, sys
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

passos = json.loads(sys.argv[1]) if len(sys.argv) > 1 else [{'name': 'inicio', 'wait': 1000}]
w, h = (int(sys.argv[2]), int(sys.argv[3])) if len(sys.argv) > 3 else (1280, 760)
saida = os.path.join(AQUI, 'saida'); os.makedirs(saida, exist_ok=True)
movel = bool(os.environ.get('MOBILE'))
with sync_playwright() as p:
    nav = p.chromium.launch(args=ARGS)
    pg = nav.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1, is_mobile=movel, has_touch=movel)
    log = []
    pg.on('console', lambda m: log.append(m.type + ': ' + m.text))
    pg.on('pageerror', lambda e: log.append('ERRO NA PÁGINA: ' + str(e)))
    pg.route('**/*', rota)
    if os.environ.get('MOCK'): pg.add_init_script(path=AQUI + '/mock_claude.js')
    if os.environ.get('FAKESB'): pg.add_init_script(path=AQUI + '/fake_supabase.js')
    if os.environ.get('NOLOCK'): pg.add_init_script('HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error("sem trava"))}')
    pg.goto(URL + 'index.html' + os.environ.get('HASH', '#debug'), wait_until='domcontentloaded', timeout=120000)
    pg.wait_for_timeout(8000)
    for s in passos:
        if s.get('click'): pg.click(s['click'])
        for k, ms in s.get('keys', []):
            pg.keyboard.down(k); pg.wait_for_timeout(ms); pg.keyboard.up(k)
        if s.get('js'): print('js ->', pg.evaluate(s['js']))
        pg.wait_for_timeout(s.get('wait', 1500))
        if s.get('name'):
            pg.screenshot(path=os.path.join(saida, s['name'] + '.png'), timeout=120000); print('foto:', s['name'] + '.png')
    for l in log[:30]: print(l)
    nav.close()
