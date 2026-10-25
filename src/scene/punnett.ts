// The floating 3D Punnett square above the nest. It draws only what the player KNOWS
// (alleles from the deduction engine); unknown alleles show as "?".
import * as THREE from 'three';
import type { Pair, GeneId, Pheno } from '../genetics/genes';
import { GENES, canon } from '../genetics/genes';
import { cardAlleles } from '../genetics/deduce';
import { drawPortrait } from './look';

export interface LensSide {
  name: string;
  pheno: Partial<Record<GeneId, Pheno>>;
  set: Pair[];
}
export interface LensSquare {
  gene: GeneId;
  /** Row parent (right nest slot) and column parent (left nest slot); null = empty slot. */
  A: LensSide | null;
  B: LensSide | null;
  env: 'warm' | 'cold';
}

const W = 1100;
const H = 1040;
const CELL = 370;
const X_COL = [290, 290 + CELL]; // col 0 = left
const Y_ROW = [280, 280 + CELL];
const COIN_R = 72;
const ROW_COIN_X = 170;
const COL_COIN_Y = 185;
const PLANE_W = 2.1;
const PLANE_H = (PLANE_W * H) / W;
/** Height of the lens centre above the nest. */
const LIFT = 2.2;

const PHENO_BG: Record<string, string> = {
  upright: '#fff1d6',
  floppy: '#ffd9ec',
  pink: '#ffe0ee',
  blue: '#dcefff',
  violet: '#e8ddff',
  stripes: '#efe0f5',
  spots: '#fff7e3',
  both: '#ffe8d1',
  plain: '#f2f2f2',
  curly: '#fff1d6',
  straight: '#e4f6ea',
  glow: '#fffbd0',
};

function rr(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

class SquareView {
  readonly canvas = document.createElement('canvas');
  readonly tex: THREE.CanvasTexture;
  readonly mesh: THREE.Mesh;
  readonly group = new THREE.Group();
  private key = '';
  constructor() {
    this.canvas.width = W;
    this.canvas.height = H;
    this.tex = new THREE.CanvasTexture(this.canvas);
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.anisotropy = 4;
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(PLANE_W, PLANE_H), new THREE.MeshBasicMaterial({ map: this.tex, transparent: true, toneMapped: false, side: THREE.DoubleSide, depthWrite: false }));
    this.mesh.renderOrder = 5;
    // A wooden-gold back plate behind the cells gives the square some thickness.
    const cx = ((X_COL[0] + CELL) / W - 0.5) * PLANE_W;
    const cy = (0.5 - (Y_ROW[0] + CELL) / H) * PLANE_H;
    const pw = ((2 * CELL + 40) / W) * PLANE_W;
    const ph = ((2 * CELL + 40) / H) * PLANE_H;
    const plate = new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.06), new THREE.MeshStandardMaterial({ color: '#b07a3a', metalness: 0.4, roughness: 0.45, emissive: '#3a2000', emissiveIntensity: 0.3 }));
    plate.position.set(cx, cy, -0.05);
    this.group.add(plate, this.mesh);
  }

  /** World-space centre of a cell. */
  cellWorld(row: 0 | 1, col: 0 | 1): THREE.Vector3 {
    const px = X_COL[col] + CELL / 2;
    const py = Y_ROW[row] + CELL / 2;
    const v = new THREE.Vector3((px / W - 0.5) * PLANE_W, (0.5 - py / H) * PLANE_H, 0.02);
    return this.mesh.localToWorld(v);
  }

  draw(sq: LensSquare, lit: [number, number][], chosen: boolean) {
    const key = JSON.stringify([sq, lit, chosen]);
    if (key === this.key) return;
    this.key = key;
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, W, H);
    const def = GENES[sq.gene];
    ctx.direction = 'rtl';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const aAl = sq.A ? cardAlleles(sq.gene, sq.A.set) : (['?', '?'] as [string, string]);
    const bAl = sq.B ? cardAlleles(sq.gene, sq.B.set) : (['?', '?'] as [string, string]);
    // Frame around the cells.
    rr(ctx, X_COL[0] - 22, Y_ROW[0] - 22, 2 * CELL + 44, 2 * CELL + 44, 40);
    const fg = ctx.createLinearGradient(0, Y_ROW[0], 0, Y_ROW[1] + CELL);
    fg.addColorStop(0, '#e8b860');
    fg.addColorStop(1, '#a8702e');
    ctx.fillStyle = fg;
    ctx.fill();
    // Name pills: column parent on top, row parent at the left.
    const pill = (txt: string, x: number, y: number, muted: boolean, size = 50) => {
      ctx.font = `700 ${size}px Rubik, sans-serif`;
      const w = ctx.measureText(txt).width + 50;
      rr(ctx, x - w / 2, y - 32, w, 64, 32);
      ctx.fillStyle = muted ? 'rgba(255,255,255,0.55)' : 'rgba(255,248,236,0.95)';
      ctx.fill();
      ctx.fillStyle = muted ? '#9b8aad' : '#3a2350';
      ctx.fillText(txt, x, y + 2);
    };
    pill(sq.B ? sq.B.name : 'הורה שני?', X_COL[0] + CELL, 52, !sq.B);
    pill(sq.A ? sq.A.name : 'הורה?', ROW_COIN_X, Y_ROW[0] - 70, !sq.A);
    pill('ריבוע פאנט · ' + def.nameHe, 250, 52, false, 38);
    // Allele coins.
    const coin = (x: number, y: number, txt: string) => {
      const unknown = txt === '?';
      const g = ctx.createRadialGradient(x - 20, y - 24, 8, x, y, COIN_R);
      g.addColorStop(0, unknown ? '#ffffff' : '#fff6c8');
      g.addColorStop(0.7, unknown ? '#ddd3ea' : '#f7cf55');
      g.addColorStop(1, unknown ? '#b9aacb' : '#d79b22');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, COIN_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = 6;
      ctx.strokeStyle = unknown ? '#a898bd' : '#b07a1a';
      ctx.stroke();
      ctx.fillStyle = unknown ? '#8a7aa0' : '#5a3510';
      ctx.font = '700 92px Rubik, sans-serif';
      ctx.fillText(txt, x, y + 6);
    };
    for (const c of [0, 1] as const) coin(X_COL[c] + CELL / 2, COL_COIN_Y, bAl[c]);
    for (const r of [0, 1] as const) coin(ROW_COIN_X, Y_ROW[r] + CELL / 2, aAl[r]);
    // Cells.
    for (const r of [0, 1] as const)
      for (const c of [0, 1] as const) {
        const x = X_COL[c] + 10;
        const y = Y_ROW[r] + 10;
        const w = CELL - 20;
        const a = aAl[r];
        const b = bAl[c];
        const known = a !== '?' && b !== '?';
        let pheno: Pheno | null = null;
        let label = '?';
        if (known) {
          const ka = Object.keys(def.label).find((k) => def.label[k] === a)!;
          const kb = Object.keys(def.label).find((k) => def.label[k] === b)!;
          const pair = canon(sq.gene, ka, kb);
          pheno = def.phenotype(pair, sq.env);
          label = def.label[pair[0]] + def.label[pair[1]];
        }
        const isLit = lit.some((l) => l[0] === r && l[1] === c);
        rr(ctx, x, y, w, w, 34);
        const cg = ctx.createLinearGradient(x, y, x + w, y + w);
        if (isLit) {
          cg.addColorStop(0, '#fff7c2');
          cg.addColorStop(1, chosen ? '#ffc93a' : '#ffe27a');
        } else {
          cg.addColorStop(0, 'rgba(235,246,255,0.96)');
          cg.addColorStop(1, pheno ? PHENO_BG[pheno] ?? '#e8f1ff' : '#e4dcef');
        }
        ctx.fillStyle = cg;
        ctx.fill();
        ctx.lineWidth = isLit ? (chosen ? 18 : 12) : 5;
        ctx.strokeStyle = isLit ? '#ffb800' : 'rgba(255,255,255,0.9)';
        if (isLit) (ctx.shadowColor = '#ffcf3a'), (ctx.shadowBlur = 40);
        ctx.stroke();
        ctx.shadowBlur = 0;
        // Glass shine.
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        rr(ctx, x + 20, y + 16, w - 40, 40, 20);
        ctx.fill();
        if (pheno) drawPortrait(ctx, x + w / 2, y + w * 0.44, w * 0.21, { [sq.gene]: pheno } as Partial<Record<GeneId, Pheno>>, { showTail: sq.gene === 'tail' });
        else drawPortrait(ctx, x + w / 2, y + w * 0.44, w * 0.21, {}, { ghost: true });
        ctx.fillStyle = '#3a2350';
        ctx.font = '700 76px Rubik, sans-serif';
        ctx.fillText(label, x + w / 2, y + w * 0.84);
      }
    this.tex.needsUpdate = true;
  }
}

export class PunnettLens {
  readonly group = new THREE.Group();
  private squares: SquareView[] = [];
  private beam: THREE.Mesh;
  private t = 0;
  private shown = 0;
  private visibleWanted = false;

  constructor(private anchor: THREE.Vector3) {
    this.group.position.copy(anchor).add(new THREE.Vector3(0, LIFT, 0));
    this.beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 1.2, 2.2, 24, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff0a8', transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    this.beam.position.copy(anchor).add(new THREE.Vector3(0, 1.3, 0));
    this.group.visible = false;
  }

  addTo(scene: THREE.Scene) {
    scene.add(this.group, this.beam);
  }

  private ensure(n: number) {
    while (this.squares.length < n) {
      const s = new SquareView();
      this.squares.push(s);
      this.group.add(s.group);
    }
    this.squares.forEach((s, i) => {
      s.group.visible = i < n;
      const gap = PLANE_W + 0.25;
      // RTL: first gene on the right.
      s.group.position.x = n === 1 ? 0 : (i === 0 ? 1 : -1) * gap * 0.5;
      s.group.scale.setScalar(n === 1 ? 1 : 0.8);
    });
  }

  set(squares: LensSquare[] | null, lit: [number, number][][] = [], chosen = false) {
    this.visibleWanted = !!squares && squares.length > 0;
    if (!squares) return;
    this.ensure(squares.length);
    squares.forEach((sq, i) => this.squares[i].draw(sq, lit[i] ?? [], chosen));
  }

  /** World-space centre of the cells of square i (where eggs drop from). */
  centerWorld(i: number): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    const s = this.squares[i];
    if (!s) return this.group.position.clone();
    const a = s.cellWorld(0, 0);
    const b = s.cellWorld(1, 1);
    return a.add(b).multiplyScalar(0.5);
  }

  cellWorld(i: number, row: 0 | 1, col: 0 | 1): THREE.Vector3 {
    this.group.updateMatrixWorld(true);
    return this.squares[i]?.cellWorld(row, col) ?? this.group.position.clone();
  }

  update(dt: number, camera: THREE.Camera, reduced: boolean) {
    this.t += dt;
    this.shown += ((this.visibleWanted ? 1 : 0) - this.shown) * Math.min(1, dt * 7);
    this.group.visible = this.shown > 0.02;
    this.beam.visible = this.group.visible;
    const k = this.shown * 0.85;
    this.group.scale.set(k, 0.17 + 0.68 * this.shown, k);
    this.group.position.y = this.anchor.y + LIFT + (reduced ? 0 : Math.sin(this.t * 1.4) * 0.05);
    // Face the camera around Y only.
    const dx = camera.position.x - this.group.position.x;
    const dz = camera.position.z - this.group.position.z;
    this.group.rotation.y = Math.atan2(dx, dz);
    (this.beam.material as THREE.MeshBasicMaterial).opacity = 0.1 * k + Math.sin(this.t * 3) * 0.02;
  }
}

export type { Pair };
