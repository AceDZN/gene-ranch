// Juice: particles, confetti, the egg, the net-gun and its suction beam.
import * as THREE from 'three';
import { propInstance } from './assets';

export function softDotTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.35, 'rgba(255,255,255,0.8)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

interface P {
  p: THREE.Vector3;
  v: THREE.Vector3;
  life: number;
  max: number;
  c: THREE.Color;
  g: number;
}

/** Additive sparkle points. */
export class Sparkles {
  readonly points: THREE.Points;
  private list: P[] = [];
  private max = 600;
  private pos: Float32Array;
  private col: Float32Array;
  constructor(tex: THREE.Texture) {
    this.pos = new Float32Array(this.max * 3);
    this.col = new Float32Array(this.max * 3);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.points = new THREE.Points(g, new THREE.PointsMaterial({ size: 0.16, map: tex, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.points.frustumCulled = false;
  }
  burst(at: THREE.Vector3, n: number, color: string | string[], speed = 2.5, gravity = -3, life = 1) {
    const cols = Array.isArray(color) ? color : [color];
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.8 + 0.2, Math.random() - 0.5).normalize().multiplyScalar(speed * (0.4 + Math.random() * 0.8));
      this.list.push({ p: at.clone(), v: d, life: 0, max: life * (0.6 + Math.random() * 0.6), c: new THREE.Color(cols[i % cols.length]), g: gravity });
    }
  }
  /** Particles streaming from `from` to `to` (suction). */
  stream(from: THREE.Vector3, to: THREE.Vector3, n: number, color: string) {
    for (let i = 0; i < n; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const p = from.clone().add(new THREE.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6));
      const v = to.clone().sub(p).multiplyScalar(2.2);
      this.list.push({ p, v, life: 0, max: 0.45, c: new THREE.Color(color), g: 0 });
    }
  }
  update(dt: number) {
    let i = 0;
    this.list = this.list.filter((q) => (q.life += dt) < q.max);
    for (const q of this.list) {
      q.v.y += q.g * dt;
      q.p.addScaledVector(q.v, dt);
      const k = 1 - q.life / q.max;
      this.pos.set([q.p.x, q.p.y, q.p.z], i * 3);
      this.col.set([q.c.r * k, q.c.g * k, q.c.b * k], i * 3);
      i++;
    }
    for (let j = i; j < this.max; j++) this.pos.set([0, -999, 0], j * 3);
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.color.needsUpdate = true;
  }
}

/** Tumbling paper confetti (instanced quads). */
export class Confetti {
  readonly mesh: THREE.InstancedMesh;
  private items: { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler; w: THREE.Vector3; life: number }[] = [];
  private n = 220;
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  constructor() {
    this.mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.08, 0.12), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), this.n);
    const cols = ['#ff6fa8', '#ffd84d', '#6fe0ff', '#9cff8a', '#b98cff', '#ffffff'];
    for (let i = 0; i < this.n; i++) this.mesh.setColorAt(i, new THREE.Color(cols[i % cols.length]));
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
  }
  burst(at: THREE.Vector3, n = 80) {
    for (let i = 0; i < n; i++) {
      if (this.items.length >= this.n) this.items.shift();
      this.items.push({
        p: at.clone(),
        v: new THREE.Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5),
        r: new THREE.Euler(Math.random() * 6, Math.random() * 6, Math.random() * 6),
        w: new THREE.Vector3(Math.random() * 10, Math.random() * 10, Math.random() * 10),
        life: 0,
      });
    }
  }
  update(dt: number) {
    this.items = this.items.filter((c) => (c.life += dt) < 2.6);
    this.items.forEach((c, i) => {
      c.v.y -= 6 * dt;
      c.v.multiplyScalar(1 - dt * 1.6);
      c.p.addScaledVector(c.v, dt);
      c.r.x += c.w.x * dt;
      c.r.y += c.w.y * dt;
      this.q.setFromEuler(c.r);
      const s = c.life > 2 ? (2.6 - c.life) / 0.6 : 1;
      this.m.compose(c.p, this.q, new THREE.Vector3(s, s, s));
      this.mesh.setMatrixAt(i, this.m);
    });
    this.mesh.count = this.items.length;
    this.mesh.instanceMatrix.needsUpdate = true;
  }
}

function speckleTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const g = ctx.createLinearGradient(0, 0, 0, 128);
  g.addColorStop(0, '#fffaf0');
  g.addColorStop(1, '#ffe2ef');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 256, 128);
  for (let i = 0; i < 70; i++) {
    ctx.fillStyle = ['#ffb3d1', '#b9d8ff', '#ffd98a', '#c9b3ff'][i % 4];
    ctx.beginPath();
    ctx.arc(Math.random() * 256, Math.random() * 128, 2 + Math.random() * 5, 0, Math.PI * 2);
    ctx.fill();
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export class Egg {
  readonly group = new THREE.Group();
  readonly mesh: THREE.Mesh;
  private shards: THREE.InstancedMesh;
  private shardState: { p: THREE.Vector3; v: THREE.Vector3; r: THREE.Euler }[] = [];
  private shardT = -1;
  constructor() {
    const geo = new THREE.SphereGeometry(0.28, 32, 24);
    geo.scale(1, 1.28, 1);
    geo.translate(0, 0.36, 0);
    this.mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: speckleTexture(), roughness: 0.45 }));
    this.mesh.castShadow = true;
    this.group.add(this.mesh);
    this.shards = new THREE.InstancedMesh(new THREE.CircleGeometry(0.09, 3), new THREE.MeshStandardMaterial({ color: '#fff6ea', side: THREE.DoubleSide }), 14);
    this.shards.count = 0;
    this.shards.frustumCulled = false;
    this.group.visible = false;
  }
  addTo(scene: THREE.Scene) {
    scene.add(this.group, this.shards);
  }
  crack(at: THREE.Vector3) {
    this.group.visible = false;
    this.shardState = Array.from({ length: 14 }, () => ({
      p: at.clone().add(new THREE.Vector3(0, 0.4, 0)),
      v: new THREE.Vector3((Math.random() - 0.5) * 4, 2 + Math.random() * 2.5, (Math.random() - 0.5) * 4),
      r: new THREE.Euler(Math.random() * 6, Math.random() * 6, 0),
    }));
    this.shardT = 0;
  }
  update(dt: number) {
    if (this.shardT < 0) return;
    this.shardT += dt;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    this.shardState.forEach((s, i) => {
      s.v.y -= 9 * dt;
      s.p.addScaledVector(s.v, dt);
      if (s.p.y < 0.02) (s.p.y = 0.02), s.v.multiplyScalar(0.3);
      s.r.x += dt * 8;
      q.setFromEuler(s.r);
      const k = this.shardT > 1.6 ? Math.max(0, (2.2 - this.shardT) / 0.6) : 1;
      m.compose(s.p, q, new THREE.Vector3(k, k, k));
      this.shards.setMatrixAt(i, m);
    });
    this.shards.count = this.shardT < 2.2 ? 14 : 0;
    this.shards.instanceMatrix.needsUpdate = true;
    if (this.shardT >= 2.2) this.shardT = -1;
  }
}

/** The first-person vacuum net gun, parented to the camera. */
export class NetGun {
  readonly group = new THREE.Group();
  readonly nozzle = new THREE.Object3D();
  private beam: THREE.Mesh;
  private kick = 0;
  private beamT = 0;
  private bobT = 0;
  readonly canister: THREE.Mesh;
  constructor() {
    const model = propInstance('netgun', { width: 0.55 });
    if (model) {
      // The Tripo net gun's funnel points to -X; turn it to face forward (-Z).
      model.rotation.y = -Math.PI / 2;
      model.position.y = -0.1;
      this.group.add(model);
      this.nozzle.position.set(0, 0.05, -0.32);
    } else {
      const teal = new THREE.MeshStandardMaterial({ color: '#2ab3a6', roughness: 0.45, metalness: 0.1 });
      const brass = new THREE.MeshStandardMaterial({ color: '#e0b04a', roughness: 0.3, metalness: 0.75 });
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.42, 16), teal);
      body.rotation.x = Math.PI / 2;
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.08), new THREE.MeshStandardMaterial({ color: '#7a4a3a' }));
      grip.position.set(0, -0.1, 0.1);
      grip.rotation.x = -0.3;
      const ring1 = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 8, 20), brass);
      ring1.position.z = -0.12;
      const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.08, 0.14, 20, 1, true), brass);
      mouth.rotation.x = -Math.PI / 2;
      mouth.position.z = -0.27;
      const net = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.012, 6, 24), new THREE.MeshStandardMaterial({ color: '#fff4e0' }));
      net.position.z = -0.34;
      this.canister = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.16, 16), new THREE.MeshStandardMaterial({ color: '#bff3ff', transparent: true, opacity: 0.55, roughness: 0.05, emissive: '#5fd0ff', emissiveIntensity: 0.3 }));
      this.canister.position.set(0, 0.11, 0.02);
      this.canister.rotation.x = Math.PI / 2;
      this.group.add(body, grip, ring1, mouth, net, this.canister);
      this.nozzle.position.set(0, 0, -0.36);
    }
    this.canister ??= new THREE.Mesh();
    this.group.add(this.nozzle);
    this.beam = new THREE.Mesh(
      new THREE.ConeGeometry(0.6, 1, 20, 1, true),
      new THREE.MeshBasicMaterial({ color: '#bff7ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.beam.geometry.translate(0, -0.5, 0);
    this.beam.geometry.rotateX(-Math.PI / 2);
    this.beam.renderOrder = 10;
    this.group.position.set(0.36, -0.34, -0.62);
    this.group.rotation.set(0.05, -0.12, 0);
    this.group.scale.setScalar(0.62);
    this.group.traverse((o) => {
      o.renderOrder = 20;
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m) (m.depthTest = true);
    });
  }
  attach(camera: THREE.Camera, scene: THREE.Scene) {
    camera.add(this.group);
    scene.add(this.beam);
  }
  fire(target: THREE.Vector3) {
    this.kick = 1;
    this.beamT = 0.45;
    const from = this.nozzle.getWorldPosition(new THREE.Vector3());
    const d = target.clone().sub(from);
    const len = d.length();
    this.beam.position.copy(from);
    this.beam.lookAt(target);
    this.beam.scale.set(Math.min(1, len * 0.12), Math.min(1, len * 0.12), len);
  }
  update(dt: number, moving: boolean, reduced: boolean) {
    this.kick = Math.max(0, this.kick - dt * 4);
    this.bobT += dt * (moving ? 9 : 2);
    const bob = reduced ? 0 : Math.sin(this.bobT) * (moving ? 0.012 : 0.004);
    this.group.position.set(0.3, -0.27 + bob, -0.62 + this.kick * 0.06);
    this.group.rotation.x = 0.05 + this.kick * 0.25;
    this.beamT = Math.max(0, this.beamT - dt);
    (this.beam.material as THREE.MeshBasicMaterial).opacity = this.beamT > 0 ? 0.35 * (this.beamT / 0.45) : 0;
    this.beam.visible = this.beamT > 0;
  }
}
