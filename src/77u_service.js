
/* ================= equipe da copa e serviço de mesa ================= */
/* NPCs de atendimento são separados dos traders: não operam nem ocupam SPOTS. */
const STAFF = { members: [], orders: [], order: null, ready: false, next: 0, serial: 0 };
const _staffHead = new THREE.Vector3(), _staffHand = new THREE.Vector3();
const _staffArmQ = new THREE.Quaternion(), _staffForeQ = new THREE.Quaternion();
const STAFF_RADIUS = 0.22, STAFF_SPEED = 1.25;

function initStaff() {
  if (STAFF.ready) return;
  STAFF.ready = true;
  const specs = [
    { id: 'waiter', name: 'Caio', role: 'garçom', file: 'Business_Male_05', spec: 7, home: [6.2, 2.8], yaw: -Math.PI / 2 },
    { id: 'waitress', name: 'Sofia', role: 'garçonete', file: 'Business_Female_02', spec: 3, home: [6.5, 20.2], yaw: Math.PI },
  ];
  for (const s of specs) {
    const P = makePerson(s.spec); P.pose = 'stand'; P.yaw = s.yaw; P.root.position.set(s.home[0], 0, s.home[1]);
    const el = mkLabel('staff'); el.firstChild.textContent = s.name + ' · ' + s.role;
    const tray = new THREE.Group();
    const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.225, 0.225, 0.016, 28), MC('#b4bdc5', 0.27, 0.8));
    plate.castShadow = true; tray.add(plate);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.217, 0.009, 6, 28), MC('#d8dde1', 0.24, 0.85));
    rim.rotation.x = Math.PI / 2; rim.position.y = 0.012; tray.add(rim);
    tray.visible = false; GROUPS.main.add(tray);
    const member = { ...s, P, el, tray, item: null, state: 'idle', path: [], order: null, loading: false, failed: false, routeT: 0, pause: 0, stuck: 0, target: null, elevWait: 0 };
    staffUniform(P); STAFF.members.push(member);
  }
}

function staffUniform(P) {
  /* Avental de tecido claro e fita na cintura, sobre a roupa do modelo. */
  const cloth = MC('#e9e5dd', 0.95), apron = new THREE.Mesh(new THREE.PlaneGeometry(0.29, 0.42, 2, 3), cloth);
  apron.material.side = THREE.DoubleSide; apron.position.set(0, 0.86, 0.17); apron.rotation.x = -0.035;
  apron.castShadow = true; P.root.add(apron);
  const belt = new THREE.Mesh(new THREE.BoxGeometry(0.33, 0.03, 0.014), cloth);
  belt.position.set(0, 1.075, 0.147); P.root.add(belt);
}

async function loadStaff(member) {
  if (!AV.clips || member.loading || member.failed || member.P.isAvatar) return;
  member.loading = true;
  try {
    const { g, SU } = await getVisitorModel(member.file);
    const old = member.P, P = new Avatar({ scene: SU.clone(g.scene) }, member.file.includes('Female') ? AV.clips.f : AV.clips.m, old, member.file);
    old.root.visible = false; if (old.cup) old.cup.visible = false;
    P.yaw = old.yaw; P.pose = 'stand'; member.P = P; staffUniform(P);
    const model = P.root.children[0];
    member.carryBones = ['L_UpperArm', 'L_Forearm'].map(n => model.getObjectByName('Bip01_' + n));
    member.leftHand = model.getObjectByName('Bip01_L_Hand');
  } catch (e) { member.failed = true; }
  member.loading = false;
}

const staffArea = floorAt;

function staffSegmentClear(a, b) {
  const d = Math.hypot(b[0] - a[0], b[1] - a[1]), steps = Math.max(1, Math.ceil(d / 0.14));
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    if (roomBlocked(a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, STAFF_RADIUS)) return false;
  }
  return true;
}

function staffGraphPath(from, to) {
  if (staffSegmentClear(from, to)) return [to];
  const visibleNodes = p => Object.keys(NODES).filter(k => staffSegmentClear(p, NODES[k])).sort((a, b) => Math.hypot(p[0] - NODES[a][0], p[1] - NODES[a][1]) - Math.hypot(p[0] - NODES[b][0], p[1] - NODES[b][1])).slice(0, 6);
  const starts = visibleNodes(from), ends = visibleNodes(to);
  let best = null, score = Infinity;
  for (const a of starts) for (const b of ends) {
    const corridor = route(a, b);
    if (!corridor.length || corridor[0] !== NODES[a]) continue;
    const points = [from, ...corridor, to]; let length = 0, clear = true;
    for (let i = 1; i < points.length; i++) {
      const ride = points[i - 1].elev && points[i].elev;
      if (!ride && !staffSegmentClear(points[i - 1], points[i])) { clear = false; break; }
      length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
    }
    if (clear && length < score) { score = length; best = points.slice(1); }
  }
  return best;
}

function staffGridPath(from, to) {
  /* Desvio local para assentos/objetos fora dos corredores, sempre respeitando as paredes. */
  const step = 0.3, x0 = -7.7, z0 = -5.7, nx = 66, nz = 93;
  const cells = new Map(), key = (x, z) => z * nx + x, point = k => [x0 + (k % nx) * step, z0 + Math.floor(k / nx) * step];
  const free = (x, z) => {
    if (x < 0 || z < 0 || x >= nx || z >= nz) return false;
    const k = key(x, z); if (!cells.has(k)) cells.set(k, !roomBlocked(x0 + x * step, z0 + z * step, STAFF_RADIUS));
    return cells.get(k);
  };
  const snap = p => {
    const cx = Math.round((p[0] - x0) / step), cz = Math.round((p[1] - z0) / step);
    for (let r = 0; r <= 3; r++) {
      let best = null, d = Infinity;
      for (let x = cx - r; x <= cx + r; x++) for (let z = cz - r; z <= cz + r; z++) {
        if (!free(x, z)) continue;
        const k = key(x, z), q = point(k), dist = Math.hypot(p[0] - q[0], p[1] - q[1]);
        if (dist < d && staffSegmentClear(p, q)) { best = k; d = dist; }
      }
      if (best !== null) return best;
    }
    return null;
  };
  const start = snap(from), goal = snap(to); if (start === null || goal === null) return null;
  const cost = new Map([[start, 0]]), previous = new Map(), closed = new Set(), heap = [];
  const heuristic = k => { const p = point(k), q = point(goal); return Math.hypot(p[0] - q[0], p[1] - q[1]); };
  const push = (k, score) => {
    heap.push({ k, score }); let i = heap.length - 1;
    while (i > 0) { const p = (i - 1) >> 1; if (heap[p].score <= score) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
  };
  const pop = () => {
    const top = heap[0], tail = heap.pop();
    if (heap.length) { heap[0] = tail; let i = 0; while (true) { let j = i, a = i * 2 + 1, b = a + 1; if (a < heap.length && heap[a].score < heap[j].score) j = a; if (b < heap.length && heap[b].score < heap[j].score) j = b; if (j === i) break; [heap[i], heap[j]] = [heap[j], heap[i]]; i = j; } }
    return top.k;
  };
  push(start, heuristic(start));
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  while (heap.length && closed.size < nx * nz) {
    const u = pop(); if (closed.has(u)) continue;
    if (u === goal) {
      const path = []; for (let k = goal; k !== undefined; k = previous.get(k)) path.unshift(point(k));
      path.push(to); const out = []; let i = 0;
      while (i < path.length) { let j = i + 1; while (j < path.length && staffSegmentClear(path[i], path[j])) j++; out.push(path[i]); i = Math.max(i + 1, j - 1); }
      return out;
    }
    closed.add(u); const ux = u % nx, uz = Math.floor(u / nx);
    for (const [dx, dz] of dirs) {
      const x = ux + dx, z = uz + dz; if (!free(x, z)) continue;
      if (dx && dz && (!free(ux + dx, uz) || !free(ux, uz + dz))) continue;
      const v = key(x, z), next = cost.get(u) + Math.hypot(dx, dz) * step;
      if (closed.has(v) || next >= (cost.get(v) ?? Infinity) || !staffSegmentClear(point(u), point(v))) continue;
      previous.set(v, u); cost.set(v, next); push(v, next + heuristic(v));
    }
  }
  return null;
}

function staffPath(from, to) { return staffGraphPath(from, to) || staffGridPath(from, to); }

function staffCustomerPosition() {
  const s = seatState.s;
  return s ? [s.x, s.z] : [fp.pos.x, fp.pos.z];
}

function staffPlanCustomer(member) {
  const target = staffCustomerPosition(), p = member.P.root.position, from = [p.x, p.z];
  const angle = Math.atan2(p.z - target[1], p.x - target[0]), candidates = [];
  for (const radius of [1.1, 1.35]) for (let i = 0; i < 12; i++) {
    const a = angle + i * Math.PI / 6, q = [target[0] + Math.cos(a) * radius, target[1] + Math.sin(a) * radius];
    if (staffArea(q[0], q[1]) === staffArea(target[0], target[1]) && !roomBlocked(q[0], q[1], STAFF_RADIUS)) candidates.push(q);
  }
  candidates.sort((a, b) => Math.hypot(a[0] - p.x, a[1] - p.z) - Math.hypot(b[0] - p.x, b[1] - p.z));
  for (const goal of candidates) {
    const path = staffPath(from, goal);
    if (path) { member.path = path; member.target = target; member.routeT = 1; member.stuck = 0; return true; }
  }
  member.path = []; member.target = target; member.routeT = 1; return false;
}

function staffReturn(member) {
  const p = member.P.root.position;
  member.state = 'returning'; member.order = null; member.tray.visible = false;
  if (member.item) { member.tray.remove(member.item); member.item = null; }
  member.path = staffPath([p.x, p.z], member.home) || [];
}

function requestService(itemId) {
  if (!inRoom || !Object.prototype.hasOwnProperty.call(CONSUMABLES, itemId)) return false;
  initStaff();
  if (STAFF.order) { serviceMessage('Seu pedido já está a caminho.'); return false; }
  const idle = STAFF.members.filter(m => m.state === 'idle');
  if (!idle.length) { serviceMessage('A equipe está voltando ao balcão. Tente novamente em instantes.'); return false; }
  const member = idle.find(m => m.id === STAFF.members[STAFF.next % STAFF.members.length].id) || idle[0];
  STAFF.next = (STAFF.members.indexOf(member) + 1) % STAFF.members.length;
  const order = { id: ++STAFF.serial, itemId, member, status: 'preparing', age: 0 };
  STAFF.order = order; member.order = order; member.state = 'collecting'; member.pause = 0.8;
  const p = member.P.root.position; member.path = staffPath([p.x, p.z], member.home) || [];
  serviceMessage(member.name + ' está preparando seu pedido.');
  return true;
}

function cancelService(silent = false) {
  const order = STAFF.order; if (!order) return false;
  order.status = 'cancelled'; STAFF.orders.push(order); if (STAFF.orders.length > 12) STAFF.orders.shift();
  STAFF.order = null; staffReturn(order.member);
  if (!silent) serviceMessage('Pedido cancelado.');
  return true;
}

function staffCarry(member) {
  const P = member.P;
  if (!member.tray.visible) return;
  if (P.isAvatar && member.carryBones && member.leftHand) {
    const [arm, fore] = member.carryBones;
    member.carryRest = member.carryBones.map(bone => bone ? bone.quaternion.clone() : null);
    if (arm) { _staffArmQ.setFromEuler(new THREE.Euler(-0.55, 0, 0.12)); arm.quaternion.multiply(_staffArmQ); }
    if (fore) { _staffForeQ.setFromEuler(new THREE.Euler(-1.12, 0, 0)); fore.quaternion.multiply(_staffForeQ); }
    P.root.updateMatrixWorld(true); member.leftHand.getWorldPosition(_staffHand);
  } else {
    P.J.lSh.rotation.set(-0.45, 0, 0.12); P.J.lEl.rotation.x = -1.45;
    P.root.updateMatrixWorld(true); P.J.lWr.getWorldPosition(_staffHand);
  }
  member.tray.position.copy(_staffHand); member.tray.position.y += 0.028; member.tray.rotation.set(0, P.yaw, 0);
  member.tray.updateMatrixWorld(true);
}

function stepStaff(dt, t) {
  initStaff();
  if (STAFF.order && (!inRoom || (STAFF.order.age += dt) > 60)) cancelService(!inRoom);
  for (const member of STAFF.members) {
    if (AV.clips && !member.P.isAvatar && !member.loading && !member.failed) loadStaff(member);
    const P = member.P, p = P.root.position; let speed = 0;
    const riding = (member.elevWait -= dt) > 0;
    if (P.root.visible === riding) P.root.visible = !riding;
    if (member.item) member.tray.visible = !riding;
    if (member.carryRest) {
      member.carryBones.forEach((bone, i) => { if (bone && member.carryRest[i]) bone.quaternion.copy(member.carryRest[i]); });
      member.carryRest = null;
    }
    if (member.state === 'serving' && member.order) {
      member.routeT -= dt; const target = staffCustomerPosition();
      const d = Math.hypot(target[0] - p.x, target[1] - p.z);
      if (d <= 1.5 && (staffArea(p.x, p.z) === staffArea(target[0], target[1]) || staffSegmentClear([p.x, p.z], target))) {
        const order = member.order; order.status = 'delivered';
        deliverConsumable(order.itemId, member); STAFF.orders.push(order); if (STAFF.orders.length > 12) STAFF.orders.shift();
        STAFF.order = null; staffReturn(member);
      } else if (member.routeT <= 0 && (!member.path.length || !member.target || Math.hypot(target[0] - member.target[0], target[1] - member.target[1]) > 0.65)) staffPlanCustomer(member);
    }
    if (member.path.length && !riding) {
      let budget = STAFF_SPEED * dt;
      while (member.path.length && budget > 0.0001) {
        const q = member.path[0], dx = q[0] - p.x, dz = q[1] - p.z, d = Math.hypot(dx, dz);
        if (d < 0.04 && q.elev && member.path[1]?.elev && member.path[1].elev !== q.elev) {
          /* Viagem de elevador: some na porta de um andar e aparece na do outro. */
          const to = member.path[1]; member.path.splice(0, 2); p.x = to[0]; p.z = to[1]; P.yaw = FLOOR[to.elev].yaw + Math.PI;
          member.elevWait = 1.6; elevOpen(q.elev); elevOpen(to.elev); break;
        }
        if (d < 0.04) { member.path.shift(); continue; }
        const step = Math.min(d, budget), x = p.x + dx / d * step, z = p.z + dz / d * step;
        if (roomBlocked(x, z, STAFF_RADIUS)) { member.stuck += dt; break; }
        P.yaw = angDamp(P.yaw, Math.atan2(dx, dz), 9, dt); p.x = x; p.z = z; budget -= step; speed = STAFF_SPEED; member.stuck = 0;
        if (step >= d - 0.001) member.path.shift();
      }
      if (member.stuck > 1.5) { member.path = []; if (member.state === 'serving') staffPlanCustomer(member); else member.path = staffPath([p.x, p.z], member.home) || []; member.stuck = 0; }
    }
    if (member.state === 'collecting' && !member.path.length && (member.pause -= dt) <= 0) {
      member.item = makeConsumableProp(member.order.itemId); member.item.position.set(0, member.order.itemId === 'wine' ? 0.1 : 0.075, 0);
      member.tray.add(member.item); member.tray.visible = true; member.state = 'serving'; member.order.status = 'on_the_way';
      staffPlanCustomer(member); serviceMessage(member.name + ' está levando seu pedido até você.');
    } else if (member.state === 'returning' && !member.path.length) { member.state = 'idle'; P.yaw = member.yaw; }
    P.pose = 'stand'; P.speed = speed;
    if (P.isAvatar) P.update(dt, t); else animatePerson(P, dt, t);
    staffCarry(member);
  }
}

function updateStaffLabels(t) {
  for (const member of STAFF.members) {
    const el = member.el, text = member.state === 'serving' ? 'levando seu pedido' : member.state === 'collecting' ? 'preparando o pedido' : member.state === 'returning' ? 'voltando ao balcão' : 'pedir cardápio';
    el.lastChild.textContent = text;
    if (!member.P.J.head || !member.P.root.visible) { el.style.opacity = '0'; continue; }
    member.P.J.head.getWorldPosition(_staffHead); _staffHead.y += 0.4;
    const dist = camera.position.distanceTo(_staffHead); _staffHead.project(camera);
    if (_staffHead.z > 1 || _staffHead.z < -1 || dist < 0.55) { el.style.opacity = '0'; continue; }
    el.style.opacity = '1';
    el.style.transform = `translate(${(_staffHead.x * 0.5 + 0.5) * innerWidth}px,${(-_staffHead.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-100%) scale(${clamp(4.2 / dist, 0.42, 1.25).toFixed(3)})`;
  }
}
