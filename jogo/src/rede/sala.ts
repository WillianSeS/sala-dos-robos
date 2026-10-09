/* Multiplayer (Fase 7): presença e posição em tempo real, chat com histórico e ranking da sinuca no Supabase.
   Usa só a chave publicável (feita para ficar no navegador); o banco tem RLS e valida tamanhos, e o ranking
   só muda pela função record_pool_result. Contagem de pessoas = presença real no canal, nunca inventada. */
import type { RealtimeChannel, SupabaseClient, createClient } from '@supabase/supabase-js';
import { create } from 'zustand';
import { useJogo } from '../estado/jogo';
import { useJogos } from '../jogos/estado';
import { modoTeste, telemetria } from '../testes/telemetria';
import { criarLimite, moderar, nomeSeguro } from './moderacao';

const SUPA = { url: 'https://qhedllguoknhotovycqf.supabase.co', chave: 'sb_publishable_fotrkTfePY0ULUN6pJjWaA_AD7dtdN9' };
/** Mesmo canal do jogo antigo: o chat é compartilhado; avatares só aparecem entre versões iguais (v). */
const CANAL = 'sala-dos-robos';
export const VERSAO = 2;
export const VISUAIS = ['Male_Adult_02', 'Female_Adult_02', 'Male_Adult_10', 'Female_Adult_09'];

export interface Presenca {
  v: number;
  n: string;
  a: number;
  andar: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  /** w andando/parado · s sentado · d dançando */
  m: 'w' | 's' | 'd';
  ds?: string | null;
  it?: string | null;
  vc?: 0 | 1;
}
export interface Mensagem {
  id: string;
  de: string;
  nome: string;
  texto: string;
  t: number;
  minha?: boolean;
}
type Status = 'desligado' | 'conectando' | 'online' | 'offline';

const SILENCIO = 'sala-dos-robos:silenciados:v1';
const lerSilenciados = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SILENCIO) ?? '[]');
  } catch {
    return [];
  }
};

interface EstadoSala {
  status: Status;
  eu: string;
  /** Outras pessoas no canal (chave = id da presença). */
  pessoas: Record<string, Partial<Presenca> & { nome: string }>;
  chat: Mensagem[];
  naoLidas: number;
  chatAberto: boolean;
  silenciados: string[];
  falando: Record<string, boolean>;
  aviso: string;
  setChatAberto: (b: boolean) => void;
  silenciar: (nome: string, sim: boolean) => void;
}

export const useSala = create<EstadoSala>((set, get) => ({
  status: 'desligado',
  eu: Math.random().toString(36).slice(2, 10),
  pessoas: {},
  chat: [],
  naoLidas: 0,
  chatAberto: false,
  silenciados: lerSilenciados(),
  falando: {},
  aviso: '',
  setChatAberto: (b) => set({ chatAberto: b, naoLidas: b ? 0 : get().naoLidas }),
  silenciar: (nome, sim) => {
    const l = new Set(get().silenciados);
    if (sim) l.add(nome);
    else l.delete(nome);
    const silenciados = [...l];
    try {
      localStorage.setItem(SILENCIO, JSON.stringify(silenciados));
    } catch {
      /* sem armazenamento */
    }
    set({ silenciados, chat: get().chat.filter((m) => m.minha || !silenciados.includes(m.nome)) });
  },
}));

if (modoTeste && typeof window !== 'undefined') Object.assign((window as unknown as { __jogo: object }).__jogo ?? {}, { sala: useSala });

/** Total de pessoas conectadas agora (você incluído) — só quando a conexão é real. */
export const totalOnline = (s: EstadoSala) => (s.status === 'online' ? Object.keys(s.pessoas).length + 1 : 0);

const rede = {
  sb: null as SupabaseClient | null,
  canal: null as RealtimeChannel | null,
  entrou: false,
  minha: {} as Partial<Presenca>,
  ultimaChave: '',
  ultimoTrack: 0,
  timerTrack: 0 as ReturnType<typeof setTimeout> | 0,
  intervalo: 0.2,
  aoRtc: null as null | ((m: Record<string, unknown>) => void),
};
const visto = new Set<string>();
const podeEnviar = criarLimite();

function addMensagem(m: Mensagem) {
  if (!m.id || visto.has(m.id)) return;
  visto.add(m.id);
  const s = useSala.getState();
  if (!m.minha && s.silenciados.includes(m.nome)) return;
  const chat = [...s.chat, m].sort((a, b) => a.t - b.t).slice(-60);
  useSala.setState({ chat, naoLidas: s.chatAberto || m.minha ? s.naoLidas : s.naoLidas + 1 });
}

type Fabrica = typeof createClient;
const fabrica = async (): Promise<Fabrica | null> => {
  const falso = (window as unknown as { __fakeSupabase?: { createClient: Fabrica } }).__fakeSupabase;
  if (falso) return falso.createClient;
  // Nos testes automáticos sem servidor falso não abre rede (o ambiente de teste não acessa a internet).
  if (modoTeste || new URLSearchParams(location.search).has('semrede')) return null;
  return (await import('@supabase/supabase-js')).createClient;
};

export async function conectar() {
  if (useSala.getState().status !== 'desligado') return;
  useSala.setState({ status: 'conectando' });
  try {
    const cria = await fabrica();
    if (!cria) {
      useSala.setState({ status: 'desligado' });
      return;
    }
    const sb = cria(SUPA.url, SUPA.chave, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
    rede.sb = sb;
    const eu = useSala.getState().eu;
    const ch = sb.channel(CANAL, { config: { presence: { key: eu }, broadcast: { self: false } } });
    const posicoes = new Map<string, Partial<Presenca>>();
    const montar = () => {
      const pres = ch.presenceState() as Record<string, Partial<Presenca>[]>;
      const pessoas: EstadoSala['pessoas'] = {};
      for (const [k, metas] of Object.entries(pres)) {
        if (k === eu) continue;
        const meta = { ...(metas[metas.length - 1] ?? {}), ...(posicoes.get(k) ?? {}) };
        pessoas[k] = { ...meta, nome: nomeSeguro(String(meta.n ?? 'Visitante')) };
      }
      for (const k of [...posicoes.keys()]) if (!pres[k]) posicoes.delete(k);
      // plano gratuito: ~100 mensagens/s no projeto; quanto mais gente, menos atualizações por pessoa
      const n = Object.keys(pres).length;
      rede.intervalo = Math.max(0.2, (n * n) / 80);
      useSala.setState({ pessoas });
    };
    ch.on('presence', { event: 'sync' }, montar);
    ch.on('broadcast', { event: 'pos' }, ({ payload }) => {
      if (!payload?.id) return;
      posicoes.set(String(payload.id), payload);
      const s = useSala.getState();
      const atual = s.pessoas[payload.id];
      if (atual) useSala.setState({ pessoas: { ...s.pessoas, [payload.id]: { ...atual, ...payload, nome: nomeSeguro(String(payload.n ?? atual.nome)) } } });
    });
    ch.on('broadcast', { event: 'chat' }, ({ payload }) => {
      if (!payload?.id) return;
      addMensagem({ id: String(payload.id), de: String(payload.from ?? ''), nome: nomeSeguro(String(payload.n ?? 'Visitante')), texto: moderar(String(payload.s ?? '')), t: Number(payload.t) || Date.now() });
    });
    ch.on('broadcast', { event: 'rtc' }, ({ payload }) => rede.aoRtc?.(payload));
    rede.canal = ch;
    ch.subscribe((st) => {
      rede.entrou = st === 'SUBSCRIBED';
      if (rede.entrou) {
        rede.ultimoTrack = Date.now();
        void ch.track({ ...rede.minha });
        useSala.setState({ status: 'online', aviso: '' });
      } else if (st === 'CHANNEL_ERROR' || st === 'TIMED_OUT' || st === 'CLOSED') {
        useSala.setState({ status: 'offline', pessoas: {}, aviso: 'Sem conexão com a sala ao vivo agora. O jogo continua normal.' });
      }
    });
    const { data } = await sb.from('chat_messages').select('id,name,body,created_at').order('created_at', { ascending: false }).limit(30);
    for (const m of (data ?? []) as { id: string; name: string; body: string; created_at: string }[])
      addMensagem({ id: m.id, de: '', nome: nomeSeguro(m.name), texto: moderar(m.body), t: Date.parse(m.created_at) });
  } catch {
    useSala.setState({ status: 'offline', aviso: 'Não consegui conectar à sala ao vivo.' });
  }
}

export function desconectar() {
  if (rede.canal && rede.sb) void rede.sb.removeChannel(rede.canal);
  rede.canal = null;
  rede.entrou = false;
  useSala.setState({ status: 'desligado', pessoas: {} });
}

/** Minha presença a partir do estado do jogo (chamado ~5x por segundo; só envia quando muda). */
export function minhaPresenca(): Presenca {
  const j = useJogo.getState();
  const g = useJogos.getState();
  const eu = useSala.getState().eu;
  const sentado = j.sentado;
  return {
    v: VERSAO,
    n: nomeSeguro(j.mostrarNome ? j.nome : 'Visitante'),
    a: parseInt(eu, 36) % VISUAIS.length,
    andar: j.etapa === 'jogo' && j.elevador.fase !== 'viajando' ? j.andar : -1,
    x: +telemetria.grupo.x.toFixed(2),
    y: +telemetria.grupo.y.toFixed(2),
    z: +telemetria.grupo.z.toFixed(2),
    yaw: +telemetria.yawCorpo.toFixed(2),
    m: g.danca ? 'd' : sentado ? 's' : 'w',
    ds: g.danca,
    it: g.naMao,
    vc: vozLigada() ? 1 : 0,
  };
}

let tEnvio = 0;
export function passoRede(dt: number) {
  const ch = rede.canal;
  if (!ch || !rede.entrou) return;
  tEnvio += dt;
  if (tEnvio < rede.intervalo) return;
  tEnvio = 0;
  const p = minhaPresenca();
  const chave = JSON.stringify(p);
  if (chave === rede.ultimaChave) return;
  rede.ultimaChave = chave;
  rede.minha = p;
  // posição rápida por broadcast para quem já está na sala; presença (lenta) para quem chega depois
  if (Object.keys(useSala.getState().pessoas).length) void ch.send({ type: 'broadcast', event: 'pos', payload: { id: useSala.getState().eu, ...p } });
  if (!rede.timerTrack)
    rede.timerTrack = setTimeout(() => {
      rede.timerTrack = 0;
      rede.ultimoTrack = Date.now();
      if (rede.entrou) void ch.track({ ...rede.minha });
    }, Math.max(0, 4000 - (Date.now() - rede.ultimoTrack)));
}

/** Envia uma mensagem no chat (moderada e com limite de ritmo). Devolve um erro curto ou null. */
export function enviarMensagem(texto: string): string | null {
  const s = moderar(texto);
  if (!s) return null;
  if (!podeEnviar(Date.now())) return 'Calma: espere um pouco antes de mandar outra mensagem.';
  const st = useSala.getState();
  const nome = minhaPresenca().n;
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const t = Date.now();
  addMensagem({ id, de: st.eu, nome, texto: s, t, minha: true });
  if (rede.canal && rede.entrou) void rede.canal.send({ type: 'broadcast', event: 'chat', payload: { id, from: st.eu, n: nome, s, t } });
  if (rede.sb) void rede.sb.from('chat_messages').insert({ id, name: nome, body: s }).then(() => undefined, () => undefined);
  return st.status === 'online' ? null : 'Você está fora da sala ao vivo: a mensagem ficou só aqui.';
}

/** Ranking da sinuca (só partidas contra o robô; o banco soma +1 pela função segura). */
export async function registrarSinuca(resultado: 'win' | 'loss' | 'draw'): Promise<string | null> {
  const nome = useJogo.getState().nome.trim();
  if (!rede.sb || !nome) return null;
  try {
    await rede.sb.rpc('record_pool_result', { p_name: nomeSeguro(nome), p_result: resultado });
    const { data } = await rede.sb.from('pool_ranking').select('name,wins').order('wins', { ascending: false }).limit(5);
    if (!data?.length) return null;
    return 'Ranking de vitórias: ' + (data as { name: string; wins: number }[]).map((v) => `${nomeSeguro(v.name).slice(0, 16)} ${v.wins}`).join(' · ');
  } catch {
    return null;
  }
}

/* sinalização da voz (WebRTC) pelo mesmo canal */
export function enviarRtc(para: string, d: Record<string, unknown>) {
  if (rede.canal && rede.entrou) void rede.canal.send({ type: 'broadcast', event: 'rtc', payload: { to: para, from: useSala.getState().eu, ...d } });
}
export function aoSinalRtc(f: (m: Record<string, unknown>) => void) {
  rede.aoRtc = f;
}
let vozAtiva = () => false;
export const vozLigada = () => vozAtiva();
export function registrarVoz(f: () => boolean) {
  vozAtiva = f;
}
