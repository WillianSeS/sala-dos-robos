/* Carregamento de GLB com os carregadores oficiais do three.js: Draco, meshopt e KTX2,
   com os decodificadores servidos pelo próprio site (public/libs), sem CDN. */
import { useLoader, useThree } from '@react-three/fiber';
import type { WebGLRenderer } from 'three';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const BASE = import.meta.env.BASE_URL;
export const caminho = (rel: string) => `${BASE}${rel}`;

let draco: DRACOLoader | null = null;
let ktx2: KTX2Loader | null = null;

function configurar(loader: GLTFLoader, gl: WebGLRenderer) {
  if (!draco) draco = new DRACOLoader().setDecoderPath(caminho('libs/draco/'));
  if (!ktx2) ktx2 = new KTX2Loader().setTranscoderPath(caminho('libs/basis/')).detectSupport(gl);
  loader.setDRACOLoader(draco);
  loader.setKTX2Loader(ktx2);
  loader.setMeshoptDecoder(MeshoptDecoder);
}

export function useModelo(rel: string): GLTF {
  const gl = useThree((s) => s.gl);
  return useLoader(GLTFLoader, caminho(rel), (loader) => configurar(loader, gl));
}
