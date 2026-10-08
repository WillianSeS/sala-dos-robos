/* Luz ambiente e reflexos.
   1) HDRI noturno (Poly Haven, CC0) como ambiente inicial;
   2) assim que a sala carrega, um CubeCamera fotografa a própria sala (paredes, janela, cidade, luzes) e esse
      mapa vira o ambiente: o mármore passa a refletir a sala de verdade, não um lugar qualquer. */
import { useLoader, useThree } from '@react-three/fiber';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EXRLoader } from 'three/addons/loaders/EXRLoader.js';
import { useJogo } from '../estado/jogo';
import { caminho } from './carregar';

export const SEM_REFLEXO = 'semReflexo';

export function Ambiente({ resolucao, intensidade }: { resolucao: number; intensidade: number }) {
  const { gl, scene } = useThree();
  const hdri = useLoader(EXRLoader, caminho('hdri/night.exr'));
  const versaoCena = useJogo((s) => s.versaoCena);
  const envHdri = useRef<THREE.Texture | null>(null);

  useEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    hdri.mapping = THREE.EquirectangularReflectionMapping;
    const env = pmrem.fromEquirectangular(hdri).texture;
    pmrem.dispose();
    envHdri.current = env;
    if (!scene.userData.reflexoCapturado) {
      scene.environment = env;
      scene.environmentIntensity = intensidade;
    }
    return () => {
      if (scene.environment === env) scene.environment = null;
      envHdri.current = null;
      env.dispose();
    };
  }, [gl, scene, hdri, intensidade]);

  useEffect(() => {
    if (!versaoCena) return;
    let cancelado = false;
    let env: THREE.Texture | null = null;
    // espera dois quadros para os modelos da qualidade atual estarem na cena
    const id = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (cancelado) return;
        const rt = new THREE.WebGLCubeRenderTarget(resolucao, { type: THREE.HalfFloatType });
        const cubo = new THREE.CubeCamera(0.05, 3000, rt);
        cubo.position.set(0, 1.55, 0);
        const ocultos: THREE.Object3D[] = [];
        scene.traverse((o) => {
          if (o.userData[SEM_REFLEXO] && o.visible) {
            o.visible = false;
            ocultos.push(o);
          }
        });
        cubo.update(gl, scene);
        for (const o of ocultos) o.visible = true;
        const pmrem = new THREE.PMREMGenerator(gl);
        env = pmrem.fromCubemap(rt.texture).texture;
        pmrem.dispose();
        rt.dispose();
        scene.environment = env;
        scene.environmentIntensity = intensidade * 1.6;
        scene.userData.reflexoCapturado = true;
      }),
    );
    return () => {
      cancelado = true;
      cancelAnimationFrame(id);
      if (env) {
        if (scene.environment === env) {
          scene.environment = envHdri.current;
          scene.environmentIntensity = intensidade;
        }
        env.dispose();
      }
      scene.userData.reflexoCapturado = false;
    };
  }, [versaoCena, gl, scene, resolucao, intensidade]);

  return null;
}
