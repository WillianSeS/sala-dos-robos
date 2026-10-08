"""Verifica recuperação gráfica em desktop e celular sem depender do Supabase real."""
from playwright.sync_api import sync_playwright
from comum import AQUI, URL, ARGS, rota

NO_DRAW = """Object.defineProperty(window,'__sala',{configurable:true,set(value){
  value.renderer.render=()=>{};
  value.renderer.shadowMap.enabled=false;
  value.renderer.setPixelRatio(.35);
  value.renderer.setSize(innerWidth,innerHeight,false);
  Object.defineProperty(window,'__sala',{value,writable:true,configurable:true});
}})"""

with sync_playwright() as p:
    browser = p.chromium.launch(args=ARGS)
    for mobile in (False, True):
        ctx = browser.new_context(viewport={'width': 390 if mobile else 1100, 'height': 760},
                                  is_mobile=mobile, has_touch=mobile)
        ctx.route('**/*', rota)
        ctx.route('https://fonts.googleapis.com/**', lambda r: r.fulfill(body='', content_type='text/css'))
        ctx.add_init_script(path=AQUI + '/fake_supabase.js')
        ctx.add_init_script(NO_DRAW)
        page = ctx.new_page()
        page.goto(URL + 'index.html#debug', wait_until='domcontentloaded', timeout=120000)
        page.wait_for_function('!!window.__sala', timeout=120000)
        result = page.evaluate("""() => {
          const s=window.__sala, proto=s.THREE.PMREMGenerator.prototype;
          const old=proto.fromScene, pos=s.scene.position.clone(), env=s.scene.environment;
          s.scene.position.set(7,3,2);
          proto.fromScene=()=>{throw new Error('Falha de GPU simulada');};
          let survived=true;
          try{s.captureEnv();}catch(e){survived=false;}
          const restored=s.scene.position.distanceTo(new s.THREE.Vector3(7,3,2))<.001;
          const unchanged=s.scene.environment===env;
          proto.fromScene=old;s.scene.position.copy(pos);
          return {survived,restored,unchanged};
        }""")
        assert all(result.values()), result
        lost = page.evaluate("""() => {
          const canvas=document.getElementById('gl'), notice=document.getElementById('gpuNotice');
          const event=new Event('webglcontextlost',{cancelable:true});
          canvas.dispatchEvent(event);
          return {prevented:event.defaultPrevented,shown:!notice.hidden,
                  retry:!!document.getElementById('gpuReload')};
        }""")
        assert all(lost.values()), lost
        print(('CELULAR' if mobile else 'DESKTOP') + ': recuperação e aviso OK')
        ctx.close()
    browser.close()
