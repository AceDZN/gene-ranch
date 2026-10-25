// DOM HUD in Hebrew (RTL). Renders the Game state; all actions go back through handlers.
import { cardAlleles, isKnownCarrier, zygosity } from '../genetics/deduce';
import { GENES, type Env, type GeneId, type Pheno, type Phenotype } from '../genetics/genes';
import { BELT_MAX, type Game, type OrderState } from '../game/state';
import { portraitURL } from '../scene/look';

export interface HudHandlers {
  select(id: string): void;
  place(id: string): void;
  release(id: string): void;
  deliver(order: string, id: string): void;
  hatch(): void;
  temp(t: Env): void;
  hint(): void;
  pause(): void;
  mute(): void;
  pedigree(): void;
}

export interface HudUi {
  coach: string;
  muted: boolean;
  eggGlow: boolean;
  logOpen: boolean;
}

const FRAC: Record<string, string> = { '0': '0', '1': '1', '0.5': '½', '0.25': '¼', '0.75': '¾', '0.125': '⅛', '0.375': '⅜', '0.0625': '1/16', '0.1875': '3/16' };
export function frac(x: number): string {
  return FRAC[String(x)] ?? `${Math.round(x * 100)}%`;
}
export function pctRange(r: [number, number]): string {
  const p = (x: number) => `${Math.round(x * 100)}%`;
  return r[0] === r[1] ? p(r[0]) : `${p(r[0])}–${p(r[1])}`;
}

function esc(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
}

export function phenoName(gene: GeneId, p: Pheno): string {
  return GENES[gene].phenoHe[p] ?? p;
}

function visibleTraits(g: Game, p: Phenotype): Partial<Phenotype> {
  const out: Partial<Phenotype> = {};
  for (const gene of g.day.genes) out[gene] = p[gene];
  // Colour always shows (it's how creatures look).
  out.color = p.color;
  return out;
}

export class Hud {
  private keys: Record<string, string> = {};
  private els: Record<string, HTMLElement> = {};
  private toastTimer = 0;
  /** The latest hatch, explained under the Punnett square (cleared by the next action). */
  hatchInfo: { id: string; html: string } | null = null;

  constructor(
    readonly root: HTMLElement,
    private h: HudHandlers,
  ) {
    root.innerHTML = `
      <div class="tl"></div>
      <div class="tr"></div>
      <div class="coach"></div>
      <div class="bl"></div>
      <div class="bottom"><div class="hatchcard"></div><div class="belt"></div></div>
      <div class="side"><div class="cardwrap"></div></div>
      <div class="log"></div>
      <div class="chip"></div>`;
    for (const k of ['tl', 'tr', 'coach', 'bl', 'cardwrap', 'hatchcard', 'belt', 'log', 'chip']) this.els[k] = root.querySelector('.' + k)!;
    root.addEventListener('click', (e) => {
      const t = (e.target as HTMLElement).closest('[data-act]') as HTMLElement | null;
      if (!t || (t as HTMLButtonElement).disabled) return;
      e.stopPropagation();
      const a = t.dataset.act!;
      const id = t.dataset.id ?? '';
      if (a === 'select') this.h.select(id);
      else if (a === 'place') this.h.place(id);
      else if (a === 'release') this.h.release(id);
      else if (a === 'deliver') this.h.deliver(t.dataset.order!, id);
      else if (a === 'hatch') (this.hatchInfo = null), this.h.hatch();
      else if (a === 'warm') this.h.temp('warm');
      else if (a === 'cold') this.h.temp('cold');
      else if (a === 'hint') this.h.hint();
      else if (a === 'pause') this.h.pause();
      else if (a === 'mute') this.h.mute();
      else if (a === 'pedigree') this.h.pedigree();
      else if (a === 'log') this.els.log.classList.toggle('open');
      else if (a === 'closecard') this.hatchInfo = null;
    });
    // Keep HUD pointer events from reaching the 3D canvas.
    root.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  private set(k: string, html: string) {
    if (this.keys[k] === html) return;
    this.keys[k] = html;
    this.els[k].innerHTML = html;
  }

  toast(text: string, ms = 2600) {
    this.root.querySelector('.toast')?.remove();
    const d = document.createElement('div');
    d.className = 'toast';
    d.textContent = text;
    this.root.appendChild(d);
    clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => d.remove(), ms);
  }

  update(g: Game, ui: HudUi) {
    const sel = g.selected ? g.get(g.selected) : null;
    // Top-left: buttons + eggs.
    this.set(
      'tl',
      `<button class="rbtn" data-act="pause" aria-label="השהיה">⏸</button>
       <button class="rbtn" data-act="mute" aria-label="צליל">${ui.muted ? '🔇' : '🔊'}</button>
       ${g.day.hints ? `<button class="rbtn" data-act="hint" aria-label="רמז">💡</button>` : ''}
       <div class="eggs ${g.eggs <= 2 ? 'low' : ''}" title="ביצות שנשארו">🥚 <bdi>× ${g.eggs}</bdi></div>`,
    );
    // Top-right: plaque + orders.
    const stars = g.phase === 'won' ? g.stars() : 0;
    const orders = g.orders.map((o) => this.orderHtml(g, o, sel?.id ?? null)).join('');
    this.set(
      'tr',
      `<div class="plaque"><span class="day">יום ${g.day.num} · ${esc(g.day.titleHe)}</span><span class="stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}</span></div>${orders}`,
    );
    this.set('coach', esc(ui.coach));
    // Bottom-left: egg button + nest temperature.
    const full = !!g.nestPair();
    const eggLabel = g.phase === 'hatching' ? 'בוקע...' : !full ? 'שימו 2 בקן' : g.eggs > 0 ? 'הטילו ביצה' : 'אין ביצים';
    this.set(
      'bl',
      `${g.day.coldNest ? `<div class="temp"><button data-act="warm" class="${g.nestTemp === 'warm' ? 'on' : ''}">🔥 קן חם</button><button data-act="cold" class="${g.nestTemp === 'cold' ? 'on cold' : ''}">❄️ קן קר</button></div>` : ''}
       <button class="eggbtn ${ui.eggGlow ? 'glow' : ''}" data-act="hatch" ${g.canHatch() ? '' : 'disabled'} aria-label="הטילו ביצה">🥚<span>${eggLabel}</span></button>`,
    );
    // Belt.
    const slots: string[] = [];
    for (let i = 0; i < BELT_MAX; i++) {
      const id = g.belt[i];
      if (!id) {
        slots.push(`<div class="slot"></div>`);
        continue;
      }
      const c = g.get(id);
      const p = g.pheno(id);
      const match = g.orders.some((o) => g.canDeliver(o.def.id, id));
      slots.push(
        `<button class="slot full ${g.selected === id ? 'sel' : ''} ${match ? 'match' : ''}" data-act="select" data-id="${id}" aria-label="${esc(c.name)}"><img src="${portraitURL(visibleTraits(g, p), 96)}" alt=""><span class="nm">${esc(c.name)}</span></button>`,
      );
    }
    this.set('belt', slots.join(''));
    // Selected creature card.
    this.set('cardwrap', sel && sel.loc === 'belt' ? this.cardHtml(g, sel.id) : '');
    this.set('hatchcard', this.hatchInfo && g.phase === 'play' ? this.hatchInfo.html : '');
    // Hatch log.
    this.set('log', this.logHtml(g));
    // Side chips.
    this.set('chip', `${g.day.pedigree ? `<button data-act="pedigree">📜 לוח השושלת</button>` : ''}<button data-act="log" class="logbtn">📊 יומן</button>`);
  }

  private orderHtml(g: Game, o: OrderState, _selId: string | null): string {
    const selId = g.deliverable(o.def.id);
    const ready = !!selId;
    const req = o.def.req;
    let od = '';
    if (o.filled) od = 'הושלם!';
    else if (req.kind === 'purePair') od = `נמסרו <bdi>${o.delivered.length}/2</bdi>`;
    else if (req.kind === 'family') {
      od = req.phenos.map((ph) => (o.delivered.some((d) => g.pheno(d)[req.gene] === ph) ? '✅' : '⬜') + ' ' + phenoName(req.gene, ph)).join(' · ');
    } else {
      const r = g.orderOdds(o);
      if (r) {
        const genes = Object.keys(req.kind === 'phenotype' ? req.pheno : req.kind === 'parentPheno' ? req.pheno : {}) as GeneId[];
        const L = g.lens();
        if (genes.length > 1 && L && r[0] === r[1]) {
          const parts = genes.map((gene) => {
            const want = (req as { pheno: Partial<Record<GeneId, Pheno>> }).pheno[gene]!;
            const x = L.find((l) => l.gene === gene)?.odds.get(want);
            return x ? frac(x[0]) : '?';
          });
          od = `סיכוי לביצה: <bdi>${parts.join(' × ')} = ${frac(r[0])}</bdi>`;
        } else od = `סיכוי לביצה: <bdi>${pctRange(r)}</bdi>`;
      }
    }
    const icon = portraitURL(o.def.icon, 96);
    return `<div class="order ${o.filled ? 'filled' : ''} ${ready ? 'ready' : ''}">
      <img src="${icon}" alt="">
      <div><div class="ot">${esc(o.def.titleHe)}</div><div class="od">${od}</div></div>
      ${ready ? `<button class="deliver" data-act="deliver" data-order="${o.def.id}" data-id="${selId}">📦 מסרו את ${esc(g.get(selId!).name)}</button>` : ''}
    </div>`;
  }

  private cardHtml(g: Game, id: string): string {
    const c = g.get(id);
    const p = g.pheno(id);
    const rows = g.day.genes
      .map((gene) => {
        const set = g.known(id, gene);
        const al = g.day.autoDeduce ? cardAlleles(gene, set) : ['?', '?'];
        const z = g.day.autoDeduce ? zygosity(set) : 'unknown';
        const badge = g.day.autoDeduce && isKnownCarrier(gene, set) ? `<span class="tag carrier">נשא</span>` : z === 'homozygous' ? `<span class="tag">הומוזיגוט</span>` : z === 'heterozygous' ? `<span class="tag">הטרוזיגוט</span>` : '';
        const streak = g.streak(id, gene);
        const rec = GENES[gene].alleles[1];
        const recName = phenoName(gene, GENES[gene].phenotype([rec, rec], 'warm'));
        const note = set.length > 1 && streak > 0 ? `<div class="note">${streak} גורים עם בן זוג נסוג — אף אחד לא ${recName}. אם זה נשא, הסיכוי לזה <bdi>${frac(Math.pow(0.5, streak))}</bdi>. עדיין לא הוכחה!</div>` : '';
        const tiles = `<span class="tiles"><bdi>${al.map((a) => `<span class="tile ${a === '?' ? 'q' : ''}">${a}</span>`).join('')}</bdi></span>`;
        return `<div class="row"><div><div class="gn">${GENES[gene].nameHe}:</div><b>${phenoName(gene, p[gene])}</b> ${badge}</div>${tiles}</div>${note}`;
      })
      .join('');
    const parents = c.parents ? `<div class="note">הורים: ${c.parents.map((pid) => esc(g.get(pid).name)).join(' × ')}${c.env === 'cold' ? ' · גדל בקן הקר ❄️' : ''}</div>` : '';
    const tag = c.tagHe ? `<span class="tag">${esc(c.tagHe)}</span>` : '';
    const canPlace = g.phase === 'play' && (!g.nest[0] || !g.nest[1]);
    return `<div class="card">
      <div class="ch">${esc(c.name)}${tag}</div>
      <img src="${portraitURL(visibleTraits(g, p), 128)}" alt="">
      <div class="rows">${rows}${parents}</div>
      <div class="acts">
        <button data-act="place" data-id="${id}" ${canPlace ? '' : 'disabled'}>🪺 לקן</button>
        <button class="ghost" data-act="release" data-id="${id}">🌿 שחרור</button>
      </div>
    </div>`;
  }

  /** Build the hatch explanation card: mini Punnett per gene with the cells that match the baby lit. */
  setHatch(g: Game, id: string) {
    const pair = g.nestPair();
    const L = g.lens();
    if (!pair || !L) {
      this.hatchInfo = null;
      return;
    }
    const c = g.get(id);
    const p = g.pheno(id);
    const tables = L.map((l) => {
      const A = cardAlleles(l.gene, l.SA);
      const B = cardAlleles(l.gene, l.SB);
      const def = GENES[l.gene];
      const key = (x: string) => Object.keys(def.label).find((k) => def.label[k] === x)!;
      let hits = 0;
      let known = 0;
      const labels: string[] = [];
      const cells = [0, 1]
        .map((r) => {
          const tds = [0, 1]
            .map((cc) => {
              const a = A[r];
              const b = B[cc];
              if (a === '?' || b === '?') return `<td class="q">?</td>`;
              known++;
              const pr = [key(a), key(b)].sort((x, y) => def.alleles.indexOf(x) - def.alleles.indexOf(y)) as [string, string];
              const ph = def.phenotype(pr, g.nestTemp);
              const lab = def.label[pr[0]] + def.label[pr[1]];
              const hit = ph === p[l.gene];
              if (hit) (hits++, labels.push(lab));
              return `<td class="${hit ? 'hit' : ''}">${lab}</td>`;
            })
            .join('');
          return `<tr><th>${A[r]}</th>${tds}</tr>`;
        })
        .join('');
      const head = `<tr><th></th><th>${B[0]}</th><th>${B[1]}</th></tr>`;
      const line = known === 4 ? `${phenoName(l.gene, p[l.gene])} = <bdi>${[...new Set(labels)].join(' / ')}</bdi> · <bdi>${frac(hits / 4)}</bdi> מהתאים` : `${phenoName(l.gene, p[l.gene])} · יש בריבוע אללים לא ידועים (?)`;
      return `<div class="mini"><table dir="ltr">${head}${cells}</table><div class="ml">${line}</div></div>`;
    }).join('');
    const open = g.orders.find((o) => !o.filled && o.def.req.kind === 'phenotype');
    const r = open ? g.orderOdds(open) : null;
    const match = g.orders.some((o) => g.canDeliver(o.def.id, id));
    const tail = match
      ? `<b>מתאים להזמנה! ⭐</b>`
      : open && r
        ? `לא מה שהוזמן. "${esc(open.def.titleHe)}": <bdi>${pctRange(r)}</bdi> בכל ביצה — ביצה חדשה היא הגרלה חדשה.`
        : 'כל ביצה היא הגרלה חדשה.';
    this.hatchInfo = {
      id,
      html: `<div class="hcard"><button class="x" data-act="closecard" aria-label="סגירה">✕</button><div class="ht">בקע ${esc(c.name)}!</div><div class="minis">${tables}</div><div class="htail">${tail}</div>${g.eggs > 0 && !match ? `<button class="again" data-act="hatch">🥚 ביצה נוספת</button>` : ''}</div>`,
    };
  }

  private logHtml(g: Game): string {
    const pair = g.nestPair();
    if (!pair && g.hatchLog.length === 0) return `<h4>📊 יומן בקיעות</h4><div class="sum">עוד לא בקעו ביצים.</div>`;
    const ids = pair ? pair.map((c) => c.id).sort().join('|') : null;
    const entries = ids ? g.hatchLog.filter((h) => [...h.parents].sort().join('|') === ids) : [];
    const L = g.lens();
    let rows = '';
    if (pair) {
      for (const gene of g.day.genes) {
        const odds = L?.find((l) => l.gene === gene)?.odds;
        const phenos = GENES[gene].phenos.filter((ph) => (odds?.get(ph)?.[1] ?? 0) > 0 || entries.some((e) => e.pheno[gene] === ph));
        for (const ph of phenos) {
          const n = entries.filter((e) => e.pheno[gene] === ph).length;
          const obs = entries.length ? n / entries.length : 0;
          const ex = odds?.get(ph);
          const exTxt = ex ? pctRange(ex) : '?';
          rows += `<div class="lr"><img src="${portraitURL({ [gene]: ph }, 52)}" alt=""><div><div class="bar"><i style="width:${obs * 100}%"></i>${ex && ex[0] === ex[1] ? `<b style="left:${ex[0] * 100}%"></b>` : ''}</div><div class="note">${phenoName(gene, ph)}</div></div><div><bdi>${n}/${entries.length}</bdi><div class="note">צפוי ${exTxt}</div></div></div>`;
        }
      }
    }
    const seq = (entries.length ? entries : g.hatchLog).slice(-14).map((e) => `<img src="${portraitURL(visibleTraits(g, e.pheno), 40)}" alt="">`).join('');
    const head = pair ? `${esc(pair[0].name)} × ${esc(pair[1].name)}` : 'כל הבקיעות';
    return `<h4>📊 יומן: ${head}</h4>${rows}<div class="seq">${seq}</div><div class="sum">פס סגול = בפועל · קו כתום = צפוי. כל ביצה היא הגרלה חדשה.</div>`;
  }
}
