// Glue: owns the renderer, the Game, creature views, input, overlays and test hooks.
import * as THREE from 'three';
import { Sfx } from './audio';
import { DAYS } from './game/days';
import { BELT_MAX, Game, HATCH_MS, pct, type GameEvent } from './game/state';
import { GENES, type GeneId } from './genetics/genes';
import { cardAlleles } from './genetics/deduce';
import { Confetti, Egg, NetGun, Sparkles, softDotTexture } from './scene/fx';
import { GnoomieView, type BodyTemplate } from './scene/gnoomie';
import { lookOf } from './scene/look';
import { Player } from './scene/player';
import { PunnettLens, type LensSquare } from './scene/punnett';
import { BARN_POS, BOARD_POS, HATCH_SPOT, MEADOW_CENTER, MEADOW_R, NEST_POS, NEST_SLOTS, SPAWN, SPAWN_LOOK, VILLAGER_POS, World, heightAt } from './scene/world';
import { drawOrderBoard, drawPedigree } from './ui/boards';
import { Hud, phenoName } from './ui/hud';
import { portraitURL } from './scene/look';

type Fly = { kind: 'suck' | 'shoot' | 'deliver' | 'bounceBack'; from: THREE.Vector3; to: THREE.Vector3 | null; t: number; dur: number };
interface Ctl {
  view: GnoomieView;
  fly: Fly | null;
  showT: number;
  wanderT: number;
  target: THREE.Vector3;
  tag: THREE.Sprite;
  tagKey: string;
}

const STEP = 1 / 60;
const RING: [0 | 1, 0 | 1][] = [
  [0, 0],
  [0, 1],
  [1, 1],
  [1, 0],
];

interface Progress {
  unlocked: number;
  stars: number[];
}

function load<T>(k: string, d: T): T {
  try {
    const v = localStorage.getItem(k);
    return v ? (JSON.parse(v) as T) : d;
  } catch {
    return d;
  }
}
function save(k: string, v: unknown) {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {
    /* storage may be blocked */
  }
}

export class App {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(62, 1, 0.05, 900);
  readonly world: World;
  readonly player: Player;
  readonly lens: PunnettLens;
  readonly egg = new Egg();
  readonly gun = new NetGun();
  readonly sparkles: Sparkles;
  readonly confetti = new Confetti();
  readonly hud: Hud;
  readonly sfx = new Sfx();
  readonly halo: THREE.Texture;
  game!: Game;
  private views = new Map<string, Ctl>();
  private raycaster = new THREE.Raycaster();
  private arrow: THREE.Group;
  private sweat: THREE.Sprite;
  private sweatT = 0;
  private villagerHop = 0;
  private paused = true;
  private manual = false;
  private acc = 0;
  private last = performance.now();
  private time = 0;
  private shake = 0;
  reduced = load('gene-ranch-reduced', false);
  private progress: Progress = load('gene-ranch-progress', { unlocked: 1, stars: [] as number[] });
  private overlayName = 'title';
  private coach = '';
  private revealPheno: Record<GeneId, string> | null = null;
  private litHold = 0;
  private lastTick = -1;
  private wobbleN = 0;
  private drag: { x: number; y: number; moved: boolean; id: number } | null = null;
  private seedParam: number | null;
  private boardKey = '';
  private dayIdx = 0;
  private attempt = 1;
  private actionsDone = { caught: false, placed: false, hatched: false, delivered: false };
  private fps = { frames: 0, t: 0, value: 0 };

  constructor(
    readonly canvas: HTMLCanvasElement,
    readonly hudEl: HTMLElement,
    readonly overlay: HTMLElement,
    private template: BodyTemplate | null,
  ) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.scene.add(this.camera);
    this.world = new World(this.scene);
    this.player = new Player(this.camera);
    this.player.obstacles.push({ x: NEST_POS.x, z: NEST_POS.z, r: 1.7 }, { x: BARN_POS.x, z: BARN_POS.z, r: 3.4 }, { x: BOARD_POS.x, z: BOARD_POS.z, r: 1.6 }, { x: VILLAGER_POS.x, z: VILLAGER_POS.z, r: 0.7 });
    this.lens = new PunnettLens(NEST_POS);
    this.lens.addTo(this.scene);
    this.egg.addTo(this.scene);
    this.gun.attach(this.camera, this.scene);
    this.halo = softDotTexture();
    this.sparkles = new Sparkles(this.halo);
    this.scene.add(this.sparkles.points, this.confetti.mesh);
    // Guide arrow.
    this.arrow = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.45, 16), new THREE.MeshBasicMaterial({ color: '#ffd84d' }));
    cone.rotation.x = Math.PI;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.05, 8, 20), new THREE.MeshBasicMaterial({ color: '#ffffff' }));
    ring.position.y = 0.3;
    ring.rotation.x = Math.PI / 2;
    this.arrow.add(cone, ring);
    this.arrow.visible = false;
    this.scene.add(this.arrow);
    // Villager sweat-drop.
    const sc = document.createElement('canvas');
    sc.width = sc.height = 128;
    const sx = sc.getContext('2d')!;
    sx.font = '96px serif';
    sx.textAlign = 'center';
    sx.fillText('💦', 64, 100);
    this.sweat = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthTest: false }));
    this.sweat.scale.setScalar(0.6);
    this.sweat.position.copy(VILLAGER_POS).add(new THREE.Vector3(0.35, 2.0, 0));
    this.sweat.visible = false;
    this.scene.add(this.sweat);

    this.hud = new Hud(hudEl, {
      select: (id) => this.act(() => this.game.select(id)),
      place: (id) => this.act(() => this.game.place(id)),
      release: (id) => this.act(() => this.game.release(id)),
      deliver: (o, id) => this.act(() => this.game.deliver(o, id)),
      hatch: () => this.act(() => this.game.hatchEgg()),
      temp: (t) => this.act(() => this.game.setNestTemp(t)),
      hint: () => this.showHint(),
      pause: () => this.showPause(),
      mute: () => this.toggleMute(),
      pedigree: () => this.showPedigree(),
    });
    const params = new URLSearchParams(location.search);
    this.seedParam = params.has('seed') ? Number(params.get('seed')) : null;
    this.sfx.setMuted(load('gene-ranch-muted', false));
    document.getElementById('app')!.classList.toggle('reduced', this.reduced);
    this.bindInput();
    this.resize();
    window.addEventListener('resize', () => this.resize());
    new ResizeObserver(() => this.resize()).observe(canvas.parentElement!);
    this.startDay(Math.min(Number(params.get('day') ?? 1) - 1, DAYS.length - 1) || 0, false);
    if (params.has('day') && params.get('skipintro') === '1') this.closeOverlay();
    else this.showTitle();
    requestAnimationFrame(this.frame);
  }

  // ---------- day flow ----------
  startDay(i: number, intro = true) {
    this.dayIdx = i;
    const seed = this.seedParam ?? Math.floor(Math.random() * 2 ** 31);
    this.game = new Game(i, seed + (this.attempt - 1) * 7919, this.attempt);
    for (const c of this.views.values()) (c.view.dispose(), c.tag.removeFromParent());
    this.views.clear();
    this.world.setPalette(this.game.day.island);
    this.world.frost.visible = false;
    this.player.place(SPAWN, SPAWN_LOOK);
    this.egg.group.visible = false;
    this.revealPheno = null;
    this.boardKey = '';
    // Wild creatures start close, in a friendly arc in front of the player.
    const wild = this.game.list('meadow');
    wild.forEach((c, k) => {
      const ctl = this.ensureView(c.id);
      const n = wild.length;
      // Spread across the view, left of the nest, nearest first.
      const span = n <= 2 ? 1.9 : 3.0;
      const x = -2.0 - (n > 2 ? 0.6 : 0) + (n === 1 ? 1 : (k * span) / (n - 1));
      const z = 4.5 + (k % 2) * 0.8 - (n > 3 ? 0.6 : 0);
      ctl.view.root.position.set(x, 0, z);
      ctl.target.set(x, 0, z);
      ctl.view.root.lookAt(SPAWN.x, 0, SPAWN.z);
    });
    if (intro) this.showIntro();
  }

  private ensureView(id: string): Ctl {
    let c = this.views.get(id);
    if (c) return c;
    const view = new GnoomieView(id, this.template, this.halo);
    view.setLook(lookOf(this.game.pheno(id)));
    this.scene.add(view.root);
    const tag = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false }));
    tag.scale.set(0.9, 0.225, 1);
    this.scene.add(tag);
    c = { view, fly: null, showT: 0, wanderT: Math.random() * 2, target: new THREE.Vector3(), tag, tagKey: '' };
    this.views.set(id, c);
    return c;
  }

  private nozzle(): THREE.Vector3 {
    return this.gun.nozzle.getWorldPosition(new THREE.Vector3());
  }

  private act(fn: () => unknown) {
    this.sfx.unlock();
    if (this.paused) return;
    fn();
  }

  private handleEvents(evs: GameEvent[]) {
    const g = this.game;
    for (const e of evs) {
      switch (e.type) {
        case 'caught': {
          const c = this.ensureView(e.id);
          c.fly = { kind: 'suck', from: c.view.root.position.clone(), to: null, t: 0, dur: 0.45 };
          this.gun.fire(c.view.root.position.clone().setY(0.5));
          this.sfx.whoosh();
          this.actionsDone.caught = true;
          break;
        }
        case 'unplaced': {
          this.hud.hatchInfo = null;
          const c = this.ensureView(e.id);
          if (g.get(e.id).loc === 'belt') {
            c.fly = { kind: 'suck', from: c.view.root.position.clone(), to: null, t: 0, dur: 0.4 };
            this.gun.fire(c.view.root.position.clone());
            this.sfx.whoosh();
          }
          break;
        }
        case 'placed': {
          this.hud.hatchInfo = null;
          const c = this.ensureView(e.id);
          c.view.setLook(lookOf(g.pheno(e.id)));
          c.fly = { kind: 'shoot', from: this.nozzle(), to: NEST_SLOTS[e.slot].clone(), t: 0, dur: 0.55 };
          this.gun.fire(NEST_SLOTS[e.slot]);
          this.sfx.shoot();
          this.actionsDone.placed = true;
          break;
        }
        case 'released': {
          const c = this.ensureView(e.id);
          const to = this.camera.position.clone().add(new THREE.Vector3(-Math.sin(this.player.yaw), 0, -Math.cos(this.player.yaw)).multiplyScalar(3)).setY(0);
          c.target.copy(to);
          c.fly = { kind: 'shoot', from: this.nozzle(), to, t: 0, dur: 0.55 };
          this.gun.fire(to);
          this.sfx.shoot();
          break;
        }
        case 'hatchStart':
          this.revealPheno = null;
          this.lastTick = -1;
          this.wobbleN = 0;
          this.egg.group.visible = true;
          this.egg.group.scale.setScalar(0.01);
          break;
        case 'hatched': {
          const c = this.ensureView(e.id);
          c.view.setLook(lookOf(g.pheno(e.id)));
          c.view.root.position.copy(HATCH_SPOT);
          c.view.root.lookAt(this.camera.position.x, 0, this.camera.position.z);
          c.view.root.scale.setScalar(0.2);
          c.showT = 1.6;
          c.view.play('happy');
          this.egg.crack(HATCH_SPOT.clone());
          this.sparkles.burst(HATCH_SPOT.clone().setY(0.6), 50, ['#ffffff', '#ffe27a', '#ffb3d1'], 3);
          this.sfx.pop();
          this.shake = this.reduced ? 0 : 0.25;
          this.litHold = 3.5;
          this.revealPheno = g.pheno(e.id);
          this.actionsDone.hatched = true;
          this.hud.setHatch(g, e.id);
          if (e.matches.length) {
            this.confetti.burst(HATCH_SPOT.clone().setY(1), 90);
            setTimeout(() => this.sfx.cheer(), 150);
            this.hud.toast(`${g.get(e.id).name} מתאים להזמנה! לחצו "מסרו" בהזמנה ⭐`);
          } else if (!g.day.lens) {
            const p = g.pheno(e.id);
            this.hud.toast(`בקע ${g.get(e.id).name}: ${g.day.genes.map((gene) => phenoName(gene, p[gene])).join(' · ')}`);
          }
          if (!e.toBelt) this.hud.toast('הכיס מלא — הגור קפץ לאחו. שחררו גנומי כדי לפנות מקום.');
          break;
        }
        case 'delivered': {
          this.hud.hatchInfo = null;
          const c = this.ensureView(e.id);
          c.fly = { kind: 'deliver', from: this.nozzle(), to: VILLAGER_POS.clone().add(new THREE.Vector3(0.6, 0, 0.6)), t: 0, dur: 0.6 };
          this.gun.fire(VILLAGER_POS);
          this.sfx.shoot();
          this.villagerHop = this.world.hasVillagerRig ? 0 : 1.2;
          this.world.villagerAnim('cheer', 3);
          this.actionsDone.delivered = true;
          setTimeout(() => {
            this.sfx.cheer();
            this.confetti.burst(VILLAGER_POS.clone().setY(1.6), e.filled ? 120 : 50);
          }, 550);
          if (e.filled && g.phase !== 'won') this.hud.toast('הזמנה הושלמה! 🎉');
          break;
        }
        case 'wrongDelivery': {
          const c = this.ensureView(e.id);
          c.fly = { kind: 'bounceBack', from: this.nozzle(), to: VILLAGER_POS.clone().add(new THREE.Vector3(0.6, 0, 0.6)), t: 0, dur: 1.6 };
          this.gun.fire(VILLAGER_POS);
          this.sfx.shoot();
          this.sweatT = 3;
          this.world.villagerAnim('frustrated_01', 3.5);
          setTimeout(() => this.sfx.aww(), 600);
          setTimeout(() => this.showExplain('אופס — לא בדיוק…', e.explainHe, 'הבנתי, ננסה שוב'), 1300);
          break;
        }
        case 'rejected':
          this.hud.toast(e.reasonHe);
          this.sfx.soft();
          break;
        case 'bonusEggs':
          this.showExplain(`הסבתא הביאה עוד ${e.n} ביצים 🧺`, e.explainHe, 'יאללה, ממשיכים!');
          break;
        case 'outOfEggs':
          setTimeout(() => this.showFail(e.explainHe), 1600);
          break;
        case 'won':
          setTimeout(() => this.showWin(), 1700);
          break;
        case 'beltFull':
          this.hud.toast('הכיס מלא (6). בחרו גנומי ולחצו "שחרור" כדי לפנות מקום.');
          this.sfx.soft();
          break;
        case 'hint':
          this.showExplain('💡 רמז', e.textHe, 'תודה!');
          break;
      }
    }
    if (evs.some((e) => e.type === 'won' || e.type === 'outOfEggs')) this.saveLearning();
  }

  private saveLearning() {
    const all = load<unknown[]>('gene-ranch-learning', []);
    all.push({ day: this.game.day.id, attempt: this.game.attempt, at: new Date().toISOString(), events: this.game.learning });
    save('gene-ranch-learning', all.slice(-60));
  }

  // ---------- per-frame ----------
  private frame = (now: number) => {
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.manual) {
      this.acc += dt;
      while (this.acc >= STEP) {
        this.acc -= STEP;
        if (!this.paused) this.step(STEP);
        else this.idleStep(STEP);
      }
    }
    this.fps.frames++;
    this.fps.t += dt;
    if (this.fps.t > 1) (this.fps.value = this.fps.frames / this.fps.t), (this.fps.frames = 0), (this.fps.t = 0);
    // Under test control (advanceTime) each call renders once; the loop stays idle.
    if (!this.manual) this.render();
    requestAnimationFrame(this.frame);
  };

  /** Background animation while an overlay is up (no game time passes). */
  private idleStep(dt: number) {
    this.time += dt;
    this.world.update(dt, this.time);
    for (const c of this.views.values()) c.view.update(dt, this.reduced);
    this.lens.update(dt, this.camera, this.reduced);
  }

  step(dt: number) {
    const g = this.game;
    this.time += dt;
    g.tick(dt * 1000);
    this.handleEvents(g.drainEvents());
    this.player.update(dt);
    this.world.update(dt, this.time);
    this.world.frost.visible = g.nestTemp === 'cold';
    this.updateViews(dt);
    this.updateHatch(dt);
    this.updateLens(dt);
    this.egg.update(dt);
    this.sparkles.update(dt);
    this.confetti.update(dt);
    this.gun.update(dt, this.player.moving, this.reduced);
    this.updateCoach();
    // Villager and sweat.
    this.villagerHop = Math.max(0, this.villagerHop - dt);
    this.world.villager.position.y = Math.abs(Math.sin(this.villagerHop * 8)) * 0.25 * (this.villagerHop > 0 ? 1 : 0);
    this.sweatT = Math.max(0, this.sweatT - dt);
    this.sweat.visible = this.sweatT > 0;
    this.sweat.position.y = 2.0 + Math.sin(this.time * 6) * 0.05;
    // Boards.
    const bk = g.orders.map((o) => o.filled + ':' + o.delivered.length).join(',') + g.day.id;
    if (bk !== this.boardKey) {
      this.boardKey = bk;
      drawOrderBoard(this.world.boardCanvas, g);
      this.world.boardTex.needsUpdate = true;
      if (g.day.pedigree) {
        drawPedigree(this.world.pedigreeCanvas, g);
        this.world.pedigreeTex.needsUpdate = true;
      }
    }
    this.hud.update(g, { coach: this.coach, muted: this.sfx.muted, eggGlow: g.canHatch(), logOpen: false });
    this.shake = Math.max(0, this.shake - dt);
  }

  private updateViews(dt: number) {
    const g = this.game;
    for (const c of g.creatures.values()) {
      if (c.loc === 'meadow' || c.loc === 'nest') this.ensureView(c.id);
    }
    for (const [id, ctl] of this.views) {
      const c = g.creatures.get(id);
      const v = ctl.view;
      if (!c) continue;
      v.update(dt, this.reduced);
      let visible = c.loc === 'meadow' || c.loc === 'nest';
      if (ctl.fly) {
        visible = true;
        const f = ctl.fly;
        f.t += dt;
        const k = Math.min(1, f.t / f.dur);
        const e = k * k * (3 - 2 * k);
        if (f.kind === 'suck') {
          const to = this.nozzle();
          v.root.position.lerpVectors(f.from, to, e);
          v.root.scale.setScalar(Math.max(0.03, 1 - e));
          v.root.rotation.y += dt * 14;
          if (Math.random() < 0.5) this.sparkles.stream(v.root.position.clone().setY(v.root.position.y + 0.3), to, 2, '#bff7ff');
          if (k >= 1) ctl.fly = null;
        } else if (f.kind === 'shoot' || f.kind === 'deliver') {
          const to = f.to!;
          v.root.position.lerpVectors(f.from, to, e);
          v.root.position.y += Math.sin(k * Math.PI) * 1.2 + (1 - e) * f.from.y * 0 ;
          v.root.scale.setScalar(0.1 + 0.9 * e);
          if (k >= 1) {
            ctl.fly = null;
            v.root.scale.setScalar(1);
            v.root.position.y = 0;
            if (f.kind === 'deliver') this.sparkles.burst(to.clone().setY(0.6), 30, ['#ffffff', '#ffe27a']);
            else (v.hop(0.15), this.sfx.pip());
          }
          if (f.kind === 'deliver' && k >= 1) visible = false;
        } else if (f.kind === 'bounceBack') {
          // Fly to the villager, wait, then get sucked back into the net.
          const to = f.to!;
          if (f.t < 0.55) {
            const kk = f.t / 0.55;
            v.root.position.lerpVectors(f.from, to, kk);
            v.root.position.y += Math.sin(kk * Math.PI) * 1.2;
            v.root.scale.setScalar(0.1 + 0.9 * kk);
          } else if (f.t < 1.15) {
            v.root.position.copy(to);
            v.root.scale.setScalar(1);
          } else {
            const kk = Math.min(1, (f.t - 1.15) / 0.45);
            v.root.position.lerpVectors(to, this.nozzle(), kk);
            v.root.scale.setScalar(1 - kk * 0.97);
          }
          if (k >= 1) ctl.fly = null;
        }
      } else if (ctl.showT > 0) {
        visible = true;
        ctl.showT -= dt;
        const s = Math.min(1, v.root.scale.x + dt * 4);
        v.root.scale.setScalar(s < 1 ? s + Math.sin(s * Math.PI) * 0.15 : 1);
        if (ctl.showT <= 0) {
          if (c.loc === 'belt') {
            ctl.fly = { kind: 'suck', from: v.root.position.clone(), to: null, t: 0, dur: 0.45 };
            this.gun.fire(v.root.position);
            this.sfx.whoosh();
          } else ctl.target.copy(v.root.position).add(new THREE.Vector3(-1.5, 0, 0.8));
        }
      } else if (c.loc === 'nest') {
        const slot = g.nest[0] === id ? 0 : 1;
        v.root.position.lerp(NEST_SLOTS[slot], Math.min(1, dt * 8));
        v.root.scale.setScalar(1);
        const other = NEST_SLOTS[1 - slot];
        const look = new THREE.Vector3((other.x + this.camera.position.x) / 2, 0.3, (other.z + this.camera.position.z) / 2);
        v.root.lookAt(look);
      } else if (c.loc === 'meadow') {
        v.root.scale.setScalar(1);
        this.wander(ctl, dt);
      }
      v.root.visible = visible;
      v.ring.visible = visible && c.loc === 'meadow' && !ctl.fly;
      this.updateTag(ctl, c.name, c.tagHe, visible && !ctl.fly && (c.loc === 'meadow' || c.loc === 'nest'));
    }
  }

  private wander(ctl: Ctl, dt: number) {
    const v = ctl.view;
    ctl.wanderT -= dt;
    if (v.hopT >= 0) {
      const dir = ctl.target.clone().sub(v.root.position).setY(0);
      const d = dir.length();
      if (d > 0.05) v.root.position.addScaledVector(dir.normalize(), Math.min(d, dt * 1.6));
    }
    if (ctl.wanderT <= 0) {
      ctl.wanderT = 0.9 + Math.random() * 1.6;
      const d = ctl.target.distanceTo(v.root.position.clone().setY(0));
      if (d < 0.3 || Math.random() < 0.15) {
        // Pick a new spot in the meadow, away from the nest and board.
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * Math.PI * 2;
          const r = Math.sqrt(Math.random()) * MEADOW_R;
          const p = new THREE.Vector3(MEADOW_CENTER.x + Math.cos(a) * r, 0, MEADOW_CENTER.z + Math.sin(a) * r);
          if (p.distanceTo(NEST_POS) > 2 && p.distanceTo(BOARD_POS) > 1.8 && p.distanceTo(VILLAGER_POS) > 1 && p.distanceTo(SPAWN.clone().setY(0)) > 1.6) {
            ctl.target.copy(p);
            break;
          }
        }
      }
      if (ctl.target.distanceTo(v.root.position.clone().setY(0)) > 0.3) {
        v.hop(0.25 + Math.random() * 0.15);
        v.play('hop');
        v.root.lookAt(ctl.target.x, v.root.position.y, ctl.target.z);
      } else if (Math.random() < 0.3) v.root.lookAt(this.camera.position.x, 0, this.camera.position.z);
    }
    v.root.position.y = heightAt(v.root.position.x, v.root.position.z);
  }

  private updateTag(ctl: Ctl, name: string, tag: string | undefined, show: boolean) {
    ctl.tag.visible = show;
    if (!show) return;
    const key = name + (tag ?? '');
    if (key !== ctl.tagKey) {
      ctl.tagKey = key;
      const c = document.createElement('canvas');
      c.width = 512;
      c.height = 128;
      const x = c.getContext('2d')!;
      x.direction = 'rtl';
      x.textAlign = 'center';
      x.textBaseline = 'middle';
      x.font = '700 64px Rubik, sans-serif';
      const text = tag ? `${name} · ${tag}` : name;
      const w = Math.min(500, x.measureText(text).width + 60);
      x.fillStyle = 'rgba(255,248,236,0.92)';
      x.beginPath();
      x.roundRect((512 - w) / 2, 14, w, 100, 50);
      x.fill();
      x.fillStyle = '#3a2350';
      x.fillText(text, 256, 68);
      const old = (ctl.tag.material as THREE.SpriteMaterial).map;
      old?.dispose();
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      (ctl.tag.material as THREE.SpriteMaterial).map = t;
      (ctl.tag.material as THREE.SpriteMaterial).needsUpdate = true;
    }
    ctl.tag.position.copy(ctl.view.root.position).add(new THREE.Vector3(0, 1.22 + ctl.view.bounce.position.y, 0));
  }

  private lensSquares(): LensSquare[] | null {
    const g = this.game;
    if (!g.day.lens) return null;
    const [a, b] = g.nest;
    if (!a && !b) return null;
    const side = (id: string | null, gene: GeneId) => {
      if (!id) return null;
      const p = g.pheno(id);
      return { name: g.get(id).name, pheno: { [gene]: p[gene], color: p.color }, set: g.known(id, gene) };
    };
    return g.day.genes.map((gene) => ({ gene, A: side(a, gene), B: side(b, gene), env: g.nestTemp }));
  }

  /**
   * During a hatch the lens cells light up in turn like a roulette. When the egg cracks, it
   * lights EVERY cell whose phenotype matches the baby — the baby's exact genotype stays
   * hidden (an upright baby may be EE or Ee), just as in real genetics.
   */
  private updateLens(dt: number) {
    const sq = this.lensSquares();
    const g = this.game;
    let lit: [number, number][][] = [];
    let chosen = false;
    if (sq && g.hatch) {
      const t = g.hatch.t;
      // Fast at first, slowing down while the egg wobbles.
      const step = Math.floor(t < 900 ? t / 70 : 13 + (t - 900) / 190);
      lit = sq.map(() => [RING[step % 4]]);
      if (step !== this.lastTick) (this.lastTick = step), this.sfx.tick(step % 8);
    } else if (sq && this.revealPheno && this.litHold > 0) {
      this.litHold -= dt;
      chosen = true;
      lit = sq.map((s) => {
        const cells: [number, number][] = [];
        const want = this.revealPheno![s.gene];
        for (const r of [0, 1] as const)
          for (const c of [0, 1] as const) {
            const ph = this.cellPheno(s, r, c);
            if (ph === null || ph === want) cells.push([r, c]);
          }
        return cells;
      });
    }
    this.lens.set(sq, lit, chosen);
    this.lens.update(dt, this.camera, this.reduced);
  }

  /** Phenotype of a lens cell from the alleles the player knows (null if a "?" is involved). */
  private cellPheno(s: LensSquare, r: 0 | 1, c: 0 | 1): string | null {
    if (!s.A || !s.B) return null;
    const def = GENES[s.gene];
    const a = cardAlleles(s.gene, s.A.set)[r];
    const b = cardAlleles(s.gene, s.B.set)[c];
    if (a === '?' || b === '?') return null;
    const ka = Object.keys(def.label).find((k) => def.label[k] === a)!;
    const kb = Object.keys(def.label).find((k) => def.label[k] === b)!;
    return def.phenotype([ka, kb], s.env);
  }

  private updateHatch(_dt: number) {
    const g = this.game;
    if (!g.hatch) return;
    const t = g.hatch.t;
    const total = 900;
    const egg = this.egg.group;
    const sq = this.lensSquares();
    const start = sq ? this.lens.centerWorld(0) : NEST_POS.clone().setY(3.2);
    const ground = HATCH_SPOT.clone();
    if (t < total) {
      egg.position.copy(start);
      egg.scale.setScalar(0.25 + (t / total) * 0.35);
      egg.rotation.set(0, 0, 0);
    } else if (t < total + 450) {
      const k = (t - total) / 450;
      egg.position.lerpVectors(start, ground, k * k);
      egg.scale.setScalar(0.6 + k * 0.4);
    } else if (t < HATCH_MS - 200) {
      const k = (t - total - 450) / (HATCH_MS - 200 - total - 450);
      egg.position.copy(ground);
      egg.scale.setScalar(1);
      const w = Math.sin(k * Math.PI * 6) * (0.08 + k * 0.3);
      egg.rotation.set(0, 0, this.reduced ? w * 0.3 : w);
      const n = Math.floor(k * 3);
      if (n > this.wobbleN) (this.wobbleN = n), this.sfx.wobble(n);
    } else {
      const k = (t - (HATCH_MS - 200)) / 200;
      egg.scale.set(1 + k * 0.15, 1 - k * 0.15, 1 + k * 0.15);
      egg.rotation.set(0, 0, 0);
    }
  }

  /** What the player should do next: a short coach line + a bouncing arrow over the target. */
  private updateCoach() {
    const g = this.game;
    let text = '';
    let target: THREE.Vector3 | null = null;
    const nestCount = g.nest.filter(Boolean).length;
    const anyMatch = g.orders.map((o) => g.deliverable(o.def.id)).find((x) => !!x) ?? null;
    const selMatch = !!anyMatch;
    if (g.phase === 'hatching') text = 'הביצה בוקעת...';
    else if (g.phase !== 'play') text = '';
    else if (selMatch) {
      text = `📦 ${g.get(anyMatch!).name} מתאים! לחצו "מסרו" בהזמנה למעלה`;
      target = VILLAGER_POS.clone().setY(2.3);
    } else if (nestCount + g.belt.length < 2 && g.list('meadow').length) {
      const near = g.list('meadow')[0];
      text = '👆 לחצו על גנומי כדי לשאוב אותו לרשת';
      const c = this.views.get(near.id);
      if (c) target = c.view.root.position.clone().setY(1.75);
    } else if (nestCount < 2 && g.belt.length) {
      const who = g.selected ? g.get(g.selected).name : g.get(g.belt[0]).name;
      text = `🪺 לחצו על הקן כדי להושיב את ${who}`;
      target = NEST_POS.clone().setY(1.4);
    } else if (g.canHatch()) text = this.actionsDone.hatched ? '' : '🥚 לחצו על הביצה הגדולה!';
    if (g.day.num > 2 && this.actionsDone.hatched && !selMatch) text = text.startsWith('⭐') ? text : '';
    this.coach = text;
    this.arrow.visible = !!target;
    if (target) {
      this.arrow.position.copy(target);
      this.arrow.position.y += Math.abs(Math.sin(this.time * 4)) * (this.reduced ? 0.05 : 0.25);
      this.arrow.rotation.y = this.time * 2;
    }
    (this.world.nest.getObjectByName('nestGlow') as THREE.Mesh).visible = nestCount < 2 && g.belt.length > 0;
  }

  render() {
    if (this.shake > 0) {
      const s = this.shake * 0.06;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
    }
    this.renderer.render(this.scene, this.camera);
  }

  resize() {
    const el = this.canvas.parentElement!;
    const w = el.clientWidth || window.innerWidth;
    const h = el.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // Narrow screens: widen the view a little so the nest and creatures fit.
    this.camera.fov = w / h < 0.8 ? 78 : 62;
    this.camera.updateProjectionMatrix();
  }

  // ---------- input ----------
  private bindInput() {
    const cv = this.canvas;
    cv.addEventListener('pointerdown', (e) => {
      this.sfx.unlock();
      cv.setPointerCapture(e.pointerId);
      this.drag = { x: e.clientX, y: e.clientY, moved: false, id: e.pointerId };
    });
    cv.addEventListener('pointermove', (e) => {
      if (this.drag && this.drag.id === e.pointerId) {
        const dx = e.clientX - this.drag.x;
        const dy = e.clientY - this.drag.y;
        if (!this.drag.moved && Math.hypot(dx, dy) > 7) this.drag.moved = true;
        if (this.drag.moved && !this.paused) {
          this.player.look(dx, dy);
          this.drag.x = e.clientX;
          this.drag.y = e.clientY;
          cv.classList.add('dragging');
        }
      } else if (e.pointerType === 'mouse' && !this.paused) {
        const hit = this.pick(e.clientX, e.clientY);
        cv.classList.toggle('pointing', !!hit && hit.kind !== 'ground');
      }
    });
    const up = (e: PointerEvent) => {
      if (!this.drag || this.drag.id !== e.pointerId) return;
      const tap = !this.drag.moved;
      this.drag = null;
      cv.classList.remove('dragging');
      if (tap && !this.paused) this.tap(e.clientX, e.clientY);
    };
    cv.addEventListener('pointerup', up);
    cv.addEventListener('pointercancel', () => (this.drag = null));
    window.addEventListener('keydown', (e) => {
      if (this.overlayName !== '' && e.code === 'Escape' && this.overlayName === 'pause') return this.closeOverlay();
      if (this.paused) return;
      this.sfx.unlock();
      if (e.code === 'Escape' || e.code === 'KeyP') return this.showPause();
      if (e.code === 'Space' || e.code === 'KeyE') {
        e.preventDefault();
        return this.act(() => this.game.hatchEgg());
      }
      if (e.code === 'KeyN' && this.game.selected) return this.act(() => this.game.place(this.game.selected!));
      if (e.code === 'KeyH') return this.showHint();
      const d = /^Digit([1-6])$/.exec(e.code);
      if (d) {
        const id = this.game.belt[Number(d[1]) - 1];
        if (id) this.game.select(id);
        return;
      }
      this.player.key(e.code, true);
    });
    window.addEventListener('keyup', (e) => this.player.key(e.code, false));
    window.addEventListener('blur', () => this.player.clearKeys());
    document.addEventListener('visibilitychange', () => document.hidden && !this.paused && this.showPause());
    cv.addEventListener('webglcontextlost', (e) => {
      e.preventDefault();
      this.showModal('lost', `<h2>הגרפיקה נעצרה</h2><p>הדפדפן עצר את התלת־ממד. אפשר לחכות רגע או לטעון מחדש.</p><button class="big" data-o="reload">טעינה מחדש</button>`, { reload: () => location.reload() });
    });
    cv.addEventListener('webglcontextrestored', () => this.closeOverlay());
  }

  private pick(x: number, y: number): { kind: string; id?: string; point: THREE.Vector3 } | null {
    const r = this.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(ndc, this.camera);
    const objs: THREE.Object3D[] = [];
    for (const c of this.views.values()) if (c.view.root.visible && !c.fly) objs.push(c.view.hit);
    objs.push(this.world.nestHit, this.world.boardHit, this.world.ground);
    const ped = this.world.group.children.find((o) => o.visible && o.children.some((k) => k.userData.kind === 'pedigree'));
    if (ped && this.game.day.pedigree) ped.traverse((o) => (o as THREE.Mesh).isMesh && objs.push(o));
    const hits = this.raycaster.intersectObjects(objs, false);
    for (const h of hits) {
      const k = h.object.userData.kind as string | undefined;
      if (k === 'creature') return { kind: 'creature', id: h.object.userData.id, point: h.point };
      if (k) return { kind: k, point: h.point };
    }
    return null;
  }

  private tap(x: number, y: number) {
    const g = this.game;
    const hit = this.pick(x, y);
    if (!hit) return;
    if (hit.kind === 'creature' && hit.id) {
      const c = g.get(hit.id);
      if (c.loc === 'meadow') g.catch(hit.id);
      else if (c.loc === 'nest') g.unplace(g.nest[0] === hit.id ? 0 : 1);
    } else if (hit.kind === 'nest') {
      const id = g.selected ?? g.belt[0];
      if (id) {
        if (!g.place(id) && g.nest[0] && g.nest[1]) this.hud.toast('הקן מלא. לחצו על גנומי בקן כדי להחזיר אותו לרשת.');
      } else if (!g.nestPair()) this.hud.toast('קודם שאבו גנומי מהאחו 👆');
    } else if (hit.kind === 'board') {
      const o = g.orders.find((x) => g.deliverable(x.def.id));
      if (o) g.deliver(o.def.id, g.deliverable(o.def.id)!);
      else this.hud.toast('בחרו בכיס גנומי שמתאים להזמנה, ואז "מסרו".');
    } else if (hit.kind === 'pedigree') this.showPedigree();
    else if (hit.kind === 'ground') this.player.goTo(hit.point);
  }

  // ---------- overlays ----------
  private showModal(name: string, html: string, handlers: Record<string, () => void> = {}) {
    this.overlayName = name;
    this.paused = true;
    this.player.clearKeys();
    this.overlay.innerHTML = `<div class="modal-bg"><div class="modal">${html}</div></div>`;
    this.overlay.querySelectorAll<HTMLElement>('[data-o]').forEach((b) =>
      b.addEventListener('click', (e) => {
        e.stopPropagation();
        this.sfx.unlock();
        handlers[b.dataset.o!]?.();
      }),
    );
    this.overlay.querySelectorAll<HTMLInputElement>('input[data-t]').forEach((inp) =>
      inp.addEventListener('change', () => {
        if (inp.dataset.t === 'mute') this.toggleMute(!inp.checked);
        if (inp.dataset.t === 'reduced') this.setReduced(inp.checked);
      }),
    );
    (this.overlay.querySelector('.big') as HTMLElement | null)?.focus();
  }

  closeOverlay() {
    this.overlay.innerHTML = '';
    this.overlayName = '';
    this.paused = false;
    this.hudEl.hidden = false;
    this.last = performance.now();
  }

  private toggles() {
    return `<div class="toggles"><label><input type="checkbox" data-t="mute" ${this.sfx.muted ? '' : 'checked'}> 🔊 צלילים</label><label><input type="checkbox" data-t="reduced" ${this.reduced ? 'checked' : ''}> 🐢 פחות תנועה</label></div>`;
  }

  private daysHtml() {
    return `<div class="days">${DAYS.map((d, i) => {
      const s = this.progress.stars[i] ?? 0;
      const open = i < this.progress.unlocked;
      return `<button data-o="day${i}" ${open ? '' : 'disabled'}>${open ? '' : '🔒 '}יום ${d.num}${i === 5 ? ' 🏆' : ''}<br>${d.titleHe}<span class="s">${'★'.repeat(s)}${'☆'.repeat(3 - s)}</span></button>`;
    }).join('')}</div>`;
  }

  showTitle() {
    this.hudEl.hidden = true;
    const handlers: Record<string, () => void> = { play: () => this.begin(Math.min(this.progress.unlocked - 1, DAYS.length - 1)) };
    DAYS.forEach((_, i) => (handlers['day' + i] = () => this.begin(i)));
    this.showModal(
      'title',
      `<div class="logo">🥚🐾</div><h1>חוות הגנים</h1><p>שאבו גנומים חמודים, הכליאו אותם בקן ובקעו ביצות.<br>כל תכונה נקבעת מזוג אללים — וכל ביצה היא הגרלה.</p>
       <button class="big" data-o="play">${this.progress.unlocked > 1 ? 'המשיכו לשחק' : 'שחקו!'}</button>${this.daysHtml()}${this.toggles()}`,
      handlers,
    );
  }

  private begin(i: number) {
    this.attempt = 1;
    this.startDay(i, true);
  }

  showIntro() {
    const g = this.game;
    const wants = g.orders.map((o) => `<div><img src="${portraitURL(o.def.icon, 128)}" alt="">${o.def.titleHe}</div>`).join('');
    const how =
      g.day.num === 1
        ? `<div class="how"><span>👆 לחצו על גנומי — שואבים</span><span>🪺 לחצו על הקן — מושיבים</span><span>🥚 ביצה — בוקעים</span><span>📦 מסרו להזמנה</span></div><p style="font-size:14px;opacity:.8">גוררים כדי להסתכל מסביב · WASD כדי ללכת (לא חובה)</p>`
        : '';
    this.hudEl.hidden = false;
    this.showModal(
      'intro',
      `<h2>יום ${g.day.num} · ${g.day.titleHe}</h2><p>${g.day.introHe}</p><div class="wants">${wants}</div>
       <p style="font-size:15px">🥚 × <bdi>${g.eggs}</bdi> ביצות${g.day.hints ? '' : ' · בלי רמזים, בלי עדשת פאנט'}</p>${how}<button class="big" data-o="go">יאללה!</button>`,
      { go: () => this.closeOverlay() },
    );
  }

  private showExplain(title: string, text: string, btn: string) {
    this.showModal('explain', `<h2>${title}</h2><p>${text}</p><button class="big" data-o="ok">${btn}</button>`, { ok: () => this.closeOverlay() });
  }

  private showHint() {
    if (this.paused) return;
    const t = this.game.hint();
    if (!t) this.hud.toast('היום אין רמזים — אתם יכולים! 💪');
  }

  showPause() {
    if (this.overlayName && this.overlayName !== '') return;
    this.showModal(
      'pause',
      `<h2>⏸ הפסקה</h2><button class="big" data-o="resume">המשך</button><br><button class="sec" data-o="restart">התחילו את היום מחדש</button><button class="sec" data-o="title">לתפריט</button>${this.toggles()}`,
      { resume: () => this.closeOverlay(), restart: () => ((this.attempt += 1), this.startDay(this.dayIdx, true)), title: () => this.showTitle() },
    );
  }

  private showWin() {
    const g = this.game;
    const s = g.stars();
    this.progress.stars[this.dayIdx] = Math.max(this.progress.stars[this.dayIdx] ?? 0, s);
    this.progress.unlocked = Math.max(this.progress.unlocked, Math.min(DAYS.length, this.dayIdx + 2));
    save('gene-ranch-progress', this.progress);
    this.sfx.win();
    const last = this.dayIdx === DAYS.length - 1;
    const why = `<p style="font-size:14px">★ סיימתם · ${g.mistakes === 0 ? '★' : '☆'} בלי מסירה שגויה · ${g.hintsUsed === 0 ? '★' : '☆'} בלי רמזים</p>`;
    this.showModal(
      'win',
      `<div class="bigstars">${'★'.repeat(s)}<span class="off">${'★'.repeat(3 - s)}</span></div><h2>${last ? 'ניצחתם בתערוכה! 🏆' : `יום ${g.day.num} הושלם!`}</h2>
       <p><b>${g.day.takeawayHe}</b></p><p style="font-size:15px">השתמשתם ב־<bdi>${g.eggsUsed}</bdi> ביצים.</p>${why}
       ${last ? `<button class="big" data-o="title">לתפריט</button>` : `<button class="big" data-o="next">ליום ${g.day.num + 1} ←</button>`}<button class="sec" data-o="again">שחקו שוב</button>`,
      { next: () => this.begin(this.dayIdx + 1), again: () => ((this.attempt += 1), this.startDay(this.dayIdx, true)), title: () => this.showTitle() },
    );
  }

  private showFail(explain: string) {
    this.showModal(
      'fail',
      `<h2>נגמרו הביצים 🥚</h2><p>${explain}</p><p style="font-size:15px">אל דאגה — הגנומים מחכים. ננסה שוב עם סל ביצים חדש?</p><button class="big" data-o="retry">נסו שוב ↻</button>`,
      { retry: () => ((this.attempt += 1), this.startDay(this.dayIdx, true)) },
    );
  }

  private showPedigree() {
    if (!this.game.day.pedigree) return;
    drawPedigree(this.world.pedigreeCanvas, this.game);
    const url = this.world.pedigreeCanvas.toDataURL();
    this.showModal('pedigree', `<h2>📜 לוח השושלת</h2><img class="ped" src="${url}" alt="לוח שושלת: כל מועמד וההורים שלו"><br><button class="big" data-o="ok">סגירה</button>`, { ok: () => this.closeOverlay() });
  }

  private toggleMute(force?: boolean) {
    this.sfx.setMuted(force ?? !this.sfx.muted);
    save('gene-ranch-muted', this.sfx.muted);
  }
  private setReduced(v: boolean) {
    this.reduced = v;
    save('gene-ranch-reduced', v);
    document.getElementById('app')!.classList.toggle('reduced', v);
  }

  // ---------- test hooks ----------
  advanceTime(ms: number) {
    this.manual = true;
    let left = ms;
    while (left > 0) {
      const d = Math.min(STEP * 1000, left);
      if (!this.paused) this.step(d / 1000);
      else this.idleStep(d / 1000);
      left -= d;
    }
    this.render();
  }

  toText(): string {
    const base = JSON.parse(this.game.toText());
    const visible = [...this.views.entries()].filter(([, c]) => c.view.root.visible).map(([id]) => id);
    return JSON.stringify({
      ...base,
      overlay: this.overlayName || null,
      paused: this.paused,
      coach: this.coach,
      camera: { x: +this.camera.position.x.toFixed(2), z: +this.camera.position.z.toFixed(2), yaw: +this.player.yaw.toFixed(2) },
      visibleCreatures: visible,
      eggVisible: this.egg.group.visible,
      lensVisible: this.lens.group.visible,
      model: this.template ? 'tripo' : 'procedural',
      fps: Math.round(this.fps.value),
      note: 'coordinates: +x right of spawn view, -z forward',
    });
  }

  /** Screen position of a creature (for automated clicking). */
  screenOf(id: string): { x: number; y: number } | null {
    const c = this.views.get(id);
    if (!c || !c.view.root.visible) return null;
    const p = c.view.root.position.clone().setY(0.45).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }
  screenOfNest(): { x: number; y: number } {
    const p = NEST_POS.clone().setY(0.4).project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: r.left + ((p.x + 1) / 2) * r.width, y: r.top + ((1 - p.y) / 2) * r.height };
  }
}

export { BELT_MAX, GENES, pct };
