"""Testa acesso, colisões, dança realista, robôs e reações compartilhadas."""
import os
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

os.makedirs(AQUI + '/saida', exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in (False, True):
        print('Abrindo ' + ('celular' if mobile else 'desktop'), flush=True)
        context = browser.new_context(viewport={'width':390 if mobile else 960,'height':760}, is_mobile=mobile, has_touch=mobile)
        context.route('**/*', rota)
        context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        context.add_init_script(path=AQUI + '/fake_supabase.js')
        # O teste funcional desenha a cena sob demanda para evitar travamentos do GPU por software.
        # Para conferir sombras/reflexos em movimento, use teste_tela.py.
        context.add_init_script('Object.defineProperty(window,"__sala",{configurable:true,set(value){window.__drawSala=value.renderer.render.bind(value.renderer);value.renderer.render=()=>{};value.renderer.shadowMap.enabled=false;value.renderer.setPixelRatio(.35);value.renderer.setSize(innerWidth,innerHeight,false);Object.defineProperty(window,"__sala",{value,writable:true,configurable:true})}})')
        context.add_init_script('Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2}); HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve()')
        errors = []
        def open_page():
            page = context.new_page()
            page.on('pageerror', lambda e: (errors.append(str(e)), print('ERRO:', e, flush=True)))
            page.goto(URL + 'index.html#debug', wait_until='domcontentloaded', timeout=120000)
            page.wait_for_function('!!window.__sala', timeout=120000)
            page.evaluate('__sala.renderer.shadowMap.enabled=false; __sala.renderer.setPixelRatio(.35); __sala.renderer.setSize(innerWidth,innerHeight,false)')
            return page
        A = open_page()
        A.evaluate('__sala.enterRoom()')
        A.wait_for_function('__sala.mode==="fp"', timeout=60000)
        A.click('#discoGo')
        A.wait_for_function('__sala.mode==="fp" && __sala.fp.pos.z>6.4')
        # O painel da pista começa fechado e abre pelo botão 🪩 Pista.
        assert not A.locator('#discoPanel').is_visible() and A.locator('#discoPanelOpen').is_visible()
        A.click('#discoPanelOpen')
        assert A.locator('#discoPanel').is_visible() and not A.locator('#discoPanelOpen').is_visible()
        A.click('#discoPanelClose')
        assert not A.locator('#discoPanel').is_visible()
        A.click('#discoPanelOpen')
        assert A.evaluate('__sala.blocked(0,6) && __sala.blocked(1.5,6) && __sala.blocked(3.9,8) && __sala.blocked(0,14) && !__sala.blocked(0,8.5)')
        print('Acesso e paredes OK', flush=True)
        A.click('#discoInvite')
        assert A.evaluate('__sala.robots.some(r=>r.spot?.startsWith("dance"))')
        assert A.evaluate('__sala.robots.filter(r=>r.spot?.startsWith("dance")).every(r=>!r.trade && r.path.some(p=>p.elev==="disco"))')
        A.evaluate('__sala.fast(35)')
        assert A.evaluate('__sala.robots.some(r=>r.mode==="lounge" && r.P.pose==="dance")')
        print('Robôs chegaram andando à pista OK', flush=True)
        A.click('#discoDance')
        A.wait_for_function('__sala.DISCO.player?.isAvatar', timeout=90000)
        assert A.evaluate('__sala.DISCO.dancing && __sala.mode==="dance" && __sala.myPresence().m==="d"')
        for style in ('groove','disco','party'):
            A.select_option('#discoStyle', style)
            A.wait_for_function('style=>__sala.DISCO.player.danceStyle===style', arg=style)
            before = A.evaluate('__sala.DISCO.player.danceBones.find(b=>b?.name==="Bip01_L_UpperArm").quaternion.toArray()')
            samples = []
            for _ in range(2):
                A.wait_for_timeout(250)
                samples.append(A.evaluate('__sala.DISCO.player.danceBones.find(b=>b?.name==="Bip01_L_UpperArm").quaternion.toArray()'))
            assert any(sum(abs(a-b) for a,b in zip(before, after)) > .01 for after in samples), style
        A.click('[data-emoji="🔥"]')
        assert A.evaluate('__sala.DISCO.emojis.length>0 && __sala.myPresence().em==="🔥"')
        A.evaluate('__drawSala(__sala.scene,__sala.camera)')
        A.screenshot(path=AQUI + '/saida/discoteca-' + ('mobile' if mobile else 'desktop') + '.png', timeout=120000)
        assert A.locator('#discoPanel').evaluate('(e)=>{const b=e.getBoundingClientRect();return b.left>=0 && b.right<=innerWidth && b.top>=0}')
        if not mobile:
            B = open_page()
            B.bring_to_front()
            B.set_viewport_size({'width':480,'height':360})
            B.evaluate('__sala.setFP(0,7.1,Math.PI); __sala.renderer.setPixelRatio(.3); __sala.renderer.setSize(innerWidth,innerHeight,false)')
            B.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.m==="d" && v.tz>6.4 && v.ds==="party")', timeout=60000)
            B.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.A?.pose==="dance")', timeout=90000)
            A.bring_to_front()
            A.click('[data-emoji="❤️"]')
            B.bring_to_front()
            B.wait_for_function('__sala.DISCO.emojis.some(p=>p.sprite.material.map)', timeout=30000)
            B.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.emojiId>0)', timeout=30000)
            print('Dança e emoji entre visitantes OK', flush=True)
            A.bring_to_front()
            A.click('#discoDance')
            B.bring_to_front()
            B.wait_for_function('[...__sala.MP.vis.values()].every(v=>v.m!=="d")', timeout=30000)
            B.close(); A.bring_to_front()
        else:
            A.keyboard.press('Escape')
        assert A.evaluate('__sala.mode==="fp" && !__sala.DISCO.player.root.visible')
        A.click('#discoLights')
        assert A.locator('#discoLights').get_attribute('aria-pressed') == 'false'
        A.click('#discoMusic')
        A.wait_for_function('__sala.MUSIC.playing && __sala.mode==="music"')
        A.click('#musicClose')
        A.click('#discoDance')
        assert A.evaluate('__sala.MUSIC.playing && __sala.DISCO.dancing')
        A.click('#discoExit')
        A.wait_for_function('__sala.mode==="fp" && __sala.fp.pos.z<6')
        assert A.evaluate('!__sala.DISCO.dancing && !__sala.DISCO.player.root.visible')
        A.evaluate('__sala.MUSIC.audio.pause(); __sala.openMusic()')
        A.click('#musicStop'); A.click('#musicClose')
        A.evaluate('__sala.setFP(-2.6,10.2,-Math.PI/2); __sala.sitDown(__sala.SEATS.find(s=>s.kind==="club"))')
        A.wait_for_function('__sala.mode==="seat"')
        A.evaluate('__sala.openMusic()'); A.click('#musicClose')
        assert A.evaluate('__sala.mode==="seat"')
        A.evaluate('__sala.standUp()')
        A.wait_for_function('__sala.mode==="fp"')
        assert A.evaluate('!__sala.blocked(__sala.fp.pos.x,__sala.fp.pos.z)')
        assert not errors, errors
        print(('CELULAR' if mobile else 'DESKTOP') + ': TUDO OK', flush=True)
        context.close()
    browser.close()
