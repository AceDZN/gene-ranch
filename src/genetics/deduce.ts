// What the player can KNOW about hidden genotypes, from phenotypes, pedigree and given facts.
// This never peeks at the true genotype: it is the detective layer behind the gene cards.
import { GENES, GENE_IDS, allPairs, canon, pairKey, type Env, type GeneId, type Pair, type Pheno, type Phenotype } from './genes';
import { phenoOdds } from './cross';

export interface Observed {
  id: string;
  pheno: Phenotype;
  env: Env;
}
export interface Family {
  a: string;
  b: string;
  child: string;
}
export type Facts = Map<string, Partial<Record<GeneId, Pair[]>>>;
export type Knowledge = Map<string, Record<GeneId, Pair[]>>;

function producible(gene: GeneId, a: Pair, b: Pair): Set<string> {
  const s = new Set<string>();
  for (const x of a) for (const y of b) s.add(pairKey(canon(gene, x, y)));
  return s;
}

/** Arc-consistency over (parent, parent, children) families until nothing changes. */
export function deduce(creatures: Observed[], families: Family[], facts: Facts = new Map()): Knowledge {
  const K: Knowledge = new Map();
  for (const c of creatures) {
    const rec = {} as Record<GeneId, Pair[]>;
    for (const g of GENE_IDS) {
      let s = allPairs(g).filter((p) => GENES[g].phenotype(p, c.env) === c.pheno[g]);
      const f = facts.get(c.id)?.[g];
      if (f) {
        const keys = new Set(f.map((p) => pairKey(canon(g, p[0], p[1]))));
        s = s.filter((p) => keys.has(pairKey(p)));
      }
      rec[g] = s;
    }
    K.set(c.id, rec);
  }
  // Group children by parent pair.
  const groups = new Map<string, { a: string; b: string; kids: string[] }>();
  for (const f of families) {
    if (!K.has(f.a) || !K.has(f.b) || !K.has(f.child)) continue;
    const key = [f.a, f.b].sort().join('|');
    const grp = groups.get(key) ?? { a: f.a, b: f.b, kids: [] };
    grp.kids.push(f.child);
    groups.set(key, grp);
  }
  let changed = true;
  let guard = 0;
  while (changed && guard++ < 50) {
    changed = false;
    for (const { a, b, kids } of groups.values()) {
      for (const g of GENE_IDS) {
        const SA = K.get(a)![g];
        const SB = K.get(b)![g];
        const keepA = new Set<string>();
        const keepB = new Set<string>();
        const kidAllowed = kids.map(() => new Set<string>());
        for (const pa of SA)
          for (const pb of SB) {
            const prod = producible(g, pa, pb);
            const ok = kids.every((k) => K.get(k)![g].some((p) => prod.has(pairKey(p))));
            if (!ok) continue;
            keepA.add(pairKey(pa));
            keepB.add(pairKey(pb));
            kids.forEach((k, i) => K.get(k)![g].forEach((p) => prod.has(pairKey(p)) && kidAllowed[i].add(pairKey(p))));
          }
        const nA = SA.filter((p) => keepA.has(pairKey(p)));
        const nB = SB.filter((p) => keepB.has(pairKey(p)));
        if (nA.length !== SA.length) (K.get(a)![g] = nA), (changed = true);
        if (nB.length !== SB.length) (K.get(b)![g] = nB), (changed = true);
        kids.forEach((k, i) => {
          const S = K.get(k)![g];
          const n = S.filter((p) => kidAllowed[i].has(pairKey(p)));
          if (n.length !== S.length) (K.get(k)![g] = n), (changed = true);
        });
      }
    }
  }
  return K;
}

/** The two allele slots a card shows: a letter where it's certain, '?' where it isn't. */
export function cardAlleles(gene: GeneId, set: Pair[]): [string, string] {
  const L = GENES[gene].label;
  if (set.length === 0) return ['?', '?'];
  if (set.length === 1) return [L[set[0][0]], L[set[0][1]]];
  // Alleles present in every possibility (as a multiset).
  let common = [...set[0]] as string[];
  for (const p of set.slice(1)) {
    const rest = [...p] as string[];
    common = common.filter((x) => {
      const i = rest.indexOf(x);
      if (i < 0) return false;
      rest.splice(i, 1);
      return true;
    });
  }
  const out = common.map((x) => L[x]);
  while (out.length < 2) out.push('?');
  return [out[0], out[1]];
}

export type ZygoteStatus = 'homozygous' | 'heterozygous' | 'unknown';
export function zygosity(set: Pair[]): ZygoteStatus {
  if (set.length !== 1) return 'unknown';
  return set[0][0] === set[0][1] ? 'homozygous' : 'heterozygous';
}

/** Known carrier: shows the dominant trait but certainly carries the hidden recessive allele. */
export function isKnownCarrier(gene: GeneId, set: Pair[]): boolean {
  return GENES[gene].mode === 'complete' && set.length === 1 && set[0][0] !== set[0][1];
}

/**
 * Lens odds for one gene when parents may be only partly known: the range of the
 * chance of each phenotype over every genotype still possible for the parents.
 */
export function lensOdds(gene: GeneId, SA: Pair[], SB: Pair[], env: Env = 'warm'): Map<Pheno, [number, number]> {
  const m = new Map<Pheno, [number, number]>();
  const phenos = GENES[gene].phenos;
  for (const ph of phenos) m.set(ph, [1, 0]);
  for (const a of SA)
    for (const b of SB) {
      const o = phenoOdds(gene, a, b, env);
      for (const ph of phenos) {
        const v = o.get(ph) ?? 0;
        const r = m.get(ph)!;
        r[0] = Math.min(r[0], v);
        r[1] = Math.max(r[1], v);
      }
    }
  for (const [ph, r] of m) if (r[0] > r[1]) m.set(ph, [0, 0]);
  return m;
}

/**
 * Test-cross streak: how many babies in a row this dominant-looking creature had with a
 * known recessive mate, all showing the dominant trait. If it were a carrier, the chance
 * of such a streak is (1/2)^n — it's never a proof, only growing confidence.
 */
export function testCrossStreak(id: string, gene: GeneId, K: Knowledge, families: Family[], obs: Map<string, Observed>): number {
  const def = GENES[gene];
  if (def.mode !== 'complete') return 0;
  const rec = def.alleles[1];
  const recKey = rec + rec;
  let n = 0;
  for (const f of families) {
    if (f.a !== id && f.b !== id) continue;
    const mate = f.a === id ? f.b : f.a;
    const ms = K.get(mate)?.[gene];
    if (!ms || ms.length !== 1 || pairKey(ms[0]) !== recKey) continue;
    const child = obs.get(f.child);
    if (!child) continue;
    if (child.pheno[gene] === def.phenotype([def.alleles[0], rec], child.env)) n++;
  }
  return n;
}
