"""Bebidas na mão, atendimento andando, geladeira, lounge e presença compartilhada."""
import os
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

os.makedirs(AQUI + '/saida', exist_ok=True)


def screenshot(page, name):
    page.evaluate('__drawSala(__sala.scene,__sala.camera)')
    page.screenshot(path=AQUI + '/saida/' + name + '.png')


def panel_fits(page, selector):
    return page.locator(selector).evaluate('''el => {
        const r=el.getBoundingClientRect();
        return r.left>=0 && r.right<=innerWidth+1 && r.top>=0 && r.bottom<=innerHeight+1;
    }''')


def advance_service(page, rounds=1):
    """Avança a caminhada sem saltar posições ou ignorar paredes; o único salto permitido é o elevador."""
    return page.evaluate('''rounds => {
        const s=__sala, t=performance.now()/1000;
        let moved=0, carried=0, rides=0;
        for(let i=0;i<rounds;i++) {
            const before=s.STAFF.members.map(m=>m.P.root.position.clone());
            s.stepStaff(.25,t+i*.25);
            s.STAFF.members.forEach((m,j)=>{
                const p=m.P.root.position, delta=p.distanceTo(before[j]);
                const riding=m.elevWait>0, atDoor=s.FLOORS.some(f=>Math.hypot(p.x-f.x,p.z-f.z)<.05);
                if(delta>1.25*.25+.001) { if(!riding || !atDoor || m.P.root.visible) throw Error('O atendimento saltou uma posição'); rides++; }
                else moved+=delta;
                if(s.roomBlocked(p.x,p.z,.22)) throw Error('O atendimento atravessou um móvel ou parede');
                if(m.state==='serving' && !riding) {
                    if(!m.tray.visible || !m.item || m.item.parent!==m.tray) throw Error('Pedido sem bandeja');
                    const hand=m.leftHand || m.P.J.lWr;
                    if(hand) {
                        const v=new s.THREE.Vector3();hand.getWorldPosition(v);
                        if(m.tray.position.distanceTo(v)>.08) throw Error('Bandeja distante da mão');
                    }
                    carried++;
                }
            });
        }
        return {moved,carried,rides};
    }''', rounds)


def realistic_smoking(page):
    """Bocal na mão real, braço erguido e pose estável, sem beber ao mesmo tempo."""
    result = page.evaluate('''() => {
        const s=__sala, P=s.robots.find(r=>r.P.isAvatar).P, t=performance.now()/1000;
        const oldPose=P.pose, hand=new s.THREE.Vector3(), head=new s.THREE.Vector3();
        const distance=()=>{P.J.rWr.getWorldPosition(hand);P.J.head.getWorldPosition(head);return hand.distanceTo(head)};
        P.pose='stand';P.speed=0;P.smokingUntil=0;
        s.setPersonItem(P,'water',0);P.update(0,t);const resting=distance();
        P.smokingUntil=t+3;P.update(0,t);const smoking=distance();
        const first=hand.clone(), attached=P.smokeRig.parent===P.root;
        const visible=P.smokeRig.visible, drinkHidden=!P.heldProp.visible;
        let drift=0;
        for(let i=0;i<20;i++){P.update(0,t);distance();drift=Math.max(drift,hand.distanceTo(first))}
        P.smokingUntil=0;P.update(0,t);
        const stopped=!P.smokeRig.visible && P.heldProp.visible;
        s.disposePersonItem(P);P.pose=oldPose;
        return {resting,smoking,attached,visible,drinkHidden,drift,stopped};
    }''')
    assert result['attached'] and result['visible'] and result['drinkHidden'] and result['stopped'], result
    assert result['smoking'] < result['resting'] - .08 and result['smoking'] < .35, result
    assert result['drift'] < .015, result
    print('Smoking realista: mão próxima à boca, bebida guardada e 20 quadros estáveis OK', flush=True)


def shared_smoking(context, page, errors):
    other = context.new_page()
    other.on('pageerror', lambda e: errors.append(str(e)))
    other.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
    other.wait_for_function('!!window.__sala && __sala.AV.ready', timeout=60000)
    other.evaluate('__sala.setFP(10.5,17,0)')
    page.bring_to_front()
    page.evaluate('__sala.setFP(6.5,16.65,Math.PI);__sala.deliverConsumable("water")')
    other.bring_to_front()
    other.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.item==="water" && v.tz>16 && v.A?.heldProp)', timeout=30000)
    page.bring_to_front()
    page.evaluate('__sala.startSmoking()')
    other.bring_to_front()
    other.wait_for_function('''[...__sala.MP.vis.values()].some(v=>
        v.tz>16 && v.hookIndex===0 && v.smokingUntil>performance.now()/1000 &&
        v.A?.smokeRig?.visible && v.A.smokeRig.parent===v.A.root && !v.A.heldProp.visible)''', timeout=5000)
    page.bring_to_front()
    page.evaluate('__sala.stopSmoking()')
    other.bring_to_front()
    other.wait_for_function('''[...__sala.MP.vis.values()].some(v=>
        v.tz>16 && v.item==="water" && !v.smokingUntil &&
        v.A?.smokeRig && !v.A.smokeRig.visible && v.A.heldProp.visible)''', timeout=5000)
    page.bring_to_front()
    page.evaluate('__sala.sitDown(__sala.SEATS.find(s=>s.id==="loungeSideA"))')
    page.wait_for_function('__sala.mode==="seat"')
    assert page.evaluate('__sala.SPOTS.lounge1.busy==="player"')
    page.evaluate('__sala.leaveRoom()')
    page.wait_for_function('__sala.mode==="orbit"')
    assert page.evaluate('!__sala.HOSP.item && !__sala.HOSP.smokingUntil && !__sala.HOSP.prop && __sala.SPOTS.lounge1.busy!=="player"')
    other.close()
    print('Smoking compartilhado: bocal na mão do visitante, parada e limpeza OK', flush=True)


with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in ((False,) if os.environ.get('HOSP_SMOKE_ONLY') else (False, True)):
        suffix = 'mobile' if mobile else 'desktop'
        context = browser.new_context(
            viewport={'width': 390 if mobile else 960, 'height': 760},
            is_mobile=mobile, has_touch=mobile)
        context.route('**/*', rota)
        context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        context.add_init_script(path=AQUI + '/fake_supabase.js')
        context.add_init_script('Object.defineProperty(window,"__sala",{configurable:true,set(value){window.__drawSala=value.renderer.render.bind(value.renderer);value.renderer.render=()=>{};value.renderer.shadowMap.enabled=false;value.renderer.setPixelRatio(.35);value.renderer.setSize(innerWidth,innerHeight,false);Object.defineProperty(window,"__sala",{value,writable:true,configurable:true})}})')
        context.add_init_script('Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2});HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve()')
        errors = []
        page = context.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
        try:
            page.wait_for_function('!!window.__sala', timeout=60000)
        except Exception:
            print('Falha ao abrir a sala:', errors, flush=True)
            raise
        print(suffix + ': sala carregada', flush=True)
        page.evaluate('__sala.enterRoom()')
        page.wait_for_function('__sala.mode==="fp"')
        page.wait_for_function('__sala.AV.ready && __sala.STAFF.members.every(m=>m.P.isAvatar)', timeout=60000)
        assert page.evaluate('__sala.STAFF.members.some(m=>m.role==="garçom") && __sala.STAFF.members.some(m=>m.role==="garçonete" && m.P.file.includes("Female"))')
        realistic_smoking(page)
        if os.environ.get('HOSP_SMOKE_ONLY'):
            shared_smoking(context, page, errors)
            assert not errors, errors
            context.close()
            continue

        # O pedido começa longe da copa: conferimos trajeto e bandeja antes de voltar para receber.
        page.evaluate('__sala.setFP(0,5.5,0)')
        page.click('#menuOpen')
        assert page.evaluate('__sala.mode==="menu"')
        assert page.locator('#menuItems [data-item]').count() == 9
        assert panel_fits(page, '#hospitalityMenu')
        page.click('#menuItems [data-item="soda"]')
        assert page.evaluate('__sala.STAFF.order.itemId==="soda" && __sala.mode==="fp"')
        advance_service(page, 4)
        assert page.evaluate('__sala.STAFF.order.member.state==="serving" && __sala.STAFF.order.member.path.length>0')
        journey = advance_service(page, 8)
        assert journey['moved'] > .3 and journey['carried'] > 0, journey
        print(suffix + ': atendimento em movimento com bandeja', flush=True)
        screenshot(page, 'atendimento-' + suffix)
        page.evaluate('__sala.setFP(6.2,3.1,-Math.PI/2)')
        for _ in range(60):
            if page.evaluate('!__sala.STAFF.order'):
                break
            advance_service(page, 4)
        assert page.evaluate('__sala.HOSP.item==="soda" && __sala.HOSP.portions===4 && __sala.HOSP.prop.parent===__sala.HOSP.rig && __sala.STAFF.orders.at(-1).status==="delivered"')
        page.wait_for_function('!document.getElementById("heldBar").hidden')
        page.click('#consumeBtn')
        assert page.evaluate('__sala.HOSP.portions===3 && __sala.HOSP.consumeUntil>performance.now()/1000')
        page.evaluate('__sala.consumeHeld()')
        assert page.evaluate('__sala.HOSP.portions===3'), 'Consumir outra vez durante a animação duplicou o gole'
        page.wait_for_function('document.getElementById("consumeBtn").disabled')
        page.wait_for_function('__sala.HOSP.consumeUntil<=performance.now()/1000')
        page.wait_for_function('!document.getElementById("consumeBtn").disabled')
        assert page.evaluate('__sala.HOSP.item==="soda" && __sala.HOSP.rig.visible')

        # A mesma bebida acompanha a mão do esqueleto realista e chega perto da boca.
        motion = page.evaluate('''() => {
            const s=__sala, P=s.robots.find(r=>r.P.isAvatar).P, t=performance.now()/1000;
            const measure=()=>{const a=new s.THREE.Vector3(),b=new s.THREE.Vector3();
                P.heldProp.getWorldPosition(a);P.J.head.getWorldPosition(b);return a.distanceTo(b)};
            const pose=P.pose;P.pose='stand';P.speed=0;
            s.setPersonItem(P,'juice',0);P.update(.016,t);const resting=measure();
            s.setPersonItem(P,'juice',t+1.2);P.update(.016,t);const drinking=measure();
            const lift=P.heldProp.userData.lift, attached=P.heldProp.parent===P.root;
            s.disposePersonItem(P);P.pose=pose;
            return {resting,drinking,lift,attached,removed:!P.heldProp};
        }''')
        assert motion['attached'] and motion['removed'] and motion['lift'] > .9, motion
        assert motion['drinking'] < motion['resting'] - .08, motion
        shapes = page.evaluate('''() => Object.keys(__sala.CONSUMABLES).map(id=>{
            const prop=__sala.makeConsumableProp(id);let meshes=0;
            prop.traverse(o=>{if(o.isMesh)meshes++});return {id,meshes};
        })''')
        assert all(item['meshes'] > 1 for item in shapes), shapes
        print(suffix + ': copo animado no avatar realista', flush=True)

        # A geladeira serve só os produtos guardados nela, mantendo o item na mão ao fechar.
        page.evaluate('__sala.setFP(6.65,5.5,-Math.PI/2)')
        page.wait_for_function('__sala.act==="Pegar bebida ou comida na geladeira"')
        page.evaluate('__sala.doAct()')
        assert page.locator('#menuItems [data-item]').count() == 7
        assert page.locator('#menuItems [data-item="coffee"],#menuItems [data-item="pizza"]').count() == 0
        page.click('#menuItems [data-item="water"]')
        assert page.evaluate('__sala.mode==="fp" && __sala.FRIDGE.open && __sala.HOSP.item==="water"')
        page.evaluate('__sala.openHospitality("fridge")')
        page.click('#menuItems [data-item="sandwich"]')
        assert page.evaluate('__sala.HOSP.item==="sandwich" && __sala.HOSP.portions===3')
        page.click('#consumeBtn')
        assert page.evaluate('__sala.HOSP.portions===2 && __sala.HOSP.consumeUntil>performance.now()/1000')
        page.evaluate('__sala.openHospitality("fridge")')
        page.click('#fridgeClose')
        assert page.evaluate('__sala.mode==="fp" && !__sala.FRIDGE.open && __sala.HOSP.item==="sandwich"')
        print(suffix + ': bebidas e comida na geladeira', flush=True)

        # Andar próprio (só pelo elevador), narguilé, música e cardápio quando sentado.
        page.click('#loungeGo')
        page.wait_for_function('__sala.mode==="fp" && __sala.inLounge(__sala.fp.pos.x,__sala.fp.pos.z)')
        assert page.evaluate('__sala.roomBlocked(10.5,14) && __sala.roomBlocked(8,14) && __sala.roomBlocked(12,18) && __sala.roomBlocked(8,22)')
        # O painel do lounge começa fechado e abre pelo botão 💨.
        assert not page.locator('#loungePanel').is_visible()
        page.click('#loungePanelOpen')
        assert panel_fits(page, '#loungePanel')
        page.evaluate('__sala.setFP(6.5,16.65,Math.PI)')
        page.wait_for_function('!document.getElementById("loungeSmoke").disabled')
        page.click('#loungeSmoke')
        page.wait_for_function('__sala.HOSP.smokingUntil>performance.now()/1000 && __sala.HOSP.smokeProp && __sala.LOUNGE_VISUAL.smoke[0].group.visible')
        assert page.evaluate('__sala.HOSP.hookIndex===0 && __sala.HOSP.smokeProp.visible')
        screenshot(page, 'lounge-' + suffix)
        page.evaluate('__sala.stopSmoking();__sala.sitDown(__sala.SEATS.find(s=>s.id==="loungeSideB"))')
        page.wait_for_function('__sala.mode==="seat"')
        page.evaluate('__sala.startSmoking()')
        page.click('#loungeMusic')
        assert page.evaluate('__sala.mode==="music" && __sala.HOSP.smokingUntil>performance.now()/1000 && __sala.HOSP.item==="sandwich"')
        page.click('#musicPlay')
        assert page.evaluate('__sala.MUSIC.playing')
        page.click('#musicClose')
        assert page.evaluate('__sala.mode==="seat" && __sala.HOSP.item==="sandwich"')
        page.evaluate('__sala.stopSmoking()')
        page.click('#loungeMenu')
        page.keyboard.press('Escape')
        assert page.evaluate('__sala.mode==="seat" && document.getElementById("hospitalityMenu").hidden')
        page.evaluate('__sala.standUp()')
        page.wait_for_function('__sala.mode==="fp"')
        assert page.evaluate('__sala.SPOTS.lounge1.busy!=="player" && __sala.SPOTS.lounge2.busy!=="player"')

        page.evaluate('for(const r of __sala.robots)if(r.mode==="seated" && r.trade)__sala.closeTrade(r)')
        page.click('#loungeInvite')
        invited = page.evaluate('__sala.robots.filter(r=>r.spot?.startsWith("lounge")).map(r=>({id:r.id,elevator:r.path.some(q=>q.elev==="lounge")}))')
        assert invited and all(r['elevator'] for r in invited), invited
        page.evaluate('__sala.fast(60)')
        assert page.evaluate('__sala.robots.some(r=>r.spot?.startsWith("lounge") && r.mode==="lounge" && r.P.root.position.z>16)')
        print(suffix + ': lounge, narguilé, música e convidados', flush=True)

        if not mobile:
            other = context.new_page()
            other.on('pageerror', lambda e: errors.append(str(e)))
            other.goto(URL + 'index.html#debug', wait_until='domcontentloaded')
            other.wait_for_function('!!window.__sala && __sala.AV.ready', timeout=60000)
            other.evaluate('__sala.setFP(10.8,17,0)')
            page.bring_to_front()
            page.evaluate('__sala.setFP(10.5,17,0);__sala.deliverConsumable("soda")')
            other.bring_to_front()
            other.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.tx>10 && v.tz>14 && v.item==="soda" && v.A?.heldProp)', timeout=30000)
            page.bring_to_front()
            page.evaluate('__sala.consumeHeld()')
            other.bring_to_front()
            other.wait_for_function('[...__sala.MP.vis.values()].some(v=>v.tx>10 && v.tz>14 && v.item==="soda" && v.consumeUntil>performance.now()/1000 && v.A?.heldProp?.userData.consuming)', timeout=10000)
            page.evaluate('''() => {
                window.badPresence=new BroadcastChannel('fake-sb');
                badPresence.postMessage({t:'pres',key:'invalid-item',state:{v:1,n:'Teste inválido',a:0,x:0,z:0,m:'w',it:'__proto__',ct:Date.now()+60000,hs:0,ht:Date.now()+5000}});
            }''')
            other.wait_for_function('__sala.MP.vis.has("invalid-item")')
            assert other.evaluate('(()=>{const v=__sala.MP.vis.get("invalid-item");return v.item==="" && !v.consumeUntil && !v.smokingUntil})()')
            page.evaluate('badPresence.postMessage({t:"leave",key:"invalid-item"});badPresence.close()')
            other.close()
            page.bring_to_front()

            shared_smoking(context, page, errors)
            page.evaluate('__sala.setFP(10.5,17,0)')

        # O segundo pedido usa Sofia, pode ser cancelado e não deixa item preso à bandeja.
        page.evaluate('__sala.stopSmoking();__sala.exitLounge()')
        page.wait_for_function('__sala.mode==="fp" && __sala.playerFloor()==="games"')
        advance_service(page, 100)
        page.click('#menuOpen')
        page.click('#menuItems [data-item="juice"]')
        assert page.evaluate('__sala.STAFF.order.member.role==="garçonete"')
        advance_service(page, 4)
        assert page.evaluate('__sala.STAFF.order.member.state==="serving" && __sala.STAFF.order.member.P.isAvatar')
        waitress_journey = advance_service(page, 4)
        assert waitress_journey['moved'] > .3 and waitress_journey['carried'] > 0, waitress_journey
        page.click('#menuOpen')
        page.click('#serviceCancel')
        assert page.evaluate('!__sala.STAFF.order && __sala.STAFF.orders.at(-1).status==="cancelled" && __sala.STAFF.members.every(m=>!m.tray.visible && !m.item)')
        page.keyboard.press('Escape')
        page.evaluate('__sala.deliverConsumable("water");__sala.requestService("pizza");__sala.leaveRoom()')
        page.wait_for_function('__sala.mode==="orbit"')
        assert page.evaluate('!__sala.HOSP.item && !__sala.HOSP.prop && !__sala.HOSP.smokingUntil && !__sala.STAFF.order && __sala.STAFF.members.every(m=>!m.tray.visible)')
        assert not errors, errors
        print(('CELULAR' if mobile else 'DESKTOP') + ': cardápio, atendimento, mãos, geladeira, lounge, música e limpeza OK', flush=True)
        context.close()
    browser.close()
print('TUDO OK', flush=True)
