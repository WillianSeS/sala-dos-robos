"""Teste de duas pessoas na sala: presença, chat de texto, voz em 3D, ranking e histórico.

Usa um Supabase falso (fake_supabase.js: tempo real entre abas e banco no localStorage),
então não grava nada no banco de verdade. O microfone é o falso do Chromium (bipes).

Uso, na raiz do repositório:
  python3 -m http.server 8766          (em outro terminal)
  python3 testes/teste_multiplayer.py
Sai com código 1 se alguma verificação falhar.
"""
import json, sys, time
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, EXTERNOS, rota

PAGINA = URL + 'index.html#debug'
falhas = []


def confere(nome, ok, detalhe=''):
    print(('OK      ' if ok else 'FALHOU  ') + nome + (f'  ({detalhe})' if detalhe else ''), flush=True)
    if not ok:
        falhas.append(nome)


def espera(pg, js, seg=20):
    for _ in range(int(seg * 2)):
        if pg.evaluate(js):
            return True
        pg.wait_for_timeout(500)
    return False


with sync_playwright() as p:
    nav = p.chromium.launch(args=ARGS)
    ctx = nav.new_context(viewport={'width': 640, 'height': 400}, device_scale_factor=1, permissions=['microphone'])
    ctx.route('**/*', rota)
    ctx.add_init_script(path=AQUI + '/fake_supabase.js')
    ctx.add_init_script('HTMLCanvasElement.prototype.requestPointerLock=function(){return Promise.reject(new Error("sem trava"))}')
    erros = {}

    def abre(nome):
        pg = ctx.new_page(); erros[nome] = []
        pg.on('pageerror', lambda e: erros[nome].append(str(e)))
        pg.goto(PAGINA, wait_until='domcontentloaded', timeout=120000)
        return pg

    A, B = abre('A'), abre('B')
    espera(A, '!!(window.__sala && __sala.AV.clips)', 90); espera(B, '!!(window.__sala && __sala.AV.clips)', 90)
    for pg, nome in [(A, 'Ana Luz'), (B, 'Bruno')]:
        pg.evaluate(f"document.getElementById('nick').value={json.dumps(nome)}; __sala.enterRoom()")
    A.wait_for_timeout(3000)
    A.evaluate('__sala.setFP(-1.5, 2.2, -Math.PI/2)'); B.evaluate('__sala.setFP(1.0, 2.2, Math.PI/2)')

    # 1. cada um vê o outro no lugar certo
    perto = "(n, x, z) => [...__sala.MP.vis.values()].some(v => v.name === n && Math.hypot(v.tx - x, v.tz - z) < 0.05)"
    confere('A vê Bruno na posição', espera(A, f"({perto})('Bruno', 1.0, 2.2)"))
    confere('B vê Ana Luz na posição', espera(B, f"({perto})('Ana Luz', -1.5, 2.2)"))
    confere('botão de voz aparece dentro da sala', A.evaluate("!document.getElementById('vcToggle').hidden"))

    # 2. chat de texto ao vivo e gravado no banco
    A.click('#mpToggle'); A.fill('#mpInput', 'Olá, alguém aí?'); A.press('#mpInput', 'Enter')
    confere('B recebe a mensagem', espera(B, "__sala.MP.log.some(m => m.name === 'Ana Luz' && m.text === 'Olá, alguém aí?')", 10))
    confere('mensagem gravada no banco', A.evaluate("JSON.parse(localStorage.getItem('fake-sb-db')).chat_messages.some(m => m.body === 'Olá, alguém aí?' && m.name === 'Ana Luz')"))

    # 3. voz: os dois entram e a conexão abre com áudio
    A.click('#vcToggle'); B.click('#vcToggle')
    conectado = "[...__sala.VOICE.peers.values()].some(P => P.pc.connectionState === 'connected' && P.an)"
    t0 = time.time(); ok = espera(A, conectado, 30) and espera(B, conectado, 30)
    confere('voz conectada nos dois lados', ok, f'{time.time() - t0:.1f}s')
    nivel = B.evaluate("""() => new Promise(res => { let mx = 0; const b = new Uint8Array(512); let n = 0;
      const iv = setInterval(() => { const P = [...__sala.VOICE.peers.values()][0];
        if (P && P.an) { P.an.getByteTimeDomainData(b); let s = 0; for (const x of b) s += ((x - 128) / 128) ** 2; mx = Math.max(mx, Math.sqrt(s / 512)); }
        if (++n >= 120 || mx > 0.02) { clearInterval(iv); res(mx); } }, 50); })""")
    confere('B ouve o som de A', nivel > 0.005, f'nível máximo {nivel:.3f}')
    B.evaluate('new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))')  # deixa o laço atualizar a posição do som
    pos = B.evaluate("""(() => { const P = [...__sala.VOICE.peers.values()][0], v = [...__sala.MP.vis.values()][0], h = new __sala.THREE.Vector3();
      v.A.J.head.getWorldPosition(h); return Math.hypot(P.pan.positionX.value - h.x, P.pan.positionY.value - h.y, P.pan.positionZ.value - h.z); })()""")
    confere('som de A sai da cabeça do avatar', pos < 0.05, f'distância {pos:.3f} m')

    # 4. sair da voz fecha a conexão do outro lado
    A.click('#vcToggle')
    confere('A sai da voz e B fecha a conexão', espera(B, '__sala.VOICE.peers.size === 0', 10) and not A.evaluate('__sala.VOICE.on'))
    confere('etiqueta de A deixa de mostrar voz', espera(B, "[...__sala.MP.vis.values()].every(v => !v.vc)", 15))

    # 5. ranking da sinuca
    A.evaluate("__sala.saveRanking('win')")
    confere('ranking grava a vitória', espera(A, "JSON.parse(localStorage.getItem('fake-sb-db')).pool_ranking.some(r => r.slug === 'ana-luz' && r.wins === 1)", 5))

    # 6. quem chega depois vê o histórico e as pessoas
    B.close()
    C = abre('C')
    confere('quem chega vê o histórico', espera(C, "!!(window.__sala && __sala.MP.log.some(m => m.text === 'Olá, alguém aí?'))", 60))
    confere('quem chega vê Ana Luz', espera(C, "[...__sala.MP.vis.values()].some(v => v.name === 'Ana Luz')", 60))

    confere('sem erros de JavaScript', not any(erros.values()), json.dumps(erros, ensure_ascii=False)[:300])
    nav.close()

print(f'\n{"TUDO OK" if not falhas else str(len(falhas)) + " FALHA(S)"}' + (f' · externos bloqueados: {len(EXTERNOS)}' if EXTERNOS else ''))
sys.exit(1 if falhas else 0)
