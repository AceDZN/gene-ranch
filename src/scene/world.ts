// The floating island: sky, light, terrain, ranch props. Rendering only.
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { models, propInstance } from './assets';

export const ISLAND_R = 22;
export const SPAWN = new THREE.Vector3(0, 1.6, 7.6);
export const SPAWN_LOOK = new THREE.Vector3(-0.2, 0.75, 2.0);
export const NEST_POS = new THREE.Vector3(0.9, 0, 2.3);
// Slot 0 is the LEFT parent (its alleles label the Punnett rows on the left), slot 1 the right one.
export const NEST_SLOTS = [new THREE.Vector3(0.36, 0.56, 2.35), new THREE.Vector3(1.44, 0.56, 2.35)];
/** Eggs land and hatch in the middle of the nest, between the parents. */
export const HATCH_SPOT = new THREE.Vector3(0.9, 0.58, 2.7);
export const BOARD_POS = new THREE.Vector3(-4.6, 0, 1.2);
export const VILLAGER_POS = new THREE.Vector3(-3.4, 0, 2.0);
export const BARN_POS = new THREE.Vector3(5.5, 0, -5.5);
export const MEADOW_CENTER = new THREE.Vector3(-1.2, 0, 4.2);
export const MEADOW_R = 5.5;

export interface Palette {
  skyTop: string;
  skyHorizon: string;
  skyBottom: string;
  sun: string;
  fog: string;
  grass: string;
  grass2: string;
  hemiSky: string;
  hemiGround: string;
  sunIntensity: number;
  stars: boolean;
}

export const PALETTES: Record<'ranch' | 'show', Palette> = {
  ranch: {
    skyTop: '#9d86e6',
    skyHorizon: '#ffc8b4',
    skyBottom: '#f0a2d2',
    sun: '#ffe0a8',
    fog: '#f6c6cf',
    grass: '#8fd46b',
    grass2: '#b8e57a',
    hemiSky: '#ffe2c4',
    hemiGround: '#6aa85a',
    sunIntensity: 2.6,
    stars: false,
  },
  show: {
    skyTop: '#1e1a52',
    skyHorizon: '#9a6ad6',
    skyBottom: '#ff9fc4',
    sun: '#c9b8ff',
    fog: '#7b62b8',
    grass: '#4fc9b4',
    grass2: '#7fe0c4',
    hemiSky: '#b9a8ff',
    hemiGround: '#2f6b7a',
    sunIntensity: 1.8,
    stars: true,
  },
};

// Small deterministic noise for terrain shaping.
function hash(x: number, y: number) {
  const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
function vnoise(x: number, y: number) {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi, yi);
  const b = hash(xi + 1, yi);
  const c = hash(xi, yi + 1);
  const d = hash(xi + 1, yi + 1);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

/** Ground height (flat in the play area so creatures sit on it). */
export function heightAt(x: number, z: number): number {
  const r = Math.hypot(x, z);
  if (r < 12) return 0;
  const t = Math.min(1, (r - 12) / 8);
  return t * t * (vnoise(x * 0.25, z * 0.25) * 1.6 + 0.2);
}

function edgeR(a: number) {
  return ISLAND_R * (0.92 + vnoise(Math.cos(a) * 2 + 5, Math.sin(a) * 2 + 5) * 0.16);
}

export class World {
  readonly group = new THREE.Group();
  readonly sun: THREE.DirectionalLight;
  readonly hemi: THREE.HemisphereLight;
  readonly ground: THREE.Mesh;
  readonly nest = new THREE.Group();
  readonly nestHit: THREE.Mesh;
  readonly board = new THREE.Group();
  readonly boardHit: THREE.Mesh;
  readonly villager = new THREE.Group();
  readonly frost: THREE.Mesh;
  private sky: THREE.Mesh;
  private skyU: Record<string, THREE.IUniform>;
  private clouds = new THREE.Group();
  private blades: THREE.Object3D | null = null;
  private grassMat: THREE.MeshStandardMaterial;
  readonly boardCanvas = document.createElement('canvas');
  readonly boardTex: THREE.CanvasTexture;
  private showProps = new THREE.Group();
  private ranchProps = new THREE.Group();
  readonly pedigreeCanvas = document.createElement('canvas');
  readonly pedigreeTex: THREE.CanvasTexture;
  palette: Palette = PALETTES.ranch;

  constructor(readonly scene: THREE.Scene) {
    scene.add(this.group);
    // Sky dome.
    this.skyU = {
      top: { value: new THREE.Color() },
      horizon: { value: new THREE.Color() },
      bottom: { value: new THREE.Color() },
      sunDir: { value: new THREE.Vector3(-0.5, 0.25, -0.8).normalize() },
      sunCol: { value: new THREE.Color() },
      stars: { value: 0 },
    };
    this.sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 32, 16),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: this.skyU,
        vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `
          uniform vec3 top, horizon, bottom, sunCol, sunDir; uniform float stars; varying vec3 vD;
          float h(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719)))*43758.5453); }
          void main(){
            float y = vD.y;
            vec3 c = y > 0.0 ? mix(horizon, top, pow(smoothstep(0.0, 0.7, y), 0.8)) : mix(horizon, bottom, smoothstep(0.0, -0.4, y));
            float s = max(dot(vD, sunDir), 0.0);
            c += sunCol * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.35);
            if (stars > 0.5 && y > 0.05) { vec3 q = floor(vD * 180.0); float st = step(0.996, h(q)); c += vec3(st) * smoothstep(0.05, 0.4, y); }
            gl_FragColor = vec4(c, 1.0);
          }`,
      }),
    );
    scene.add(this.sky);
    this.hemi = new THREE.HemisphereLight('#ffffff', '#ffffff', 1.1);
    scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight('#ffffff', 2.5);
    this.sun.position.set(-14, 16, -10);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -18;
    sc.right = 18;
    sc.top = 18;
    sc.bottom = -18;
    sc.near = 1;
    sc.far = 60;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    scene.add(this.sun);
    scene.fog = new THREE.Fog('#ffd6bd', 40, 150);

    // Island top.
    this.grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95 });
    this.ground = new THREE.Mesh(this.islandTop(), this.grassMat);
    this.ground.receiveShadow = true;
    this.ground.userData.kind = 'ground';
    this.group.add(this.ground);
    const under = new THREE.Mesh(this.islandUnder(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true }));
    this.group.add(under);
    this.group.add(this.ranchProps, this.showProps);

    this.buildClouds();
    this.buildDecor();

    // Nest.
    this.buildNest();
    this.nestHit = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 1.6, 16), new THREE.MeshBasicMaterial({ visible: false }));
    this.nestHit.position.copy(NEST_POS).setY(0.6);
    this.nestHit.userData.kind = 'nest';
    this.group.add(this.nestHit);
    this.frost = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.16, 8, 40), new THREE.MeshStandardMaterial({ color: '#dff4ff', emissive: '#9fdcff', emissiveIntensity: 0.6, roughness: 0.3 }));
    this.frost.rotation.x = -Math.PI / 2;
    this.frost.position.copy(NEST_POS).setY(0.42);
    this.frost.visible = false;
    this.group.add(this.frost);

    // Order board.
    this.boardCanvas.width = 1024;
    this.boardCanvas.height = 640;
    this.boardTex = new THREE.CanvasTexture(this.boardCanvas);
    this.boardTex.colorSpace = THREE.SRGBColorSpace;
    this.buildBoard();
    this.boardHit = new THREE.Mesh(new THREE.BoxGeometry(2.8, 3, 1.4), new THREE.MeshBasicMaterial({ visible: false }));
    this.boardHit.position.copy(BOARD_POS).setY(1.4);
    this.boardHit.userData.kind = 'board';
    this.group.add(this.boardHit);
    this.buildVillager();

    this.pedigreeCanvas.width = 1024;
    this.pedigreeCanvas.height = 768;
    this.pedigreeTex = new THREE.CanvasTexture(this.pedigreeCanvas);
    this.pedigreeTex.colorSpace = THREE.SRGBColorSpace;
    this.buildShowProps();
    this.setPalette('ranch');
  }

  private islandTop(): THREE.BufferGeometry {
    const rings = 40;
    const segs = 128;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const c1 = new THREE.Color();
    const c2 = new THREE.Color();
    const dirt = new THREE.Color('#d9b47e');
    pos.push(0, 0, 0);
    col.push(1, 1, 1);
    for (let i = 1; i <= rings; i++) {
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const R = edgeR(a) * (i / rings);
        const x = Math.cos(a) * R;
        const z = Math.sin(a) * R;
        const y = i === rings ? heightAt(x, z) - 0.25 : heightAt(x, z);
        pos.push(x, y, z);
        // Encode a grass mix factor in R; real colours applied in setPalette.
        const n = vnoise(x * 0.6, z * 0.6);
        // Dirt path from spawn to nest and to the board.
        const dPath = Math.min(segDist(x, z, 0, 7.6, NEST_POS.x, NEST_POS.z + 1.4), segDist(x, z, 0, 7.6, BOARD_POS.x + 1, BOARD_POS.z + 0.8), segDist(x, z, NEST_POS.x, NEST_POS.z, BARN_POS.x, BARN_POS.z + 2));
        const p = Math.max(0, 1 - dPath / 0.9) * (0.6 + 0.4 * n);
        col.push(n, p, 0);
      }
    }
    for (let j = 0; j < segs; j++) idx.push(0, 1 + ((j + 1) % segs), 1 + j);
    for (let i = 1; i < rings; i++)
      for (let j = 0; j < segs; j++) {
        const a = 1 + (i - 1) * segs + j;
        const b = 1 + (i - 1) * segs + ((j + 1) % segs);
        const c = 1 + i * segs + j;
        const d = 1 + i * segs + ((j + 1) % segs);
        idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('mix', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(new Array(col.length).fill(1), 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    void c1;
    void c2;
    void dirt;
    return g;
  }

  private islandUnder(): THREE.BufferGeometry {
    const segs = 64;
    const layers = 14;
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const rock = [new THREE.Color('#b9876a'), new THREE.Color('#9b6b5e'), new THREE.Color('#c99a74'), new THREE.Color('#8a5f6e')];
    for (let i = 0; i <= layers; i++) {
      const t = i / layers;
      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const R = edgeR(a) * (1 - Math.pow(t, 1.6)) * (0.9 + 0.2 * vnoise(j * 0.7, i * 0.9)) + 0.4;
        pos.push(Math.cos(a) * R, -0.25 - t * 16 - vnoise(j, i) * 1.2 * t, Math.sin(a) * R);
        const c = rock[(i + (j % 3 === 0 ? 1 : 0)) % rock.length];
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < layers; i++)
      for (let j = 0; j < segs; j++) {
        const a = i * segs + j;
        const b = i * segs + ((j + 1) % segs);
        const c = (i + 1) * segs + j;
        const d = (i + 1) * segs + ((j + 1) % segs);
        idx.push(a, c, b, b, c, d);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }

  private buildClouds() {
    const mat = new THREE.MeshStandardMaterial({ color: '#ffffff', emissive: '#ffe9f2', emissiveIntensity: 0.35, roughness: 1 });
    const geo = new THREE.SphereGeometry(1, 14, 10);
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + hash(i, 1);
      const r = 34 + hash(i, 2) * 50;
      const puff = new THREE.Group();
      for (let k = 0; k < 5; k++) {
        const m = new THREE.Mesh(geo, mat);
        const s = 3 + hash(i, k + 3) * 4;
        m.scale.set(s * 1.4, s * 0.7, s);
        m.position.set((k - 2) * 3.2, hash(i, k) * 1.5, hash(k, i) * 2);
        puff.add(m);
      }
      puff.position.set(Math.cos(a) * r, -10 - hash(i, 4) * 14 + (i % 4 === 0 ? 22 : 0), Math.sin(a) * r);
      puff.rotation.y = -a;
      this.clouds.add(puff);
    }
    this.scene.add(this.clouds);
  }

  /** Far-away floating islets with waterfalls (both islands use them). */
  private buildIslets() {
    const rock = new THREE.MeshStandardMaterial({ color: '#b48a9a', roughness: 1, flatShading: true });
    const grass = new THREE.MeshStandardMaterial({ color: '#9bd77a', roughness: 1 });
    const water = new THREE.MeshBasicMaterial({ color: '#dff6ff', transparent: true, opacity: 0.75, fog: false });
    const spots = [
      [-38, 14, -70, 7],
      [30, 22, -85, 9],
      [70, 8, -40, 6],
      [-75, 18, -20, 8],
      [10, 6, -55, 4],
    ];
    spots.forEach(([x, y, z, r], i) => {
      const g = new THREE.Group();
      const under = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.6, 9), rock);
      under.rotation.x = Math.PI;
      under.position.y = -r * 0.8;
      const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.95, r * 0.25, 9), grass);
      g.add(under, top);
      for (let k = 0; k < 3; k++) {
        const t = new THREE.Mesh(new THREE.IcosahedronGeometry(r * 0.22, 0), new THREE.MeshStandardMaterial({ color: k % 2 ? '#ffb3d1' : '#8fd06a' }));
        t.position.set((hash(i, k) - 0.5) * r, r * 0.35, (hash(k, i) - 0.5) * r);
        g.add(t);
      }
      const fall = new THREE.Mesh(new THREE.PlaneGeometry(r * 0.25, r * 2.6), water);
      fall.position.set(r * 0.4, -r * 1.2, r * 0.75);
      g.add(fall);
      g.position.set(x, y, z);
      g.lookAt(0, y, 0);
      this.scene.add(g);
    });
  }

  private buildDecor() {
    const P = this.ranchProps;
    this.buildIslets();
    // Cherry-blossom trees framing the ranch.
    for (const [x, z, s] of [
      [-6.8, 2.2, 1.2],
      [7.6, 0.6, 1.0],
      [-4.5, -6, 1.1],
    ]) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 2.6, 8), new THREE.MeshStandardMaterial({ color: '#8a5a4a' }));
      trunk.position.y = 1.3;
      trunk.rotation.z = 0.08;
      tree.add(trunk);
      const pink = new THREE.MeshStandardMaterial({ color: '#ffb7d5', roughness: 0.85 });
      for (let k = 0; k < 6; k++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.75 + hash(x, k) * 0.4, 1), pink);
        b.position.set(Math.cos(k * 1.1) * 0.9, 2.7 + hash(k, z) * 0.7, Math.sin(k * 1.1) * 0.9);
        tree.add(b);
      }
      const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.32, 10), new THREE.MeshStandardMaterial({ color: '#fff3c4', emissive: '#ffcf6b', emissiveIntensity: 1.6 }));
      lamp.position.set(0.9, 2.0, 0.5);
      tree.add(lamp);
      tree.scale.setScalar(s);
      tree.position.set(x, 0, z);
      tree.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null));
      P.add(tree);
    }
    // Grass tufts (instanced).
    const tuftGeo = new THREE.ConeGeometry(0.06, 0.32, 4);
    tuftGeo.translate(0, 0.16, 0);
    const tufts = new THREE.InstancedMesh(tuftGeo, new THREE.MeshStandardMaterial({ color: '#7cc957', roughness: 0.9 }), 900);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    let n = 0;
    for (let i = 0; i < 4000 && n < 900; i++) {
      const a = hash(i, 9) * Math.PI * 2;
      const r = Math.sqrt(hash(i, 10)) * (ISLAND_R - 2);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (Math.hypot(x - NEST_POS.x, z - NEST_POS.z) < 1.8 || Math.hypot(x, z - 7.6) < 1.2) continue;
      q.setFromAxisAngle(new THREE.Vector3(hash(i, 3) - 0.5, 0, hash(i, 4) - 0.5).normalize(), 0.3);
      const s = 0.6 + hash(i, 11) * 0.9;
      m.compose(new THREE.Vector3(x, heightAt(x, z), z), q, new THREE.Vector3(s, s, s));
      tufts.setMatrixAt(n++, m);
    }
    tufts.count = n;
    P.add(tufts);
    // Flowers.
    const fl = new THREE.InstancedMesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ roughness: 0.6 }), 260);
    const fcols = ['#ffffff', '#ffd1e8', '#fff07a', '#c9a6ff', '#ff9fb2'].map((c) => new THREE.Color(c));
    for (let i = 0; i < 260; i++) {
      const a = hash(i, 21) * Math.PI * 2;
      const r = 3 + Math.sqrt(hash(i, 22)) * (ISLAND_R - 5);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      m.makeTranslation(x, heightAt(x, z) + 0.12, z);
      fl.setMatrixAt(i, m);
      fl.setColorAt(i, fcols[i % fcols.length]);
    }
    P.add(fl);
    // Trees around the edge.
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#9a6a4a', roughness: 0.9 });
    const leafCols = ['#7fd06a', '#ffb3d1', '#a8e07a', '#ffc6a0'];
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2 + hash(i, 31) * 0.3;
      const r = 13 + hash(i, 32) * 5;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (z > 6 && Math.abs(x) < 6) continue;
      const tree = new THREE.Group();
      const h = 1.6 + hash(i, 33) * 1.4;
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.22, h, 8), trunkMat);
      trunk.position.y = h / 2;
      tree.add(trunk);
      const leafMat = new THREE.MeshStandardMaterial({ color: leafCols[i % leafCols.length], roughness: 0.8 });
      for (let k = 0; k < 3; k++) {
        const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9 + hash(i, k) * 0.5, 1), leafMat);
        b.position.set((hash(k, i) - 0.5) * 0.9, h + 0.3 + k * 0.35, (hash(i + 3, k) - 0.5) * 0.9);
        tree.add(b);
      }
      tree.position.set(x, heightAt(x, z), z);
      tree.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o.castShadow = true), (o.receiveShadow = true)) : null));
      P.add(tree);
    }
    // Mushrooms.
    for (let i = 0; i < 14; i++) {
      const a = hash(i, 41) * Math.PI * 2;
      const r = 6 + hash(i, 42) * 9;
      const mg = new THREE.Group();
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.22, 8), new THREE.MeshStandardMaterial({ color: '#fff4e0' }));
      stem.position.y = 0.11;
      const cap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: i % 2 ? '#ff6f8a' : '#ffb04d' }));
      cap.position.y = 0.2;
      mg.add(stem, cap);
      mg.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
      mg.scale.setScalar(0.8 + hash(i, 43));
      P.add(mg);
    }
    // Fence arcs.
    const wood = new THREE.MeshStandardMaterial({ color: '#f3e3c8', roughness: 0.8 });
    for (let i = 0; i < 22; i++) {
      const a = -0.6 + (i / 22) * 2.2;
      const r = 10.5;
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.8, 0.12), wood);
      post.position.set(Math.cos(a + Math.PI) * r, 0.4, Math.sin(a + Math.PI) * r);
      post.castShadow = true;
      P.add(post);
      if (i < 21) {
        const b = (-0.6 + ((i + 0.5) / 22) * 2.2) + Math.PI;
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.08, ((2.2 / 22) * r) + 0.05), wood);
        rail.position.set(Math.cos(b) * r, 0.55, Math.sin(b) * r);
        rail.rotation.y = -b;
        P.add(rail);
      }
    }
    // Barn.
    const barn = propInstance('barn', { height: 5.2 }) ?? this.proceduralBarn();
    barn.position.copy(BARN_POS);
    barn.lookAt(new THREE.Vector3(0, 0, 6));
    P.add(barn);
    // Windmill.
    const mill = new THREE.Group();
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.9, 5, 10), new THREE.MeshStandardMaterial({ color: '#fff1dc', roughness: 0.8 }));
    tower.position.y = 2.5;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.8, 1.2, 10), new THREE.MeshStandardMaterial({ color: '#e0546a' }));
    roof.position.y = 5.6;
    const hub = new THREE.Group();
    hub.position.set(0, 4.6, 0.75);
    for (let k = 0; k < 4; k++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.35, 2.2, 0.05), new THREE.MeshStandardMaterial({ color: '#ffe7b8' }));
      blade.position.y = 1.1;
      const arm = new THREE.Group();
      arm.rotation.z = (k * Math.PI) / 2;
      arm.add(blade);
      hub.add(arm);
    }
    this.blades = hub;
    mill.add(tower, roof, hub);
    mill.position.set(-9, 0, -7);
    mill.lookAt(new THREE.Vector3(0, 0, 6));
    mill.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null));
    P.add(mill);
  }

  private proceduralBarn(): THREE.Object3D {
    const g = new THREE.Group();
    const red = new THREE.MeshStandardMaterial({ color: '#d9485f', roughness: 0.75 });
    const cream = new THREE.MeshStandardMaterial({ color: '#fff3df', roughness: 0.8 });
    const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3, 3.6), red);
    body.position.y = 1.5;
    // Gable roof: a triangular prism (apex up) running front to back.
    const roof = new THREE.Mesh(new THREE.CylinderGeometry(2.7, 2.7, 4.0, 3, 1, false), new THREE.MeshStandardMaterial({ color: '#7b4a6b', roughness: 0.7, flatShading: true }));
    roof.rotation.x = -Math.PI / 2;
    roof.position.y = 3 + 1.35;
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.1), cream);
    door.position.set(0, 1.1, 1.82);
    const cross1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 2.6, 0.06), red);
    cross1.position.set(0, 1.1, 1.88);
    cross1.rotation.z = 0.7;
    const cross2 = cross1.clone();
    cross2.rotation.z = -0.7;
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.4, 20), new THREE.MeshStandardMaterial({ color: '#ffe89a', emissive: '#ffcf6b', emissiveIntensity: 0.6 }));
    win.position.set(0, 3.6, 1.95);
    g.add(body, roof, door, cross1, cross2, win);
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o.castShadow = true), (o.receiveShadow = true)) : null));
    return g;
  }

  private buildNest() {
    const model = propInstance('nest', { width: 2.5, rotX: -Math.PI / 4 });
    if (model) {
      // Keep it a low, wide nest so the parents sitting in it stay visible, on a mossy stone.
      model.scale.y *= 0.55;
      model.position.y = 0.22;
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.45, 0.34, 28), new THREE.MeshStandardMaterial({ color: '#a9a2b8', roughness: 0.95 }));
      stone.position.y = 0.17;
      const moss = new THREE.Mesh(new THREE.CylinderGeometry(1.27, 1.27, 0.06, 28), new THREE.MeshStandardMaterial({ color: '#86c96f', roughness: 1 }));
      moss.position.y = 0.35;
      // A straw bed inside the ring (the model's own interior renders dark).
      const bed = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.95, 0.12, 28), new THREE.MeshStandardMaterial({ color: '#e7c374', roughness: 1 }));
      bed.position.y = 0.52;
      this.nest.add(stone, moss, model, bed);
    }
    else {
      const stone = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.6, 0.3, 24), new THREE.MeshStandardMaterial({ color: '#a8a0b8', roughness: 0.9 }));
      stone.position.y = 0.15;
      const moss = new THREE.Mesh(new THREE.CylinderGeometry(1.42, 1.42, 0.06, 24), new THREE.MeshStandardMaterial({ color: '#79c26a', roughness: 1 }));
      moss.position.y = 0.32;
      const strawMat = new THREE.MeshStandardMaterial({ color: '#e8c06a', roughness: 0.95 });
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.24, 10, 36), strawMat);
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.42;
      ring.scale.set(1, 1, 0.75);
      this.nest.add(stone, moss, ring);
      for (let i = 0; i < 40; i++) {
        const s = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.5, 4), strawMat);
        const a = (i / 40) * Math.PI * 2;
        s.position.set(Math.cos(a) * 1.15, 0.5, Math.sin(a) * 1.15);
        s.rotation.set(hash(i, 1) - 0.5, a, 1.2 + hash(i, 2));
        this.nest.add(s);
      }
    }
    // Glow ring that pulses when the nest is the next step.
    const glow = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.05, 8, 48), new THREE.MeshBasicMaterial({ color: '#fff3a0', transparent: true, opacity: 0.9, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.05;
    glow.name = 'nestGlow';
    this.nest.add(glow);
    this.nest.position.copy(NEST_POS);
    this.nest.traverse((o) => ((o as THREE.Mesh).isMesh && o.name !== 'nestGlow' ? ((o.castShadow = true), (o.receiveShadow = true)) : null));
    this.group.add(this.nest);
  }

  private buildBoard() {
    const model = propInstance('board', { height: 2.9 });
    const g = this.board;
    if (model) g.add(model);
    else {
      const wood = new THREE.MeshStandardMaterial({ color: '#b07a50', roughness: 0.85 });
      for (const sx of [-1.25, 1.25]) {
        const post = new THREE.Mesh(new THREE.BoxGeometry(0.16, 2.8, 0.16), wood);
        post.position.set(sx, 1.4, 0);
        g.add(post);
      }
      const back = new THREE.Mesh(new THREE.BoxGeometry(2.7, 1.75, 0.1), new THREE.MeshStandardMaterial({ color: '#8a5a3a' }));
      back.position.set(0, 1.75, -0.03);
      g.add(back);
      const roof = new THREE.Mesh(new THREE.BoxGeometry(3, 0.12, 0.7), new THREE.MeshStandardMaterial({ color: '#d9485f' }));
      roof.position.set(0, 2.78, 0.1);
      roof.rotation.x = 0.25;
      g.add(roof);
    }
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 1.56), new THREE.MeshStandardMaterial({ map: this.boardTex, roughness: 0.9 }));
    paper.position.set(0, model ? 1.95 : 1.75, model ? 0.4 : 0.03);
    g.add(paper);
    g.position.copy(BOARD_POS);
    g.lookAt(new THREE.Vector3(0.5, 0, 7.6));
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null));
    this.group.add(g);
  }

  private villagerMixer: THREE.AnimationMixer | null = null;
  get hasVillagerRig() {
    return !!this.villagerMixer;
  }
  private villagerActions = new Map<string, THREE.AnimationAction>();
  private villagerCur: THREE.AnimationAction | null = null;
  private villagerBack = 0;

  /** Play a villager clip ('idle' | 'cheer' | 'frustrated_01'); short reactions return to idle. */
  villagerAnim(name: string, hold = 2.5) {
    const next = this.villagerActions.get(name);
    if (!next || next === this.villagerCur) return;
    next.reset().fadeIn(0.25).play();
    this.villagerCur?.fadeOut(0.25);
    this.villagerCur = next;
    this.villagerBack = name === 'idle' ? 0 : hold;
  }

  private buildVillager() {
    const g = this.villager;
    let model: THREE.Object3D | null = null;
    const gltf = models.get('villager');
    if (gltf) {
      const m = skeletonClone(gltf.scene);
      const box = new THREE.Box3().setFromObject(m);
      m.scale.setScalar(1.75 / box.getSize(new THREE.Vector3()).y);
      m.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o.castShadow = true), (o.frustumCulled = false)) : null));
      this.villagerMixer = new THREE.AnimationMixer(m);
      for (const clip of gltf.animations) this.villagerActions.set(clip.name, this.villagerMixer.clipAction(clip));
      model = m;
      this.villagerAnim('idle');
    }
    if (model) g.add(model);
    else {
      const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.6, 6, 14), new THREE.MeshStandardMaterial({ color: '#6fb7e8' }));
      body.position.y = 0.75;
      const apron = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.35, 6, 14, 1), new THREE.MeshStandardMaterial({ color: '#fff4e4' }));
      apron.position.set(0, 0.6, 0.05);
      apron.scale.set(0.9, 1, 0.9);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), new THREE.MeshStandardMaterial({ color: '#f2c4a0' }));
      head.position.y = 1.42;
      const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.5, 0.18, 20), new THREE.MeshStandardMaterial({ color: '#f1cf6a' }));
      hat.position.y = 1.66;
      for (const s of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshBasicMaterial({ color: '#2a1a1a' }));
        eye.position.set(s * 0.09, 1.46, 0.23);
        g.add(eye);
      }
      g.add(body, apron, head, hat);
    }
    g.position.copy(VILLAGER_POS);
    g.lookAt(new THREE.Vector3(0, 0, 7.6));
    g.traverse((o) => ((o as THREE.Mesh).isMesh ? (o.castShadow = true) : null));
    this.group.add(g);
  }

  private buildShowProps() {
    const S = this.showProps;
    // Stage with bunting and lanterns.
    const stage = new THREE.Mesh(new THREE.CylinderGeometry(3, 3.2, 0.4, 32), new THREE.MeshStandardMaterial({ color: '#f5e6ff', roughness: 0.6 }));
    stage.position.set(5.5, 0.2, -5);
    stage.receiveShadow = true;
    S.add(stage);
    const flagCols = ['#ff6fa8', '#ffd84d', '#6fe0ff', '#b98cff'];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const flag = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.4, 3), new THREE.MeshStandardMaterial({ color: flagCols[i % 4], emissive: flagCols[i % 4], emissiveIntensity: 0.3 }));
      flag.rotation.x = Math.PI;
      flag.position.set(5.5 + Math.cos(a) * 3, 3 + Math.sin(i) * 0.05, -5 + Math.sin(a) * 3);
      S.add(flag);
    }
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8), new THREE.MeshStandardMaterial({ color: '#ffe9a8', emissive: '#ffcf6b', emissiveIntensity: 2 }));
      lamp.position.set(Math.cos(a) * 9, 2.2, Math.sin(a) * 9);
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 6), new THREE.MeshStandardMaterial({ color: '#4a3a6a' }));
      pole.position.set(Math.cos(a) * 9, 1.1, Math.sin(a) * 9);
      S.add(lamp, pole);
    }
    // Pedigree board (next to the order board).
    const ped = new THREE.Group();
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.2, 2.4, 0.1), new THREE.MeshStandardMaterial({ color: '#3d2f63' }));
    back.position.y = 1.9;
    const paper = new THREE.Mesh(new THREE.PlaneGeometry(3, 2.25), new THREE.MeshStandardMaterial({ map: this.pedigreeTex, roughness: 0.9 }));
    paper.position.set(0, 1.9, 0.06);
    for (const sx of [-1.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.14, 3.1, 0.14), new THREE.MeshStandardMaterial({ color: '#2a2048' }));
      post.position.set(sx, 1.55, 0);
      ped.add(post);
    }
    ped.add(back, paper);
    ped.position.set(-1.2, 0, -1.6);
    ped.lookAt(new THREE.Vector3(0, 0, 7.6));
    ped.userData.kind = 'pedigree';
    ped.traverse((o) => ((o as THREE.Mesh).isMesh ? ((o.castShadow = true), (o.userData.kind = 'pedigree')) : null));
    S.add(ped);
    // Show island trees: crystal spires.
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      const r = 14 + hash(i, 51) * 4;
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (z > 6 && Math.abs(x) < 6) continue;
      const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.8 + hash(i, 52), 0), new THREE.MeshStandardMaterial({ color: '#9fe8ff', emissive: '#6fb8ff', emissiveIntensity: 0.5, roughness: 0.2 }));
      c.scale.y = 2.4;
      c.position.set(x, heightAt(x, z) + 1.6, z);
      c.castShadow = true;
      S.add(c);
    }
  }

  setPalette(name: 'ranch' | 'show') {
    const p = (this.palette = PALETTES[name]);
    this.skyU.top.value.set(p.skyTop);
    this.skyU.horizon.value.set(p.skyHorizon);
    this.skyU.bottom.value.set(p.skyBottom);
    this.skyU.sunCol.value.set(p.sun);
    this.skyU.stars.value = p.stars ? 1 : 0;
    (this.scene.fog as THREE.Fog).color.set(p.fog);
    this.hemi.color.set(p.hemiSky);
    this.hemi.groundColor.set(p.hemiGround);
    this.sun.color.set(p.sun);
    this.sun.intensity = p.sunIntensity;
    this.ranchProps.visible = name === 'ranch';
    this.showProps.visible = name === 'show';
    // Repaint the ground.
    const g = this.ground.geometry;
    const mix = g.getAttribute('mix') as THREE.BufferAttribute;
    const col = g.getAttribute('color') as THREE.BufferAttribute;
    const a = new THREE.Color(p.grass);
    const b = new THREE.Color(p.grass2);
    const dirt = new THREE.Color(name === 'ranch' ? '#e2bf88' : '#c9b8f0');
    const c = new THREE.Color();
    for (let i = 0; i < mix.count; i++) {
      c.copy(a).lerp(b, mix.getX(i));
      c.lerp(dirt, Math.min(1, mix.getY(i)));
      col.setXYZ(i, c.r, c.g, c.b);
    }
    col.needsUpdate = true;
  }

  update(dt: number, t: number) {
    this.villagerMixer?.update(dt);
    if (this.villagerBack > 0 && (this.villagerBack -= dt) <= 0) this.villagerAnim('idle');
    if (this.blades) this.blades.rotation.z += dt * 0.6;
    this.clouds.rotation.y = t * 0.004;
    const glow = this.nest.getObjectByName('nestGlow') as THREE.Mesh;
    if (glow) glow.scale.setScalar(1 + Math.sin(t * 4) * 0.03);
  }
}

function segDist(px: number, pz: number, ax: number, az: number, bx: number, bz: number): number {
  const dx = bx - ax;
  const dz = bz - az;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / (dx * dx + dz * dz)));
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
