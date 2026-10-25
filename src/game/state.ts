// The authoritative game state. Pure TypeScript: the 3D scene and HUD only render it.
import { Rng, cross, punnett } from '../genetics/cross';
import { deduce, lensOdds, testCrossStreak, type Family, type Facts, type Knowledge, type Observed } from '../genetics/deduce';
import { GENES, GENE_IDS, geno, isHomozygous, phenotypeOf, type Env, type GeneId, type Genotype, type Pair, type Pheno, type Phenotype } from '../genetics/genes';
import { DAYS, type CreatureSpec, type DayDef, type OrderDef } from './days';

export const BELT_MAX = 6;
export const HATCH_MS = 2600;

export type Loc = 'meadow' | 'belt' | 'nest' | 'delivered' | 'away';

export interface Creature {
  id: string;
  name: string;
  genotype: Genotype;
  env: Env;
  sex: 'f' | 'm';
  origin: 'wild' | 'ranch' | 'baby' | 'pedigree';
  parents?: [string, string];
  loc: Loc;
  tagHe?: string;
  pretty: number;
}

export interface OrderState {
  def: OrderDef;
  delivered: string[];
  filled: boolean;
}

export interface HatchEntry {
  parents: [string, string];
  child: string;
  pheno: Phenotype;
  env: Env;
  /** Punnett cell (row = nest slot 0 parent's allele, col = slot 1 parent's) per gene. */
  cell: Record<GeneId, [0 | 1, 0 | 1]>;
}

export type GameEvent =
  | { type: 'caught'; id: string }
  | { type: 'released'; id: string }
  | { type: 'placed'; id: string; slot: 0 | 1 }
  | { type: 'unplaced'; id: string }
  | { type: 'hatchStart'; child: string; cell: Record<GeneId, [0 | 1, 0 | 1]> }
  | { type: 'hatched'; id: string; toBelt: boolean; matches: string[] }
  | { type: 'delivered'; id: string; order: string; filled: boolean }
  | { type: 'wrongDelivery'; id: string; order: string; explainHe: string }
  | { type: 'rejected'; id: string; order: string; reasonHe: string }
  | { type: 'bonusEggs'; n: number; explainHe: string }
  | { type: 'outOfEggs'; explainHe: string }
  | { type: 'won' }
  | { type: 'beltFull' }
  | { type: 'hint'; textHe: string };

export interface LearningEvent {
  t: number;
  day: string;
  attempt: number;
  action: string;
  detail: string;
  outcome: string;
  hinted: boolean;
}

export type Phase = 'play' | 'hatching' | 'won' | 'outOfEggs';

const BABY_NAMES = ['צ׳יקו', 'נוני', 'בִּיבּי', 'קוקו', 'זוזו', 'מימי', 'טוטו', 'פופו', 'דודו', 'גוגו', 'ריקי', 'שושו', 'לילי', 'חומי', 'נונה', 'בלבל', 'פיצי', 'מושי', 'קיקי', 'ננה'];

export function matchesPheno(p: Phenotype, want: Partial<Record<GeneId, Pheno>>): boolean {
  return (Object.keys(want) as GeneId[]).every((g) => p[g] === want[g]);
}

export class Game {
  readonly day: DayDef;
  readonly dayIndex: number;
  readonly attempt: number;
  readonly rng: Rng;
  creatures = new Map<string, Creature>();
  belt: string[] = [];
  nest: [string | null, string | null] = [null, null];
  selected: string | null = null;
  nestTemp: Env = 'warm';
  eggs: number;
  eggsUsed = 0;
  bonusGiven = false;
  orders: OrderState[];
  families: Family[] = [];
  phase: Phase = 'play';
  hatch: { t: number; child: Creature; entry: HatchEntry } | null = null;
  hatchLog: HatchEntry[] = [];
  mistakes = 0;
  hintsUsed = 0;
  private hintIdx = 0;
  facts: Facts = new Map();
  knowledge: Knowledge = new Map();
  events: GameEvent[] = [];
  learning: LearningEvent[] = [];
  time = 0;
  private babyN = 0;
  private firstPairLogged = false;

  constructor(dayIndex: number, seed: number, attempt = 1) {
    this.dayIndex = dayIndex;
    this.day = DAYS[dayIndex];
    this.attempt = attempt;
    this.rng = new Rng(seed);
    this.eggs = this.day.eggs;
    this.orders = this.day.orders.map((def) => ({ def, delivered: [], filled: false }));
    for (const spec of this.day.roster(this.rng)) this.addSpec(spec);
    if (this.day.pedigree)
      for (const [kid, [m, f]] of Object.entries(this.day.pedigree.parents)) {
        this.creatures.get(kid)!.parents = [m, f];
        this.families.push({ a: m, b: f, child: kid });
      }
    this.recompute();
  }

  private addSpec(s: CreatureSpec) {
    const c: Creature = {
      id: s.key,
      name: s.name,
      genotype: geno(s.geno),
      env: s.env ?? 'warm',
      sex: this.rng.coin() ? 'f' : 'm',
      origin: s.loc === 'away' ? 'pedigree' : s.loc === 'belt' ? 'ranch' : 'wild',
      loc: s.loc,
      tagHe: s.tagHe,
      pretty: s.pretty ?? 0,
    };
    this.creatures.set(c.id, c);
    if (s.loc === 'belt') this.belt.push(c.id);
    if (s.fact) {
      const g = geno(s.fact);
      const rec: Partial<Record<GeneId, Pair[]>> = {};
      for (const tok of s.fact.split(/\s+/)) {
        const gene = GENE_IDS.find((id) => GENES[id].alleles.includes(tok[0]))!;
        rec[gene] = [g[gene]];
      }
      this.facts.set(c.id, rec);
    }
  }

  // ---------- queries ----------
  get(id: string): Creature {
    const c = this.creatures.get(id);
    if (!c) throw new Error(`no creature ${id}`);
    return c;
  }
  pheno(id: string): Phenotype {
    const c = this.get(id);
    return phenotypeOf(c.genotype, c.env);
  }
  list(loc: Loc): Creature[] {
    return [...this.creatures.values()].filter((c) => c.loc === loc);
  }
  /** Knowledge sets the card may show (empty-ish when the day turns auto-deduction off). */
  known(id: string, gene: GeneId): Pair[] {
    return this.knowledge.get(id)?.[gene] ?? [];
  }
  streak(id: string, gene: GeneId): number {
    if (!this.day.autoDeduce) return 0;
    const obs = new Map<string, Observed>();
    for (const c of this.creatures.values()) obs.set(c.id, { id: c.id, pheno: this.pheno(c.id), env: c.env });
    return testCrossStreak(id, gene, this.knowledge, this.families, obs);
  }
  nestPair(): [Creature, Creature] | null {
    const [a, b] = this.nest;
    return a && b ? [this.get(a), this.get(b)] : null;
  }
  canHatch(): boolean {
    return this.phase === 'play' && !!this.nestPair() && this.eggs > 0;
  }
  /** Lens for the current nest pair: per active gene, allele edges + odds ranges from what is KNOWN. */
  lens() {
    const pair = this.nestPair();
    if (!pair || !this.day.lens) return null;
    const [A, B] = pair;
    return this.day.genes.map((g) => {
      const SA = this.known(A.id, g);
      const SB = this.known(B.id, g);
      const exactA = SA.length === 1 ? SA[0] : null;
      const exactB = SB.length === 1 ? SB[0] : null;
      return {
        gene: g,
        SA,
        SB,
        cells: exactA && exactB ? punnett(g, exactA, exactB, this.nestTemp) : null,
        odds: lensOdds(g, SA, SB, this.nestTemp),
      };
    });
  }
  /** Chance range that the next egg fills each open order, from known genotypes (phenotype orders only). */
  orderOdds(order: OrderState): [number, number] | null {
    const L = this.lens();
    if (!L) return null;
    const req = order.def.req;
    const want = req.kind === 'phenotype' ? req.pheno : req.kind === 'parentPheno' ? req.pheno : null;
    if (!want) return null;
    let lo = 1;
    let hi = 1;
    for (const g of Object.keys(want) as GeneId[]) {
      const l = L.find((x) => x.gene === g);
      const r = l?.odds.get(want[g]!) ?? (this.nestPair()!.every((c) => this.pheno(c.id)[g] === want[g]) ? [1, 1] : [0, 0]);
      lo *= r[0];
      hi *= r[1];
    }
    return [lo, hi];
  }
  canDeliver(orderId: string, id: string): boolean {
    const o = this.orders.find((x) => x.def.id === orderId);
    if (!o || o.filled || this.phase !== 'play') return false;
    const c = this.creatures.get(id);
    if (!c || (c.loc !== 'belt' && c.loc !== 'nest')) return false;
    return this.eligible(o, id);
  }
  /** Phenotype-level fit of a creature for an order (what the player can see), ignoring where it is. */
  eligible(o: OrderState, id: string): boolean {
    const c = this.get(id);
    const p = this.pheno(id);
    const req = o.def.req;
    switch (req.kind) {
      case 'phenotype':
        return matchesPheno(p, req.pheno);
      case 'carrier': {
        // The village only takes a PROVEN carrier: the card must already show it is heterozygous.
        const dom = GENES[req.gene].phenotype([GENES[req.gene].alleles[0], GENES[req.gene].alleles[1]], c.env);
        const k = this.known(id, req.gene);
        return p[req.gene] === dom && (!this.day.autoDeduce || (k.length === 1 && k[0][0] !== k[0][1]));
      }
      case 'purePair':
        return p[req.gene] === req.pheno;
      case 'family': {
        const have = o.delivered.map((d) => this.pheno(d)[req.gene]);
        if (!req.phenos.includes(p[req.gene]) || have.includes(p[req.gene]) || !c.parents) return false;
        if (o.delivered.length === 0) return true;
        const first = this.get(o.delivered[0]).parents!;
        return [...first].sort().join('|') === [...c.parents].sort().join('|');
      }
      case 'parentPheno':
        return matchesPheno(p, req.pheno) && !!c.parents && c.parents.some((pid) => matchesPheno(this.pheno(pid), req.parentPheno));
    }
  }
  /** A creature that can fill this order right now: the selected one first, then belt, then nest. */
  deliverable(orderId: string): string | null {
    const ids = [this.selected, ...this.belt, ...this.nest].filter((x): x is string => !!x);
    return ids.find((id) => this.canDeliver(orderId, id)) ?? null;
  }
  allFilled(): boolean {
    return this.orders.every((o) => o.filled);
  }
  stars(): number {
    if (this.phase !== 'won') return 0;
    return 1 + (this.mistakes === 0 ? 1 : 0) + (this.hintsUsed === 0 ? 1 : 0);
  }

  // ---------- actions ----------
  select(id: string | null) {
    if (id && this.creatures.get(id)?.loc !== 'belt') return;
    this.selected = id;
  }

  catch(id: string): boolean {
    const c = this.creatures.get(id);
    if (!c || c.loc !== 'meadow' || this.phase === 'won') return false;
    if (this.belt.length >= BELT_MAX) {
      this.emit({ type: 'beltFull' });
      return false;
    }
    c.loc = 'belt';
    this.belt.push(id);
    this.selected = id;
    this.emit({ type: 'caught', id });
    this.logL('catch', c.name, 'ok');
    return true;
  }

  release(id: string): boolean {
    const c = this.creatures.get(id);
    if (!c || c.loc !== 'belt') return false;
    this.belt = this.belt.filter((x) => x !== id);
    c.loc = 'meadow';
    if (this.selected === id) this.selected = null;
    this.emit({ type: 'released', id });
    return true;
  }

  /** Put a belt creature in the nest (first free slot, or the given one). */
  place(id: string, slot?: 0 | 1): boolean {
    const c = this.creatures.get(id);
    if (!c || c.loc !== 'belt' || this.phase !== 'play') return false;
    const s = slot ?? (this.nest[0] === null ? 0 : this.nest[1] === null ? 1 : null);
    if (s === null) return false;
    if (this.nest[s]) this.unplace(s);
    this.nest[s] = id;
    c.loc = 'nest';
    this.belt = this.belt.filter((x) => x !== id);
    if (this.selected === id) this.selected = this.belt[0] ?? null;
    this.emit({ type: 'placed', id, slot: s });
    return true;
  }

  unplace(slot: 0 | 1): boolean {
    const id = this.nest[slot];
    if (!id || this.phase !== 'play') return false;
    const c = this.get(id);
    this.nest[slot] = null;
    if (this.belt.length < BELT_MAX) {
      c.loc = 'belt';
      this.belt.push(id);
    } else c.loc = 'meadow';
    this.emit({ type: 'unplaced', id });
    return true;
  }

  setNestTemp(t: Env) {
    if (!this.day.coldNest || this.phase !== 'play') return;
    this.nestTemp = t;
  }

  hatchEgg(): boolean {
    if (!this.canHatch()) return false;
    const [A, B] = this.nestPair()!;
    const r = cross(A.genotype, B.genotype, this.rng);
    const child: Creature = {
      id: `baby${++this.babyN}`,
      name: BABY_NAMES[(this.babyN - 1) % BABY_NAMES.length] + (this.babyN > BABY_NAMES.length ? ` ${Math.ceil(this.babyN / BABY_NAMES.length)}` : ''),
      genotype: r.genotype,
      env: this.nestTemp,
      sex: r.sex,
      origin: 'baby',
      parents: [A.id, B.id],
      loc: 'away',
      pretty: 0,
    };
    this.eggs--;
    this.eggsUsed++;
    const entry: HatchEntry = { parents: [A.id, B.id], child: child.id, pheno: phenotypeOf(child.genotype, child.env), env: child.env, cell: r.pick };
    this.hatch = { t: 0, child, entry };
    this.phase = 'hatching';
    this.emit({ type: 'hatchStart', child: child.id, cell: r.pick });
    if (!this.firstPairLogged) {
      this.firstPairLogged = true;
      this.logL('firstPair', `${A.name}×${B.name}`, this.pairUseful(A, B) ? 'useful' : 'not-useful');
    }
    return true;
  }

  /** Whether some open phenotype order is possible from this pair (truth; used only for learning logs/tests). */
  pairUseful(A: Creature, B: Creature): boolean {
    return this.orders.some((o) => {
      if (o.filled) return false;
      const req = o.def.req;
      if (req.kind !== 'phenotype') return true;
      return (Object.keys(req.pheno) as GeneId[]).every((g) => {
        const cells = punnett(g, A.genotype[g], B.genotype[g], this.nestTemp);
        return cells.some((c) => c.pheno === req.pheno[g]);
      });
    });
  }

  tick(dt: number) {
    this.time += dt;
    if (this.phase !== 'hatching' || !this.hatch) return;
    this.hatch.t += dt;
    if (this.hatch.t < HATCH_MS) return;
    const { child, entry } = this.hatch;
    this.hatch = null;
    this.creatures.set(child.id, child);
    this.families.push({ a: entry.parents[0], b: entry.parents[1], child: child.id });
    this.hatchLog.push(entry);
    this.recompute();
    // A full belt makes room: the oldest baby that fits no open order hops out to the meadow.
    if (this.belt.length >= BELT_MAX) {
      const spare = this.belt.find((id) => this.get(id).origin === 'baby' && !this.orders.some((o) => !o.filled && this.eligible(o, id)));
      if (spare) {
        this.belt = this.belt.filter((x) => x !== spare);
        this.get(spare).loc = 'meadow';
        if (this.selected === spare) this.selected = null;
        this.emit({ type: 'released', id: spare });
      }
    }
    const toBelt = this.belt.length < BELT_MAX;
    child.loc = toBelt ? 'belt' : 'meadow';
    if (toBelt) this.belt.push(child.id);
    if (toBelt) this.selected = child.id;
    this.phase = 'play';
    this.recompute();
    const matches = this.orders.filter((o) => this.canDeliver(o.def.id, child.id)).map((o) => o.def.id);
    this.emit({ type: 'hatched', id: child.id, toBelt, matches });
    this.logL('hatch', `${entry.parents.join('×')}→${Object.values(entry.pheno).join('/')}`, matches.length ? 'match' : 'no-match');
    this.checkEggs();
  }

  private checkEggs() {
    if (this.phase !== 'play' || this.eggs > 0 || this.allFilled()) return;
    // Not stuck while the ranch already holds what the open orders need.
    if (this.orders.every((o) => o.filled || this.canStillFill(o))) return;
    const explain = this.explainLuck();
    if (this.day.bonusEggs && !this.bonusGiven) {
      this.bonusGiven = true;
      this.eggs += this.day.bonusEggs;
      this.emit({ type: 'bonusEggs', n: this.day.bonusEggs, explainHe: explain });
      this.logL('bonusEggs', String(this.day.bonusEggs), 'granted');
      return;
    }
    {
      this.phase = 'outOfEggs';
      this.emit({ type: 'outOfEggs', explainHe: explain });
      this.logL('outOfEggs', String(this.eggsUsed), 'fail');
    }
  }

  /** Could this order still be filled from creatures already on the ranch (belt, nest or meadow)? */
  private canStillFill(o: OrderState): boolean {
    const owned = [...this.creatures.values()].filter((c) => c.loc === 'belt' || c.loc === 'meadow' || c.loc === 'nest');
    const ok = owned.filter((c) => this.eligible(o, c.id));
    const req = o.def.req;
    if (req.kind === 'purePair') return ok.length >= 2 - o.delivered.length;
    if (req.kind === 'family') {
      const missing = req.phenos.filter((ph) => !o.delivered.some((d) => this.pheno(d)[req.gene] === ph));
      return missing.every((ph) => ok.some((c) => this.pheno(c.id)[req.gene] === ph));
    }
    return ok.length > 0;
  }

  private explainLuck(): string {
    const open = this.orders.find((o) => !o.filled);
    if (!open) return '';
    const r = this.orderOdds(open);
    const n = this.eggsUsed;
    if (r && r[1] === 0) return 'עם ההורים שבקן הסיכוי היה 0% — אף תא בריבוע לא נותן את מה שהוזמן. נסו זוג אחר.';
    if (r && r[0] > 0 && r[0] === r[1]) {
      const miss = Math.pow(1 - r[0], n);
      return `לכל ביצה היה סיכוי של ${pct(r[0])}. ${n} ביצות בלי הצלחה קורות בערך ב־${pct(miss)} מהפעמים — מזל רע, לא טעות. כל ביצה היא הגרלה חדשה.`;
    }
    return 'כל ביצה היא הגרלה חדשה: ריבוע פאנט אומר מה הסיכוי, לא מה יקרה בפועל.';
  }

  deliver(orderId: string, id: string): boolean {
    const o = this.orders.find((x) => x.def.id === orderId);
    if (!o || !this.canDeliver(orderId, id)) {
      if (o) this.emit({ type: 'rejected', id, order: orderId, reasonHe: this.rejectReason(o, id) });
      return false;
    }
    const c = this.get(id);
    const req = o.def.req;
    const hinted = this.hintsUsed > 0;
    const certain = this.isCertainFor(o, id);
    if (req.kind === 'carrier' && isHomozygous(c.genotype[req.gene])) {
      this.mistakes++;
      const dom = GENES[req.gene].alleles[0];
      this.emit({
        type: 'wrongDelivery',
        id,
        order: orderId,
        explainHe: `הכפר הכליא את ${c.name} עם שמוט 6 פעמים — כל הגורים זקופים. ${c.name} הוא ${dom}${dom}, לא נשא. בלי גור שמוט אין הוכחה.`,
      });
      this.logL('deliver', `${orderId}:${c.name}`, certain ? 'wrong-certain?' : 'wrong-guess', hinted);
      return false;
    }
    // Leaves with the villager (straight from the nest if it was sitting there).
    if (this.nest[0] === id) this.nest[0] = null;
    if (this.nest[1] === id) this.nest[1] = null;
    this.belt = this.belt.filter((x) => x !== id);
    c.loc = 'delivered';
    if (this.selected === id) this.selected = this.belt[0] ?? null;
    o.delivered.push(id);
    const need = req.kind === 'purePair' ? 2 : req.kind === 'family' ? req.phenos.length : 1;
    if (o.delivered.length >= need) {
      if (req.kind === 'purePair') {
        const bad = o.delivered.map((d) => this.get(d)).filter((x) => !isHomozygous(x.genotype[req.gene]));
        if (bad.length) {
          this.mistakes++;
          for (const d of o.delivered) {
            const x = this.get(d);
            x.loc = this.belt.length < BELT_MAX ? 'belt' : 'meadow';
            if (x.loc === 'belt') this.belt.push(d);
          }
          o.delivered = [];
          // The village's own breeding test took time: it costs eggs from your basket.
          const cost = Math.min(this.eggs, 3);
          this.eggs -= cost;
          const rec = GENES[req.gene].alleles[1];
          const dom = GENES[req.gene].alleles[0];
          this.emit({
            type: 'wrongDelivery',
            id,
            order: orderId,
            explainHe: `הכפר גידל את הזוג: הגורים ורודים... אבל בדור הנכדים בקע גור כחול! ${bad.map((b) => b.name).join(' ו')} ${bad.length > 1 ? 'היו נשאים' : 'היה נשא'} (${dom}${rec}) והעביר את ${rec} הלאה.${cost ? ` הבדיקה של הכפר עלתה ${cost} ביצים.` : ''}`,
          });
          this.checkEggs();
          this.logL('deliver', `${orderId}`, certain ? 'wrong' : 'wrong-guess', hinted);
          return false;
        }
      }
      o.filled = true;
    }
    this.emit({ type: 'delivered', id, order: orderId, filled: o.filled });
    this.logL('deliver', `${orderId}:${c.name}`, certain ? 'proved' : 'unproved', hinted);
    if (this.allFilled()) {
      this.phase = 'won';
      this.emit({ type: 'won' });
      this.logL('won', `eggs=${this.eggsUsed}`, `stars=${this.stars()}`, hinted);
    } else this.checkEggs();
    return true;
  }

  /** Whether the card showed enough to be sure (for honest learning logs: proof vs lucky guess). */
  private isCertainFor(o: OrderState, id: string): boolean {
    const req = o.def.req;
    if (req.kind === 'carrier' || req.kind === 'purePair') {
      const s = this.known(id, req.gene);
      return s.length === 1;
    }
    return true;
  }

  private rejectReason(o: OrderState, id: string): string {
    const c = this.creatures.get(id);
    if (!c) return '';
    if (o.def.req.kind === 'family' && !c.parents) return 'בתמונה המשפחתית רק גורים שבקעו כאן.';
    if (o.def.req.kind === 'family') return 'צריך אחים מאותם הורים, עם דוגמה שעוד חסרה בתמונה.';
    if (o.def.req.kind === 'parentPheno') return 'צריך גור כחול שאחד מההורים שלו סגול.';
    if (o.def.req.kind === 'carrier') return `עוד אין הוכחה ש${c.name} נשא. הכפר רוצה לראות גור שמוט שלו.`;
    return 'זה לא מה שהוזמן — הסתכלו בתמונה שעל ההזמנה.';
  }

  hint(): string | null {
    if (!this.day.hints || this.day.hintsHe.length === 0) return null;
    const t = this.day.hintsHe[this.hintIdx % this.day.hintsHe.length];
    this.hintIdx++;
    this.hintsUsed++;
    this.emit({ type: 'hint', textHe: t });
    this.logL('hint', String(this.hintIdx), 'shown', true);
    return t;
  }

  recompute() {
    const obs: Observed[] = [...this.creatures.values()].map((c) => ({ id: c.id, pheno: this.pheno(c.id), env: c.env }));
    if (this.day.autoDeduce) this.knowledge = deduce(obs, this.families, this.facts);
    else {
      // Transfer day: the card shows phenotypes only; the player deduces from the board.
      const K: Knowledge = new Map();
      for (const c of this.creatures.values()) {
        const rec = {} as Record<GeneId, Pair[]>;
        for (const g of GENE_IDS) rec[g] = [];
        K.set(c.id, rec);
      }
      this.knowledge = K;
    }
  }

  private emit(e: GameEvent) {
    this.events.push(e);
  }
  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }
  private logL(action: string, detail: string, outcome: string, hinted = this.hintsUsed > 0) {
    this.learning.push({ t: Math.round(this.time), day: this.day.id, attempt: this.attempt, action, detail, outcome, hinted });
  }

  /** Text snapshot for automated testing (window.render_game_to_text). */
  toText(): string {
    const show = (c: Creature) => {
      const p = this.pheno(c.id);
      return {
        id: c.id,
        name: c.name,
        loc: c.loc,
        pheno: Object.fromEntries(this.day.genes.map((g) => [g, p[g]])),
        known: Object.fromEntries(this.day.genes.map((g) => [g, this.known(c.id, g).map((x) => x.join('')).join('|') || '?'])),
      };
    };
    return JSON.stringify({
      day: this.day.num,
      title: this.day.titleHe,
      phase: this.phase,
      eggs: this.eggs,
      eggsUsed: this.eggsUsed,
      nestTemp: this.nestTemp,
      selected: this.selected,
      belt: this.belt.map((id) => show(this.get(id))),
      meadow: this.list('meadow').map(show),
      nest: this.nest.map((id) => (id ? show(this.get(id)) : null)),
      hatching: this.hatch ? { t: Math.round(this.hatch.t), of: HATCH_MS } : null,
      orders: this.orders.map((o) => ({ id: o.def.id, title: o.def.titleHe, filled: o.filled, delivered: o.delivered.length, odds: this.orderOdds(o) })),
      lens: this.lens()?.map((l) => ({ gene: l.gene, odds: Object.fromEntries([...l.odds].filter(([, r]) => r[1] > 0)) })),
      hatchLog: this.hatchLog.map((h) => Object.fromEntries(this.day.genes.map((g) => [g, h.pheno[g]]))),
      mistakes: this.mistakes,
      hints: this.hintsUsed,
      stars: this.stars(),
    });
  }
}

export function pct(x: number): string {
  const v = x * 100;
  if (v === 0) return '0%';
  if (v < 1) return '<1%';
  return `${Math.round(v)}%`;
}

export { DAYS };
