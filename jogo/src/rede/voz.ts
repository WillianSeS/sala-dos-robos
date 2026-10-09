/* Voz ao vivo (opcional): WebRTC direto entre quem entrou na voz, sinalizado pelo canal do Supabase.
   Som posicional (sai do avatar de quem fala). Só liga o microfone quando a pessoa aperta o botão. */
import { aoSinalRtc, enviarRtc, registrarVoz, useSala } from './sala';

const RTC = { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }] };
interface Par {
  id: string;
  pc: RTCPeerConnection;
  t0: number;
  ok: boolean;
  el?: HTMLAudioElement;
  pan?: PannerNode;
  an?: AnalyserNode;
  fala: number;
}
const V = {
  ligada: false,
  ocupada: false,
  stream: null as MediaStream | null,
  ctx: null as AudioContext | null,
  pares: new Map<string, Par>(),
  tentar: new Map<string, number>(),
  buf: new Uint8Array(512),
  checagem: 0,
};
registrarVoz(() => V.ligada);
export const vozSuportada = () => typeof RTCPeerConnection !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
const agora = () => performance.now() / 1000;

function largar(id: string) {
  const P = V.pares.get(id);
  if (!P) return;
  V.pares.delete(id);
  try {
    P.pc.close();
  } catch {
    /* já fechado */
  }
  if (P.el) P.el.srcObject = null;
  P.pan?.disconnect();
}

function novoPar(id: string) {
  largar(id);
  const pc = new RTCPeerConnection(RTC);
  const P: Par = { id, pc, t0: agora(), ok: false, fala: 0 };
  V.pares.set(id, P);
  for (const tr of V.stream?.getAudioTracks() ?? []) pc.addTrack(tr, V.stream!);
  pc.ontrack = (e) => {
    if (P.pan || !V.ctx) return;
    const s = e.streams[0] ?? new MediaStream([e.track]);
    // o Chrome só entrega o áudio da chamada ao WebAudio com um elemento de áudio tocando (mudo)
    P.el = new Audio();
    P.el.muted = true;
    P.el.srcObject = s;
    void P.el.play().catch(() => undefined);
    const src = V.ctx.createMediaStreamSource(s);
    const pan = V.ctx.createPanner();
    pan.panningModel = 'HRTF';
    pan.distanceModel = 'inverse';
    pan.refDistance = 2.5;
    pan.rolloffFactor = 0.5;
    P.pan = pan;
    P.an = V.ctx.createAnalyser();
    P.an.fftSize = 512;
    src.connect(pan);
    pan.connect(V.ctx.destination);
    src.connect(P.an);
  };
  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'connected') P.ok = true;
    if (pc.connectionState === 'failed' && V.pares.get(id) === P) {
      largar(id);
      V.tentar.set(id, agora() + 10);
    }
  };
  return P;
}

const iceCompleto = (pc: RTCPeerConnection) =>
  new Promise<void>((res) => {
    if (pc.iceGatheringState === 'complete') return res();
    const fim = () => {
      clearTimeout(tm);
      pc.removeEventListener('icegatheringstatechange', chk);
      res();
    };
    const chk = () => pc.iceGatheringState === 'complete' && fim();
    const tm = setTimeout(fim, 2500);
    pc.addEventListener('icegatheringstatechange', chk);
  });

async function ligarPara(id: string) {
  const P = novoPar(id);
  try {
    await P.pc.setLocalDescription(await P.pc.createOffer());
    await iceCompleto(P.pc);
    if (V.pares.get(id) === P) enviarRtc(id, { k: 'offer', sdp: P.pc.localDescription?.sdp });
  } catch {
    if (V.pares.get(id) === P) largar(id);
  }
}

aoSinalRtc(async (m) => {
  const eu = useSala.getState().eu;
  const de = String(m.from ?? '');
  if (m.to !== eu || !de || de === eu) return;
  if (m.k === 'bye') {
    largar(de);
    V.tentar.set(de, agora() + 8);
    return;
  }
  if (!V.ligada) {
    if (m.k === 'offer') enviarRtc(de, { k: 'bye' });
    return;
  }
  if (m.k === 'offer') {
    const P = novoPar(de);
    try {
      await P.pc.setRemoteDescription({ type: 'offer', sdp: String(m.sdp) });
      await P.pc.setLocalDescription(await P.pc.createAnswer());
      await iceCompleto(P.pc);
      if (V.pares.get(de) === P) enviarRtc(de, { k: 'answer', sdp: P.pc.localDescription?.sdp });
    } catch {
      if (V.pares.get(de) === P) largar(de);
    }
  } else if (m.k === 'answer') {
    const P = V.pares.get(de);
    if (P && P.pc.signalingState === 'have-local-offer')
      await P.pc.setRemoteDescription({ type: 'answer', sdp: String(m.sdp) }).catch(() => largar(de));
  }
});

/** Liga o microfone e entra na voz. Devolve uma mensagem para a interface. */
export async function entrarNaVoz(): Promise<string> {
  if (V.ligada || V.ocupada) return '';
  if (!vozSuportada()) return 'Este navegador não tem chamada de voz.';
  V.ocupada = true;
  try {
    V.ctx ??= new AudioContext();
    if (V.ctx.state !== 'running') void V.ctx.resume().catch(() => undefined);
    V.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    V.ligada = true;
    V.tentar.clear();
    return 'Voz ligada: quem também estiver na voz ouve você.';
  } catch (e) {
    const n = (e as Error)?.name;
    return n === 'NotAllowedError' || n === 'SecurityError' ? 'Microfone bloqueado pelo navegador.' : 'Nenhum microfone encontrado.';
  } finally {
    V.ocupada = false;
  }
}

export function sairDaVoz() {
  if (!V.ligada) return;
  for (const id of [...V.pares.keys()]) {
    enviarRtc(id, { k: 'bye' });
    largar(id);
  }
  for (const t of V.stream?.getTracks() ?? []) t.stop();
  V.stream = null;
  V.ligada = false;
  useSala.setState({ falando: {} });
}

export const estadoVoz = () => ({ ligada: V.ligada, conectados: [...V.pares.values()].filter((p) => p.ok).map((p) => p.id) });

function nivel(an: AnalyserNode) {
  an.getByteTimeDomainData(V.buf);
  let s = 0;
  for (const b of V.buf) s += ((b - 128) / 128) ** 2;
  return Math.sqrt(s / V.buf.length);
}

/** A cada quadro: ouvinte na câmera, cada voz no avatar de quem fala, chama quem também entrou na voz. */
export function passoVoz(cam: { x: number; y: number; z: number; fx: number; fy: number; fz: number }) {
  if (!V.ligada || !V.ctx) return;
  const L = V.ctx.listener;
  if (L.positionX) {
    L.positionX.value = cam.x;
    L.positionY.value = cam.y;
    L.positionZ.value = cam.z;
    L.forwardX.value = cam.fx;
    L.forwardY.value = cam.fy;
    L.forwardZ.value = cam.fz;
  }
  const s = useSala.getState();
  const t = agora();
  let mudou = false;
  const falando: Record<string, boolean> = {};
  for (const P of V.pares.values()) {
    const p = s.pessoas[P.id];
    if (P.pan && p && P.pan.positionX) {
      P.pan.positionX.value = Number(p.x) || 0;
      P.pan.positionY.value = (Number(p.y) || 0) + 1.6;
      P.pan.positionZ.value = Number(p.z) || 0;
    }
    if (P.an && nivel(P.an) > 0.01) P.fala = t + 0.35;
    falando[P.id] = t < P.fala;
    if (falando[P.id] !== !!s.falando[P.id]) mudou = true;
  }
  if (mudou) useSala.setState({ falando });
  if (t - V.checagem < 1) return;
  V.checagem = t;
  for (const [id, p] of Object.entries(s.pessoas)) {
    const P = V.pares.get(id);
    if (!p.vc) {
      if (P && t - P.t0 > 6) largar(id);
      continue;
    }
    if (s.eu > id) continue; // quem tem o código menor chama
    if (!P) {
      if (t > (V.tentar.get(id) ?? 0)) void ligarPara(id);
    } else if (!P.ok && t - P.t0 > 15) {
      largar(id);
      V.tentar.set(id, t + 10);
    }
  }
  for (const [id, P] of [...V.pares]) if (!s.pessoas[id] && t - P.t0 > 6) largar(id);
}
