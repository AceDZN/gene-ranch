// Canvas drawings for in-world boards: the village order board and the show's pedigree board.
import { GENES, type GeneId } from '../genetics/genes';
import type { Game } from '../game/state';
import { drawPortrait } from '../scene/look';

function paper(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, rot: number, fill = '#fff8e8') {
  ctx.save();
  ctx.translate(x + w / 2, y + h / 2);
  ctx.rotate(rot);
  ctx.fillStyle = 'rgba(0,0,0,0.18)';
  ctx.fillRect(-w / 2 + 6, -h / 2 + 8, w, h);
  ctx.fillStyle = fill;
  ctx.fillRect(-w / 2, -h / 2, w, h);
  ctx.fillStyle = '#e0546a';
  ctx.beginPath();
  ctx.arc(0, -h / 2 + 14, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function wrap(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lh: number) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (ctx.measureText(t).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = w;
      yy += lh;
    } else line = t;
  }
  if (line) ctx.fillText(line, x, yy);
}

export function drawOrderBoard(canvas: HTMLCanvasElement, g: Game) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#9a6a45';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#86593a';
  for (let y = 0; y < H; y += 64) ctx.fillRect(0, y, W, 4);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff4dc';
  ctx.font = '700 54px Rubik, sans-serif';
  ctx.fillText('הזמנות הכפר', W / 2, 52);
  const n = g.orders.length;
  const w = Math.min(300, (W - 60) / n - 20);
  g.orders.forEach((o, i) => {
    // RTL: first order on the right.
    const x = W - 30 - (i + 1) * (w + 20) + 10;
    const y = 110;
    paper(ctx, x, y, w, 470, (i % 2 ? -1 : 1) * 0.03, o.filled ? '#e9fbe3' : '#fff8e8');
    drawPortrait(ctx, x + w / 2, y + 170, 80, o.def.icon, { showTail: !!o.def.icon.tail });
    ctx.fillStyle = '#3a2350';
    ctx.font = '700 36px Rubik, sans-serif';
    wrap(ctx, o.def.titleHe, x + w / 2, y + 320, w - 30, 42);
    if (o.filled) {
      ctx.save();
      ctx.translate(x + w / 2, y + 200);
      ctx.rotate(-0.25);
      ctx.strokeStyle = '#2f9e44';
      ctx.lineWidth = 10;
      ctx.strokeRect(-110, -50, 220, 100);
      ctx.fillStyle = '#2f9e44';
      ctx.font = '700 58px Rubik, sans-serif';
      ctx.fillText('נמסר!', 0, 4);
      ctx.restore();
    }
  });
}

/** Pedigree board for the show: each candidate with its two parents above it. */
export function drawPedigree(canvas: HTMLCanvasElement, g: Game) {
  const ctx = canvas.getContext('2d')!;
  const W = canvas.width;
  const H = canvas.height;
  ctx.fillStyle = '#3d2f63';
  ctx.fillRect(0, 0, W, H);
  ctx.direction = 'rtl';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '700 50px Rubik, sans-serif';
  ctx.fillText('לוח השושלת', W / 2, 46);
  const ped = g.day.pedigree;
  if (!ped) return;
  const genes = g.day.genes;
  const traits = (id: string) => {
    const p = g.pheno(id);
    const out: Partial<Record<GeneId, string>> = {};
    for (const gene of genes) out[gene] = p[gene];
    return out;
  };
  /** One short line per trait so neighbouring columns never overlap. */
  const labelLines = (id: string) => genes.map((gene) => GENES[gene].phenoHe[g.pheno(id)[gene]]);
  const lines = (txt: string[], x: number, y: number, lh: number) => txt.forEach((t, i) => ctx.fillText(t, x, y + i * lh));
  const kids = [...g.creatures.values()].filter((c) => c.origin === 'wild');
  const colW = W / kids.length;
  kids.forEach((c, i) => {
    const cx = W - colW * (i + 0.5);
    const parents = ped.parents[c.id];
    if (parents) {
      parents.forEach((pid, k) => {
        const px = cx + (k === 0 ? 1 : -1) * colW * 0.24;
        drawPortrait(ctx, px, 190, 44, traits(pid), { showTail: true });
        ctx.fillStyle = '#d8ccff';
        ctx.font = '500 17px Rubik, sans-serif';
        lines(labelLines(pid), px, 254, 20);
      });
      ctx.strokeStyle = '#ffe9a8';
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.moveTo(cx + colW * 0.24, 300);
      ctx.lineTo(cx + colW * 0.24, 330);
      ctx.lineTo(cx - colW * 0.24, 330);
      ctx.lineTo(cx - colW * 0.24, 300);
      ctx.moveTo(cx, 330);
      ctx.lineTo(cx, 385);
      ctx.stroke();
    } else {
      ctx.fillStyle = '#a99ad6';
      ctx.font = '500 24px Rubik, sans-serif';
      ctx.fillText('הורים לא ידועים', cx, 230);
    }
    drawPortrait(ctx, cx, 470, 64, traits(c.id), { showTail: true });
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 36px Rubik, sans-serif';
    ctx.fillText(c.name, cx, 580);
    ctx.fillStyle = '#d8ccff';
    ctx.font = '500 21px Rubik, sans-serif';
    lines(labelLines(c.id), cx, 616, 25);
  });
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '500 24px Rubik, sans-serif';
  wrap(ctx, ped.noteHe, W / 2, H - 80, W - 80, 32);
}
