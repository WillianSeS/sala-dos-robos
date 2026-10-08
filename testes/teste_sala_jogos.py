"""Confere separação física, jogos, caminhos dos robôs e presença na sala anexa."""
import os
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota
os.makedirs(AQUI + '/saida', exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in (False, True):
        context = browser.new_context(viewport={'width':390 if mobile else 960,'height':760}, is_mobile=mobile, has_touch=mobile)
        context.route('**/*', rota)
        context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        context.add_init_script(path=AQUI + '/fake_supabase.js')
        context.add_init_script('Object.defineProperty(window,"__sala",{configurable:true,set(value){window.__drawSala=value.renderer.render.bind(value.renderer);value.renderer.render=()=>{};value.renderer.shadowMap.enabled=false;value.renderer.setPixelRatio(.35);value.renderer.setSize(innerWidth,innerHeight,false);Object.defineProperty(window,"__sala",{value,writable:true,configurable:true})}})')
        context.add_init_script('Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2});HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve()')
        errors=[]
        page=context.new_page(); page.on('pageerror',lambda e:errors.append(str(e)))
        page.goto(URL+'index.html#debug',wait_until='domcontentloaded');page.wait_for_function('!!window.__sala')
        page.evaluate('__sala.enterRoom()');page.wait_for_function('__sala.mode==="fp"')
        page.click('#gamesGo');page.wait_for_function('__sala.mode==="fp" && __sala.inGames(__sala.fp.pos.x,__sala.fp.pos.z)')
        assert page.evaluate('__sala.blocked(5.5,6) && __sala.blocked(7,6) && __sala.blocked(4,8) && __sala.blocked(12,9) && __sala.blocked(8,14) && !__sala.blocked(5.5,8)')
        assert page.evaluate('__sala.POOL.cx===8 && __sala.POOL.cz===9.4 && __sala.robots.filter(r=>r.spot==="poolShoot").every(r=>r.P.root.position.z>6)')
        page.evaluate('__drawSala(__sala.scene,__sala.camera)');page.screenshot(path=AQUI+'/saida/jogos-'+('mobile' if mobile else 'desktop')+'.png')
        page.evaluate('__sala.setFP(8,10.8,Math.PI)');page.wait_for_function('__sala.act==="Jogar 21 com os robôs"');page.evaluate('__sala.doAct()');assert page.evaluate('__sala.mode==="casino"');page.click('#casinoDeal');assert page.evaluate('__sala.CASINO.you.length===2');page.click('#casinoClose')
        page.evaluate('__sala.setFP(8,7.9,Math.PI)');page.wait_for_function('__sala.act==="Jogar sinuca"');page.evaluate('__sala.doAct()');assert page.evaluate('__sala.POOL.active && __sala.balls.every(b=>Math.abs(b.x-8)<1.3 && Math.abs(b.z-9.4)<.7)');page.evaluate('__sala.exitPool()')
        page.evaluate('window.walker=__sala.robots.find(r=>r.mode==="seated"); if(walker.trade)__sala.closeTrade(walker); __sala.SPOTS.poolWait.busy=null; __sala.goBreak(walker,"poolWait")')
        assert page.evaluate('walker.path.some(p=>p.elev==="office") && walker.path.some(p=>p.elev==="games")')
        if not mobile:
            other=context.new_page();other.goto(URL+'index.html#debug',wait_until='domcontentloaded');other.wait_for_function('!!window.__sala');other.evaluate('__sala.setFP(10.5,11,0)');page.bring_to_front();page.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.tx>10 && v.tz>10)',timeout=30000);other.close()
        page.evaluate('__sala.setFP(8,7.4,0)');page.click('#gamesBack');page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="office"');assert not errors,errors
        print(('CELULAR' if mobile else 'DESKTOP')+': sala, paredes, 21, sinuca, rotas e retorno OK',flush=True)
        context.close()
    browser.close()
