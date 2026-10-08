/* Pele de vidro da torre: as janelas acesas são calculadas no shader a partir da posição no mundo (nítidas a
   qualquer distância), sobre o material PBR do vidro, que continua refletindo o céu e a cidade.
   Grade igual à do predio.py: térreo de 8 m, andares de 4 m, módulos de 1,6 m. */
import * as THREE from 'three';

const DECLARACOES = /* glsl */ `
varying vec3 vPosFachada;
varying vec3 vNormalFachada;
`;

const FUNCOES = /* glsl */ `
float hashF(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
vec3 janelasFachada(vec3 p, vec3 n) {
  if (abs(n.y) > 0.5) return vec3(0.0);
  float u = abs(n.x) > 0.5 ? p.z : p.x;
  float a = (p.y - 8.0) / 4.0;
  float andar = floor(a);
  float fy = fract(a);
  float col = floor(u / 1.6);
  float fx = fract(u / 1.6);
  // montante vertical, peitoril (faixa opaca embaixo) e verga
  float vidro = step(0.07, fx) * step(fx, 0.93) * step(0.24, fy) * step(fy, 0.93);
  float h = hashF(vec2(col, andar) + floor(n.xz * 3.0));
  float acesa = step(0.42 + 0.18 * hashF(vec2(andar, 7.0)), h);
  vec3 quente = vec3(1.0, 0.72, 0.42);
  vec3 fria = vec3(0.68, 0.8, 1.0);
  vec3 luz = mix(quente, fria, step(0.78, hashF(vec2(col * 1.7, andar * 2.3))));
  float forca = 0.3 + 0.7 * hashF(vec2(col * 3.1, andar * 1.3));
  // algumas cortinas meio fechadas e escritórios com o fundo mais claro no meio da janela
  float cortina = step(0.72, hashF(vec2(col * 5.3, andar * 0.7))) * smoothstep(0.58, 0.64, fy);
  float centro = 0.75 + 0.25 * (1.0 - abs(fx - 0.5) * 2.0);
  vec3 apagada = vec3(0.012, 0.016, 0.03) * vidro;
  return apagada + vidro * acesa * luz * forca * centro * (1.0 - 0.75 * cortina);
}
`;

export function fachadaProcedural(mat: THREE.MeshStandardMaterial) {
  mat.map = null;
  mat.emissiveMap = null;
  mat.color.set('#0d1220');
  mat.roughness = 0.12;
  mat.metalness = 0.65;
  mat.emissive.set('#ffffff');
  mat.emissiveIntensity = 1.35;
  mat.envMapIntensity = 1.1;
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DECLARACOES}`)
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>\nvPosFachada = (modelMatrix * vec4(transformed, 1.0)).xyz;\nvNormalFachada = normalize(mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>\n${DECLARACOES}\n${FUNCOES}`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>\ntotalEmissiveRadiance *= janelasFachada(vPosFachada, normalize(vNormalFachada));`);
  };
  mat.customProgramCacheKey = () => 'fachada-janelas-v1';
  mat.needsUpdate = true;
}
