/* ================= clima de festa: fumaça leve e luzes piscando (discoteca e Las Vegas Night) ================= */
/* Fumaça baixa e discreta, tingida pela luz da sala, com um jato da máquina de fumaça de tempos em tempos.
   As luzes piscam no máximo 3 vezes por segundo (sem estrobo); com "reduzir movimento", tudo fica mais lento. */
const hazeTex = canvasTex(128, 128, (g, w, h) => {
  const grad = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  grad.addColorStop(0, 'rgba(255,255,255,0.75)'); grad.addColorStop(0.45, 'rgba(255,255,255,0.28)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
});
const PARTY = {
  rooms: [
    { key: 'disco', x0: -3.4, x1: 3.4, z0: 6.8, z1: 13.2, emitters: [[-2.2, 12.5], [2.2, 12.5]], walls: [[-3.92, 6.4, 13.6], [3.92, 6.4, 13.6]], hue: () => CLUB.lights[0].color },
    { key: 'show', x0: -3.5, x1: 3.5, z0: 15.0, z1: 21.6, emitters: [[-2.6, 21.3], [2.6, 21.3]], walls: [[-3.9, 14.5, 21.5], [3.88, 14.5, 21.5]], hue: () => SHOWFX.light.color },
  ],
  next: 0,
};
const _partyColor = new THREE.Color(), _partyWhite = new THREE.Color('#ffffff');
for (const r of PARTY.rooms) {
  r.group = new THREE.Group(); r.group.visible = false; GROUPS.main.add(r.group);
  /* Névoa baixa: poucas camadas grandes e quase transparentes. */
  r.haze = Array.from({ length: 10 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
    s.userData = { bx: r.x0 + (r.x1 - r.x0) * ((i * 0.37) % 1), bz: r.z0 + (r.z1 - r.z0) * ((i * 0.61) % 1), y: 0.45 + (i % 3) * 0.35, size: 2.6 + (i % 4) * 0.5, ph: i * 1.7 };
    r.group.add(s); return s;
  });
  /* Jato da máquina de fumaça: cresce, sobe um pouco e some. */
  r.burst = { t: 99, puffs: Array.from({ length: 8 }, (_, i) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: hazeTex, transparent: true, depthWrite: false, opacity: 0, toneMapped: false }));
    s.userData = { e: i % 2, a: i * 0.8 }; r.group.add(s); return s;
  }) };
  for (const [x, z] of r.emitters) { const box = new THREE.Mesh(G.box, mat.black); box.position.set(x, 0.12, z); box.scale.set(0.34, 0.24, 0.26); r.group.add(box); }
  /* Lâmpadas coloridas nas paredes, no alto. */
  const pts = []; for (const [x, z0, z1] of r.walls) for (let z = z0; z <= z1; z += 0.28) pts.push([x, 2.62, z]);
  r.bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ toneMapped: false }), pts.length);
  const o = new THREE.Object3D();
  pts.forEach((p, i) => { o.position.set(...p); o.updateMatrix(); r.bulbs.setMatrixAt(i, o.matrix); r.bulbs.setColorAt(i, _partyWhite); });
  r.bulbs.frustumCulled = false; r.group.add(r.bulbs);
  /* Refletores de teto que trocam de cor e piscam. */
  r.pars = [[r.x0 + 0.3, r.z0 + 0.3], [r.x1 - 0.3, r.z0 + 0.3], [r.x0 + 0.3, r.z1 - 0.6], [r.x1 - 0.3, r.z1 - 0.6]].map(([x, z], i) => {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.06, 0.16, 12), new THREE.MeshBasicMaterial({ toneMapped: false }));
    can.position.set(x, RH - 0.12, z); r.group.add(can); return { can, i };
  });
}
function partyBurst(r, t) { r.burst.t = 0; r.burst.t0 = t; }
function stepPartyFx(dt, t) {
  const slow = reduceMotion ? 0.25 : 1, here = inRoom ? playerFloor() : null;
  if (t > PARTY.next) { PARTY.next = t + (DEBUG ? 6 : 22 + Math.random() * 10); for (const r of PARTY.rooms) if (r.key === here) partyBurst(r, t); }
  for (const r of PARTY.rooms) {
    r.group.visible = r.key === here; if (!r.group.visible) continue;
    _partyColor.copy(r.hue()).lerp(_partyWhite, 0.55);
    for (const s of r.haze) {
      const u = s.userData, k = t * 0.05 * slow + u.ph;
      s.position.set(clamp(u.bx + Math.sin(k) * 0.7, r.x0, r.x1), u.y + Math.sin(k * 1.3) * 0.08, clamp(u.bz + Math.cos(k * 0.8) * 0.6, r.z0, r.z1));
      s.scale.setScalar(u.size); s.material.color.copy(_partyColor); s.material.opacity = 0.14 + 0.04 * Math.sin(k * 2);
    }
    const b = r.burst; b.t += dt;
    for (const s of b.puffs) {
      const u = s.userData, life = clamp(b.t / 6, 0, 1), [ex, ez] = r.emitters[u.e], dir = ex < 0 ? 1 : -1;
      s.visible = life < 1; if (!s.visible) continue;
      s.position.set(ex + dir * (0.3 + life * (1.2 + u.a * 0.2)), 0.35 + life * (0.4 + u.a * 0.08), ez - life * (0.6 + u.a * 0.15));
      s.scale.setScalar(0.5 + life * (1.6 + u.a * 0.12)); s.material.color.copy(_partyColor);
      s.material.opacity = Math.sin(Math.PI * Math.min(1, life * 1.4)) * 0.34;
    }
    /* Corrida de cores nas lâmpadas: cada lâmpada muda no máximo 3 vezes por segundo. */
    const step = Math.floor(t * 6 * slow);
    for (let i = 0; i < r.bulbs.count; i++) {
      const on = (i + step) % 5 < 2;
      r.bulbs.setColorAt(i, on ? _partyColor.setHSL(((i * 0.07) + t * 0.05) % 1, 1, 0.62) : _partyColor.setRGB(0.12, 0.08, 0.1));
    }
    r.bulbs.instanceColor.needsUpdate = true;
    for (const p of r.pars) {
      const on = Math.floor(t * 2.4 * slow + p.i * 0.5) % 2 === 0;
      p.can.material.color.setHSL((t * 0.1 + p.i * 0.25) % 1, 1, on ? 0.6 : 0.12);
    }
  }
}
