"""Hotel Las Vegas Night: vista de fora, show no 44º andar, atendentes, gorjetas e vozes, no desktop e no celular."""
import os
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

os.makedirs(AQUI + '/saida', exist_ok=True)


def draw_for_photo(page):
    """Desenha a cena real, incluindo as cinco passadas quando o prédio está empilhado."""
    page.evaluate('''()=>{
        const s=__sala, render=s.renderer.render, clear=s.renderer.clear;
        s.renderer.render=window.__drawSala; s.renderer.clear=window.__clearSala;
        try { if(s.STACK.on)s.renderStacked();else s.renderer.render(s.scene,s.camera); }
        finally { s.renderer.render=render;s.renderer.clear=clear; }
    }''')


def wait_offer(page):
    """Espera uma atendente oferecer algo; se não vier, mostra o estado delas para diagnóstico."""
    try:
        page.wait_for_function('!!__sala.SHOW.offer', polling=400, timeout=90000)
    except Exception:
        print(page.evaluate('JSON.stringify([__sala.mode,__sala.fp.pos.toArray(),__sala.SHOW.nextOffer,performance.now()/1000,__sala.SHOW.hosts.map(h=>[h.name,h.state,h.P.root.position.toArray(),h.path])])'), flush=True)
        raise
with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in (False, True):
        nome = 'celular' if mobile else 'desktop'
        context = browser.new_context(viewport={'width': 390 if mobile else 960, 'height': 760}, is_mobile=mobile, has_touch=mobile)
        context.route('**/*', rota)
        context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        context.add_init_script(path=AQUI + '/fake_supabase.js')
        context.add_init_script('Object.defineProperty(window,"__sala",{configurable:true,set(value){window.__drawSala=value.renderer.render.bind(value.renderer);window.__clearSala=value.renderer.clear.bind(value.renderer);value.renderer.render=()=>{};value.renderer.clear=()=>{};value.renderer.shadowMap.enabled=false;value.renderer.setPixelRatio(.35);value.renderer.setSize(innerWidth,innerHeight,false);Object.defineProperty(window,"__sala",{value,writable:true,configurable:true})}})')
        # Registra as falas em vez de tocar o som (o navegador de teste não tem vozes).
        context.add_init_script('Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2});HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();window.__falas=[];try{localStorage.removeItem("sala-voz")}catch(e){}if(window.speechSynthesis){speechSynthesis.speak=u=>window.__falas.push(u.text);speechSynthesis.cancel=()=>{}}')
        errors = []
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
        page.wait_for_function('!!window.__sala', timeout=120000)

        # Abre com o hotel visto de fora, letreiro e luzes piscando; o botão alterna com a vista por dentro.
        assert page.evaluate('__sala.orbit.view==="outside" && __sala.EXT.group.visible && __sala.EXT.chase.length>=5')
        patterns = set()
        for _ in range(30):
            if len(patterns) > 1: break
            patterns.add(tuple(page.evaluate('[...Array(8).keys()].map(i=>{const c=new __sala.THREE.Color();__sala.EXT.chase[0].getColorAt(i,c);return +c.r.toFixed(2)})')))
            page.wait_for_timeout(400)
        assert len(patterns) > 1, 'As lâmpadas do letreiro não piscaram'
        assert page.locator('#btnOutside').is_hidden(), 'A entrada exclusiva oculta controles da sala'
        draw_for_photo(page); page.screenshot(path=AQUI + '/saida/hotel-fora-' + nome + '.png')
        page.evaluate('__sala.setOrbitView("inside")')
        assert page.evaluate('__sala.orbit.view==="inside" && !__sala.EXT.group.visible')
        page.evaluate('__sala.setOrbitView("outside")')
        assert page.evaluate('__sala.orbit.view==="outside"')
        # Entrada simples: boas-vindas, nome e botão Entrar (Enter também entra).
        assert 'Robôs no pregão.' in page.inner_text('#intro h1') and page.locator('#nick').is_visible() and page.locator('#btnEnter').is_visible()
        page.fill('#nick', 'Willian')
        page.press('#nick', 'Enter')
        page.wait_for_function('__sala.mode==="fp"', timeout=60000)
        assert page.evaluate('__sala.orbit.view==="inside" && !__sala.EXT.group.visible') and not page.locator('#btnOutside').is_visible()
        print(nome + ': hotel visto de fora e entrada OK', flush=True)

        # Aurora, a recepcionista cyber, dá as boas-vindas com o nome, por voz, e oferece uma bebida.
        page.wait_for_function('__sala.WELCOME.open && !document.getElementById("welcome").hidden', timeout=60000)
        assert 'Willian' in page.inner_text('#welcomeLine') and page.evaluate('__falas.some(f=>f.includes("Aurora") && f.includes("Willian"))')
        page.wait_for_function('__sala.WELCOME.npc.P.isAvatar && __sala.WELCOME.npc.P.cyber', timeout=90000)
        page.click('#welDrink')
        assert page.evaluate('!!__sala.HOSP.item && !__sala.WELCOME.open') and 'Aurora entregou' in page.inner_text('#menuMsg')
        page.evaluate('__sala.putAwayConsumable(); __sala.setFP(6.4,-4.4,Math.PI)')
        # Confere e usa a ação no mesmo instante (um robô passando pode disputar o botão de ação).
        page.wait_for_function('(()=>{if(__sala.act!=="Falar com a Aurora")return false;__sala.doAct();return __sala.WELCOME.open})()', polling=300, timeout=60000)
        page.evaluate('__sala.setFP(0,0,0)')
        page.wait_for_function('!__sala.WELCOME.open')
        print(nome + ': recepcionista Aurora OK', flush=True)

        # 44º andar pelo elevador; dançarinas no palco, acima do chão.
        page.evaluate('__sala.rideTo("show")')
        page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="show"', timeout=30000)
        page.wait_for_function('__sala.SHOW.dancers.every(d=>d.P.isAvatar && d.P.root.position.y>.35) && __sala.SHOW.hosts.every(h=>h.P.isAvatar)', timeout=120000)
        assert page.evaluate('__sala.SHOW.dancers.every(d=>d.P.pose==="dance")') and page.locator('#showBar').is_visible()
        assert page.evaluate('__sala.SEATS.filter(s=>s.kind==="show").length===8 && __sala.roomBlocked(0,21) && __sala.roomBlocked(4,18)')
        # Showgirls: figurino preso aos ossos (cocar, estola, saia e cinto), cancan sincronizado com chutes de verdade.
        page.wait_for_function('__sala.SHOW.dancers.every(d=>d.P.costume)', timeout=60000)
        girls = page.evaluate('''(()=>{const s=__sala;return {
            parts:s.SHOW.dancers.every(d=>d.P.costume.parts.length===4 && d.P.costume.parts.every(p=>p && p.parent && p.parent.isBone)),
            style:s.SHOW.dancers.every(d=>d.P.danceStyle==='showgirl' && d.P.dancePhase===0),
            colors:new Set(s.SHOW.dancers.map(d=>d.P.costume.sequin.color.getHexString())).size}})()''')
        assert girls['parts'] and girls['style'] and girls['colors'] == 3, girls
        kick = page.evaluate('''(()=>{const s=__sala,P=s.SHOW.dancers[0].P,foot=P.root.getObjectByName('Bip01_R_Foot'),v=new s.THREE.Vector3(),ys=[];
            for(let i=0;i<16;i++){P.update(0.016,i*0.125);P.root.updateMatrixWorld(true);foot.getWorldPosition(v);ys.push(v.y-P.root.position.y)}return Math.max(...ys)-Math.min(...ys)})()''')
        assert kick > 0.4, kick
        styles = page.evaluate('''(()=>{const s=__sala;return ['groove','disco','party','showgirl'].map(st=>JSON.stringify(s.dancePose(st,1.3,1)))})()''')
        assert len(set(styles)) == 4, styles
        print(nome + ': show no 44º andar e showgirls OK', flush=True)

        # Clima de festa: névoa leve só no andar do visitante, jato da máquina de fumaça e lâmpadas trocando de cor.
        page.wait_for_function('__sala.PARTY.rooms.find(r=>r.key==="show").group.visible && !__sala.PARTY.rooms.find(r=>r.key==="disco").group.visible')
        assert page.evaluate('__sala.PARTY.rooms.find(r=>r.key==="show").haze.every(h=>h.material.opacity>0.05 && h.material.opacity<0.25)')
        page.evaluate('__sala.partyBurst(__sala.PARTY.rooms.find(r=>r.key==="show"), performance.now()/1000)')
        page.wait_for_function('__sala.PARTY.rooms.find(r=>r.key==="show").burst.puffs.some(p=>p.visible && p.material.opacity>0.1)', timeout=30000)
        bulbs = set()
        for _ in range(30):
            if len(bulbs) > 1: break
            bulbs.add(page.evaluate('(()=>{const r=__sala.PARTY.rooms.find(r=>r.key==="show"),c=new __sala.THREE.Color();r.bulbs.getColorAt(0,c);return c.getHexString()})()'))
            page.wait_for_timeout(300)
        assert len(bulbs) > 1, 'As lâmpadas da parede não piscaram'
        print(nome + ': fumaça e luzes de festa OK', flush=True)

        # Uma atendente vem até o visitante, oferece e fala; a bebida chega pela mão dela.
        page.evaluate('__sala.closeOffer(0);__sala.setFP(0,15.6,Math.PI);__sala.SHOW.nextOffer=0')
        wait_offer(page)
        assert page.locator('#hostOffer').is_visible()
        assert page.evaluate('Math.hypot(__sala.SHOW.offer.P.root.position.x-__sala.fp.pos.x,__sala.SHOW.offer.P.root.position.z-__sala.fp.pos.z)<1.5')
        assert page.evaluate('__falas.some(f=>f.includes("Las Vegas Night"))')
        page.click('#hostDrink')
        assert page.evaluate('__sala.SHOW.hosts.some(h=>h.state==="fetch")')
        page.wait_for_function('!!__sala.HOSP.item', timeout=90000)
        assert page.evaluate('/(Bianca|Larissa) entregou/.test(document.getElementById("menuMsg").textContent)')
        assert page.evaluate('__falas.some(f=>f.includes("Aqui está"))')
        print(nome + ': atendente oferece e traz bebida OK', flush=True)

        # Dançar com a atendente, depois sentar à mesa pelo convite.
        page.evaluate('__sala.SHOW.nextOffer=0')
        wait_offer(page)
        page.click('#hostDance')
        page.wait_for_function('__sala.DISCO.dancing && __sala.mode==="dance" && __sala.SHOW.hosts.some(h=>h.state==="dance" && h.P.pose==="dance")', timeout=30000)
        page.keyboard.press('Escape')
        page.wait_for_function('__sala.mode==="fp"')
        page.evaluate('__sala.SHOW.hosts.forEach(h=>{if(h.state==="dance"){h.state="wander"}});__sala.SHOW.nextOffer=0')
        wait_offer(page)
        page.click('#hostSeat')
        page.wait_for_function('__sala.mode==="seat"', timeout=30000)
        print(nome + ': dançar e mesa para o show OK', flush=True)

        # Gorjeta: tira 10 fichas, mostra 💵 e agradece; sem fichas, avisa.
        chips = page.evaluate('__sala.CASINO.balance')
        page.click('#showTip')
        assert page.evaluate('c=>__sala.CASINO.balance===c-10 && __sala.DISCO.emojis.length>0', chips)
        page.wait_for_function('(()=>{const m=new __sala.THREE.Matrix4(),v=new __sala.THREE.Vector3();const c=__sala.scene.getObjectByProperty("isInstancedMesh",true);let n=0;__sala.scene.traverse(o=>{if(o.isInstancedMesh&&o.userData.floor==="show"&&o.count===160){for(let i=0;i<160;i++){o.getMatrixAt(i,m);v.setFromMatrixScale(m);if(v.x>0.5)n++}}});return n>20})()', timeout=30000)
        assert page.evaluate('__falas.some(f=>f.includes("Obrigada"))')
        page.evaluate('__sala.CASINO.balance=5')
        page.click('#showTip')
        assert page.evaluate('__sala.CASINO.balance===5') and 'Sem fichas' in page.inner_text('#serviceNote')
        page.evaluate('__sala.CASINO.balance=100;__sala.standUp()')
        page.wait_for_function('__sala.mode==="fp"')
        page.evaluate('__sala.setFP(0,19.5,Math.PI)')
        page.wait_for_function('(__sala.act||"").startsWith("Dar gorjeta")')
        page.evaluate('__sala.doAct()')
        assert page.evaluate('__sala.CASINO.balance===90')
        print(nome + ': gorjetas OK', flush=True)

        # Voz pode ser desligada e fica lembrada.
        n = page.evaluate('__falas.length')
        page.click('#showVoice')
        assert page.evaluate('!__sala.SHOW.voice && localStorage.getItem("sala-voz")==="0"')
        page.evaluate('__sala.tipDancer()')
        assert page.evaluate('n=>__falas.length===n', n)
        page.click('#showVoice')

        # Painel do show e controles cabem na tela; nomes do show não aparecem em outro andar.
        assert page.locator('#showBar').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0}')
        overlap = page.evaluate('''() => {
            const bar=document.getElementById('showBar').getBoundingClientRect();
            const others=['joy','mRun','btnAct','heldBar','mpToggle','vcToggle','musicOpen','btnView',...[...document.querySelectorAll('.disco-shortcuts .btn')].map(b=>b.id)]
                .map(id=>document.getElementById(id)).filter(e=>e && !e.hidden && e.getClientRects().length);
            return others.filter(e=>{const r=e.getBoundingClientRect();return bar.left<r.right-1&&r.left<bar.right-1&&bar.top<r.bottom-1&&r.top<bar.bottom-1}).map(e=>e.id);
        }''')
        assert not overlap, overlap
        draw_for_photo(page); page.screenshot(path=AQUI + '/saida/show-' + nome + '.png')
        page.evaluate('__sala.rideTo("office")')
        page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="office"', timeout=30000)
        page.wait_for_timeout(300)
        assert page.evaluate('[...__sala.SHOW.dancers,...__sala.SHOW.hosts].every(n=>n.el.style.opacity==="0")') and not page.locator('#showBar').is_visible()
        page.evaluate('__sala.leaveRoom()')
        page.wait_for_function('__sala.mode==="orbit"', timeout=30000)
        assert not errors, errors
        print(nome.upper() + ': TUDO OK', flush=True)
        context.close()
    browser.close()
