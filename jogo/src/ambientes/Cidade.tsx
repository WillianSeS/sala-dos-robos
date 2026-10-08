/* Cidade noturna: prédios instanciados com janelas acesas calculadas no shader (sem textura), ruas com luz
   âmbar, céu em degradê e estrelas. Dentro do prédio a rua fica bem abaixo do piso (o 40º andar está a 164 m);
   na fachada, a frente da torre fica livre para a câmera e a praça. */
import { useMemo } from 'react';
import * as THREE from 'three';

/** Altura das janelas acesas: a grade é calculada a partir da rua (y local 0). */
const RUA = 0;

function aleatorio(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const vertPredio = /* glsl */ `
  varying vec3 vMundo;
  varying vec3 vNormal;
  varying float vSemente;
  void main() {
    vec4 m = modelMatrix * instanceMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
    vSemente = fract(sin(dot(instanceMatrix[3].xz, vec2(12.9898, 78.233))) * 43758.5453);
    gl_Position = projectionMatrix * viewMatrix * m;
  }
`;

const fragPredio = /* glsl */ `
  uniform vec3 uNevoa;
  uniform float uDensidade;
  varying vec3 vMundo;
  varying vec3 vNormal;
  varying float vSemente;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec3 n = normalize(vNormal);
    vec3 fachada = mix(vec3(0.018, 0.022, 0.035), vec3(0.03, 0.028, 0.04), vSemente);
    vec3 cor = fachada * (0.6 + 0.4 * max(n.y, 0.0));
    if (n.y < 0.5) {
      float u = (abs(n.x) > 0.5 ? vMundo.z : vMundo.x) / 3.1;
      float v = (vMundo.y - ${RUA.toFixed(1)}) / 3.5;
      vec2 cel = floor(vec2(u, v));
      vec2 f = fract(vec2(u, v));
      float janela = step(0.16, f.x) * step(f.x, 0.84) * step(0.22, f.y) * step(f.y, 0.86);
      float h = hash(cel + vSemente * 91.0);
      float acesa = step(0.52 - vSemente * 0.25, h);
      vec3 quente = vec3(1.0, 0.72, 0.42);
      vec3 fria = vec3(0.62, 0.78, 1.0);
      vec3 luz = mix(quente, fria, step(0.82, hash(cel * 1.73 + 3.0)));
      cor += janela * acesa * luz * (0.35 + 0.9 * hash(cel * 3.1));
      cor += janela * (1.0 - acesa) * vec3(0.015, 0.02, 0.035);
    } else {
      cor += vec3(0.9, 0.05, 0.05) * step(0.985, hash(floor(vMundo.xz / 6.0)));
    }
    float d = length(vMundo - cameraPosition);
    float nevoa = 1.0 - exp(-d * uDensidade);
    gl_FragColor = vec4(mix(cor, uNevoa, nevoa), 1.0);
    #include <colorspace_fragment>
  }
`;

const fragRua = /* glsl */ `
  uniform vec3 uNevoa;
  uniform float uDensidade;
  varying vec3 vMundo;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 g = vMundo.xz / 80.0;
    vec2 f = abs(fract(g) - 0.5);
    float rua = smoothstep(0.035, 0.0, min(f.x, f.y) - 0.0);
    vec2 p = vMundo.xz / 9.0;
    float poste = step(0.93, hash(floor(p))) * rua;
    vec3 cor = vec3(0.012, 0.012, 0.018) + rua * vec3(0.55, 0.32, 0.12) * 0.55 + poste * vec3(1.0, 0.65, 0.3);
    float d = length(vMundo - cameraPosition);
    gl_FragColor = vec4(mix(cor, uNevoa, 1.0 - exp(-d * uDensidade)), 1.0);
    #include <colorspace_fragment>
  }
`;

const vertSimples = /* glsl */ `
  varying vec3 vMundo;
  void main() {
    vec4 m = modelMatrix * vec4(position, 1.0);
    vMundo = m.xyz;
    gl_Position = projectionMatrix * viewMatrix * m;
  }
`;

const fragCeu = /* glsl */ `
  varying vec3 vMundo;
  void main() {
    vec3 d = normalize(vMundo - cameraPosition);
    float h = clamp(d.y, -0.2, 1.0);
    vec3 topo = vec3(0.008, 0.01, 0.03);
    vec3 meio = vec3(0.05, 0.03, 0.11);
    vec3 horizonte = vec3(0.32, 0.14, 0.24);
    vec3 cor = mix(horizonte, meio, smoothstep(-0.05, 0.12, h));
    cor = mix(cor, topo, smoothstep(0.12, 0.6, h));
    gl_FragColor = vec4(cor, 1.0);
    #include <colorspace_fragment>
  }
`;

export function Cidade({ quantidade, distancia, chao = -164, frenteLivre = false }: { quantidade: number; distancia: number; chao?: number; frenteLivre?: boolean }) {
  const nevoa = useMemo(() => new THREE.Color('#2a1530'), []);
  const densidade = 1.6 / distancia;

  const { geo, matPredio, matRua, matCeu, estrelas } = useMemo(() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const uniforms = { uNevoa: { value: nevoa }, uDensidade: { value: densidade } };
    const matPredio = new THREE.ShaderMaterial({ vertexShader: vertPredio, fragmentShader: fragPredio, uniforms });
    const matRua = new THREE.ShaderMaterial({ vertexShader: vertSimples, fragmentShader: fragRua, uniforms });
    const matCeu = new THREE.ShaderMaterial({ vertexShader: vertSimples, fragmentShader: fragCeu, side: THREE.BackSide, depthWrite: false });
    const r = aleatorio(77);
    const pts: number[] = [];
    for (let i = 0; i < 700; i++) {
      const a = r() * Math.PI * 2;
      const e = 0.08 + r() * 1.3;
      pts.push(Math.cos(a) * Math.cos(e) * 2400, Math.sin(e) * 2400, Math.sin(a) * Math.cos(e) * 2400);
    }
    const estrelas = new THREE.BufferGeometry();
    estrelas.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return { geo, matPredio, matRua, matCeu, estrelas };
  }, [nevoa, densidade]);

  const predios = useMemo(() => {
    const r = aleatorio(2026);
    const lista: { x: number; z: number; w: number; d: number; h: number }[] = [];
    let tentativas = 0;
    while (lista.length < quantidade && tentativas < quantidade * 20) {
      tentativas++;
      // quarteirões de 80 m com ruas; mais prédios ao norte, onde fica a janela
      const norte = r() < 0.72;
      const x = (r() - 0.5) * distancia * 1.6;
      const z = norte ? -60 - r() * distancia : (r() - 0.5) * distancia * 1.6;
      if (Math.hypot(x, z) < 70) continue;
      // na fachada: rua, praça e o caminho da câmera (frente da torre) sem prédios
      if (frenteLivre && z > 18 && z < 260 && Math.abs(x) < z * 1.1 + 70) continue;
      const qx = ((x % 80) + 80) % 80;
      const qz = ((z % 80) + 80) % 80;
      if (qx < 14 || qz < 14) continue;
      const w = 14 + r() * 26;
      const d = 14 + r() * 26;
      const perto = Math.hypot(x, z) < 400;
      const h = 30 + Math.pow(r(), 1.6) * (perto ? 240 : 320);
      lista.push({ x, z, w, d, h });
    }
    return lista;
  }, [quantidade, distancia, frenteLivre]);

  const instancias = useMemo(() => {
    const mesh = new THREE.InstancedMesh(geo, matPredio, predios.length);
    const m = new THREE.Matrix4();
    predios.forEach((p, i) => {
      m.compose(new THREE.Vector3(p.x, RUA, p.z), new THREE.Quaternion(), new THREE.Vector3(p.w, p.h, p.d));
      mesh.setMatrixAt(i, m);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.frustumCulled = false;
    return mesh;
  }, [geo, matPredio, predios]);

  return (
    <group position={[0, chao, 0]}>
      <mesh material={matCeu} renderOrder={-10}>
        <sphereGeometry args={[2600, 32, 16]} />
      </mesh>
      <points geometry={estrelas}>
        <pointsMaterial color="#cfd6ff" size={2.2} sizeAttenuation={false} fog={false} />
      </points>
      <primitive object={instancias} />
      <mesh material={matRua} rotation={[-Math.PI / 2, 0, 0]} position={[0, RUA, 0]}>
        <planeGeometry args={[distancia * 3, distancia * 3]} />
      </mesh>
    </group>
  );
}
