// How a phenotype looks. Shared by the 3D creatures, HUD portraits and Punnett cells.
import type { GeneId, Pheno } from '../genetics/genes';

export const COLORS = {
  pink: '#ff9cc8',
  blue: '#7cc4ff',
  violet: '#8b5cf6',
  stripe: '#5b2a6e',
  spot: '#fff4d6',
  earInner: '#ffd0e0',
  glow: '#fff36b',
};

export interface Look {
  body: string;
  ears: 'upright' | 'floppy';
  stripes: boolean;
  spots: boolean;
  tail: 'curly' | 'straight';
  glow: boolean;
}

export function lookOf(p: Partial<Record<GeneId, Pheno>>): Look {
  return {
    body: COLORS[(p.color as 'pink' | 'blue' | 'violet') ?? 'pink'] ?? COLORS.pink,
    ears: p.ears === 'floppy' ? 'floppy' : 'upright',
    stripes: p.pattern === 'stripes' || p.pattern === 'both',
    spots: p.pattern === 'spots' || p.pattern === 'both',
    tail: p.tail === 'straight' ? 'straight' : 'curly',
    glow: p.glow === 'glow',
  };
}

function shade(hex: string, k: number): string {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.min(255, Math.max(0, Math.round(((n >> 16) & 255) * k)));
  const g = Math.min(255, Math.max(0, Math.round(((n >> 8) & 255) * k)));
  const b = Math.min(255, Math.max(0, Math.round((n & 255) * k)));
  return `rgb(${r},${g},${b})`;
}

/**
 * Draw a front-facing Gnoomie portrait into a 2D context, centred at (cx, cy) with radius r.
 * `only` limits which traits are drawn as "known" (others neutral), `ghost` greys it out.
 */
export function drawPortrait(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, p: Partial<Record<GeneId, Pheno>>, opts: { ghost?: boolean; showTail?: boolean } = {}) {
  const L = lookOf(p);
  ctx.save();
  if (opts.ghost) ctx.globalAlpha = 0.45;
  const body = L.body;
  // Tail (behind the body, peeking out on the right).
  if (opts.showTail || p.tail) {
    ctx.strokeStyle = shade(body, 0.85);
    ctx.lineWidth = r * 0.16;
    ctx.lineCap = 'round';
    ctx.beginPath();
    if (L.tail === 'curly') {
      const tx = cx + r * 0.95;
      const ty = cy + r * 0.35;
      ctx.moveTo(cx + r * 0.6, cy + r * 0.55);
      ctx.quadraticCurveTo(tx + r * 0.25, ty + r * 0.2, tx + r * 0.2, ty - r * 0.1);
      ctx.arc(tx, ty - r * 0.12, r * 0.2, 0, Math.PI * 1.6);
    } else {
      ctx.moveTo(cx + r * 0.6, cy + r * 0.55);
      ctx.lineTo(cx + r * 1.25, cy + r * 0.05);
    }
    ctx.stroke();
  }
  // Ears.
  const ear = (side: 1 | -1) => {
    ctx.save();
    ctx.translate(cx + side * r * 0.45, cy - r * 0.62);
    ctx.rotate(L.ears === 'upright' ? side * 0.25 : side * 2.1);
    ctx.fillStyle = shade(body, 0.92);
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.42, r * 0.2, r * 0.48, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLORS.earInner;
    ctx.beginPath();
    ctx.ellipse(0, -r * 0.4, r * 0.1, r * 0.32, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
  ear(-1);
  ear(1);
  // Antenna.
  if (L.glow) {
    ctx.strokeStyle = shade(body, 0.7);
    ctx.lineWidth = r * 0.07;
    ctx.beginPath();
    ctx.moveTo(cx, cy - r * 0.9);
    ctx.quadraticCurveTo(cx + r * 0.15, cy - r * 1.25, cx + r * 0.05, cy - r * 1.4);
    ctx.stroke();
    const g = ctx.createRadialGradient(cx + r * 0.05, cy - r * 1.45, 0, cx + r * 0.05, cy - r * 1.45, r * 0.4);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.3, COLORS.glow);
    g.addColorStop(1, 'rgba(255,243,107,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx + r * 0.05, cy - r * 1.45, r * 0.4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Body.
  const grad = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.35, r * 0.1, cx, cy, r);
  grad.addColorStop(0, shade(body, 1.15));
  grad.addColorStop(1, shade(body, 0.85));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.94, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(cx, cy, r, r * 0.94, 0, 0, Math.PI * 2);
  ctx.clip();
  if (L.stripes) {
    ctx.strokeStyle = COLORS.stripe;
    ctx.lineWidth = r * 0.13;
    for (const dy of [-0.55, -0.15, 0.25, 0.65]) {
      ctx.beginPath();
      ctx.moveTo(cx - r, cy + dy * r);
      ctx.quadraticCurveTo(cx, cy + dy * r - r * 0.12, cx + r, cy + dy * r);
      ctx.stroke();
    }
  }
  if (L.spots) {
    ctx.fillStyle = COLORS.spot;
    for (const [dx, dy, s] of [
      [-0.62, -0.3, 0.16],
      [0.6, -0.4, 0.13],
      [-0.5, 0.45, 0.13],
      [0.55, 0.42, 0.17],
      [0.05, 0.72, 0.12],
      [-0.15, -0.72, 0.11],
    ])
      (ctx.beginPath(), ctx.arc(cx + dx * r, cy + dy * r, s * r, 0, Math.PI * 2), ctx.fill());
  }
  ctx.restore();
  // Face.
  for (const side of [-1, 1]) {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.32, cy - r * 0.08, r * 0.22, r * 0.26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1840';
    ctx.beginPath();
    ctx.ellipse(cx + side * r * 0.3, cy - r * 0.04, r * 0.15, r * 0.19, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(cx + side * r * 0.25, cy - r * 0.12, r * 0.06, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(255,120,150,0.55)';
  for (const side of [-1, 1]) (ctx.beginPath(), ctx.ellipse(cx + side * r * 0.58, cy + r * 0.22, r * 0.12, r * 0.07, 0, 0, Math.PI * 2), ctx.fill());
  ctx.strokeStyle = '#2a1840';
  ctx.lineWidth = r * 0.06;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy + r * 0.2, r * 0.13, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
  ctx.restore();
}

const cache = new Map<string, string>();
/** A portrait as a data URL (cached), for DOM <img>. */
export function portraitURL(p: Partial<Record<GeneId, Pheno>>, size = 128, opts: { ghost?: boolean } = {}): string {
  const key = JSON.stringify([p, size, opts]);
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d')!;
  drawPortrait(ctx, size * 0.47, size * 0.58, size * 0.3, p, opts);
  const url = c.toDataURL();
  cache.set(key, url);
  return url;
}
