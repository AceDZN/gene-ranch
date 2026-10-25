import '@fontsource/rubik/400.css';
import '@fontsource/rubik/500.css';
import '@fontsource/rubik/700.css';
import './style.css';
import * as THREE from 'three';
import { App } from './app';
import { loadModels, manifest, models } from './scene/assets';
import type { Anim, BodyTemplate } from './scene/gnoomie';

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => void;
    __app: App;
  }
}

const overlay = document.getElementById('overlay')!;
overlay.innerHTML = `<div class="modal-bg"><div class="modal"><div class="logo">🥚</div><h2>חוות הגנים</h2><p class="load">טוען את החווה…</p></div></div>`;

/** Build the creature template from the rigged Tripo GLB, if it shipped. */
function gnoomieTemplate(): BodyTemplate | null {
  const g = models.get('gnoomie');
  if (!g) return null;
  const entry = manifest.gnoomie ?? { file: '' };
  const scene = g.scene;
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const scale = 0.85 / size.y;
  const roles: Partial<Record<Anim, string>> = {};
  const find = (re: RegExp) => g.animations.find((a) => re.test(a.name))?.name;
  roles.idle = entry.roles?.idle ?? find(/idle/i);
  roles.hop = entry.roles?.hop ?? find(/jump|hop/i);
  roles.happy = entry.roles?.happy ?? find(/cheer|happy|dance|celebr/i);
  roles.sleepy = entry.roles?.sleepy ?? find(/sleep|tired/i);
  let headBone = entry.headBone;
  if (!headBone) scene.traverse((o) => !headBone && (o as THREE.Bone).isBone && /head$/i.test(o.name) && (headBone = o.name));
  const top = box.max.y * scale;
  const depth = size.z * scale;
  return {
    scene,
    clips: g.animations,
    roles,
    scale,
    headBone,
    headTop: new THREE.Vector3(0, top * 0.93 - box.min.y * scale, 0),
    rear: new THREE.Vector3(0, top * 0.3, -depth * 0.42),
    radius: size.z * scale * 0.5,
  };
}

async function boot() {
  await Promise.all([loadModels(), document.fonts?.load('700 40px Rubik').catch(() => undefined)]);
  const app = new App(document.getElementById('c') as HTMLCanvasElement, document.getElementById('hud')!, overlay, gnoomieTemplate());
  window.__app = app;
  window.render_game_to_text = () => app.toText();
  window.advanceTime = (ms: number) => app.advanceTime(ms);
}

boot().catch((e) => {
  console.error(e);
  overlay.innerHTML = `<div class="modal-bg"><div class="modal"><h2>אופס</h2><p>המשחק לא נטען. נסו לרענן את הדף.</p></div></div>`;
});
