// Crosses, gametes and Punnett squares. Pure logic, seeded randomness.
import { GENES, GENE_IDS, canon, pairKey, phenotypeOf, type Env, type GeneId, type Genotype, type Pair, type Pheno } from './genes';

/** mulberry32: small, fast, deterministic. Returns floats in [0, 1). */
export class Rng {
  private s: number;
  constructor(seed: number) {
    // Scramble the seed (murmur3 finalizer) so nearby seeds don't give correlated first draws.
    let h = (seed >>> 0) ^ 0x9e3779b9;
    h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
    h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
    this.s = (h ^ (h >>> 16)) >>> 0;
  }
  next(): number {
    this.s = (this.s + 0x6d2b79f5) >>> 0;
    let t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  /** 0 or 1 with equal odds. */
  coin(): 0 | 1 {
    return this.next() < 0.5 ? 0 : 1;
  }
  int(n: number): number {
    return Math.floor(this.next() * n);
  }
  shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  get state(): number {
    return this.s;
  }
}

export interface CrossResult {
  genotype: Genotype;
  /** For each gene: which allele copy (0/1) came from parent A (row) and parent B (column). */
  pick: Record<GeneId, [0 | 1, 0 | 1]>;
  sex: 'f' | 'm';
}

/**
 * One fertilisation. Each parent passes ONE of its two copies of every gene,
 * chosen independently 50/50 (genes are independent: no linkage).
 */
export function cross(a: Genotype, b: Genotype, rng: Rng): CrossResult {
  const genotype = {} as Genotype;
  const pick = {} as Record<GeneId, [0 | 1, 0 | 1]>;
  for (const id of GENE_IDS) {
    const ia = rng.coin();
    const ib = rng.coin();
    genotype[id] = canon(id, a[id][ia], b[id][ib]);
    pick[id] = [ia, ib];
  }
  const sex = rng.coin() === 0 ? 'f' : 'm';
  return { genotype, pick, sex };
}

export interface PunnettCell {
  row: 0 | 1;
  col: 0 | 1;
  pair: Pair;
  pheno: Pheno;
}

/** The 2×2 Punnett square for one gene of two known parents. Rows = parent A's alleles. */
export function punnett(gene: GeneId, a: Pair, b: Pair, env: Env = 'warm'): PunnettCell[] {
  const cells: PunnettCell[] = [];
  for (const row of [0, 1] as const)
    for (const col of [0, 1] as const) {
      const pair = canon(gene, a[row], b[col]);
      cells.push({ row, col, pair, pheno: GENES[gene].phenotype(pair, env) });
    }
  return cells;
}

/** Probability of each genotype (by key) for one gene. Each cell = 1/4. */
export function genotypeOdds(gene: GeneId, a: Pair, b: Pair): Map<string, number> {
  const m = new Map<string, number>();
  for (const c of punnett(gene, a, b)) m.set(pairKey(c.pair), (m.get(pairKey(c.pair)) ?? 0) + 0.25);
  return m;
}

/** Probability of each phenotype value for one gene. */
export function phenoOdds(gene: GeneId, a: Pair, b: Pair, env: Env = 'warm'): Map<Pheno, number> {
  const m = new Map<Pheno, number>();
  for (const c of punnett(gene, a, b, env)) m.set(c.pheno, (m.get(c.pheno) ?? 0) + 0.25);
  return m;
}

/**
 * Probability that one egg shows ALL the wanted phenotypes. Genes are independent,
 * so the per-gene probabilities multiply.
 */
export function targetOdds(a: Genotype, b: Genotype, want: Partial<Record<GeneId, Pheno>>, env: Env = 'warm'): number {
  let p = 1;
  for (const id of Object.keys(want) as GeneId[]) p *= phenoOdds(id, a[id], b[id], env).get(want[id]!) ?? 0;
  return p;
}

export { phenotypeOf };
