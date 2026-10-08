/* Pós-processamento por preset. Econômico: nenhum (tone mapping do próprio renderer).
   Equilibrado: brilho das luzes (bloom). Ultra: oclusão de ambiente (N8AO), bloom, SMAA e vinheta. */
import { Bloom, EffectComposer, N8AO, SMAA, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import type { Preset } from './qualidade';

export function Efeitos({ preset }: { preset: Preset }) {
  if (preset.posProcessamento === 'nenhum') return null;
  if (preset.posProcessamento === 'brilho') {
    return (
      <EffectComposer multisampling={4}>
        <Bloom intensity={0.55} luminanceThreshold={0.9} luminanceSmoothing={0.2} mipmapBlur />
        <ToneMapping mode={ToneMappingMode.AGX} />
      </EffectComposer>
    );
  }
  return (
    <EffectComposer multisampling={0}>
      <N8AO aoRadius={0.6} intensity={1.6} distanceFalloff={0.6} quality="medium" halfRes />
      <Bloom intensity={0.7} luminanceThreshold={0.85} luminanceSmoothing={0.25} mipmapBlur />
      <ToneMapping mode={ToneMappingMode.AGX} />
      <SMAA />
      <Vignette offset={0.3} darkness={0.45} />
    </EffectComposer>
  );
}
