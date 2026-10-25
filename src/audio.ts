// Tiny WebAudio synth: every sound is generated, nothing is fetched. Starts after the first gesture.
export class Sfx {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }
  setMuted(m: boolean) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 0.5;
  }

  private tone(f0: number, f1: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, delay = 0) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t = c.currentTime + delay;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.05);
  }
  private noise(dur: number, freq: number, vol = 0.25, delay = 0, sweepTo?: number) {
    const c = this.ctx;
    if (!c || !this.master || this.muted) return;
    const t = c.currentTime + delay;
    const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = c.createBufferSource();
    src.buffer = buf;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    f.Q.value = 1.2;
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.master);
    src.start(t);
  }

  whoosh() {
    this.noise(0.42, 400, 0.35, 0, 2600);
  }
  shoot() {
    this.noise(0.25, 2400, 0.25, 0, 500);
    this.tone(600, 300, 0.2, 'triangle', 0.1);
  }
  pip() {
    this.tone(880, 1320, 0.12, 'sine', 0.25);
    this.tone(1320, 1760, 0.1, 'sine', 0.15, 0.08);
  }
  tick(i: number) {
    this.tone(500 + i * 40, 520 + i * 40, 0.05, 'square', 0.06);
  }
  wobble(i: number) {
    this.tone(220 + i * 30, 160, 0.14, 'triangle', 0.18);
  }
  pop() {
    this.noise(0.12, 1800, 0.4);
    this.tone(300, 900, 0.18, 'sine', 0.3);
  }
  cheer() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.22, 'triangle', 0.18, i * 0.09));
  }
  aww() {
    this.tone(440, 330, 0.5, 'sine', 0.18);
    this.tone(415, 311, 0.55, 'sine', 0.12, 0.05);
  }
  soft() {
    this.tone(660, 660, 0.08, 'sine', 0.12);
  }
  win() {
    [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => this.tone(f, f * 1.01, 0.25, 'triangle', 0.2, i * 0.11));
  }
}
