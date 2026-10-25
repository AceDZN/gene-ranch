// First-person controller: drag to look, WASD/arrows to walk, tap the ground to walk there.
// No pointer lock, so it behaves inside an embedding page.
import * as THREE from 'three';
import { ISLAND_R, heightAt } from './world';

export class Player {
  yaw = 0;
  pitch = -0.12;
  readonly pos = new THREE.Vector3();
  private keys = new Set<string>();
  private walkTo: THREE.Vector3 | null = null;
  moving = false;
  readonly obstacles: { x: number; z: number; r: number }[] = [];

  constructor(readonly camera: THREE.PerspectiveCamera) {}

  place(p: THREE.Vector3, lookAt: THREE.Vector3) {
    this.pos.copy(p);
    const d = lookAt.clone().sub(p);
    this.yaw = Math.atan2(-d.x, -d.z);
    this.pitch = Math.atan2(d.y, Math.hypot(d.x, d.z));
    this.walkTo = null;
    this.apply();
  }

  key(code: string, down: boolean) {
    if (down) this.keys.add(code);
    else this.keys.delete(code);
    if (down) this.walkTo = null;
  }
  clearKeys() {
    this.keys.clear();
  }

  look(dx: number, dy: number) {
    this.yaw -= dx * 0.0042;
    this.pitch = THREE.MathUtils.clamp(this.pitch - dy * 0.0036, -1.1, 0.75);
  }

  goTo(p: THREE.Vector3) {
    this.walkTo = p.clone();
  }

  /** Smoothly turn to look at a point (used by tutorial nudges). */
  faceToward(p: THREE.Vector3, k: number) {
    const d = p.clone().sub(this.pos);
    const ty = Math.atan2(-d.x, -d.z);
    let dy = ty - this.yaw;
    dy = Math.atan2(Math.sin(dy), Math.cos(dy));
    this.yaw += dy * k;
  }

  update(dt: number) {
    const f = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const r = new THREE.Vector3(-f.z, 0, f.x);
    const mv = new THREE.Vector3();
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) mv.add(f);
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) mv.sub(f);
    if (this.keys.has('KeyD')) mv.add(r);
    if (this.keys.has('KeyA')) mv.sub(r);
    if (this.keys.has('ArrowLeft')) this.yaw += dt * 2;
    if (this.keys.has('ArrowRight')) this.yaw -= dt * 2;
    if (this.walkTo && mv.lengthSq() === 0) {
      const d = this.walkTo.clone().sub(this.pos).setY(0);
      if (d.length() < 0.3) this.walkTo = null;
      else mv.copy(d.normalize());
    }
    this.moving = mv.lengthSq() > 0;
    if (this.moving) {
      mv.normalize().multiplyScalar(4.2 * dt);
      const next = this.pos.clone().add(mv);
      for (const o of this.obstacles) {
        const dx = next.x - o.x;
        const dz = next.z - o.z;
        const dd = Math.hypot(dx, dz);
        if (dd < o.r) {
          next.x = o.x + (dx / dd) * o.r;
          next.z = o.z + (dz / dd) * o.r;
        }
      }
      const rr = Math.hypot(next.x, next.z);
      const lim = ISLAND_R - 3;
      if (rr > lim) next.multiplyScalar(lim / rr);
      this.pos.x = next.x;
      this.pos.z = next.z;
    }
    this.pos.y = heightAt(this.pos.x, this.pos.z) + 1.6;
    this.apply();
  }

  private apply() {
    this.camera.position.copy(this.pos);
    this.camera.rotation.set(this.pitch, this.yaw, 0, 'YXZ');
  }
}
