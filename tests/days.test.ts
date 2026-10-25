// Every authored day: solvable with correct reasoning inside its egg budget, and the
// wrong approaches produce the advertised consequence. Strategies act only through the
// public Game actions (no injected wins); they peek only at what the card shows.
import { describe, expect, it } from 'vitest';
import { deduce } from '../src/genetics/deduce';
import { phenotypeOf } from '../src/genetics/genes';
import { DAYS } from '../src/game/days';
import { BELT_MAX, Game, HATCH_MS } from '../src/game/state';

const RUNS = 400;

/** Hatch one egg; a baby that overflowed into the meadow is caught again (like a player would). */
function hatchOnce(g: Game, keep: string[] = []): string | null {
  if (!g.hatchEgg()) return null;
  g.tick(HATCH_MS);
  const ev = g.drainEvents().find((e) => e.type === 'hatched');
  if (!ev || ev.type !== 'hatched') return null;
  if (g.get(ev.id).loc === 'meadow') toBelt(g, ev.id, keep);
  return ev.id;
}
function catchAll(g: Game) {
  for (const c of g.list('meadow')) g.catch(c.id);
}
/** Make room and bring a creature into the belt. */
function toBelt(g: Game, id: string, keep: string[] = []) {
  const c = g.get(id);
  if (c.loc === 'belt') return;
  if (c.loc === 'nest') {
    g.unplace(g.nest[0] === id ? 0 : 1);
    if (g.get(id).loc === 'belt') return;
  }
  if (g.belt.length >= BELT_MAX) {
    const victim = g.belt.find((x) => !keep.includes(x) && x !== id);
    if (victim) g.release(victim);
  }
  g.catch(id);
}
function setNest(g: Game, a: string, b: string) {
  if (g.nest[0] === a && g.nest[1] === b) return;
  if (g.nest[0]) g.unplace(0);
  if (g.nest[1]) g.unplace(1);
  toBelt(g, a, [b]);
  g.place(a, 0);
  toBelt(g, b, [a]);
  g.place(b, 1);
}
function deliverAny(g: Game, orderId: string): boolean {
  const all = [...g.creatures.values()].filter((c) => c.loc === 'belt' || c.loc === 'meadow' || c.loc === 'nest');
  for (const c of all) {
    const o = g.orders.find((x) => x.def.id === orderId)!;
    if (o.filled) return true;
    if (!g.eligible(o, c.id)) continue;
    toBelt(g, c.id);
    if (g.deliver(orderId, c.id)) return true;
  }
  return false;
}
const knownKey = (g: Game, id: string, gene: 'ears' | 'color') => g.known(id, gene).map((p) => p.join('')).join('|');

function rate(fn: (seed: number) => boolean, runs = RUNS): number {
  let ok = 0;
  for (let s = 1; s <= runs; s++) if (fn(s)) ok++;
  return ok / runs;
}

describe('Day 1 — Big Ears', () => {
  const play = (seed: number) => {
    const g = new Game(0, seed);
    catchAll(g);
    setNest(g, 'bobo', 'lulu');
    while (g.phase === 'play' && !g.orders[0].filled) {
      const kid = hatchOnce(g);
      if (!kid) break;
      if (g.pheno(kid).ears === 'floppy') g.deliver('floppy', kid);
    }
    return g;
  };
  it('the first 30 seconds work: catch two, nest, Punnett lens appears with ¼ floppy', () => {
    const g = new Game(0, 1);
    catchAll(g);
    expect(g.belt.length).toBe(2);
    setNest(g, 'bobo', 'lulu');
    const lens = g.lens()!;
    expect(lens[0].cells!.map((c) => c.pair.join(''))).toEqual(['EE', 'Ee', 'Ee', 'ee']);
    expect(g.orderOdds(g.orders[0])).toEqual([0.25, 0.25]);
  });
  it('wins almost always within 8 + 4 bonus eggs; the bonus explains the luck', () => {
    expect(rate((s) => play(s).phase === 'won')).toBeGreaterThan(0.95);
    // (¾)^8 ≈ 10% of players need the bonus basket.
    const needBonus = rate((s) => play(s).bonusGiven);
    expect(Math.abs(needBonus - Math.pow(0.75, 8))).toBeLessThan(0.05);
  });
});

describe('Day 2 — The Hidden Carrier', () => {
  // Test-cross each candidate with Pip (ee): 3 eggs, 3 eggs, then the rest on the last one.
  const smart = (seed: number) => {
    const g = new Game(1, seed);
    catchAll(g);
    const cands = ['tofi', 'motzi', 'shimshi'];
    cands.forEach((c, i) => {
      if (g.orders[0].filled || g.phase !== 'play') return;
      setNest(g, c, 'pip');
      for (let k = 0; (i < 2 ? k < 3 : true) && g.eggs > 0 && knownKey(g, c, 'ears') !== 'Ee'; k++) if (!hatchOnce(g)) break;
      // A proven carrier can be delivered straight from the nest.
      if (knownKey(g, c, 'ears') === 'Ee') g.deliver('carrier', c);
    });
    return g;
  };
  it('a test-cross strategy finds the carrier within 10 eggs', () => {
    expect(rate((s) => smart(s).phase === 'won')).toBeGreaterThan(0.85);
  });
  it("babies don't count: an upright baby of Pip is a proven Ee, but the order wants a wild candidate", () => {
    const g = new Game(1, 3);
    catchAll(g);
    setNest(g, 'tofi', 'pip');
    let up: string | null = null;
    for (let i = 0; i < 6 && !up; i++) {
      const k = hatchOnce(g);
      if (k && g.pheno(k).ears === 'upright') up = k;
    }
    expect(up).not.toBeNull();
    expect(knownKey(g, up!, 'ears')).toBe('Ee');
    expect(g.canDeliver('carrier', up!)).toBe(false);
  });
  it('a floppy baby fills the carrier card (Ee) — proof, not a guess', () => {
    for (let s = 1; s < 50; s++) {
      const g = smart(s);
      const delivered = g.orders[0].delivered[0];
      if (!delivered) continue;
      expect(g.get(delivered).genotype.ears.join('')).toBe('Ee');
    }
  });
  it('guessing is impossible: without a recessive baby as proof the village refuses every candidate', () => {
    for (let s = 1; s <= 50; s++) {
      const g = new Game(1, s);
      catchAll(g);
      for (const c of ['tofi', 'motzi', 'shimshi']) {
        expect(g.deliver('carrier', c)).toBe(false);
        expect(g.drainEvents().some((e) => e.type === 'rejected')).toBe(true);
      }
      expect(g.mistakes).toBe(0);
    }
  });
});

describe('Day 3 — Pure Line', () => {
  const pinks = ['varda', 'sukaria', 'petel'];
  const smart = (seed: number) => {
    const g = new Game(2, seed);
    catchAll(g);
    const clean: string[] = [];
    for (const c of pinks) {
      setNest(g, c, 'kachli');
      let blue = false;
      for (let i = 0; i < 3 && g.eggs > 0; i++) {
        const kid = hatchOnce(g);
        if (kid && g.pheno(kid).color === 'blue') {
          blue = true;
          break;
        }
      }
      if (!blue) clean.push(c);
    }
    if (g.nest[0]) g.unplace(0);
    for (const c of clean.slice(0, 2)) {
      toBelt(g, c);
      g.deliver('pure-pink', c);
    }
    return g;
  };
  it('test-crossing each pink with the blue gives a pure pair within 10 eggs most of the time', () => {
    expect(rate((s) => smart(s).phase === 'won')).toBeGreaterThan(0.85);
  });
  it('a carrier can never be proven PP: after n pink babies the card still shows "P ?"', () => {
    const g = new Game(2, 3);
    catchAll(g);
    const pp = pinks.find((c) => g.get(c).genotype.color.join('') === 'PP')!;
    setNest(g, pp, 'kachli');
    for (let i = 0; i < 4; i++) hatchOnce(g);
    expect(g.known(pp, 'color').length).toBe(2);
    expect(g.streak(pp, 'color')).toBe(4);
  });
  it('delivering untested pinks fails about 2 times in 3 with a visible consequence', () => {
    let won = 0;
    for (let s = 1; s <= RUNS; s++) {
      const g = new Game(2, s);
      catchAll(g);
      g.deliver('pure-pink', 'varda');
      g.deliver('pure-pink', 'sukaria');
      if (g.orders[0].filled) won++;
      else {
        expect(g.drainEvents().some((e) => e.type === 'wrongDelivery')).toBe(true);
        expect(g.get('varda').loc).toBe('belt');
        expect(g.eggs).toBe(DAYS[2].eggs - 3);
      }
    }
    expect(Math.abs(won / RUNS - 1 / 3)).toBeLessThan(0.08);
  });
});

describe('Day 4 — Stripes AND Spots', () => {
  const smart = (seed: number) => {
    const g = new Game(3, seed);
    catchAll(g);
    setNest(g, 'zebra', 'nekudi');
    const kids = [hatchOnce(g)!, hatchOnce(g)!, hatchOnce(g)!];
    for (const k of kids) expect(g.pheno(k).pattern).toBe('both');
    g.deliver('both', kids[0]);
    setNest(g, kids[1], kids[2]);
    const fam = g.orders[1];
    while (g.phase === 'play' && !fam.filled && g.eggs > 0) {
      const kid = hatchOnce(g);
      if (!kid) break;
      if (g.canDeliver('family', kid)) g.deliver('family', kid);
    }
    return g;
  };
  it('stripes × spots always gives both patterns; the 1:2:1 family fits in 14 eggs', () => {
    expect(rate((s) => smart(s).phase === 'won')).toBeGreaterThan(0.85);
  });
  it('family photo only starts with parents that can give all three patterns', () => {
    const g = new Game(3, 1);
    catchAll(g);
    setNest(g, 'zebra', 'nekudi');
    const a = hatchOnce(g)!;
    expect(g.pheno(a).pattern).toBe('both');
    // FˢFˢ × FᴰFᴰ can only ever give "both": starting the family photo here would be a dead end.
    expect(g.canDeliver('family', a)).toBe(false);
    expect(g.canDeliver('family', 'zebra')).toBe(false);
  });
});

describe('Day 5 — Two Traits + environment', () => {
  const smart = (seed: number) => {
    const g = new Game(4, seed);
    setNest(g, 'yam', 'perach');
    while (g.phase === 'play' && !g.orders[0].filled) {
      const kid = hatchOnce(g);
      if (!kid) break;
      if (g.canDeliver('floppy-blue', kid)) g.deliver('floppy-blue', kid);
    }
    g.setNestTemp('cold');
    let violet: string | null = null;
    while (g.phase === 'play' && !violet && g.eggs > 0) {
      const kid = hatchOnce(g);
      if (!kid) break;
      if (g.pheno(kid).color === 'violet') violet = kid;
    }
    if (!violet) return g;
    g.setNestTemp('warm');
    setNest(g, violet, 'yam');
    const kid = hatchOnce(g, [violet]);
    // pp × pp in the warm nest: always blue, even though one parent looks violet.
    if (kid) expect(g.pheno(kid).color).toBe('blue');
    expect(g.get(violet).genotype.color.join('')).toBe('pp');
    g.unplace(0);
    g.unplace(1);
    if (kid) {
      toBelt(g, kid);
      g.deliver('violet-kid', kid);
    }
    toBelt(g, violet);
    g.deliver('violet', violet);
    return g;
  };
  it('choosing the ½ × ½ pair, then cold, then warm, fills all three orders within 14 eggs', () => {
    expect(rate((s) => smart(s).phase === 'won')).toBeGreaterThan(0.85);
  });
  it('lens multiplies independent genes: yam × perach = ¼, agas × perach = ⅛, nasich × anything = 0', () => {
    const g = new Game(4, 1);
    setNest(g, 'yam', 'perach');
    expect(g.orderOdds(g.orders[0])).toEqual([0.25, 0.25]);
    setNest(g, 'agas', 'perach');
    expect(g.orderOdds(g.orders[0])).toEqual([0.125, 0.125]);
    setNest(g, 'nasich', 'perach');
    expect(g.orderOdds(g.orders[0])).toEqual([0, 0]);
  });
  it('always breeding the prettiest pair (nasich × agas) never fills the floppy order', () => {
    const won = rate((s) => {
      const g = new Game(4, s);
      setNest(g, 'nasich', 'agas');
      while (g.eggs > 0 && g.phase === 'play') {
        const k = hatchOnce(g);
        if (k && g.canDeliver('floppy-blue', k)) g.deliver('floppy-blue', k);
      }
      return g.orders[0].filled;
    }, 300);
    expect(won).toBe(0);
  });
});

describe('Day 6 — Transfer: The Show (no hints, no lens)', () => {
  it('has no lens, no hints and no auto-filled genotype cards', () => {
    const g = new Game(5, 1);
    catchAll(g);
    setNest(g, 'nitzotz', 'tachav');
    expect(g.lens()).toBeNull();
    expect(g.hint()).toBeNull();
    expect(g.known('tachav', 'tail')).toEqual([]);
  });
  it('the pedigree board is enough to deduce the key genotypes', () => {
    const g = new Game(5, 1);
    const obs = [...g.creatures.values()].map((c) => ({ id: c.id, pheno: phenotypeOf(c.genotype, c.env), env: c.env }));
    const K = deduce(obs, g.families);
    expect(K.get('nitzotz')!.tail.map((p) => p.join(''))).toEqual(['Cc']);
    expect(K.get('nitzotz')!.glow.map((p) => p.join(''))).toEqual(['Gg']);
    expect(K.get('chaluk')!.tail.map((p) => p.join(''))).toEqual(['Cc']);
    expect(K.get('shavit')!.tail.length).toBe(2); // can't tell CC from Cc — and doesn't need to
  });
  const smart = (seed: number) => {
    const g = new Game(5, seed);
    catchAll(g);
    setNest(g, 'shavit', 'tachav');
    const k = hatchOnce(g)!;
    g.deliver('glow', k);
    setNest(g, 'nitzotz', 'tachav');
    while (g.phase === 'play' && g.eggs > 0) {
      const kid = hatchOnce(g);
      if (!kid) break;
      const p = g.pheno(kid);
      if (p.glow === 'glow' && p.tail === 'straight' && !g.orders[2].filled) {
        toBelt(g, kid, [g.nest[0]!, g.nest[1]!]);
        g.deliver('glow-straight', kid);
      } else if (p.tail === 'straight' && !g.orders[0].filled) {
        toBelt(g, kid);
        g.deliver('straight', kid);
      }
      if (g.allFilled()) break;
    }
    if (!g.allFilled()) deliverAny(g, 'straight');
    return g;
  };
  it('reasoning from the pedigree fills all three orders within 10 eggs most of the time', () => {
    expect(rate((s) => smart(s).phase === 'won')).toBeGreaterThan(0.85);
  });
  it('the constant strategy "breed the two prettiest" (ניצוץ × שביט) always fails', () => {
    const won = rate((s) => {
      const g = new Game(5, s);
      catchAll(g);
      setNest(g, 'nitzotz', 'shavit');
      while (g.eggs > 0 && g.phase === 'play') {
        const kid = hatchOnce(g);
        if (!kid) break;
        for (const o of g.orders) if (g.canDeliver(o.def.id, kid)) g.deliver(o.def.id, kid);
      }
      return g.phase === 'won';
    }, 300);
    expect(won).toBe(0);
  });
  it('dominant is not "more common": glow (G) is dominant but rare on the island', () => {
    const g = new Game(5, 1);
    expect(DAYS[5].pedigree!.noteHe).toContain('G');
    const wild = g.list('meadow');
    expect(wild.filter((c) => g.pheno(c.id).glow === 'glow').length).toBeLessThan(wild.length);
  });
});

describe('science-review regressions', () => {
  it('a wrong pure pair does not name the carrier', () => {
    for (let s = 1; s <= 40; s++) {
      const g = new Game(2, s);
      catchAll(g);
      g.deliver('pure-pink', 'varda');
      g.deliver('pure-pink', 'sukaria');
      const ev = g.drainEvents().find((e) => e.type === 'wrongDelivery');
      if (ev && ev.type === 'wrongDelivery') for (const n of ['ורדה', 'סוכריה', 'פטל']) expect(ev.explainHe).not.toContain(n);
    }
  });
  it('a known carrier (card shows Pp) is never offered for the pure line', () => {
    const g = new Game(2, 4);
    catchAll(g);
    const pp = ['varda', 'sukaria', 'petel'].find((c) => g.get(c).genotype.color.join('') === 'Pp')!;
    setNest(g, pp, 'kachli');
    for (let i = 0; i < 12 && knownKey(g, pp, 'color') !== 'Pp'; i++) hatchOnce(g);
    expect(knownKey(g, pp, 'color')).toBe('Pp');
    expect(g.eligible(g.orders[0], pp)).toBe(false);
  });
  it('out-of-eggs separates impossible pairs from bad luck', () => {
    const g = new Game(4, 2);
    setNest(g, 'nasich', 'agas');
    const all: ReturnType<Game['drainEvents']> = [];
    while (g.eggs > 0 && g.hatchEgg()) {
      g.tick(HATCH_MS);
      all.push(...g.drainEvents());
    }
    const out = all.find((e) => e.type === 'outOfEggs');
    expect(g.phase).toBe('outOfEggs');
    expect(out && out.type === 'outOfEggs' && out.explainHe).toContain('0%');
    expect(out && out.type === 'outOfEggs' && out.explainHe).not.toContain('מזל רע');
  });
  it('no free guessing at 0 eggs: a wrong pure pair the village cannot test ends the day', () => {
    let ended = 0;
    for (let s = 1; s <= 60; s++) {
      const g = new Game(2, s);
      catchAll(g);
      g.eggs = 0;
      g.deliver('pure-pink', 'varda');
      g.deliver('pure-pink', 'sukaria');
      if (!g.orders[0].filled) {
        expect(g.phase).toBe('outOfEggs');
        ended++;
      }
    }
    expect(ended).toBeGreaterThan(0);
  });
  it('the show only accepts babies bred on the island', () => {
    const g = new Game(5, 1);
    catchAll(g);
    expect(g.canDeliver('straight', 'tachav')).toBe(false);
    expect(g.canDeliver('glow', 'shavit')).toBe(false);
  });
});

describe('game plumbing', () => {
  it('hatching respects time: the baby appears only after HATCH_MS', () => {
    const g = new Game(0, 1);
    catchAll(g);
    setNest(g, 'bobo', 'lulu');
    g.hatchEgg();
    g.tick(HATCH_MS - 1);
    expect(g.phase).toBe('hatching');
    g.tick(1);
    expect(g.phase).toBe('play');
    expect(g.hatchLog.length).toBe(1);
  });
  it('a full belt makes room for a newborn that fits an order', () => {
    const g = new Game(0, 5);
    catchAll(g);
    setNest(g, 'bobo', 'lulu');
    let floppy: string | null = null;
    for (let i = 0; i < 12 && !floppy && g.eggs > 0; i++) {
      g.hatchEgg();
      g.tick(HATCH_MS);
      const ev = g.drainEvents().find((e) => e.type === 'hatched');
      if (ev && ev.type === 'hatched' && g.pheno(ev.id).ears === 'floppy') floppy = ev.id;
    }
    expect(floppy).not.toBeNull();
    expect(g.get(floppy!).loc).toBe('belt');
    expect(g.canDeliver('floppy', floppy!)).toBe(true);
  });
  it('the belt overflows into the meadow instead of losing babies', () => {
    const g = new Game(3, 1);
    catchAll(g);
    setNest(g, 'zebra', 'nekudi');
    for (let i = 0; i < 8; i++) hatchOnce(g);
    expect(g.belt.length).toBe(BELT_MAX);
    expect(g.list('meadow').length).toBe(8 - BELT_MAX);
  });
  it('render text exposes day, phase, eggs and orders', () => {
    const g = new Game(0, 1);
    const t = JSON.parse(g.toText());
    expect(t.day).toBe(1);
    expect(t.eggs).toBe(8);
    expect(t.orders[0].id).toBe('floppy');
  });
});
