/* Durante a entrada, baixa o interior (andar 40, elevador e personagem) em segundo plano. O progresso aparece
   na tela de entrada e, ao entrar, a cabine já está pronta. */
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';
import { modeloAndar } from '../mundo/andares';
import { precarregar } from './carregar';
import type { Preset } from './qualidade';

export function Precarregar({ preset }: { preset: Preset }) {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    precarregar('modelos/elevador.glb', gl);
    precarregar(preset.jogador, gl);
    precarregar(modeloAndar(40, preset.posProcessamento === 'completo'), gl);
  }, [gl, preset]);
  return null;
}
