import { useEffect, useRef } from 'react';
import { useMouse, useTeclado } from './controles/entrada';
import { detectarToque, useToqueOlhar } from './controles/toque';
import { useJogo } from './estado/jogo';
import { Cena } from './motor/Cena';
import { Carregando } from './ui/Carregando';
import { ControlesToque } from './ui/ControlesToque';
import { Hud } from './ui/Hud';
import { Paineis } from './ui/Paineis';

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
      <Carregando />
    </main>
  );
}
