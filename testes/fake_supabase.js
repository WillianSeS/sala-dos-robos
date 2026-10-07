/* Supabase falso para teste local: tempo real via BroadcastChannel entre abas, banco em localStorage */
(() => {
  const DBK = 'fake-sb-db';
  const empty = () => ({ chat_messages: [], pool_ranking: [] });
  const load = () => { try { return JSON.parse(localStorage.getItem(DBK)) || empty(); } catch (e) { return empty(); } };
  const save = d => localStorage.setItem(DBK, JSON.stringify(d));
  window.__sbCount = {};
  const cnt = k => { window.__sbCount[k] = (window.__sbCount[k] || 0) + 1; };
  function query(table) {
    let ord = null, lim = null, ins = null;
    const q = {
      select() { return q; },
      order(col, o) { ord = [col, o && o.ascending === false ? -1 : 1]; return q; },
      limit(n) { lim = n; return q; },
      insert(row) { ins = row; return q; },
      then(res, rej) {
        const d = load();
        if (ins) { cnt('insert:' + table); d[table].push(Object.assign({ created_at: new Date().toISOString() }, ins)); save(d); return Promise.resolve({ data: null, error: null }).then(res, rej); }
        let out = d[table].slice();
        if (ord) out.sort((a, b) => (a[ord[0]] > b[ord[0]] ? 1 : a[ord[0]] < b[ord[0]] ? -1 : 0) * ord[1]);
        if (lim != null) out = out.slice(0, lim);
        cnt('select:' + table);
        return Promise.resolve({ data: out, error: null }).then(res, rej);
      },
    };
    return q;
  }
  window.__fakeSupabase = () => {
    const bc = new BroadcastChannel('fake-sb');
    return {
      from: t => query(t),
      rpc(fn, a) {
        cnt('rpc:' + fn); const d = load(), slug = String(a.p_name).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-');
        let r = d.pool_ranking.find(x => x.slug === slug); if (!r) d.pool_ranking.push(r = { slug, name: a.p_name, wins: 0, losses: 0, draws: 0 });
        if (a.p_result === 'win') r.wins++; else if (a.p_result === 'loss') r.losses++; else if (a.p_result === 'draw') r.draws++;
        save(d); return Promise.resolve({ data: null, error: null });
      },
      channel(name, cfg) {
        const key = cfg.config.presence.key, hs = [], pres = {}; let mine = null;
        const fire = (type, ev, arg) => { for (const h of hs) if (h.type === type && h.ev === ev) h.cb(arg); };
        bc.onmessage = e => {
          const m = e.data;
          if (m.t === 'pres') { pres[m.key] = [m.state]; fire('presence', 'sync'); }
          else if (m.t === 'leave') { delete pres[m.key]; fire('presence', 'sync'); }
          else if (m.t === 'hello') { if (mine) bc.postMessage({ t: 'pres', key, state: mine }); }
          else if (m.t === 'bc') { cnt('recv:' + m.event); fire('broadcast', m.event, { type: 'broadcast', event: m.event, payload: m.payload }); }
        };
        addEventListener('pagehide', () => bc.postMessage({ t: 'leave', key }));
        const ch = {
          on(type, f, cb) { hs.push({ type, ev: f.event, cb }); return ch; },
          subscribe(cb) { setTimeout(() => { bc.postMessage({ t: 'hello' }); cb('SUBSCRIBED'); }, 50); return ch; },
          track(st) { cnt('track'); mine = JSON.parse(JSON.stringify(st)); pres[key] = [mine]; bc.postMessage({ t: 'pres', key, state: mine }); fire('presence', 'sync'); return Promise.resolve('ok'); },
          presenceState() { return JSON.parse(JSON.stringify(pres)); },
          send(msg) { cnt('send:' + msg.event); bc.postMessage({ t: 'bc', event: msg.event, payload: JSON.parse(JSON.stringify(msg.payload)) }); return Promise.resolve('ok'); },
        };
        return ch;
      },
    };
  };
})();
