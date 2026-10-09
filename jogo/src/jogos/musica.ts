/* Música: rádio sintetizada no navegador (Web Audio, sem arquivos de terceiros), arquivo do próprio aparelho e o
   player oficial do Spotify por link. Portado do jogo antigo (src/77_leisure.js). */
export type Estacao = 'lofi' | 'lounge' | 'electro';
export const ESTACOES: { id: Estacao; nome: string }[] = [
  { id: 'lofi', nome: 'Lo-fi da madrugada' },
  { id: 'lounge', nome: 'Lounge jazz' },
  { id: 'electro', nome: 'Electro da pista' },
];
export const passoMs = (e: Estacao) => (e === 'electro' ? 260 : e === 'lounge' ? 430 : 520);
const NOTAS: Record<Estacao, number[]> = {
  electro: [48, 55, 60, 63, 48, 58, 55, 63],
  lounge: [60, 64, 67, 71, 62, 65, 69, 72],
  lofi: [48, 60, 63, 67, 53, 60, 65, 67],
};
export const frequencia = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

class Radio {
  ctx: AudioContext | null = null;
  ganho: GainNode | null = null;
  timer: ReturnType<typeof setInterval> | null = null;
  proximo = 0;
  estacao: Estacao = 'lofi';
  volume = 0.35;
  tocando = false;

  ligar(estacao: Estacao) {
    this.estacao = estacao;
    if (!this.ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return false;
      this.ctx = new C();
      this.ganho = this.ctx.createGain();
      this.ganho.connect(this.ctx.destination);
    }
    this.ganho!.gain.value = this.volume;
    void this.ctx.resume();
    if (this.timer) clearInterval(this.timer);
    this.proximo = 0;
    this.timer = setInterval(() => this.tick(), 60);
    this.tocando = true;
    return true;
  }
  desligar() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.tocando = false;
  }
  setVolume(v: number) {
    this.volume = v;
    if (this.ganho && this.ctx) this.ganho.gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  }
  private tick() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running') return;
    const passo = passoMs(this.estacao);
    const agora = Date.now();
    // a batida segue o relógio: todos que ligarem a mesma estação ouvem a mesma nota
    if (!this.proximo || this.proximo * passo < agora - 1000) this.proximo = Math.ceil(agora / passo);
    while (this.proximo * passo < agora + 200) {
      const quando = ctx.currentTime + (this.proximo * passo - agora) / 1000;
      if (quando >= ctx.currentTime) this.nota(this.proximo, quando);
      this.proximo++;
    }
  }
  private nota(k: number, t: number) {
    const ctx = this.ctx!;
    const notas = NOTAS[this.estacao];
    const dur = this.estacao === 'electro' ? 0.22 : 0.65;
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = this.estacao === 'electro' ? 'triangle' : 'sine';
    osc.frequency.value = frequencia(notas[k % notas.length]);
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(0.18, t + 0.025);
    env.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(env);
    env.connect(this.ganho!);
    osc.onended = () => {
      osc.disconnect();
      env.disconnect();
    };
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }
}
export const radio = new Radio();

/** Converte um link do Spotify no endereço do player oficial incorporável (ou '' se não for válido). */
export function linkSpotify(texto: string): string {
  const m = String(texto || '')
    .trim()
    .match(/^(?:https?:\/\/open\.spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?|spotify:)(playlist|album|track|artist|episode|show)[/:]([A-Za-z0-9]{22})(?:[/?#].*)?$/);
  return m ? `https://open.spotify.com/embed/${m[1]}/${m[2]}?utm_source=generator` : '';
}
