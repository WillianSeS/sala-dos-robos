"""Prédio com andares: paredes fechadas, cabine do elevador, terceira pessoa, rádio da sala e Spotify no desktop e no celular."""
import os
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

os.makedirs(AQUI + '/saida', exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in (False, True):
        nome = 'celular' if mobile else 'desktop'
        context = browser.new_context(viewport={'width': 390 if mobile else 960, 'height': 760}, is_mobile=mobile, has_touch=mobile)
        context.route('**/*', rota)
        context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        context.add_init_script(path=AQUI + '/fake_supabase.js')
        context.add_init_script('Object.defineProperty(window,"__sala",{configurable:true,set(value){window.__drawSala=value.renderer.render.bind(value.renderer);value.renderer.render=()=>{};value.renderer.shadowMap.enabled=false;value.renderer.setPixelRatio(.35);value.renderer.setSize(innerWidth,innerHeight,false);Object.defineProperty(window,"__sala",{value,writable:true,configurable:true})}})')
        context.add_init_script('Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2});HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve();try{localStorage.removeItem("sala-view")}catch(e){}')
        errors = []
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
        page.wait_for_function('!!window.__sala', timeout=120000)
        page.evaluate('__sala.enterRoom()')
        page.wait_for_function('__sala.mode==="fp"', timeout=60000)

        # Salas separadas: nenhuma passagem entre elas; a frente de cada elevador é livre.
        assert page.evaluate('''[[0,6],[5.5,6],[10.5,14],[4,10],[4,18]].every(([x,z])=>__sala.roomBlocked(x,z))
            && __sala.FLOORS.every(f=>!__sala.roomBlocked(f.x,f.z) && __sala.floorAt(f.x,f.z)===f.key)''')
        print(nome + ': paredes fechadas entre os andares OK', flush=True)

        # Cabine de verdade: porta fechada barra a passagem; chegando perto, as portas abrem e dá para entrar.
        page.evaluate('__sala.setFP(0,0,0)')
        page.wait_for_function('__sala.FLOOR.office.open<.1', timeout=30000)
        assert page.evaluate('__sala.wallBlocked(8.05,-4.8,.28)')
        page.evaluate('__sala.setFP(6.4,-4.8,-Math.PI/2)')
        page.wait_for_function('__sala.FLOOR.office.open>.8')
        assert page.evaluate('!__sala.wallBlocked(8.05,-4.8,.28) && !__sala.wallBlocked(8.84,-4.8,.28) && __sala.wallBlocked(9.7,-4.8,.28) && __sala.wallBlocked(8.84,-5.7,.28)')
        page.evaluate('__sala.setFP(8.84,-4.8,Math.PI/2)')
        page.wait_for_function('__sala.act==="Escolher o andar"')
        page.evaluate('__sala.setFP(6.6,-4.8,-Math.PI/2)')
        print(nome + ': cabine com portas e passagem OK', flush=True)

        # Elevador pela tecla E: painel com os quatro andares, entrada, viagem e saída no outro andar.
        page.wait_for_function('__sala.act==="Usar o elevador"')
        page.evaluate('__sala.doAct()')
        assert page.evaluate('__sala.mode==="elevator"') and page.locator('#elevator').is_visible()
        assert page.locator('#elevFloors button').count() == 4
        assert page.locator('#elevFloors [data-floor="office"]').is_disabled()
        page.keyboard.press('Escape')
        assert page.evaluate('__sala.mode==="fp"') and not page.locator('#elevator').is_visible()
        page.evaluate('__sala.openElevator()')
        page.click('#elevFloors [data-floor="lounge"]')
        assert page.evaluate('__sala.mode==="ride"') and page.locator('#elevRide').is_visible()
        page.wait_for_function('__sala.ELEV.ride?.step===2', timeout=30000)
        assert page.evaluate('__sala.inCab(__sala.fp.pos.x,__sala.fp.pos.z)?.key==="office" && __sala.FLOOR.office.openUntil===0')
        page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="lounge"', timeout=30000)
        assert page.evaluate('__sala.FLOOR.lounge.openUntil>performance.now()/1000 && !__sala.blocked(__sala.fp.pos.x,__sala.fp.pos.z)')
        assert not page.locator('#elevRide').is_visible()
        page.wait_for_function('__sala.FLOOR.lounge.leaves[0].scale.z<.3')
        print(nome + ': elevador com painel, viagem e portas OK', flush=True)

        # Atalhos também viajam pelo elevador, inclusive sentado.
        page.evaluate('__sala.sitDown(__sala.SEATS.find(s=>s.id==="loungeSideB"))')
        page.wait_for_function('__sala.mode==="seat"')
        page.click('#discoGo')
        page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="disco"', timeout=30000)
        page.click('#gamesBack')
        page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="office"', timeout=30000)
        print(nome + ': atalhos pelo elevador OK', flush=True)

        # O garçom do escritório leva o pedido ao lounge pelo elevador.
        page.evaluate('__sala.setFP(10.5,17.6,0)')
        path = page.evaluate('__sala.staffPath([6.2,2.8],[9.4,18.6]).map(q=>q.elev||"")')
        assert 'office' in path and 'lounge' in path, path
        page.evaluate('__sala.requestService("coffee")')
        ride = page.evaluate('''() => {
            const s=__sala, m=s.STAFF.order.member, t=performance.now()/1000; let rode=false;
            for(let i=0;i<600 && s.STAFF.order;i++){ s.stepStaff(.1,t+i*.1); if(m.elevWait>0) rode=true; }
            return {rode, delivered:!s.STAFF.order && s.HOSP.item==="coffee", role:m.role};
        }''')
        assert ride['rode'] and ride['delivered'] and ride['role'] == 'garçom', ride
        print(nome + ': atendimento entre andares pelo elevador OK', flush=True)

        # Etiquetas de nome só para quem está no mesmo andar.
        page.wait_for_timeout(300)
        assert page.evaluate('__sala.robots.filter(r=>__sala.floorAt(r.P.root.position.x,r.P.root.position.z)==="office").every(r=>r.el.style.opacity==="0")')

        # Terceira pessoa: o próprio avatar aparece, anda e segura o item; a câmera não atravessa paredes.
        assert page.locator('#viewToggle').is_visible()
        page.click('#viewToggle')
        page.wait_for_function('__sala.DISCO.player?.isAvatar && __sala.DISCO.player.root.visible', timeout=90000)
        third = page.evaluate('''() => {
            const s=__sala, A=s.DISCO.player, c=s.camera.position, f=s.fp.pos;
            return {behind: Math.hypot(c.x-f.x,c.z-f.z), wall: s.wallBlocked(c.x,c.z,.1), item: A.heldItem, hand: s.HOSP.rig.visible,
                    pos: Math.hypot(A.root.position.x-f.x,A.root.position.z-f.z)};
        }''')
        assert third['behind'] > .2 and not third['wall'] and third['item'] == 'coffee' and not third['hand'] and third['pos'] < .01, third
        page.evaluate('__sala.setFP(11.3,16,-Math.PI/2)')
        page.wait_for_timeout(400)
        assert not page.evaluate('__sala.wallBlocked(__sala.camera.position.x,__sala.camera.position.z,.1)')
        page.evaluate('__sala.consumeHeld()')
        page.wait_for_function('__sala.DISCO.player.heldProp?.userData.consuming')
        # O corpo vira para onde anda (aqui, para o lado), e a câmera aproxima e afasta.
        page.evaluate('__sala.setFP(9,17.5,0)')
        page.keyboard.down('KeyD'); page.wait_for_function('Math.abs(__sala.fp.body-Math.PI/2)<.3 && Math.abs(__sala.DISCO.player.yaw-Math.PI/2)<.3', timeout=30000); page.keyboard.up('KeyD')
        assert page.evaluate('Math.abs(__sala.myPresence().yaw-Math.PI/2)<.3')
        if not mobile:
            page.mouse.move(480, 380); page.mouse.wheel(0, 600)
            assert page.evaluate('__sala.VIEW.zoom>3.5')
            page.mouse.wheel(0, -900)
            assert page.evaluate('__sala.VIEW.zoom<2')
        page.evaluate('__sala.sitDown(__sala.SEATS.find(s=>s.id==="loungeSideA"))')
        page.wait_for_function('__sala.mode==="seat" && __sala.DISCO.player.pose==="sofa" && __sala.DISCO.player.root.visible')
        page.evaluate('__drawSala(__sala.scene,__sala.camera)')
        page.screenshot(path=AQUI + '/saida/terceira-pessoa-' + nome + '.png')
        page.evaluate('__sala.standUp()')
        page.wait_for_function('__sala.mode==="fp"')
        if not mobile:
            page.keyboard.press('KeyV')
            assert page.evaluate('!__sala.VIEW.third && localStorage.getItem("sala-view")==="1"')
            page.wait_for_function('!__sala.DISCO.player.root.visible && __sala.HOSP.rig.visible')
            page.keyboard.press('KeyV')
            assert page.evaluate('__sala.VIEW.third && localStorage.getItem("sala-view")==="3"')
        page.click('#viewToggle')
        page.wait_for_function('!__sala.VIEW.third && !__sala.DISCO.player.root.visible')
        print(nome + ': terceira pessoa OK', flush=True)

        # Spotify: link inválido avisa; link válido abre o player oficial, para a música local e segue tocando ao fechar.
        assert page.evaluate('''__sala.spotifyEmbedUrl("https://open.spotify.com/intl-pt/playlist/37i9dQZF1DXcBWIGoYBM5M?si=x")==="https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator"
            && __sala.spotifyEmbedUrl("spotify:album:1DFixLWuPkv3KT3TnV35m3").includes("/embed/album/")
            && !__sala.spotifyEmbedUrl("https://evil.example/playlist/37i9dQZF1DXcBWIGoYBM5M")
            && !__sala.spotifyEmbedUrl("javascript:alert(1)")''')
        page.evaluate('__sala.openMusic()')
        page.click('#musicPlay')
        page.wait_for_function('__sala.MUSIC.playing')
        page.fill('#spotifyUrl', 'qualquer coisa')
        page.click('#spotifyLoad')
        assert 'Cole um link do Spotify' in page.inner_text('#musicMsg') and page.evaluate('__sala.MUSIC.playing')
        page.fill('#spotifyUrl', 'https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M')
        page.click('#spotifyLoad')
        assert page.evaluate('!__sala.MUSIC.playing && __sala.RADIO.on && document.getElementById("radioMute").checked && document.querySelector("#spotifyBox iframe").src.startsWith("https://open.spotify.com/embed/playlist/")')
        assert page.locator('#spotifyDock').is_visible()
        page.click('#musicClose')
        in_view = page.evaluate('(()=>{const r=document.getElementById("spotifyDock").getBoundingClientRect();return r.right>0 && r.left<innerWidth})()')
        assert in_view == (not mobile), in_view
        assert page.evaluate('!!document.querySelector("#spotifyBox iframe") && localStorage.getItem("sala-spotify").includes("37i9dQZF1DXcBWIGoYBM5M")')
        if not mobile:
            page.click('#spotifyMin')
            assert page.evaluate('document.getElementById("spotifyDock").classList.contains("min") && !!document.querySelector("#spotifyBox iframe")')
            page.click('#spotifyMin')
            page.click('#spotifyClose')
        else:
            page.evaluate('__sala.openMusic()')
            assert page.locator('#spotifyDock').evaluate('e=>{const r=e.getBoundingClientRect();return r.left>=0 && r.right<=innerWidth}')
            page.click('#spotifyClose')
            page.click('#musicClose')
        assert page.evaluate('!document.querySelector("#spotifyBox iframe") && !__sala.SPOTIFY.url') and not page.locator('#spotifyDock').is_visible()
        page.evaluate('__sala.openMusic()'); page.click('#musicStop'); page.click('#musicClose')
        assert page.evaluate('!__sala.RADIO.on && !__sala.MUSIC.playing')
        print(nome + ': Spotify OK', flush=True)

        # Quem muda de andar aparece direto no outro andar para os demais visitantes.
        if not mobile:
            other = context.new_page()
            other.on('pageerror', lambda e: errors.append(str(e)))
            other.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
            other.wait_for_function('!!window.__sala', timeout=120000)
            other.evaluate('__sala.setFP(0,2,0)')
            page.bring_to_front()
            page.evaluate('__sala.setFP(5,-4.8,0)')
            other.bring_to_front()
            other.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.A && __sala.floorAt(v.x,v.z)==="office")', timeout=90000)
            page.bring_to_front()
            page.evaluate('__sala.rideTo("games")')
            page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="games"', timeout=30000)
            other.bring_to_front()
            other.wait_for_function('[...__sala.MP.vis.values()].some(v=>__sala.floorAt(v.tx,v.tz)==="games")', timeout=30000)
            assert other.evaluate('[...__sala.MP.vis.values()].every(v=>__sala.floorAt(v.x,v.z)===__sala.floorAt(v.tx,v.tz))')
            print(nome + ': visitante troca de andar sem atravessar paredes OK', flush=True)

            # Rádio da sala: quem liga ou troca a estação muda para todos, no mesmo compasso.
            page.bring_to_front()
            page.evaluate('__sala.openMusic()')
            page.select_option('#musicStyle', 'electro'); page.click('#musicPlay')
            other.bring_to_front()
            other.wait_for_function('__sala.RADIO.on && __sala.RADIO.station==="electro" && __sala.MUSIC.radio && __sala.MUSIC.timer!==null', timeout=30000)
            assert other.evaluate('document.getElementById("musicStyle").value')=='electro'
            page.bring_to_front(); page.select_option('#musicStyle', 'lounge')
            other.bring_to_front(); other.wait_for_function('__sala.RADIO.station==="lounge"', timeout=30000)
            beats = [x.evaluate('Math.floor(Date.now()/430)') for x in (page, other)]
            assert abs(beats[0] - beats[1]) <= 3, beats
            other.evaluate('__sala.openMusic()'); other.check('#radioMute')
            assert other.evaluate('__sala.RADIO.on && !__sala.MUSIC.radio && !__sala.MUSIC.playing')
            other.uncheck('#radioMute'); other.click('#musicClose')
            page.bring_to_front(); page.click('#musicStop')
            other.bring_to_front(); other.wait_for_function('!__sala.RADIO.on && !__sala.MUSIC.radio', timeout=30000)
            page.bring_to_front(); page.click('#musicClose')
            print(nome + ': rádio da sala para todos OK', flush=True)
            other.close()
            page.bring_to_front()

        page.evaluate('__sala.openElevator()')
        page.evaluate('__sala.leaveRoom()')
        page.wait_for_function('__sala.mode==="orbit"', timeout=30000)
        assert not page.locator('#elevator').is_visible() and not page.locator('#elevRide').is_visible()
        assert not errors, errors
        print(nome.upper() + ': TUDO OK', flush=True)
        context.close()
    browser.close()
