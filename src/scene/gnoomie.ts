// A Gnoomie in 3D: a base body (Tripo rigged GLB when available, procedural otherwise)
// with procedural trait parts, so every genotype renders exactly.
import * as THREE from 'three';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { COLORS, type Look } from './look';

export type Anim = 'idle' | 'hop' | 'happy' | 'sleepy';

export interface BodyTemplate {
  scene: THREE.Object3D;
  clips: THREE.AnimationClip[];
  /** Clip name for each of our animation roles. */
  roles: Partial<Record<Anim, string>>;
  /** Uniform scale that makes the body ~0.8 m tall. */
  scale: number;
  /** Bone name the ears/antenna attach to (head), and local offsets in body space. */
  headBone?: string;
  headTop: THREE.Vector3;
  rear: THREE.Vector3;
  /** Body radius (m, after scale) for pattern mapping. */
  radius: number;
}

const R = 0.36;

const patternChunks = {
  vertexHead: 'varying vec3 vObj;\n',
  vertexBody: 'vObj = position;\n',
  fragHead: `
varying vec3 vObj;
uniform float uStripes; uniform float uSpots; uniform vec3 uStripeCol; uniform vec3 uSpotCol;
uniform float uInvR; uniform vec3 uTint; uniform float uTintMix; uniform vec3 uCenter;
vec3 hash3(vec3 p){ p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6))); return fract(sin(p)*43758.5453); }
`,
  fragBody: `
{
  vec3 q = (vObj - uCenter) * uInvR;
  float lum = dot(diffuseColor.rgb, vec3(0.299,0.587,0.114));
  float mx = max(diffuseColor.r, max(diffuseColor.g, diffuseColor.b));
  float mn = min(diffuseColor.r, min(diffuseColor.g, diffuseColor.b));
  float sat = (mx - mn) / max(mx, 1e-3);
  float fur = smoothstep(0.42, 0.62, lum) * (1.0 - smoothstep(0.14, 0.32, sat));
  diffuseColor.rgb = mix(diffuseColor.rgb, uTint * (0.55 + 0.6 * lum), fur * uTintMix);
  float face = smoothstep(0.3, 0.7, q.z) * smoothstep(-0.55, -0.25, q.y) * (1.0 - smoothstep(0.35, 0.6, q.y));
  float m = (1.0 - face) * mix(1.0, fur, uTintMix);
  if (uStripes > 0.5) {
    float s = sin(q.y * 13.0 + sin(atan(q.x, q.z) * 3.0) * 0.7);
    diffuseColor.rgb = mix(diffuseColor.rgb, uStripeCol, smoothstep(0.5, 0.62, s) * m);
  }
  if (uSpots > 0.5) {
    vec3 c = q * 3.0; vec3 id = floor(c); vec3 f = fract(c); float d = 9.0;
    for (int x=-1;x<=1;x++) for (int y=-1;y<=1;y++) for (int z=-1;z<=1;z++) {
      vec3 o = vec3(float(x),float(y),float(z));
      vec3 pnt = o + 0.2 + 0.6 * hash3(id + o);
      d = min(d, length(f - pnt));
    }
    diffuseColor.rgb = mix(diffuseColor.rgb, uSpotCol, (1.0 - smoothstep(0.22, 0.27, d)) * m);
  }
}
`,
};

function patternMaterial(base: THREE.MeshStandardMaterial, tintMix: number, center: THREE.Vector3, invR: number) {
  const mat = base.clone();
  const uniforms = {
    uStripes: { value: 0 },
    uSpots: { value: 0 },
    uStripeCol: { value: new THREE.Color(COLORS.stripe) },
    uSpotCol: { value: new THREE.Color(COLORS.spot) },
    uInvR: { value: invR },
    uTint: { value: new THREE.Color(COLORS.pink) },
    uTintMix: { value: tintMix },
    uCenter: { value: center.clone() },
  };
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = patternChunks.vertexHead + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n' + patternChunks.vertexBody);
    sh.fragmentShader = patternChunks.fragHead + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + patternChunks.fragBody);
  };
  mat.customProgramCacheKey = () => 'gnoomie-pattern-' + tintMix;
  return { mat, uniforms };
}

function leafLathe(len: number, w: number): THREE.BufferGeometry {
  const pts: THREE.Vector2[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12;
    pts.push(new THREE.Vector2(Math.sin(Math.PI * Math.pow(t, 0.8)) * w + 0.001, t * len));
  }
  const g = new THREE.LatheGeometry(pts, 14);
  g.scale(1, 1, 0.45);
  return g;
}

const earGeo = leafLathe(0.36, 0.105);
const earInnerGeo = leafLathe(0.27, 0.06);
const eyeWhite = new THREE.SphereGeometry(0.085, 20, 16);
const pupil = new THREE.SphereGeometry(0.062, 20, 16);
const glint = new THREE.SphereGeometry(0.02, 8, 6);
const footGeo = new THREE.SphereGeometry(0.1, 16, 12);
const bodyGeo = new THREE.SphereGeometry(R, 48, 36);
const hitGeo = new THREE.SphereGeometry(0.75, 10, 8);
const ringGeo = new THREE.TorusGeometry(0.55, 0.035, 8, 40);

function tailCurve(curly: boolean): THREE.Curve<THREE.Vector3> {
  if (!curly) return new THREE.LineCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0.16, -0.36));
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i <= 24; i++) {
    const t = i / 24;
    const a = t * Math.PI * 3.2;
    const r = 0.11 * (1 - t * 0.55);
    pts.push(new THREE.Vector3(Math.sin(a) * r * 0.4, 0.05 + Math.sin(a) * r + t * 0.12, -0.05 - (1 - Math.cos(a)) * r - t * 0.1));
  }
  return new THREE.CatmullRomCurve3(pts);
}
const tailGeos = { curly: new THREE.TubeGeometry(tailCurve(true), 48, 0.035, 8), straight: new THREE.TubeGeometry(tailCurve(false), 8, 0.04, 8) };
const tuftGeo = new THREE.SphereGeometry(0.075, 12, 10);

export class GnoomieView {
  readonly root = new THREE.Group();
  /** Squash/stretch + hop offset live here; the base body sits inside. */
  readonly bounce = new THREE.Group();
  readonly hit: THREE.Mesh;
  readonly ring: THREE.Mesh;
  private uniforms!: ReturnType<typeof patternMaterial>['uniforms'];
  private bodyMat!: THREE.MeshStandardMaterial;
  private earL = new THREE.Group();
  private earR = new THREE.Group();
  private earMats: THREE.MeshStandardMaterial[] = [];
  private tail = new THREE.Group();
  private antenna = new THREE.Group();
  private bulb!: THREE.Mesh;
  private halo!: THREE.Sprite;
  private eyes: THREE.Object3D[] = [];
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<Anim, THREE.AnimationAction>();
  private current: Anim | null = null;
  private t = Math.random() * 10;
  private blinkIn = 2 + Math.random() * 3;
  private earSpring = { v: 0, x: 0 };
  look: Look | null = null;
  anim: Anim = 'idle';
  /** 0..1 progress of a procedural hop; <0 when not hopping. */
  hopT = -1;
  hopHeight = 0.35;
  happyT = -1;

  constructor(readonly id: string, template: BodyTemplate | null, private haloTex: THREE.Texture) {
    this.root.add(this.bounce);
    if (template) this.buildFromTemplate(template);
    else this.buildProcedural();
    const hitMat = new THREE.MeshBasicMaterial({ visible: false });
    this.hit = new THREE.Mesh(hitGeo, hitMat);
    this.hit.position.y = 0.45;
    this.hit.userData = { kind: 'creature', id };
    this.root.add(this.hit);
    this.ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color: '#fff7a8', transparent: true, opacity: 0.85, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 0.03;
    this.ring.visible = false;
    this.root.add(this.ring);
    this.root.traverse((o) => {
      if ((o as THREE.Mesh).isMesh && o !== this.hit && o !== this.ring) {
        o.castShadow = true;
        (o as THREE.Mesh).userData.creatureId = id;
      }
    });
  }

  private earMesh(): THREE.Group {
    const g = new THREE.Group();
    const outer = new THREE.MeshStandardMaterial({ color: COLORS.pink, roughness: 0.75 });
    const inner = new THREE.MeshStandardMaterial({ color: COLORS.earInner, roughness: 0.8 });
    this.earMats.push(outer);
    const o = new THREE.Mesh(earGeo, outer);
    const i = new THREE.Mesh(earInnerGeo, inner);
    i.position.set(0, 0.03, 0.025);
    g.add(o, i);
    return g;
  }

  /**
   * Build ears, tail and antenna in body space. With a rigged body, the head parts are then
   * re-parented to the head bone with Object3D.attach (keeps the bind-pose placement), so they
   * follow the Tripo animation; their own pose rotations stay in body-aligned pivot space.
   */
  private addParts(headTop: THREE.Vector3, rear: THREE.Vector3, k: number, headBone: THREE.Object3D | null) {
    const pivots: THREE.Object3D[] = [];
    for (const [ear, side] of [
      [this.earL, -1],
      [this.earR, 1],
    ] as const) {
      const pivot = new THREE.Group();
      ear.add(this.earMesh());
      pivot.position.set(headTop.x + side * 0.17 * k, headTop.y - 0.04 * k, headTop.z);
      pivot.scale.setScalar(k);
      ear.userData.side = side;
      pivot.add(ear);
      this.bounce.add(pivot);
      pivots.push(pivot);
    }
    this.tail.position.copy(rear);
    this.tail.scale.setScalar(k);
    this.bounce.add(this.tail);
    const stalkCurve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.06, 0.16, 0.02), new THREE.Vector3(0.02, 0.28, 0.04));
    const stalk = new THREE.Mesh(new THREE.TubeGeometry(stalkCurve, 12, 0.014, 6), new THREE.MeshStandardMaterial({ color: '#6b4a7a', roughness: 0.6 }));
    this.bulb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), new THREE.MeshStandardMaterial({ color: COLORS.glow, emissive: COLORS.glow, emissiveIntensity: 2.2 }));
    this.bulb.position.set(0.02, 0.3, 0.04);
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.haloTex, color: COLORS.glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    this.halo.scale.setScalar(0.45);
    this.halo.position.copy(this.bulb.position);
    this.antenna.add(stalk, this.bulb, this.halo);
    this.antenna.position.copy(headTop);
    this.antenna.scale.setScalar(k);
    this.bounce.add(this.antenna);
    pivots.push(this.antenna);
    if (headBone) {
      this.root.updateMatrixWorld(true);
      for (const p of pivots) headBone.attach(p);
    }
  }

  private buildProcedural() {
    const { mat, uniforms } = patternMaterial(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.72 }), 0, new THREE.Vector3(0, 0, 0), 1 / R);
    this.uniforms = uniforms;
    this.bodyMat = mat;
    const body = new THREE.Mesh(bodyGeo, mat);
    body.scale.set(1, 0.93, 0.96);
    body.position.y = R * 0.93 + 0.04;
    this.bounce.add(body);
    // Face.
    const white = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.25 });
    const dark = new THREE.MeshStandardMaterial({ color: '#25163a', roughness: 0.15 });
    const shine = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    for (const side of [-1, 1]) {
      const eye = new THREE.Group();
      const w = new THREE.Mesh(eyeWhite, white);
      w.scale.set(1, 1.15, 0.6);
      const p = new THREE.Mesh(pupil, dark);
      p.position.z = 0.035;
      p.scale.set(1, 1.15, 0.6);
      const gl = new THREE.Mesh(glint, shine);
      gl.position.set(-0.02, 0.03, 0.075);
      eye.add(w, p, gl);
      eye.position.set(side * 0.12, body.position.y + 0.04, R * 0.86);
      eye.rotation.y = side * 0.25;
      this.eyes.push(eye);
      this.bounce.add(eye);
      const cheek = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: '#ff7ea8', transparent: true, opacity: 0.55 }));
      cheek.scale.set(1.3, 0.7, 0.4);
      cheek.position.set(side * 0.22, body.position.y - 0.06, R * 0.84);
      this.bounce.add(cheek);
    }
    const mouth = new THREE.Mesh(new THREE.TorusGeometry(0.04, 0.012, 6, 16, Math.PI), dark);
    mouth.rotation.z = Math.PI;
    mouth.position.set(0, body.position.y - 0.07, R * 0.93);
    this.bounce.add(mouth);
    for (const side of [-1, 1]) {
      const foot = new THREE.Mesh(footGeo, mat);
      foot.scale.set(1, 0.55, 1.3);
      foot.position.set(side * 0.16, 0.05, 0.08);
      this.bounce.add(foot);
      const arm = new THREE.Mesh(footGeo, mat);
      arm.scale.set(0.6, 0.9, 0.6);
      arm.position.set(side * 0.34, body.position.y - 0.08, 0.04);
      arm.rotation.z = side * 0.5;
      this.bounce.add(arm);
    }
    const headTop = new THREE.Vector3(0, body.position.y + R * 0.82, -0.02);
    this.addParts(headTop, new THREE.Vector3(0, 0.22, -R * 0.9), 1, null);
  }

  private buildFromTemplate(t: BodyTemplate) {
    const model = skeletonClone(t.scene);
    model.scale.setScalar(t.scale);
    this.bounce.add(model);
    let bodyMesh: THREE.Mesh | null = null;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh && !bodyMesh) bodyMesh = m;
    });
    if (bodyMesh) {
      const bm = bodyMesh as THREE.Mesh;
      const src = bm.material as THREE.MeshStandardMaterial;
      bm.geometry.computeBoundingBox();
      const bb = bm.geometry.boundingBox!;
      const center = bb.getCenter(new THREE.Vector3());
      const size = bb.getSize(new THREE.Vector3());
      const { mat, uniforms } = patternMaterial(src, 1, center, 2 / Math.max(size.x, size.y * 0.8));
      this.uniforms = uniforms;
      this.bodyMat = mat;
      bm.material = mat;
    }
    const bone = t.headBone ? model.getObjectByName(t.headBone) ?? null : null;
    this.addParts(t.headTop, t.rear, t.radius / R, bone);
    if (t.clips.length) {
      this.mixer = new THREE.AnimationMixer(model);
      for (const role of ['idle', 'hop', 'happy', 'sleepy'] as Anim[]) {
        const name = t.roles[role];
        const clip = name ? t.clips.find((c) => c.name === name) : undefined;
        if (clip) this.actions.set(role, this.mixer.clipAction(clip));
      }
    }
  }

  setLook(L: Look) {
    this.look = L;
    const col = new THREE.Color(L.body);
    if (this.uniforms.uTintMix.value > 0.5) this.uniforms.uTint.value.copy(col);
    else this.bodyMat.color.copy(col);
    this.uniforms.uStripes.value = L.stripes ? 1 : 0;
    this.uniforms.uSpots.value = L.spots ? 1 : 0;
    for (const m of this.earMats) m.color.copy(col).multiplyScalar(0.94);
    // Ear pose.
    for (const ear of [this.earL, this.earR]) {
      const s = ear.userData.side as number;
      if (L.ears === 'upright') ear.rotation.set(-0.1, 0, -s * 0.32);
      else ear.rotation.set(0.35, 0, -s * 2.15);
    }
    this.tail.clear();
    const tailMat = new THREE.MeshStandardMaterial({ color: col.clone().multiplyScalar(0.9), roughness: 0.75 });
    const tube = new THREE.Mesh(tailGeos[L.tail], tailMat);
    const tuft = new THREE.Mesh(tuftGeo, tailMat);
    const end = L.tail === 'curly' ? tailCurve(true).getPoint(1) : new THREE.Vector3(0, 0.16, -0.36);
    tuft.position.copy(end);
    tube.castShadow = tuft.castShadow = true;
    this.tail.add(tube, tuft);
    this.antenna.visible = L.glow;
  }

  play(a: Anim) {
    this.anim = a;
    if (a === 'happy') this.happyT = 0;
    if (!this.mixer) return;
    const next = this.actions.get(a) ?? this.actions.get('idle');
    const cur = this.current ? this.actions.get(this.current) : null;
    if (!next || next === cur) return;
    next.reset().setEffectiveWeight(1).fadeIn(0.25).play();
    next.setLoop(THREE.LoopRepeat, Infinity);
    cur?.fadeOut(0.25);
    this.current = a;
    // Long Tripo clips (cheer is 12 s): play a short burst, then settle back.
    this.clipLeft = a === 'happy' ? 2.2 : a === 'hop' ? 1.2 : Infinity;
  }
  private clipLeft = Infinity;

  /** Start a procedural hop (vertical arc); the caller moves root along the ground. */
  hop(height = 0.35) {
    this.hopT = 0;
    this.hopHeight = height;
  }

  update(dt: number, reduced: boolean) {
    this.t += dt;
    this.mixer?.update(dt);
    if (this.mixer && this.current && this.current !== 'idle') {
      this.clipLeft -= dt;
      if (this.clipLeft <= 0) this.play('idle');
    }
    let y = 0;
    let sy = 1;
    if (this.hopT >= 0) {
      this.hopT += dt / 0.42;
      const h = Math.min(1, this.hopT);
      y = Math.sin(h * Math.PI) * this.hopHeight;
      sy = 1 + Math.sin(h * Math.PI) * 0.12;
      if (this.hopT >= 1) {
        this.hopT = -1;
        this.earSpring.v -= 4;
      }
    } else if (this.happyT >= 0) {
      this.happyT += dt;
      const p = this.happyT / 1.1;
      y = Math.abs(Math.sin(p * Math.PI * 2)) * 0.32;
      this.bounce.rotation.y = reduced ? 0 : p * Math.PI * 2;
      if (p >= 1) (this.happyT = -1), (this.bounce.rotation.y = 0);
    } else {
      sy = 1 + Math.sin(this.t * 2.4) * 0.025;
    }
    if (reduced) y *= 0.4;
    this.bounce.position.y = y;
    this.bounce.scale.set(1 / Math.sqrt(sy), sy, 1 / Math.sqrt(sy));
    // Ear spring.
    const s = this.earSpring;
    s.v += (-s.x * 60 - s.v * 6) * dt;
    s.x += s.v * dt;
    if (this.look)
      for (const ear of [this.earL, this.earR]) {
        const side = ear.userData.side as number;
        const baseZ = this.look.ears === 'upright' ? -side * 0.32 : -side * 2.15;
        ear.rotation.z = baseZ + side * s.x * 0.25;
      }
    // Blink.
    this.blinkIn -= dt;
    const blink = this.blinkIn < 0.12 && this.blinkIn > 0;
    for (const e of this.eyes) e.scale.y = blink ? 0.12 : 1;
    if (this.blinkIn < 0) this.blinkIn = 2 + Math.random() * 4;
    if (this.antenna.visible) {
      const k = 0.85 + Math.sin(this.t * 4) * 0.15;
      this.halo.scale.setScalar(0.45 * k);
      (this.bulb.material as THREE.MeshStandardMaterial).emissiveIntensity = 1.8 + k;
    }
    if (this.ring.visible) {
      const k = 1 + Math.sin(this.t * 5) * 0.08;
      this.ring.scale.setScalar(k);
    }
  }

  dispose() {
    this.root.removeFromParent();
    this.mixer?.stopAllAction();
  }
}
