// Plays a day through real mouse clicks + the deterministic advanceTime hook, saving screenshots.
// Usage: node scripts/play.mjs [baseUrl] [outDir] [day] [width] [height]
import { chromium } from 'playwright';
import fs from 'node:fs';

const base = process.argv[2] ?? 'http://127.0.0.1:5221/';
const out = process.argv[3] ?? 'shots';
const day = Number(process.argv[4] ?? 1);
const W = Number(process.argv[5] ?? 1280);
const H = Number(process.argv[6] ?? 800);
fs.mkdirSync(out, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(`${base}?day=${day}&skipintro=1&seed=5`);
await page.waitForFunction(() => window.__app && window.render_game_to_text, null, { timeout: 180000 }).catch(async (e) => { console.log('boot timeout', errors, await page.content().then((c) => c.slice(0, 400))); throw e; });
const adv = (ms) => page.evaluate((m) => window.advanceTime(m), ms);
const state = async () => JSON.parse(await page.evaluate(() => window.render_game_to_text()));
const shot = async (name) => page.screenshot({ path: `${out}/${name}.png`, timeout: 180000 });
const clickCreature = async (id) => {
  const p = await page.evaluate((i) => window.__app.screenOf(i), id);
  if (!p) return false;
  await page.mouse.click(p.x, p.y);
  return true;
};
const clickSel = async (sel) => {
  const el = await page.$(sel);
  if (!el) return false;
  const b = await el.boundingBox();
  if (!b) return false;
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2);
  return true;
};

await adv(400);
await page.evaluate(() => window.advanceTime(16));
await shot('01-start');
let s = await state();
// Catch the wild ones.
for (const c of s.meadow) {
  await adv(100);
  await clickCreature(c.id);
  await adv(250);
}
await shot('02-caught-midflight');
await adv(600);
s = await state();
console.log('belt after catch', s.belt.map((b) => b.name));
// Place two in the nest by tapping it.
for (let i = 0; i < 2; i++) {
  const n = await page.evaluate(() => window.__app.screenOfNest());
  await page.mouse.click(n.x, n.y);
  await adv(700);
}
await shot('03-nest-lens');
s = await state();
console.log('nest', s.nest.map((n) => n && n.name), 'lens', JSON.stringify(s.lens));
let hatches = 0;
while (s.phase === 'play' && s.eggs > 0 && hatches < 12) {
  await clickSel('.eggbtn');
  await adv(500);
  if (hatches === 0) await shot('04-roulette');
  await adv(1500);
  if (hatches === 0) await shot('05-wobble');
  await adv(800);
  if (hatches === 0) await shot('06-hatched');
  await adv(2400);
  s = await state();
  hatches++;
  console.log('hatch', hatches, s.hatchLog.at(-1), 'eggs', s.eggs, 'overlay', s.overlay);
  if (s.overlay) {
    await shot(`07-overlay-${hatches}`);
    await clickSel('.modal .big');
    await adv(100);
    s = await state();
  }
  const ready = await page.$('.card [data-act="deliver"]');
  if (ready) {
    await shot('08-ready-to-deliver');
    await clickSel('.card [data-act="deliver"]');
    await adv(2500);
    await shot('09-delivered');
    s = await state();
    break;
  }
}
await adv(500);
s = await state();
console.log('final phase', s.phase, 'overlay', s.overlay, 'stars', s.stars, 'fps', s.fps);
await shot('10-end');
console.log('errors', errors);
await browser.close();
