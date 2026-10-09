import { useEffect, useRef } from 'react';
import { useMouse, useTeclado } from './controles/entrada';
import { detectarToque, useToqueOlhar } from './controles/toque';
import { useJogo } from './estado/jogo';
import { Cena } from './motor/Cena';
import { aplicarInicioDaUrl } from './mundo/inicio';
import { Carregando } from './ui/Carregando';
import { ControlesToque } from './ui/ControlesToque';
import { Cortina } from './ui/Cortina';
import { Entrada } from './ui/Entrada';
import { Hud } from './ui/Hud';
import { Paineis } from './ui/Paineis';
import { PainelJogos } from './ui/PainelJogos';
import { BarraDanca } from './ui/BarraDanca';
import { IndicadorOnline } from './ui/PainelConversa';
import { BarraItem, DocaSpotify, PainelCardapio } from './ui/PainelServico';

aplicarInicioDaUrl();

export default function App() {
  const palco = useRef<HTMLDivElement | null>(null);
  useTeclado();
  useMouse(palco);
  useToqueOlhar(palco);
  useEffect(() => {
    if (detectarToque()) useJogo.getState().setToque(true);
  }, []);
  return (
    <main className="jogo">
      <Cena onElemento={(el) => (palco.current = el)} />
      <Hud />
      <ControlesToque />
      <Paineis />
      <PainelJogos />
      <BarraDanca />
      <BarraItem />
      <IndicadorOnline />
      <PainelCardapio />
      <DocaSpotify />
      <audio id="audio-local" loop hidden />
      <Entrada />
      <Cortina />
      <Carregando />
    </main>
  );
}
