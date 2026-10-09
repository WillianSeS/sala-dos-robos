/* Supabase falso para os testes (o contêiner de teste não acessa a internet): liga as abas do mesmo navegador por
   BroadcastChannel com a mesma interface usada pelo jogo (canal com presença e broadcast, tabelas e rpc). */
export function instalarSupabaseFalso() {
  (window as unknown as { __fakeSupabase: unknown }).__fakeSupabase = {
    createClient: () => {
      const bc = new BroadcastChannel('supabase-falso');
      type H = { tipo: string; ev: string; cb: (x?: unknown) => void };
      const handlers: H[] = [];
      const outros: Record<string, unknown> = {};
      let chave = '';
      let minha: unknown = null;
      const sync = () => handlers.filter((h) => h.tipo === 'presence').forEach((h) => h.cb());
      bc.onmessage = ({ data: d }) => {
        if (d.k === 'track') {
          outros[d.from] = d.obj;
          sync();
        } else if (d.k === 'ola' && minha) bc.postMessage({ k: 'track', from: chave, obj: minha });
        else if (d.k === 'tchau') {
          delete outros[d.from];
          sync();
        } else if (d.k === 'bc') handlers.filter((h) => h.tipo === 'broadcast' && h.ev === d.event).forEach((h) => h.cb({ payload: d.payload }));
      };
      addEventListener('pagehide', () => bc.postMessage({ k: 'tchau', from: chave }));
      const w = window as unknown as { __fakeInserts: unknown[]; __fakeRpc: unknown[] };
      w.__fakeInserts = [];
      w.__fakeRpc = [];
      const consulta = {
        select: () => consulta,
        order: () => consulta,
        limit: () => Promise.resolve({ data: [{ id: 'hist1', name: 'Bia', body: 'mensagem antiga do histórico', created_at: new Date(Date.now() - 60_000).toISOString() }] }),
        insert: (r: unknown) => {
          w.__fakeInserts.push(r);
          return Promise.resolve({});
        },
      };
      return {
        channel: (_: string, o: { config: { presence: { key: string } } }) => {
          chave = o.config.presence.key;
          const ch = {
            on: (tipo: string, f: { event: string }, cb: H['cb']) => {
              handlers.push({ tipo, ev: f.event, cb });
              return ch;
            },
            subscribe: (cb: (s: string) => void) => {
              setTimeout(() => {
                cb('SUBSCRIBED');
                bc.postMessage({ k: 'ola', from: chave });
              }, 30);
              return ch;
            },
            track: (obj: unknown) => {
              minha = obj;
              bc.postMessage({ k: 'track', from: chave, obj });
              sync();
              return Promise.resolve('ok');
            },
            send: (m: { event: string; payload: unknown }) => {
              bc.postMessage({ k: 'bc', from: chave, event: m.event, payload: m.payload });
              return Promise.resolve('ok');
            },
            presenceState: () => {
              const r: Record<string, unknown[]> = {};
              for (const [k, v] of Object.entries(outros)) r[k] = [v];
              if (minha) r[chave] = [minha];
              return r;
            },
          };
          return ch;
        },
        from: () => consulta,
        rpc: (n: string, a: unknown) => {
          w.__fakeRpc.push([n, a]);
          return Promise.resolve({});
        },
        removeChannel: () => Promise.resolve(),
      };
    },
  };
}
