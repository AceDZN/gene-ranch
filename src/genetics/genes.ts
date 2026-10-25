// Gene definitions for Gnoomies. Pure data + phenotype rules, no rendering.
// Every trait is one gene with two allele copies, one from each parent.

export type GeneId = 'ears' | 'color' | 'pattern' | 'tail' | 'glow';
export type Env = 'warm' | 'cold';
export type Allele = string;
export type Pair = readonly [Allele, Allele];
export type Genotype = Record<GeneId, Pair>;
export type Pheno = string;
export type Phenotype = Record<GeneId, Pheno>;

export interface GeneDef {
  id: GeneId;
  nameHe: string;
  /** All alleles, in canonical display order (dominant / codominant first). */
  alleles: Allele[];
  /** Display text for an allele (unicode, safe for canvas and DOM). */
  label: Record<Allele, string>;
  /** 'complete' = one allele masks the other; 'codominant' = both show (plus a recessive null allele). */
  mode: 'complete' | 'codominant';
  phenotype(pair: Pair, env: Env): Pheno;
  /** Hebrew name of each phenotype value. */
  phenoHe: Record<Pheno, string>;
  /** Phenotype values in display order. */
  phenos: Pheno[];
}

const has = (pair: Pair, a: Allele) => pair[0] === a || pair[1] === a;

export const GENES: Record<GeneId, GeneDef> = {
  ears: {
    id: 'ears',
    nameHe: 'אוזניים',
    alleles: ['E', 'e'],
    label: { E: 'E', e: 'e' },
    mode: 'complete',
    phenotype: (p) => (has(p, 'E') ? 'upright' : 'floppy'),
    phenoHe: { upright: 'אוזניים זקופות', floppy: 'אוזניים שמוטות' },
    phenos: ['upright', 'floppy'],
  },
  color: {
    id: 'color',
    nameHe: 'צבע פרווה',
    alleles: ['P', 'p'],
    label: { P: 'P', p: 'p' },
    mode: 'complete',
    // Like the Himalayan rabbit: the blue pigment of pp darkens to violet when the
    // fur grows in the cold. Genotype is unchanged; only the phenotype differs.
    phenotype: (p, env) => (has(p, 'P') ? 'pink' : env === 'cold' ? 'violet' : 'blue'),
    phenoHe: { pink: 'ורוד', blue: 'כחול', violet: 'סגול' },
    phenos: ['pink', 'blue', 'violet'],
  },
  pattern: {
    id: 'pattern',
    nameHe: 'דוגמה',
    // Mirrors Workbook's ABO example: Fˢ and Fᴰ are codominant, f is recessive to both.
    alleles: ['S', 'D', 'f'],
    label: { S: 'Fˢ', D: 'Fᴰ', f: 'f' },
    mode: 'codominant',
    phenotype: (p) => {
      const s = has(p, 'S');
      const d = has(p, 'D');
      if (s && d) return 'both';
      if (s) return 'stripes';
      if (d) return 'spots';
      return 'plain';
    },
    phenoHe: { stripes: 'פסים', spots: 'נקודות', both: 'פסים וגם נקודות', plain: 'חלק' },
    phenos: ['stripes', 'both', 'spots', 'plain'],
  },
  tail: {
    id: 'tail',
    nameHe: 'זנב',
    alleles: ['C', 'c'],
    label: { C: 'C', c: 'c' },
    mode: 'complete',
    phenotype: (p) => (has(p, 'C') ? 'curly' : 'straight'),
    phenoHe: { curly: 'זנב מסולסל', straight: 'זנב ישר' },
    phenos: ['curly', 'straight'],
  },
  glow: {
    id: 'glow',
    nameHe: 'מחוש',
    alleles: ['G', 'g'],
    label: { G: 'G', g: 'g' },
    mode: 'complete',
    phenotype: (p) => (has(p, 'G') ? 'glow' : 'plain'),
    phenoHe: { glow: 'מחוש זוהר', plain: 'בלי מחוש' },
    phenos: ['glow', 'plain'],
  },
};

export const GENE_IDS: GeneId[] = ['ears', 'color', 'pattern', 'tail', 'glow'];

/** Sort a pair into canonical order (dominant/codominant before recessive). */
export function canon(gene: GeneId, a: Allele, b: Allele): Pair {
  const order = GENES[gene].alleles;
  return order.indexOf(a) <= order.indexOf(b) ? [a, b] : [b, a];
}

export function pairKey(p: Pair): string {
  return p[0] + p[1];
}

export function pairLabel(gene: GeneId, p: Pair): string {
  const l = GENES[gene].label;
  return l[p[0]] + l[p[1]];
}

/** Every unordered genotype pair a gene allows. */
export function allPairs(gene: GeneId): Pair[] {
  const al = GENES[gene].alleles;
  const out: Pair[] = [];
  for (let i = 0; i < al.length; i++) for (let j = i; j < al.length; j++) out.push([al[i], al[j]]);
  return out;
}

export function phenotypeOf(g: Genotype, env: Env): Phenotype {
  const out = {} as Phenotype;
  for (const id of GENE_IDS) out[id] = GENES[id].phenotype(g[id], env);
  return out;
}

export function isHomozygous(p: Pair): boolean {
  return p[0] === p[1];
}

/** Defaults for genes a day doesn't use: everyone looks the same for those. */
export const DEFAULT_GENOTYPE: Genotype = {
  ears: ['E', 'E'],
  color: ['P', 'P'],
  pattern: ['f', 'f'],
  tail: ['C', 'C'],
  glow: ['g', 'g'],
};

/** Parse a compact genotype like "Ee pp SD" (gene letters, any order of genes). */
export function geno(spec: string, base: Genotype = DEFAULT_GENOTYPE): Genotype {
  const out: Genotype = { ...base };
  for (const tok of spec.trim().split(/\s+/).filter(Boolean)) {
    const [a, b] = [tok[0], tok[1]];
    const gene = GENE_IDS.find((id) => GENES[id].alleles.includes(a) && GENES[id].alleles.includes(b));
    if (!gene) throw new Error(`unknown genotype token ${tok}`);
    out[gene] = canon(gene, a, b);
  }
  return out;
}
