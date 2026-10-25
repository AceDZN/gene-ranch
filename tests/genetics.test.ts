import { describe, expect, it } from 'vitest';
import { Rng, cross, genotypeOdds, phenoOdds, punnett, targetOdds } from '../src/genetics/cross';
import { cardAlleles, deduce, isKnownCarrier, lensOdds, testCrossStreak, type Family, type Observed } from '../src/genetics/deduce';
import { GENES, geno, pairKey, phenotypeOf, type Env, type GeneId, type Genotype } from '../src/genetics/genes';

const N = 8000;

function sample(a: Genotype, b: Genotype, gene: GeneId, seed = 1, env: Env = 'warm') {
  const rng = new Rng(seed);
  const geno = new Map<string, number>();
  const pheno = new Map<string, number>();
  for (let i = 0; i < N; i++) {
    const r = cross(a, b, rng);
    const k = pairKey(r.genotype[gene]);
    geno.set(k, (geno.get(k) ?? 0) + 1 / N);
    const p = GENES[gene].phenotype(r.genotype[gene], env);
    pheno.set(p, (pheno.get(p) ?? 0) + 1 / N);
  }
  return { geno, pheno };
}

// 4 standard errors of a proportion at N = 8000 is about 0.022 for p = 0.5.
const TOL = 0.022;

describe('single-gene crosses (complete dominance)', () => {
  it('Ee × Ee gives genotypes 1:2:1 and phenotypes 3:1', () => {
    const { geno: g, pheno: p } = sample(geno('Ee'), geno('Ee'), 'ears');
    expect(g.get('EE')!).toBeCloseTo(0.25, 1);
    expect(Math.abs(g.get('EE')! - 0.25)).toBeLessThan(TOL);
    expect(Math.abs(g.get('Ee')! - 0.5)).toBeLessThan(TOL);
    expect(Math.abs(g.get('ee')! - 0.25)).toBeLessThan(TOL);
    expect(Math.abs(p.get('upright')! - 0.75)).toBeLessThan(TOL);
    expect(Math.abs(p.get('floppy')! - 0.25)).toBeLessThan(TOL);
  });

  it('test-cross Ee × ee gives 1:1, EE × ee gives only Ee', () => {
    const het = sample(geno('Ee'), geno('ee'), 'ears', 2);
    expect(Math.abs(het.pheno.get('floppy')! - 0.5)).toBeLessThan(TOL);
    const hom = sample(geno('EE'), geno('ee'), 'ears', 3);
    expect(hom.geno.get('Ee')).toBeCloseTo(1, 6);
    expect(hom.pheno.get('floppy')).toBeUndefined();
  });

  it('dominant does not mean more common: a recessive-only population stays recessive', () => {
    const { pheno } = sample(geno('ee'), geno('ee'), 'ears', 4);
    expect(pheno.get('floppy')).toBeCloseTo(1, 6);
  });

  it('exact Punnett odds match the sampled ones', () => {
    expect([...genotypeOdds('ears', ['E', 'e'], ['E', 'e'])]).toEqual([
      ['EE', 0.25],
      ['Ee', 0.5],
      ['ee', 0.25],
    ]);
    expect(punnett('ears', ['E', 'e'], ['e', 'e']).map((c) => c.pair.join(''))).toEqual(['Ee', 'Ee', 'ee', 'ee']);
  });

  it('"1/4" is per egg, not "exactly one in every four"', () => {
    const rng = new Rng(7);
    let exactlyOne = 0;
    const runs = 5000;
    for (let r = 0; r < runs; r++) {
      let floppy = 0;
      for (let i = 0; i < 4; i++) if (cross(geno('Ee'), geno('Ee'), rng).genotype.ears.join('') === 'ee') floppy++;
      if (floppy === 1) exactlyOne++;
    }
    // Binomial: 4 · ¼ · (¾)³ ≈ 0.42 — most families of four do NOT show exactly 3:1.
    expect(Math.abs(exactlyOne / runs - 0.4219)).toBeLessThan(0.03);
  });
});

describe('codominance (pattern gene, like ABO)', () => {
  it('stripes × spots gives only both-patterns (not a blend)', () => {
    const { pheno } = sample(geno('SS'), geno('DD'), 'pattern', 5);
    expect(pheno.get('both')).toBeCloseTo(1, 6);
  });
  it('FˢFᴰ × FˢFᴰ gives phenotypes 1:2:1, not 3:1', () => {
    const { pheno } = sample(geno('SD'), geno('SD'), 'pattern', 6);
    expect(Math.abs(pheno.get('stripes')! - 0.25)).toBeLessThan(TOL);
    expect(Math.abs(pheno.get('both')! - 0.5)).toBeLessThan(TOL);
    expect(Math.abs(pheno.get('spots')! - 0.25)).toBeLessThan(TOL);
  });
  it('Fˢf × Fᴰf gives all four patterns at ¼ (like Aᵢ × Bᵢ blood types)', () => {
    const o = phenoOdds('pattern', ['S', 'f'], ['D', 'f']);
    expect(o.get('both')).toBe(0.25);
    expect(o.get('stripes')).toBe(0.25);
    expect(o.get('spots')).toBe(0.25);
    expect(o.get('plain')).toBe(0.25);
  });
});

describe('independent genes and sex', () => {
  it('two genes assort independently: P(floppy & blue) ≈ P(floppy)·P(blue)', () => {
    const rng = new Rng(8);
    let both = 0;
    let fl = 0;
    let bl = 0;
    const a = geno('Ee Pp');
    for (let i = 0; i < N; i++) {
      const p = phenotypeOf(cross(a, a, rng).genotype, 'warm');
      const f = p.ears === 'floppy';
      const b = p.color === 'blue';
      if (f) fl++;
      if (b) bl++;
      if (f && b) both++;
    }
    expect(Math.abs(both / N - 1 / 16)).toBeLessThan(0.01);
    expect(Math.abs(both / N - (fl / N) * (bl / N))).toBeLessThan(0.01);
    expect(targetOdds(a, a, { ears: 'floppy', color: 'blue' })).toBe(1 / 16);
    expect(targetOdds(geno('Ee pp'), geno('ee Pp'), { ears: 'floppy', color: 'blue' })).toBe(1 / 4);
  });
  it('sex is 50/50 per egg', () => {
    const rng = new Rng(9);
    let f = 0;
    for (let i = 0; i < N; i++) if (cross(geno('Ee'), geno('Ee'), rng).sex === 'f') f++;
    expect(Math.abs(f / N - 0.5)).toBeLessThan(TOL);
  });
  it('same seed gives the same eggs (deterministic RNG)', () => {
    const run = (s: number) => {
      const r = new Rng(s);
      return Array.from({ length: 20 }, () => cross(geno('Ee Pp'), geno('Ee Pp'), r).genotype.ears.join('')).join(',');
    };
    expect(run(42)).toBe(run(42));
    expect(run(42)).not.toBe(run(43));
  });
});

describe('environment changes phenotype, never genotype', () => {
  it('pp is blue in warm, violet in cold; P_ is pink in both', () => {
    expect(GENES.color.phenotype(['p', 'p'], 'warm')).toBe('blue');
    expect(GENES.color.phenotype(['p', 'p'], 'cold')).toBe('violet');
    expect(GENES.color.phenotype(['P', 'p'], 'cold')).toBe('pink');
  });
  it('a violet (cold-raised pp) parent has blue babies in the warm nest', () => {
    const { pheno } = sample(geno('pp'), geno('pp'), 'color', 10, 'warm');
    expect(pheno.get('blue')).toBeCloseTo(1, 6);
  });
});

describe('deduction engine (what the player can know)', () => {
  const obs = (id: string, g: string, env: Env = 'warm'): Observed => ({ id, pheno: phenotypeOf(geno(g), env), env });

  it('a floppy baby from two upright parents proves both are carriers', () => {
    const creatures = [obs('a', 'Ee'), obs('b', 'Ee'), obs('k', 'ee')];
    const fam: Family[] = [{ a: 'a', b: 'b', child: 'k' }];
    const K = deduce(creatures, fam);
    expect(K.get('a')!.ears.map((p) => p.join(''))).toEqual(['Ee']);
    expect(K.get('b')!.ears.map((p) => p.join(''))).toEqual(['Ee']);
    expect(isKnownCarrier('ears', K.get('a')!.ears)).toBe(true);
  });

  it('upright-only test-cross babies leave the parent unproven ("E ?") with a growing streak', () => {
    const creatures = [obs('x', 'EE'), obs('r', 'ee'), obs('k1', 'Ee'), obs('k2', 'Ee'), obs('k3', 'Ee')];
    const fam: Family[] = ['k1', 'k2', 'k3'].map((k) => ({ a: 'x', b: 'r', child: k }));
    const K = deduce(creatures, fam);
    expect(K.get('x')!.ears.length).toBe(2);
    expect(cardAlleles('ears', K.get('x')!.ears)).toEqual(['E', '?']);
    const m = new Map(creatures.map((c) => [c.id, c]));
    expect(testCrossStreak('x', 'ears', K, fam, m)).toBe(3);
    // Children of an ee mate are always heterozygous if upright.
    expect(K.get('k1')!.ears.map((p) => p.join(''))).toEqual(['Ee']);
  });

  it('given facts constrain the card; lens shows honest ranges for unknowns', () => {
    const facts = new Map([['a', { ears: [['E', 'e'] as const] }]]);
    const K = deduce([obs('a', 'Ee'), obs('u', 'EE'), obs('r', 'ee')], [], facts);
    expect(K.get('a')!.ears.map((p) => p.join(''))).toEqual(['Ee']);
    const r = lensOdds('ears', K.get('u')!.ears, K.get('r')!.ears);
    expect(r.get('floppy')).toEqual([0, 0.5]);
    const exact = lensOdds('ears', K.get('a')!.ears, K.get('a')!.ears);
    expect(exact.get('floppy')).toEqual([0.25, 0.25]);
  });

  it('codominant cards: stripes could be FˢFˢ or Fˢf', () => {
    const K = deduce([obs('s', 'SS')], []);
    expect(cardAlleles('pattern', K.get('s')!.pattern)).toEqual(['Fˢ', '?']);
    const K2 = deduce([obs('b', 'SD')], []);
    expect(cardAlleles('pattern', K2.get('b')!.pattern)).toEqual(['Fˢ', 'Fᴰ']);
  });

  it('violet means pp even though the colour came from the cold', () => {
    const K = deduce([obs('v', 'pp', 'cold')], []);
    expect(K.get('v')!.color.map((p) => p.join(''))).toEqual(['pp']);
  });
});
