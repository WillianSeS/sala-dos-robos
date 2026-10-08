"""Valida figurinos, poses, confete e início atômico da dança oferecida."""
import os
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

os.makedirs(AQUI + '/saida', exist_ok=True)
with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in (False, True):
        print('Abrindo ' + ('celular, movimento reduzido' if mobile else 'desktop'), flush=True)
        context = browser.new_context(
            viewport={'width': 390 if mobile else 960, 'height': 760},
            is_mobile=mobile, has_touch=mobile,
            reduced_motion='reduce' if mobile else 'no-preference')
        context.route('**/*', rota)
        context.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        context.add_init_script(path=AQUI + '/fake_supabase.js')
        context.add_init_script('Object.defineProperty(window,"__sala",{configurable:true,set(v){v.renderer.render=()=>{};v.renderer.shadowMap.enabled=false;v.renderer.setPixelRatio(.35);Object.defineProperty(window,"__sala",{value:v,writable:true,configurable:true})}})')
        context.add_init_script('Object.defineProperty(navigator,"hardwareConcurrency",{get:()=>2});HTMLCanvasElement.prototype.requestPointerLock=()=>Promise.resolve()')
        errors = []

        def open_page(name):
            page = context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            page.goto(URL + 'index.html#debug', wait_until='domcontentloaded', timeout=120000)
            page.wait_for_function('!!window.__sala', timeout=120000)
            page.fill('#nick', name)
            return page

        A = open_page('Coreografia A')
        assert A.evaluate('''() => {
            let confetti; __sala.scene.traverse(o => { if(o.isInstancedMesh && o.count===160 && o.geometry.type==='PlaneGeometry' && o.userData.floor==='show') confetti=o; });
            if(!confetti) return false;
            const m=new __sala.THREE.Matrix4();
            for(let i=0;i<confetti.count;i++) { confetti.getMatrixAt(i,m); if(m.determinant()!==0) return false; }
            window.testConfetti=confetti; return true;
        }'''), 'Confete precisa começar invisível antes do primeiro show'
        A.evaluate('__sala.enterRoom()')
        A.wait_for_function('__sala.mode==="fp"', timeout=60000)
        A.evaluate('__sala.setFP(0,17,Math.PI)')
        A.wait_for_function('__sala.SHOW.dancers.length===3 && __sala.SHOW.dancers.every(d=>d.P.isAvatar && d.P.costume)', timeout=90000)
        assert A.evaluate('''() => {
            const V=__sala.THREE.Vector3;
            return __sala.SHOW.dancers.every((d,i) => {
                const A=d.P, parts=A.costume.parts;
                if(parts.length!==4 || parts.some(p=>!p || !p.parent.isBone)) return false;
                if(parts.map(p=>p.parent.name).join(',')!=='Bip01_Head,Bip01_Neck,Bip01_Pelvis,Bip01_Pelvis') return false;
                A.root.updateMatrixWorld(true);
                const scale=parts[1].getWorldScale(new V());
                if(Math.abs(scale.x-1.15)>.01 || Math.abs(scale.y-.85)>.01 || Math.abs(scale.z-1)>.01) return false;
                const count=A.root.getObjectByProperty('uuid',parts[0].uuid).children.length;
                __sala.dressShowgirl(A,i);
                return A.costume.parts===parts && parts[0].children.length===count;
            });
        }'''), 'Figurino precisa acompanhar os ossos e preservar a escala oval da estola'
        print('Figurinos e vínculo aos ossos OK', flush=True)
        pose_result = A.evaluate('''() => {
            const A=__sala.SHOW.dancers[0].P;
            A.pose='stand'; A.update(0,100);
            const baseline=A.danceBones.map(b=>b?.quaternion.clone());
            for(const style of ['groove','disco','party','showgirl']) {
                A.pose='dance'; A.danceStyle=style; A.dancePhase=0; A.update(0,7.6);
                if(!A.danceRest || !A.danceBones.some((b,i)=>b && b.quaternion.angleTo(baseline[i])>.05)) return {style,error:'no pose change'};
                if(A.danceBones.some(b=>b && !b.quaternion.toArray().every(Number.isFinite))) return {style,error:'nonfinite quaternion'};
                A.pose='stand'; A.update(0,100);
                if(A.danceRest || A.root.children[0].position.distanceTo(A.sceneRest.p)>1e-8 || A.root.children[0].quaternion.angleTo(A.sceneRest.q)>1e-7) return {style,error:'scene not restored',p:A.root.children[0].position.toArray(),rest:A.sceneRest.p.toArray(),angle:A.root.children[0].quaternion.angleTo(A.sceneRest.q)};
                /* Os clipes têm quaternions float32 levemente não unitários; angleTo presume norma 1.
                   Compare os coeficientes restaurados diretamente, com tolerância mais estrita. */
                const changed=A.danceBones.map((b,i)=>b ? {name:b.name,delta:Math.max(...b.quaternion.toArray().map((v,k)=>Math.abs(v-baseline[i].toArray()[k])))} : null).filter(v=>v && v.delta>1e-8);
                if(changed.length) return {style,error:'bones not restored',changed};
            }
            const p=__sala.dancePose;
            return p('showgirl',15.99,.35).turn===0 && p('showgirl',16.01,.35).turn===0 && p('showgirl',15.5,1).turn>4;
        }''')
        assert pose_result is True, pose_result
        print('Quatro coreografias e restauração da pose OK', flush=True)
        assert A.evaluate('''() => {
            const C=window.testConfetti, M=new __sala.THREE.Matrix4(), v=new __sala.THREE.Vector3();
            __sala.stepShow(12,8);
            __sala.confettiBurst(40); __sala.stepShow(0,8);
            let count=0;
            for(let i=0;i<C.count;i++) { C.getMatrixAt(i,M); if(Math.abs(M.determinant())>.5) { count++; v.setFromMatrixPosition(M); if(v.y<2.9 || v.y>3.31 || v.z<19.1 || v.z>21.86) return false; } }
            if(count!==40) return false;
            __sala.stepShow(12,8);
            for(let i=0;i<C.count;i++) { C.getMatrixAt(i,M); if(M.determinant()!==0) return false; }
            return true;
        }'''), 'Confete precisa aparecer sobre o palco e desaparecer depois de cair'
        print('Confete com início, queda e fim OK', flush=True)
        # Outra atendente cruza a posição do visitante: o convite deve dar um passo curto
        # para um espaço livre e iniciar as duas danças, sem deixar só a atendente dançando.
        A.evaluate('''() => {
            const s=__sala, [h,other]=s.SHOW.hosts;
            s.closeWelcome();s.setFP(0,15.6,Math.PI);s.SHOW.voice=false;
            h.P.root.position.set(-1,0,15.6);
            other.P.root.position.set(-.4,0,15.4);other.state='wander';other.path=[];other.wait=100;
            s.openOffer(h);
        }''')
        assert A.evaluate('__sala.blocked(0,15.6) && !__sala.roomBlocked(0,15.6)')
        A.click('#hostDance')
        assert A.evaluate('''() => {
            const s=__sala,h=s.SHOW.hosts[0];
            return s.DISCO.dancing && s.mode==='dance' && h.state==='dance' && h.P.pose==='dance'
                && !s.SHOW.offer && document.getElementById('hostOffer').hidden
                && s.inShow(s.fp.pos.x,s.fp.pos.z) && !s.blocked(s.fp.pos.x,s.fp.pos.z)
                && Math.hypot(h.P.root.position.x-s.SHOW.hosts[1].P.root.position.x,h.P.root.position.z-s.SHOW.hosts[1].P.root.position.z)>.499
                && Math.abs(Math.hypot(s.fp.pos.x,s.fp.pos.z-15.6)-.65)<1e-8;
        }'''), 'Convite ocupado precisa encontrar espaço próximo e iniciar visitante e atendente'
        A.evaluate('''() => {
            const s=__sala,[h,other]=s.SHOW.hosts;s.stopDance();s.setFP(0,15.6,Math.PI);
            h.P.root.position.set(-1,0,15.6);h.P.pose='stand';other.P.root.position.set(2.4,0,19.6);
            other.state='wander';other.path=[];other.wait=100;s.openOffer(h);
        }''')
        A.click('#hostDance')
        assert A.evaluate('__sala.DISCO.dancing && __sala.SHOW.hosts[0].state==="dance" && __sala.fp.pos.x===0 && __sala.fp.pos.z===15.6')
        # Preenche os pontos próximos com NPCs reais dentro de uma única chamada síncrona.
        # O teste não substitui blocked/startDance e restaura todos os NPCs ao terminar.
        no_space = A.evaluate('''() => {
            const s=__sala,[h,other]=s.SHOW.hosts;s.stopDance();s.setFP(0,15.6,Math.PI);
            h.P.root.position.set(-1,0,15.6);h.P.pose='stand';other.P.root.position.set(2.4,0,19.6);
            other.state='wander';other.path=[];other.wait=100;s.openOffer(h);
            const spots=[[0,15.6],...Array.from({length:8},(_,i)=>[Math.cos(i*Math.PI/4)*.65,15.6+Math.sin(i*Math.PI/4)*.65])];
            const saved=s.robots.map(r=>r.P.root.position.clone());
            try {
                spots.forEach(([x,z],i)=>s.robots[i].P.root.position.set(x,0,z));
                if(!spots.every(([x,z])=>s.blocked(x,z))) return {error:'fixture has free spot'};
                const accepted=s.offerDance();
                return {accepted,mode:s.mode,dancing:s.DISCO.dancing,offer:s.SHOW.offer===h,state:h.state,pose:h.P.pose,
                    visible:!document.getElementById('hostOffer').hidden,line:document.getElementById('hostLine').textContent};
            } finally {saved.forEach((p,i)=>s.robots[i].P.root.position.copy(p));}
        }''')
        assert no_space.get('accepted') is False and no_space['mode'] == 'fp' and no_space['dancing'] is False, no_space
        assert no_space['offer'] and no_space['state'] == 'offer' and no_space['pose'] != 'dance' and no_space['visible'], no_space
        assert 'espaço livre' in no_space['line'], no_space
        A.evaluate('__sala.closeOffer();__sala.SHOW.nextOffer=performance.now()/1000+100')
        print('Convite normal, ocupado e sem espaço: estados consistentes OK', flush=True)
        A.evaluate("__sala.setFP(0,9,Math.PI);document.querySelector('#discoStyle').value='showgirl';__sala.startDance()")
        A.wait_for_function('__sala.DISCO.player?.isAvatar && __sala.DISCO.player.danceStyle==="showgirl"', timeout=90000)
        assert A.evaluate('__sala.DISCO.player.danceStyle==="showgirl" && __sala.myPresence().ds==="showgirl" && __sala.myPresence().m==="d"')
        A.evaluate('__sala.stopDance()')
        assert A.evaluate('__sala.mode==="fp" && !__sala.DISCO.dancing')
        assert not errors, errors
        print(('CELULAR' if mobile else 'DESKTOP') + ': TUDO OK', flush=True)
        context.close()
    browser.close()
