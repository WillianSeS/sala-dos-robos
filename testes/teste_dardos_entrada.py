"""Entrada com fachada e dardos: mira real, pontuação, prêmios e limpeza."""
import math
import os
import json
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

os.makedirs(AQUI + '/saida', exist_ok=True)

# A cena, animações e raycast continuam reais; desenhamos apenas as fotos para
# o Chromium sem GPU conseguir exercitar as interações a uma velocidade útil.
RENDER_FIXTURE = '''Object.defineProperty(window,"__sala",{configurable:true,set(value){
    window.__drawSala=value.renderer.render.bind(value.renderer);
    value.renderer.render=()=>{};
    value.renderer.shadowMap.enabled=false;
    value.renderer.setPixelRatio(.35);
    value.renderer.setSize(innerWidth,innerHeight,false);
    Object.defineProperty(window,"__sala",{value,writable:true,configurable:true});
}})'''


def context_for(browser, mobile):
    context = browser.new_context(
        viewport={'width': 390 if mobile else 960, 'height': 760},
        is_mobile=mobile, has_touch=mobile)
    context.route('**/*', rota)
    context.route('https://fonts.googleapis.com/**',
                  lambda r: r.fulfill(body='', content_type='text/css'))
    context.add_init_script(path=AQUI + '/fake_supabase.js')
    context.add_init_script(RENDER_FIXTURE)
    context.add_init_script('''Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2});
        HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();''')
    return context


def screenshot(page, name):
    page.evaluate('''()=>{
        const s=__sala, previous=s.renderer.render;
        s.renderer.setPixelRatio(.65);
        s.renderer.setSize(innerWidth,innerHeight,false);
        s.renderer.render=window.__drawSala;
        try { s.renderer.render(s.scene,s.camera); }
        finally { s.renderer.render=previous; }
    }''')
    page.screenshot(path=AQUI + '/saida/' + name + '.png')


def panel_fits(page, selector):
    return page.locator(selector).evaluate('''el=>{
        const r=el.getBoundingClientRect();
        return r.left>=-1 && r.right<=innerWidth+1 &&
               r.top>=-1 && r.bottom<=innerHeight+1;
    }''')


def assert_entrance(page, suffix):
    page.wait_for_function('document.body.classList.contains("at-entrance") && __sala.EXT.group.visible && __sala.orbit.view==="outside" && Math.abs(__sala.camera.position.distanceTo(__sala.orbit.target)-__sala.orbit.r)<1')
    assert page.locator('#intro').is_visible()
    assert page.evaluate('document.body.classList.contains("at-entrance")')
    assert page.evaluate('__sala.EXT.group.visible')
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
    page.locator('#btnEnter').scroll_into_view_if_needed()
    assert panel_fits(page, '#nick') and panel_fits(page, '#btnEnter')
    assert page.locator('#nick').get_attribute('maxlength') == '24'
    assert page.locator('#btnEnter').is_enabled()
    assert page.evaluate('''(()=>{let n=0;__sala.EXT.group.traverse(o=>{if(o.isMesh)n++});
        return n>10;})()'''), 'A fachada precisa conter a arquitetura 3D'
    screenshot(page, 'entrada-' + suffix)


def score_rules(page):
    """Os 20 setores e os anéis de multiplicação devem funcionar igualmente."""
    sectors = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17,
               3, 19, 7, 16, 8, 11, 14, 9, 12, 5]
    cases = []
    for i, number in enumerate(sectors):
        angle = i * math.pi / 10
        for radius, multiplier in ((.3, 1), (.605, 3), (.98, 2), (.77, 1)):
            cases.append({'x': math.sin(angle) * radius,
                          'y': math.cos(angle) * radius,
                          'points': number * multiplier})
    actual = page.evaluate('''cases=>cases.map(p=>({
        want:p.points, actual:__sala.dartScore(p.x,p.y).points
    }))''', cases)
    assert all(p['want'] == p['actual'] for p in actual), actual
    assert page.evaluate('''__sala.dartScore(0,0).points===50 &&
        __sala.dartScore(.06,0).points===25 &&
        __sala.dartScore(0,1.1).points===0 &&
        __sala.dartScore(NaN,0).points===0''')


def board_projection(page):
    """Projeta o centro do alvo real para clicar no canvas, sem chamar o tiro."""
    return page.evaluate('''()=>{
        const s=__sala, c=s.DARTS_LAYOUT, r=s.renderer.domElement.getBoundingClientRect();
        s.camera.updateMatrixWorld();
        const p=new s.THREE.Vector3(c.x,c.y,c.z).project(s.camera);
        return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
    }''')


def assert_darts_layout(page):
    assert panel_fits(page, '.darts-top') and panel_fits(page, '.darts-bottom')
    assert panel_fits(page, '#dartsExit')
    result = page.evaluate('''()=>{
        const s=__sala,c=s.DARTS_LAYOUT,r=s.renderer.domElement.getBoundingClientRect();
        s.camera.updateMatrixWorld();
        const project=(dy,dz)=>{
            const p=new s.THREE.Vector3(c.x,c.y+dy,c.z+dz).project(s.camera);
            return {x:r.left+(p.x+1)*r.width/2,y:r.top+(1-p.y)*r.height/2};
        };
        const top=project(c.radius,0),bottom=project(-c.radius,0);
        const left=project(0,-c.radius),right=project(0,c.radius),center=project(0,0);
        const a=document.querySelector('.darts-top').getBoundingClientRect();
        const b=document.querySelector('.darts-bottom').getBoundingClientRect();
        const hit=document.elementFromPoint(center.x,center.y);
        return {top:top.y,bottom:bottom.y,left:Math.min(left.x,right.x),right:Math.max(left.x,right.x),
            headerBottom:a.bottom,footerTop:b.top,canvasAtCenter:hit===s.renderer.domElement};
    }''')
    assert result['canvasAtCenter'], result
    assert result['left'] >= 0 and result['right'] <= page.viewport_size['width'], result
    assert result['top'] >= result['headerBottom']-1 and result['bottom'] <= result['footerTop']+1, result


def settle_throw(page):
    page.wait_for_function('!__sala.DARTS.flight', timeout=5000)


def hit_exact(page, x, y):
    page.evaluate('''p=>{
        if(!__sala.throwDart(p.x,p.y))throw Error('Dardo exato rejeitado');
        __sala.stepDarts(1);
    }''', {'x': x, 'y': y})


def stored_prizes(page):
    return page.evaluate('localStorage.getItem("sala-dos-robos:darts:v1")')


def play_round(page, x, y):
    for _ in range(9):
        hit_exact(page, x, y)
    assert page.evaluate('__sala.DARTS.phase==="done" && __sala.DARTS.hits.length===9 && __sala.DARTS.throws===9')


def restart_round(page):
    page.click('#dartsAgain')
    assert page.evaluate('''__sala.DARTS.active && __sala.DARTS.phase==="aim" &&
        __sala.DARTS.hits.length===0 && __sala.DARTS.score===0''')


def test_game(page, mobile, suffix):
    page.click('#gamesGo')
    page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="games" && __sala.inGames(__sala.fp.pos.x,__sala.fp.pos.z)')
    score_rules(page)
    print(suffix+': 80 combinações de setores e anéis OK',flush=True)
    assert page.evaluate('!__sala.roomBlocked(__sala.DARTS_LAYOUT.stand.x,__sala.DARTS_LAYOUT.stand.z)')
    page.evaluate('__sala.deliverConsumable("water");__sala.setFP(9.8,__sala.DARTS_LAYOUT.stand.z,-Math.PI/2)')
    page.wait_for_function('__sala.act && __sala.act.includes("dardos")')
    page.evaluate('__sala.doAct()')
    page.wait_for_function('__sala.mode==="darts" && __sala.DARTS.active')
    assert page.locator('#dartsHud').is_visible() and panel_fits(page, '#dartsHud')
    assert_darts_layout(page)
    if mobile:
        page.set_viewport_size({'width': 390, 'height': 500})
        page.wait_for_timeout(100)
        assert_darts_layout(page)
        screenshot(page, 'dardos-mobile-baixo')
        page.set_viewport_size({'width': 390, 'height': 760})
        page.wait_for_timeout(100)
    page.wait_for_function('!__sala.HOSP.rig.visible && document.getElementById("heldBar").hidden')
    assert page.evaluate('__sala.HOSP.item==="water" && __sala.HOSP.portions===4')
    assert page.evaluate('Math.abs(__sala.fp.pos.x-__sala.DARTS_LAYOUT.stand.x)<.01 && Math.abs(__sala.fp.pos.z-__sala.DARTS_LAYOUT.stand.z)<.01')
    before = stored_prizes(page)
    aim = board_projection(page)
    assert aim['x'] > 0 and aim['y'] > 0
    if mobile:
        page.touchscreen.tap(aim['x'], aim['y'])
        assert page.evaluate('__sala.DARTS.hits.length===0 && !__sala.DARTS.flight')
        page.click('#dartsThrow')
    else:
        page.mouse.click(aim['x'], aim['y'])
    assert page.evaluate('!!__sala.DARTS.flight'), 'O clique deve iniciar o dardo 3D'
    page.evaluate('__sala.throwDart(0,0)')
    settle_throw(page)
    assert page.evaluate('__sala.DARTS.hits.length===1'), 'Tiros durante o voo precisam ser ignorados'
    assert page.evaluate('__sala.DARTS.hits[0].points>0')
    assert page.evaluate('''__sala.DARTS_VISUAL.darts.children.length===1 &&
        Math.abs(__sala.DARTS_VISUAL.darts.children[0].position.x-(__sala.DARTS_LAYOUT.x+.004))<.001''')
    assert stored_prizes(page) == before, 'Um prêmio só deve ser concedido após o nono dardo'
    screenshot(page, 'dardos-' + suffix)
    print(suffix+': mira por clique/toque e dardo 3D OK',flush=True)

    # Sair no meio da rodada preserva o item e restaura a câmera/interações.
    page.keyboard.press('Escape')
    assert page.evaluate('__sala.mode==="fp" && !__sala.DARTS.active && !__sala.DARTS.flight')
    assert page.locator('#dartsHud').is_hidden()
    assert page.evaluate('__sala.DARTS_VISUAL.darts.children.length===0 && !__sala.DARTS_VISUAL.aim.visible')
    page.wait_for_function('__sala.HOSP.rig.visible && !document.getElementById("heldBar").hidden')
    assert page.evaluate('''__sala.HOSP.item==="water" && __sala.HOSP.portions===4 &&
        Math.abs(__sala.fp.pos.x-9.8)<.01 && Math.abs(__sala.fp.pos.z-__sala.DARTS_LAYOUT.stand.z)<.01''')
    assert stored_prizes(page) == before
    page.click('#dartsGo')
    page.wait_for_function('__sala.mode==="darts"')
    play_round(page, 0, 1.2)
    assert page.evaluate('__sala.DARTS.score===0 && __sala.DARTS.awards.length===0 && __sala.DARTS.best===0')
    assert json.loads(stored_prizes(page))['awards'] == [], 'Rodada sem pontos não deve conceder prêmios'

    # Nove acertos simples liberam os dois primeiros níveis; o centro libera todos.
    restart_round(page)
    play_round(page, 0, .3)
    assert page.evaluate('''__sala.DARTS.score===180 &&
        __sala.DARTS.awards.includes("bronze") && __sala.DARTS.awards.includes("silver") &&
        !__sala.DARTS.awards.includes("gold") && !__sala.DARTS.awards.includes("bull")''')
    saved_lower = stored_prizes(page)
    assert saved_lower != before
    restart_round(page)
    assert stored_prizes(page) == saved_lower, 'Nova rodada não apaga a coleção'
    play_round(page, 0, 0)
    assert page.evaluate('''__sala.DARTS.score===450 && __sala.DARTS.best===450 &&
        ["bronze","silver","gold","bull"].every(id=>__sala.DARTS.awards.includes(id))''')
    saved = stored_prizes(page)
    assert saved != saved_lower
    page.evaluate('__sala.throwDart(0,0)')
    assert page.evaluate('__sala.DARTS.hits.length===9 && __sala.DARTS.score===450')
    screenshot(page, 'premios-dardos-' + suffix)
    print(suffix+': nove dardos e coleção de prêmios OK',flush=True)
    page.click('#dartsExit')
    assert page.evaluate('__sala.mode==="fp" && !__sala.DARTS.active && !__sala.DARTS.flight')
    assert page.locator('#dartsHud').is_hidden()
    assert page.evaluate('''!__sala.DARTS_VISUAL.aim.visible &&
        !__sala.DARTS_VISUAL.darts.children.length && !document.getElementById("hud").hidden &&
        !document.getElementById("mp").classList.contains("off")''')
    assert page.evaluate('__sala.camera.fov===(innerWidth<innerHeight?80:66)')
    assert page.evaluate('__sala.HOSP.item==="water" && __sala.HOSP.portions===4')

    # A câmera fixa do alvo oculta o próprio avatar e preserva a opção de terceira pessoa.
    page.evaluate('__sala.setThirdPerson(true)')
    page.wait_for_function('__sala.DISCO.player && __sala.DISCO.player.root.visible')
    page.click('#dartsGo')
    page.wait_for_function('__sala.mode==="darts" && !__sala.DISCO.player.root.visible && !__sala.HOSP.rig.visible')
    assert page.evaluate('__sala.VIEW.third && __sala.HOSP.item==="water"')
    page.keyboard.press('Space')
    settle_throw(page)
    assert page.evaluate('__sala.DARTS.hits.length===1')
    page.click('#dartsExit')
    page.wait_for_function('__sala.mode==="fp" && __sala.VIEW.third && __sala.DISCO.player.root.visible')
    assert page.evaluate('__sala.HOSP.item==="water" && __sala.HOSP.portions===4')
    page.evaluate('__sala.setThirdPerson(false)')
    page.wait_for_function('__sala.HOSP.rig.visible')

    page.reload(wait_until='domcontentloaded')
    page.wait_for_function('!!window.__sala')
    assert page.evaluate('__sala.DARTS.best===450')
    assert stored_prizes(page) == saved, 'Recorde e coleção precisam sobreviver ao recarregamento'
    if not mobile:
        # Valores inválidos no aparelho não devem impedir a entrada nem inventar prêmios.
        page.evaluate('localStorage.setItem("sala-dos-robos:darts:v1","sem JSON")')
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('!!window.__sala')
        assert page.evaluate('__sala.DARTS.best===0 && __sala.DARTS.awards.length===0')
        page.evaluate('''localStorage.setItem("sala-dos-robos:darts:v1",JSON.stringify({
            v:1,best:999999,awards:["gold","gold","__proto__","<script>"],extra:"ignorar"
        }))''')
        page.reload(wait_until='domcontentloaded')
        page.wait_for_function('!!window.__sala')
        assert page.evaluate('''__sala.DARTS.best===540 &&
            __sala.DARTS.awards.length===1 && __sala.DARTS.awards[0]==="gold"''')
        page.evaluate('saved=>localStorage.setItem("sala-dos-robos:darts:v1",saved)', saved)
    print(suffix + ': pontuação, clique/toque, 9 dardos, prêmios, persistência e saída OK', flush=True)



def main():
    with sync_playwright() as p:
        browser = p.chromium.launch(args=ARGS)
        for mobile in (False, True):
            suffix = 'mobile' if mobile else 'desktop'
            context = context_for(browser, mobile)
            errors = []
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
            page.wait_for_function('!!window.__sala', timeout=60000)
            assert_entrance(page, suffix)
            if mobile:
                page.set_viewport_size({'width': 390, 'height': 500})
                assert_entrance(page, 'mobile-baixo')
                page.set_viewport_size({'width': 390, 'height': 760})
            page.fill('#nick', 'Visitante ' + suffix)
            page.click('#btnEnter')
            page.wait_for_function('__sala.mode==="fp"')
            page.evaluate('__sala.closeWelcome()')
            assert page.locator('#intro').is_hidden()
            assert page.evaluate('!document.body.classList.contains("at-entrance") && !__sala.EXT.group.visible')
            assert page.evaluate('__sala.myPresence().n==="Visitante '+suffix+'"')
            test_game(page, mobile, suffix)
            assert not errors, errors
            context.close()
        browser.close()
    print('TUDO OK', flush=True)


if __name__ == "__main__":
    main()
