// Plays every day through real mouse clicks (3D creatures, nest, HUD buttons) using the
// deterministic advanceTime hook, and saves screenshots. The strategy reads only what the
// HUD/render text shows (phenotypes and the cards' known alleles), never true genotypes.
// Usage: node scripts/playall.mjs [baseUrl] [outDir] [days e.g. 1,2,3] [width] [height]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:4221/';
const out = process.argv[3] ?? 'shots';
const days = (process.argv[4] ?? '1,2,3,4,5,6').split(',').map(Number);
const W = Number(process.argv[5] ?? 1280);
const H = Number(process.argv[6] ?? 800);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const results = [];

for (const day of days) {
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  const errors = [];
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(`${base}?day=${day}&skipintro=1&seed=${day * 11}`);
  await page.waitForFunction(() => window.__app && window.render_game_to_text, null, { timeout: 180000 });
  const adv = (ms) => page.evaluate((m) => window.advanceTime(m), ms);
  const st = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
  const shot = (name) => page.screenshot({ path: `${out}/d${day}-${name}.png`, timeout: 180000 });
  const clickAt = (p) => page.mouse.click(p.x, p.y);
  const clickSel = async (sel) => {
    const el = await page.$(sel);
    const b = el && (await el.boundingBox());
    if (!b) return false;
    await clickAt({ x: b.x + b.width / 2, y: b.y + b.height / 2 });
    return true;
  };
  const dismiss = async () => {
    let s = await st();
    while (s.overlay && s.overlay !== 'win' && s.overlay !== 'fail') {
      await clickSel('.modal .big');
      await adv(50);
      s = await st();
    }
    return s;
  };
  /** Bring a creature into the belt (catching it in 3D if it hopped to the meadow). */
  const toBelt = async (id) => {
    let s = await st();
    if (s.belt.some((b) => b.id === id)) return;
    if (s.nest.some((n) => n && n.id === id)) {
      const p = await page.evaluate((i) => window.__app.screenOf(i), id);
      if (p) await clickAt(p);
      await adv(600);
      s = await st();
      if (s.belt.some((b) => b.id === id)) return;
    }
    if (s.belt.length >= 6) {
      const keep = new Set([id, ...s.nest.filter(Boolean).map((n) => n.id)]);
      const victim = [...s.belt].reverse().find((b) => !keep.has(b.id) && b.id.startsWith('baby'));
      if (victim) {
        await clickSel(`.slot[data-id="${victim.id}"]`);
        await adv(50);
        await clickSel(`[data-act="release"][data-id="${victim.id}"]`);
        await adv(700);
      }
    }
    for (let i = 0; i < 6; i++) {
      const p = await page.evaluate((x) => window.__app.screenOf(x), id);
      const onScreen = p && p.x > 0 && p.y > 0 && p.x < W && p.y < H;
      if (onScreen) {
        await clickAt(p);
        await adv(600);
        s = await st();
        if (s.belt.some((b) => b.id === id)) return;
      }
      // Turn toward it if it's off-screen: walk a bit by tapping the ground in front.
      await page.evaluate((x) => window.__app.lookAtCreature(x), id);
      await adv(100);
    }
  };
  const setNest = async (a, b) => {
    let s = await st();
    if (s.nest[0]?.id === a && s.nest[1]?.id === b) return;
    for (const n of s.nest) if (n && n.id !== a && n.id !== b) {
      const p = await page.evaluate((i) => window.__app.screenOf(i), n.id);
      if (p) await clickAt(p);
      await adv(600);
    }
    for (const id of [a, b]) {
      s = await st();
      if (s.nest.some((n) => n && n.id === id)) continue;
      await toBelt(id);
      // One tap on the belt portrait seats it in the nest.
      await clickSel(`.slot[data-id="${id}"]`);
      await adv(700);
    }
  };
  let shots = 0;
  const hatch = async (label) => {
    await clickSel('.eggbtn');
    await adv(1200);
    if (shots === 0) await shot('roulette');
    await adv(1500);
    if (shots++ === 0) await shot('hatched');
    await adv(1800);
    return dismiss();
  };
  const deliverAll = async () => {
    for (let i = 0; i < 3; i++) {
      if (!(await page.$('.ctabtn'))) return;
      if (!(await page.$('.shot-delivered-taken'))) {
        await shot('ready-to-deliver');
        await page.evaluate(() => document.body.classList.add('shot-delivered-taken'));
      }
      await clickSel('.ctabtn');
      await adv(2200);
      await dismiss();
    }
  };
  const known = (s, id, gene) => [...s.belt, ...s.nest.filter(Boolean), ...s.meadow].find((c) => c.id === id)?.known[gene];
  const pheno = (s, id, gene) => [...s.belt, ...s.nest.filter(Boolean), ...s.meadow].find((c) => c.id === id)?.pheno[gene];

  await adv(300);
  await shot('start');
  let s = await st();
  for (const c of s.meadow) await toBelt(c.id);
  await adv(500);
  const until = async (cond, max = 20) => {
    for (let i = 0; i < max; i++) {
      s = await st();
      if (cond(s) || s.phase !== 'play' || s.eggs <= 0) break;
      s = await hatch();
      await deliverAll();
    }
    return st();
  };

  if (day === 1) {
    await setNest('bobo', 'lulu');
    await shot('nest-lens');
    s = await until((x) => x.phase === 'won');
  } else if (day === 2) {
    const cands = ['tofi', 'motzi', 'shimshi'];
    for (let i = 0; i < 3 && (await st()).phase === 'play'; i++) {
      await setNest(cands[i], 'pip');
      let n = 0;
      s = await until((x) => known(x, cands[i], 'ears') === 'Ee' || x.phase === 'won' || (i < 2 && ++n > 3), 12);
    }
  } else if (day === 3) {
    const pinks = ['varda', 'sukaria', 'petel'];
    const clean = [];
    for (const c of pinks) {
      await setNest(c, 'kachli');
      let n = 0;
      let blue = false;
      while (n++ < 3 && (await st()).eggs > 0) {
        s = await hatch();
        if (s.hatchLog.at(-1)?.color === 'blue') {
          blue = true;
          break;
        }
      }
      if (!blue) clean.push(c);
    }
    for (const c of clean.slice(0, 2)) {
      await toBelt(c);
      await clickSel(`.slot[data-id="${c}"]`);
      await adv(50);
      await shot('ready-to-deliver');
      await clickSel('.ctabtn');
      await adv(2200);
      await dismiss();
    }
  } else if (day === 4) {
    await setNest('zebra', 'nekudi');
    for (let i = 0; i < 3; i++) await hatch();
    await deliverAll();
    s = await st();
    const both = [...s.belt, ...s.nest.filter(Boolean)].filter((b) => b.pheno.pattern === 'both' && b.id.startsWith('baby')).map((b) => b.id);
    await setNest(both[0], both[1]);
    s = await until((x) => x.phase === 'won', 12);
  } else if (day === 5) {
    await setNest('yam', 'perach');
    await shot('two-traits');
    s = await until((x) => x.orders[0].filled, 12);
    await clickSel('[data-act="cold"]');
    await adv(100);
    let violet = null;
    for (let i = 0; i < 8 && !violet && (await st()).eggs > 0; i++) {
      s = await hatch();
      const last = s.belt.find((b) => b.pheno.color === 'violet') ?? s.meadow.find((b) => b.pheno.color === 'violet');
      if (last) violet = last.id;
    }
    await shot('violet');
    await clickSel('[data-act="warm"]');
    await adv(100);
    if (violet) {
      await setNest(violet, 'yam');
      s = await hatch();
      await deliverAll();
      // The violet parent itself fills the violet order (deliverable from the nest).
      await deliverAll();
    }
  } else if (day === 6) {
    await page.evaluate(() => window.__app.openPedigree());
    await adv(50);
    await shot('pedigree');
    await dismiss();
    await clickSel('.modal .big');
    await adv(50);
    await setNest('shavit', 'tachav');
    s = await hatch();
    await deliverAll();
    await setNest('nitzotz', 'tachav');
    s = await until((x) => x.phase === 'won', 12);
  }
  await adv(2500);
  s = await st();
  await shot('end');
  const r = { day, phase: s.phase, overlay: s.overlay, eggsUsed: s.eggsUsed, stars: s.stars, mistakes: s.mistakes, errors };
  console.log(JSON.stringify(r));
  results.push(r);
  await page.close();
}
await browser.close();
fs.writeFileSync(`${out}/results.json`, JSON.stringify(results, null, 2));
