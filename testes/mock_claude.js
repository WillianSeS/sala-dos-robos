(() => {
  const now = Date.now();
  let me = {};
  const fake = { peer: 'p2', by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, updatedAt: now,
    presence: { v: 1, n: 'Ana Souza', a: 1, x: -2.2, z: 1.6, yaw: 1.2, m: 'w', sy: 0, msg: { id: 'm1', t: now, s: 'Oi pessoal! Que vista de Nova York!' } } };
  const room = {
    presence: async p => { me = Object.assign({}, me, p); window.__myPresence = me; },
    peers: () => [{ peer: 'p1', by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, updatedAt: now, presence: me }, fake],
    onPeers: (fn) => { setTimeout(() => fn({ peers: room.peers(), joined: room.peers(), left: [], updated: [] }), 10); return () => {}; },
    on: () => () => {}, emit: async () => {}, connected: () => true,
  };
  const store = { 'chat/c0': { n: 'Bruno', s: 'Bem-vindos à Sala dos Robôs', t: now - 60000 } };
  const docRef = path => ({ get: async () => ({ exists: !!store[path], data: () => store[path] }), set: async d => { store[path] = d; window.__dbWrites = (window.__dbWrites || 0) + 1; } });
  const coll = name => ({
    doc: id => docRef(name + '/' + id),
    orderBy: () => ({ limit: () => ({
      onSnapshot: next => { setTimeout(() => next({ docs: Object.keys(store).filter(k => k.startsWith(name + '/')).map(k => ({ id: k.split('/')[1], data: () => store[k] })) }), 20); return () => {}; },
      get: async () => ({ docs: Object.keys(store).filter(k => k.startsWith(name + '/')).map(k => ({ id: k.split('/')[1], data: () => store[k] })) }) }) }),
  });
  const db = { doc: docRef, collection: coll };
  const sample = async (turns, opts) => { window.__sampleTurns = turns; const t = 'Opa! Tá corrido aqui, mas sempre tem tempo pra um papo. Tudo simulado, viu?'; await new Promise(r => setTimeout(r, 200)); opts && opts.onText && opts.onText({ text: t, delta: t }); return { text: t, truncated: false, modelTierApplied: 'quick' }; };
  window.claude = { use: async n => n === 'room' ? room : n === 'db' ? db : n === 'sample' ? sample : null };
})();
