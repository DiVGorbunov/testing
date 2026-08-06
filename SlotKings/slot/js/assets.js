/* ============================================================
   ROYAL GEMS DELUXE — SlotKings demo slot
   assets.js — config, tween engine, audio synth, vector art
   PixiJS v8
   ============================================================ */
(function () {
  "use strict";
  const RG = (window.RG = {});

  /* ================= CONFIG ================= */
  RG.C = {
    DESIGN_W: 1700,
    DESIGN_H: 920,
    REELS: 3,
    ROWS: 3,
    CELL: 152,
    CELL_GAP: 10,
    REEL_X: 850,          // reels block center x
    REEL_TOP: 348,        // top edge of row 0 cells
    START_BALANCE: 5000,
    BETS: [1, 2, 5, 10, 20, 50],
    FREESPINS_AFTER: 20,  // paid spins to trigger free spins (test value)
    FREESPINS_COUNT: 10,
    FS_MULT: 2,
    BIGWIN_X: 10,         // win >= 10x bet -> big win overlay
    MEGA_X: 25,
    ROYAL_X: 60,
    // line pays (x bet) for 3-of-a-kind
    PAYS: { crown: 50, seven: 25, bell: 15, bar: 10, ruby: 8, amethyst: 5, wild: 100 },
    // diamond scatter ladder (x bet) by count; FS doubles, 3 in FS = GRAND
    DIAMOND_PAY: { 1: 2, 2: 20, 3: 50 },
    GRAND_PAY: 1000,
    LADDER: [
      { key: "grand", label: "GRAND", mult: 1000, color: 0xff5f8f },
      { key: "major", label: "MAJOR", mult: 100,  color: 0xc77dff },
      { key: "maxi",  label: "MAXI",  mult: 50,   color: 0x9d4edd },
      { key: "minor", label: "MINOR", mult: 20,   color: 0x5fb0ff },
      { key: "mini",  label: "MINI",  mult: 10,   color: 0x69dd9a },
    ],
    SPEEDS: [
      { name: "NORMAL", dur: 1.0 },
      { name: "FAST",   dur: 0.55 },
      { name: "TURBO",  dur: 0.3 },
    ],
    SYMBOLS: ["crown", "seven", "bell", "bar", "ruby", "amethyst", "wild", "diamond"],
    // reel strip (same for each reel, rotated) — 24 entries
    STRIP: [
      "ruby", "bell", "bar", "amethyst", "seven", "ruby", "diamond", "amethyst",
      "bar", "crown", "ruby", "bell", "wild", "amethyst", "bar", "seven",
      "amethyst", "bell", "crown", "ruby", "wild", "amethyst", "bell", "ruby",
    ],
    COL: {
      bg: 0x07050c, panel: 0x140d22, panel2: 0x1b1130,
      purple: 0x7b2cbf, purpleBright: 0x9d4edd, purpleLight: 0xc77dff, purpleDeep: 0x3c096c,
      gold: 0xe8c368, goldLight: 0xf7e7b0, goldDeep: 0xa97e2b,
      text: 0xf1ecfa, muted: 0xa99cc0,
      line: 0x4b2d73,
    },
  };

  /* ================= UTILS ================= */
  RG.rand = (a, b) => a + Math.random() * (b - a);
  RG.randInt = (a, b) => Math.floor(RG.rand(a, b + 1));
  RG.pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  RG.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  RG.fmt = (n) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/,/g, " ");
  RG.sleep = (ms) => new Promise((res) => setTimeout(res, ms));

  RG.E = {
    linear: (t) => t,
    quadIn: (t) => t * t,
    quadOut: (t) => t * (2 - t),
    cubicOut: (t) => 1 + --t * t * t,
    cubicInOut: (t) => (t < 0.5 ? 4 * t * t * t : 1 + (t - 1) * (2 * t - 2) * (2 * t - 2) * 2),
    backOut: (t) => { const s = 1.70158; return --t * t * ((s + 1) * t + s) + 1; },
    sineInOut: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
    elasticOut: (t) => t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1,
  };

  /* ================= TWEENS ================= */
  const tweens = [];
  RG.updateTweens = (dms) => {
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      if (tw.dead) { tweens.splice(i, 1); continue; }
      if (tw.delay > 0) { tw.delay -= dms; continue; }
      tw.t += dms;
      let p = RG.clamp(tw.t / tw.duration, 0, 1);
      const v = tw.ease(p);
      if (tw.obj && tw.props) {
        for (const k in tw.props) {
          const pr = tw.props[k];
          tw.obj[k] = pr.from + (pr.to - pr.from) * v;
        }
      }
      if (tw.onUpdate) tw.onUpdate(v, p);
      if (p >= 1) {
        tweens.splice(i, 1);
        if (tw.onComplete) tw.onComplete();
      }
    }
  };
  /**
   * RG.tween(obj, {to:{x:10}, duration, ease, delay, owner, onUpdate, onComplete})
   * obj may be null when only onUpdate is used.
   */
  RG.tween = (obj, o) => {
    const tw = {
      obj, t: 0,
      duration: Math.max(1, o.duration || 300),
      delay: o.delay || 0,
      ease: o.ease || RG.E.quadOut,
      onUpdate: o.onUpdate || null,
      onComplete: o.onComplete || null,
      owner: o.owner || null,
      dead: false,
    };
    if (obj && o.to) {
      tw.props = {};
      for (const k in o.to) tw.props[k] = { from: o.from && k in o.from ? o.from[k] : obj[k], to: o.to[k] };
      if (o.from) for (const k in o.from) obj[k] = o.from[k];
    }
    tweens.push(tw);
    return tw;
  };
  RG.tweenP = (obj, o) => new Promise((res) => { const oc = o.onComplete; o.onComplete = () => { if (oc) oc(); res(); }; RG.tween(obj, o); });
  RG.killTweens = (owner) => { for (const tw of tweens) if (tw.owner === owner || tw.obj === owner) tw.dead = true; };

  /* ================= AUDIO (WebAudio synth, no assets) ================= */
  RG.Audio = {
    ctx: null, master: null, musicGain: null, sfxGain: null,
    on: true, _musicTimer: null, _noiseBuf: null, _bar: 0,

    init() {
      if (this.ctx) return;
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AC();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.9;
        this.master.connect(this.ctx.destination);
        this.musicGain = this.ctx.createGain();
        this.musicGain.gain.value = 0.3;
        this.musicGain.connect(this.master);
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = 0.75;
        this.sfxGain.connect(this.master);
        const len = this.ctx.sampleRate * 1;
        this._noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
        const d = this._noiseBuf.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
        this.startMusic();
      } catch (e) { console.warn("Audio unavailable", e); }
    },
    toggle() {
      this.on = !this.on;
      if (this.master) this.master.gain.linearRampToValueAtTime(this.on ? 0.9 : 0.0001, this.ctx.currentTime + 0.15);
      return this.on;
    },
    _env(t0, a, d, s, peak) {
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.linearRampToValueAtTime(peak, t0 + a);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * s), t0 + a + d);
      return g;
    },
    _osc(type, freq, t0) {
      const o = this.ctx.createOscillator();
      o.type = type; o.frequency.setValueAtTime(freq, t0);
      return o;
    },
    _tone(dest, { type = "sine", f = 440, t = 0, a = 0.01, d = 0.2, peak = 0.2, slideTo = 0, dur = 0 }) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + t;
      const o = this._osc(type, f, t0);
      if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + (dur || d));
      const g = this._env(t0, a, d, 0.001, peak);
      o.connect(g); g.connect(dest);
      o.start(t0); o.stop(t0 + a + d + 0.1);
    },
    _noise(dest, { t = 0, d = 0.3, peak = 0.2, fType = "lowpass", f0 = 800, f1 = 0 }) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + t;
      const src = this.ctx.createBufferSource();
      src.buffer = this._noiseBuf; src.loop = true;
      const fl = this.ctx.createBiquadFilter();
      fl.type = fType; fl.frequency.setValueAtTime(f0, t0);
      if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t0 + d);
      const g = this._env(t0, 0.01, d, 0.001, peak);
      src.connect(fl); fl.connect(g); g.connect(dest);
      src.start(t0); src.stop(t0 + d + 0.1);
    },

    /* ---- music: dark royal loop, Am - F - C - G ---- */
    startMusic() {
      if (!this.ctx || this._musicTimer) return;
      const BPM = 92, bar = (60 / BPM) * 4;
      const chords = [
        [220.0, 261.63, 329.63], // Am
        [174.61, 220.0, 261.63], // F
        [130.81, 196.0, 261.63], // C
        [196.0, 246.94, 293.66], // G
      ];
      const bass = [110.0, 87.31, 65.41, 98.0];
      const arp = [440, 523.25, 659.25, 523.25, 440, 392, 329.63, 392];
      let nextT = this.ctx.currentTime + 0.1;
      const scheduleBar = () => {
        const i = this._bar % 4;
        const t0 = nextT;
        // pad
        for (const f of chords[i]) {
          const o = this._osc("triangle", f, t0);
          const o2 = this._osc("triangle", f * 1.005, t0);
          const fl = this.ctx.createBiquadFilter();
          fl.type = "lowpass"; fl.frequency.value = 900;
          const g = this.ctx.createGain();
          g.gain.setValueAtTime(0.0001, t0);
          g.gain.linearRampToValueAtTime(0.05, t0 + bar * 0.3);
          g.gain.linearRampToValueAtTime(0.0001, t0 + bar * 0.98);
          o.connect(fl); o2.connect(fl); fl.connect(g); g.connect(this.musicGain);
          o.start(t0); o.stop(t0 + bar); o2.start(t0); o2.stop(t0 + bar);
        }
        // bass on beats 1 & 3
        for (const bt of [0, 2]) {
          const t = t0 + bt * (bar / 4);
          const o = this._osc("sine", bass[i], t);
          const g = this._env(t, 0.01, bar / 4 * 0.9, 0.001, 0.11);
          o.connect(g); g.connect(this.musicGain);
          o.start(t); o.stop(t + bar / 4);
        }
        // sparkle arp every other bar
        if (this._bar % 2 === 1) {
          arp.forEach((f, n) => {
            const t = t0 + n * (bar / 8);
            const o = this._osc("square", f, t);
            const fl = this.ctx.createBiquadFilter();
            fl.type = "lowpass"; fl.frequency.value = 2400;
            const g = this._env(t, 0.005, 0.12, 0.001, 0.025);
            o.connect(fl); fl.connect(g); g.connect(this.musicGain);
            o.start(t); o.stop(t + 0.2);
          });
        }
        this._bar++;
        nextT += bar;
      };
      scheduleBar(); scheduleBar();
      this._musicTimer = setInterval(() => {
        while (nextT < this.ctx.currentTime + 1.2) scheduleBar();
      }, 250);
    },

    /* ---- SFX ---- */
    click()      { this._tone(this.sfxGain, { type: "triangle", f: 700, d: 0.07, peak: 0.15 }); },
    betClick()   { this._tone(this.sfxGain, { type: "triangle", f: 880, d: 0.06, peak: 0.13 }); },
    spinStart()  { this._noise(this.sfxGain, { d: 0.45, peak: 0.14, fType: "highpass", f0: 300, f1: 2600 });
                   this._tone(this.sfxGain, { type: "sine", f: 180, slideTo: 420, dur: 0.4, d: 0.4, peak: 0.1 }); },
    reelStop(i)  { this._noise(this.sfxGain, { d: 0.08, peak: 0.16, f0: 1200 });
                   this._tone(this.sfxGain, { type: "square", f: 220 + i * 60, d: 0.07, peak: 0.09 }); },
    fireball()   { this._noise(this.sfxGain, { d: 0.5, peak: 0.2, f0: 400, f1: 3400 });
                   this._tone(this.sfxGain, { type: "sawtooth", f: 200, slideTo: 900, dur: 0.45, d: 0.45, peak: 0.06 }); },
    slam() {
      this._tone(this.sfxGain, { type: "sine", f: 90, slideTo: 40, dur: 0.35, d: 0.35, peak: 0.4 });
      this._noise(this.sfxGain, { d: 0.25, peak: 0.2, f0: 3000, f1: 300 });
      [1567.98, 1975.53, 2637.02].forEach((f, n) =>
        this._tone(this.sfxGain, { type: "sine", f, t: 0.06 + n * 0.05, d: 0.3, peak: 0.07 }));
    },
    winSmall() {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, n) =>
        this._tone(this.sfxGain, { type: "triangle", f, t: n * 0.07, d: 0.25, peak: 0.12 }));
    },
    countTick()  { this._tone(this.sfxGain, { type: "square", f: 1320, d: 0.03, peak: 0.05 }); },
    bigwin() {
      const seq = [392, 523.25, 659.25, 783.99, 1046.5, 1318.51];
      seq.forEach((f, n) => {
        this._tone(this.sfxGain, { type: "triangle", f, t: n * 0.1, d: 0.5, peak: 0.14 });
        this._tone(this.sfxGain, { type: "sine", f: f / 2, t: n * 0.1, d: 0.5, peak: 0.1 });
      });
      this._noise(this.sfxGain, { t: 0.55, d: 0.9, peak: 0.07, f0: 5000, f1: 800 });
    },
    freespins() {
      [261.63, 329.63, 392, 523.25, 659.25].forEach((f, n) =>
        this._tone(this.sfxGain, { type: "sawtooth", f, t: n * 0.09, d: 0.4, peak: 0.08 }));
      this._tone(this.sfxGain, { type: "sine", f: 65, d: 0.6, peak: 0.3 });
    },
    buzz()       { this._tone(this.sfxGain, { type: "sawtooth", f: 130, d: 0.18, peak: 0.12 });
                   this._tone(this.sfxGain, { type: "sawtooth", f: 98, t: 0.16, d: 0.22, peak: 0.12 }); },
  };

  /* ================= ART ================= */
  const A = (RG.Art = {});
  const C = RG.C.COL;

  /* ---------- small building blocks ---------- */
  function gem(g, cx, cy, r, base, light, dark, edge) {
    // brilliant-cut gem: crown trapezoid + pavilion triangle + facets
    const w = r, tw = r * 0.55, gh = r * 0.34; // half-width, table half-width, girdle y offset from top
    const top = cy - r * 0.62, gy = top + gh * 1.15, bot = cy + r * 0.75;
    // pavilion (bottom)
    g.poly([-w + cx, gy, w + cx, gy, cx, bot]).fill(base);
    g.poly([-w + cx, gy, cx, bot, cx - w * 0.33, gy]).fill(dark);
    g.poly([w + cx, gy, cx, bot, cx + w * 0.45, gy]).fill(light);
    // crown (top)
    g.poly([cx - tw, top, cx + tw, top, w + cx, gy, -w + cx, gy]).fill(base);
    g.poly([cx - tw, top, -w + cx, gy, cx - tw * 0.4, gy]).fill(light);
    g.poly([cx + tw, top, w + cx, gy, cx + tw * 0.2, gy]).fill(dark);
    g.poly([cx - tw, top, cx + tw, top, cx + tw * 0.2, gy, cx - tw * 0.4, gy]).fill({ color: light, alpha: 0.55 });
    // outline + glint
    g.poly([cx - tw, top, cx + tw, top, w + cx, gy, cx, bot, -w + cx, gy], true).stroke({ width: r * 0.06, color: edge, join: "round" });
    g.moveTo(-w + cx, gy).lineTo(w + cx, gy).stroke({ width: r * 0.045, color: edge, alpha: 0.8 });
    g.poly([cx - tw * 0.72, top + r * 0.12, cx - tw * 0.15, top + r * 0.12, cx - tw * 0.5, top + r * 0.44]).fill({ color: 0xffffff, alpha: 0.85 });
  }

  function star4(g, cx, cy, R, color = 0xffffff, alpha = 1) {
    const r = R * 0.22;
    g.poly([cx, cy - R, cx + r, cy - r, cx + R, cy, cx + r, cy + r, cx, cy + R, cx - r, cy + r, cx - R, cy, cx - r, cy - r]).fill({ color, alpha });
  }

  function radialTex(app, R, stops) {
    const g = new PIXI.Graphics();
    const grad = new PIXI.FillGradient({
      type: "radial",
      center: { x: R, y: R }, innerRadius: 0,
      outerCenter: { x: R, y: R }, outerRadius: R,
      colorStops: stops,
    });
    g.circle(R, R, R).fill(grad);
    return app.renderer.generateTexture({ target: g, resolution: 1 });
  }

  /* ---------- symbol builders (draw in ~220x220 box, centered at 110,110) ---------- */
  const SYM_BUILDERS = {
    crown(g) {
      const cx = 110, base = 158, top = 62;
      g.poly([38, base, 28, top + 14, 72, 108, cx, top - 16, 148, 108, 192, top + 14, 182, base]).fill(C.gold);
      g.poly([38, base, 28, top + 14, 72, 108, 80, base]).fill(C.goldDeep);
      g.poly([cx, top - 16, 148, 108, 140, base, 80, base, 72, 108]).fill(C.goldLight);
      g.roundRect(34, base, 152, 26, 6).fill(C.gold).stroke({ width: 4, color: C.goldDeep });
      g.poly([38, base, 28, top + 14, 72, 108, cx, top - 16, 148, 108, 192, top + 14, 182, base], true)
        .stroke({ width: 5, color: 0x6b4a12, join: "round" });
      g.circle(28, top + 8, 9).fill(C.goldLight).stroke({ width: 3, color: 0x6b4a12 });
      g.circle(cx, top - 22, 10).fill(C.goldLight).stroke({ width: 3, color: 0x6b4a12 });
      g.circle(192, top + 8, 9).fill(C.goldLight).stroke({ width: 3, color: 0x6b4a12 });
      g.circle(cx, base + 13, 8).fill(0xb03060).stroke({ width: 2.5, color: 0x6b4a12 });
      g.circle(70, base + 13, 7).fill(C.purpleBright).stroke({ width: 2.5, color: 0x6b4a12 });
      g.circle(150, base + 13, 7).fill(C.purpleBright).stroke({ width: 2.5, color: 0x6b4a12 });
      star4(g, 84, 84, 12, 0xffffff, 0.9);
    },
    seven(g) {
      const pts = [48, 46, 176, 46, 172, 82, 118, 180, 74, 180, 128, 84, 52, 84];
      g.poly(pts).fill(C.gold);
      g.poly([48, 46, 176, 46, 172, 60, 50, 60]).fill(C.goldLight);
      g.poly(pts, true).stroke({ width: 6, color: 0x6b4a12, join: "round" });
      g.poly([60, 52, 166, 52, 163, 72, 60, 70]).fill({ color: 0xffffff, alpha: 0.35 });
      star4(g, 166, 52, 13, 0xffffff, 0.95);
    },
    bell(g) {
      const cx = 110;
      g.moveTo(cx - 58, 148)
        .bezierCurveTo(cx - 58, 74, cx - 34, 52, cx, 52)
        .bezierCurveTo(cx + 34, 52, cx + 58, 74, cx + 58, 148)
        .closePath().fill(C.gold);
      g.moveTo(cx - 58, 148)
        .bezierCurveTo(cx - 58, 74, cx - 34, 52, cx, 52)
        .lineTo(cx, 148).closePath().fill({ color: C.goldDeep, alpha: 0.55 });
      g.roundRect(cx - 70, 142, 140, 20, 9).fill(C.gold).stroke({ width: 4.5, color: 0x6b4a12 });
      g.moveTo(cx - 58, 148)
        .bezierCurveTo(cx - 58, 74, cx - 34, 52, cx, 52)
        .bezierCurveTo(cx + 34, 52, cx + 58, 74, cx + 58, 148)
        .stroke({ width: 5, color: 0x6b4a12 });
      g.circle(cx, 44, 12).fill(C.gold).stroke({ width: 4, color: 0x6b4a12 });
      g.circle(cx, 172, 13).fill(C.goldLight).stroke({ width: 4, color: 0x6b4a12 });
      g.poly([cx - 34, 70, cx - 16, 64, cx - 26, 108]).fill({ color: 0xffffff, alpha: 0.5 });
    },
    bar(g) {
      for (let i = 0; i < 2; i++) {
        const y = 58 + i * 56;
        g.roundRect(34, y, 152, 44, 10).fill(C.panel2).stroke({ width: 4.5, color: C.gold });
        g.roundRect(40, y + 5, 140, 14, 7).fill({ color: C.purpleBright, alpha: 0.35 });
      }
      star4(g, 176, 60, 11, 0xffffff, 0.85);
    },
    ruby(g)     { gem(g, 110, 112, 74, 0xd23b5e, 0xff7d99, 0x8f1f3c, 0xffc2cf); },
    amethyst(g) { gem(g, 110, 112, 74, C.purpleBright, C.purpleLight, 0x5a1a8c, 0xe6ccff); },
    diamond(g)  { gem(g, 110, 112, 78, 0xcfe0f2, 0xffffff, 0x93aecf, 0xffffff);
                  star4(g, 74, 66, 15, 0xffffff, 1); star4(g, 152, 128, 11, 0xffffff, 0.9); },
    wild(g) {
      g.roundRect(28, 62, 164, 96, 18).fill(C.purpleDeep).stroke({ width: 5, color: C.gold });
      g.roundRect(38, 72, 144, 34, 12).fill({ color: C.purpleBright, alpha: 0.5 });
      g.moveTo(28, 110).lineTo(192, 110).stroke({ width: 2.5, color: C.gold, alpha: 0.5 });
      star4(g, 44, 76, 10, 0xffffff, 0.9); star4(g, 178, 146, 9, 0xffffff, 0.8);
    },
  };

  /* text glued onto some symbols after Graphics (needs font) */
  const SYM_TEXT = {
    bar: () => new PIXI.Text({
      text: "BAR", style: {
        fontFamily: "Cinzel, serif", fontSize: 46, fontWeight: "800",
        fill: C.goldLight, stroke: { color: 0x6b4a12, width: 5 }, letterSpacing: 4,
      },
    }),
    wild: () => new PIXI.Text({
      text: "WILD", style: {
        fontFamily: "Cinzel, serif", fontSize: 48, fontWeight: "800",
        fill: C.goldLight, stroke: { color: 0x2a0f45, width: 6 }, letterSpacing: 3,
      },
    }),
  };

  /* ---------- texture bake ---------- */
  A.bake = function (app) {
    RG.tex = {};
    for (const key of RG.C.SYMBOLS) {
      const wrap = new PIXI.Container();
      const g = new PIXI.Graphics();
      SYM_BUILDERS[key](g);
      wrap.addChild(g);
      if (SYM_TEXT[key]) {
        const t = SYM_TEXT[key]();
        t.anchor.set(0.5);
        t.position.set(110, key === "bar" ? 110 : 111);
        wrap.addChild(t);
      }
      const pad = new PIXI.Graphics().rect(0, 0, 220, 220).fill({ color: 0, alpha: 0 });
      wrap.addChildAt(pad, 0);
      RG.tex[key] = app.renderer.generateTexture({ target: wrap, resolution: 2 });
      wrap.destroy({ children: true });
    }
    // mini diamond for bursts / big win rain
    {
      const wrap = new PIXI.Container();
      const g = new PIXI.Graphics();
      gem(g, 60, 60, 42, 0xdcebfb, 0xffffff, 0x9db8d9, 0xffffff);
      wrap.addChild(g);
      RG.tex.mini = app.renderer.generateTexture({ target: wrap, resolution: 2 });
      wrap.destroy({ children: true });
    }
    // soft radial glow (white -> transparent), tintable
    RG.tex.glow = radialTex(app, 128, [
      { offset: 0, color: 0xffffff }, { offset: 0.35, color: 0xffffff }, { offset: 1, color: 0x000000 },
    ]);
    // fire core
    RG.tex.fire = (() => {
      const R = 48, g = new PIXI.Graphics();
      const grad = new PIXI.FillGradient({
        type: "radial", center: { x: R, y: R }, innerRadius: 0,
        outerCenter: { x: R, y: R }, outerRadius: R,
        colorStops: [
          { offset: 0, color: 0xfff7d0 }, { offset: 0.3, color: 0xffd45e },
          { offset: 0.65, color: 0xff7b2e }, { offset: 1, color: 0xff7b2e },
        ],
      });
      g.circle(R, R, R).fill(grad);
      const t = app.renderer.generateTexture({ target: g, resolution: 1 });
      g.destroy(); return t;
    })();
    // Tapered flame beam for the shot arc. U runs along the path (tail -> head),
    // V across the thickness. The taper is baked into the alpha because a
    // MeshRope has a constant width: thin and dissolving at the tail, thick and
    // white-hot at the head.
    RG.tex.flameArc = (() => {
      const W = 512, H = 64;
      const cnv = document.createElement("canvas");
      cnv.width = W; cnv.height = H;
      const ctx = cnv.getContext("2d");
      const img = ctx.createImageData(W, H);
      const px = img.data;
      for (let x = 0; x < W; x++) {
        const u = x / (W - 1);
        const taper = 0.16 + 0.84 * Math.pow(u, 0.7); // thickness profile
        const tail = Math.min(1, u / 0.18);           // dissolve the very tail
        for (let y = 0; y < H; y++) {
          const n = (Math.abs(y / (H - 1) - 0.5) * 2) / taper; // 0 core .. 1 edge
          if (n >= 1) continue;                        // stays transparent
          const i = (y * W + x) * 4;
          let g, b;
          if (n < 0.4) { const k = n / 0.4; g = 247 - 67 * k; b = 208 - 114 * k; }
          else { const k = (n - 0.4) / 0.6; g = 180 - 57 * k; b = 94 - 48 * k; }
          px[i] = 255; px[i + 1] = g; px[i + 2] = b;
          px[i + 3] = Math.round(Math.pow(1 - n, 1.6) * tail * 255);
        }
      }
      ctx.putImageData(img, 0, 0);
      return PIXI.Texture.from(cnv);
    })();
    // 4-point sparkle
    RG.tex.spark = (() => {
      const g = new PIXI.Graphics();
      star4(g, 32, 32, 30, 0xffffff, 1);
      star4(g, 32, 32, 12, 0xffffff, 1);
      const t = app.renderer.generateTexture({ target: g, resolution: 2 });
      g.destroy(); return t;
    })();
  };

  /* ---------- glow sprite helper ---------- */
  A.glow = function (tint, size, alpha = 0.8) {
    const s = new PIXI.Sprite(RG.tex.glow);
    s.anchor.set(0.5); s.tint = tint;
    s.width = s.height = size; s.alpha = alpha;
    return s;
  };

  /* ---------- THE BIG DIAMOND (hero prop, always spinning & glinting) ---------- */
  A.makeBigDiamond = function () {
    const root = new PIXI.Container();
    const aura = A.glow(C.purpleBright, 460, 0.5);
    root.addChild(aura);
    const auraGold = A.glow(C.gold, 300, 0.35);
    root.addChild(auraGold);

    const body = new PIXI.Container();
    root.addChild(body);

    const W = 150, TOP = -96, GY = -28, BOT = 96, TW = 84; // half sizes
    const sil = [-W, GY, -TW, TOP, TW, TOP, W, GY, 0, BOT];

    const g = new PIXI.Graphics();
    // pavilion
    g.poly([-W, GY, W, GY, 0, BOT]).fill(0xbfd4ee);
    g.poly([-W, GY, 0, BOT, -W * 0.38, GY]).fill(0x8ea9cd);
    g.poly([W, GY, 0, BOT, W * 0.45, GY]).fill(0xe6f1fc);
    g.poly([-W * 0.38, GY, W * 0.45, GY, 0, BOT]).fill(0xa9c2e2);
    // crown
    g.poly([-TW, TOP, TW, TOP, W, GY, -W, GY]).fill(0xd4e4f6);
    g.poly([-TW, TOP, -W, GY, -TW * 0.45, GY]).fill(0xf2f9ff);
    g.poly([TW, TOP, W, GY, TW * 0.3, GY]).fill(0x9fb9da);
    g.poly([-TW, TOP, TW, TOP, TW * 0.3, GY, -TW * 0.45, GY]).fill({ color: 0xffffff, alpha: 0.75 });
    // outline
    g.poly(sil, true).stroke({ width: 6, color: 0xffffff, alpha: 0.9, join: "round" });
    g.moveTo(-W, GY).lineTo(W, GY).stroke({ width: 4, color: 0xffffff, alpha: 0.8 });
    body.addChild(g);

    // light sweep, masked to silhouette
    const sweep = new PIXI.Graphics();
    const grad = new PIXI.FillGradient({
      end: { x: 1, y: 0 },
      colorStops: [
        { offset: 0, color: 0xffffff }, { offset: 0.5, color: 0xffffff }, { offset: 1, color: 0xffffff },
      ],
    });
    sweep.poly([-40, TOP - 10, 10, TOP - 10, -60, BOT + 10, -110, BOT + 10]).fill({ fill: grad, alpha: 0.5 });
    const mask = new PIXI.Graphics().poly(sil, true).fill(0xffffff);
    body.addChild(mask, sweep);
    sweep.mask = mask;

    // sparkles
    const sparks = [];
    for (let i = 0; i < 3; i++) {
      const sp = new PIXI.Sprite(RG.tex.spark);
      sp.anchor.set(0.5); sp.alpha = 0; sp.scale.set(0.4);
      root.addChild(sp); sparks.push(sp);
    }
    const sparkPts = [[-TW, TOP], [TW, TOP], [-W, GY], [W, GY], [0, BOT], [0, TOP], [TW * 0.3, GY]];

    let t = RG.rand(0, 100), sparkT = 0;
    root.update = (dms) => {
      t += dms / 1000;
      // pseudo 3D spin: horizontal squash swings, facets shimmer via sweep pass
      const spin = Math.cos(t * 1.5);
      body.scale.x = 0.72 + 0.28 * Math.abs(spin);
      body.scale.y = 1 + 0.02 * Math.sin(t * 3);
      root.rotation = Math.sin(t * 0.9) * 0.05;
      sweep.x = ((t * 130) % 480) - 200;
      aura.alpha = 0.42 + 0.14 * Math.sin(t * 2.1);
      auraGold.alpha = 0.28 + 0.1 * Math.sin(t * 1.4 + 2);
      // twinkles
      sparkT -= dms;
      if (sparkT <= 0) {
        sparkT = RG.rand(350, 900);
        const sp = RG.pick(sparks);
        const p = RG.pick(sparkPts);
        sp.position.set(p[0] * body.scale.x, p[1]);
        sp.rotation = RG.rand(0, Math.PI);
        RG.killTweens(sp);
        sp.alpha = 0; sp.scale.set(0.1);
        RG.tween(sp, { to: { alpha: 1 }, duration: 160, onComplete: () => RG.tween(sp, { to: { alpha: 0 }, duration: 260 }) });
        RG.tween(sp.scale, { to: { x: RG.rand(0.5, 0.9), y: RG.rand(0.5, 0.9) }, duration: 420 });
      }
    };
    /* jackpot slam pop */
    root.bottomOffset = 100;
    root.baseScale = 1;
    root.pop = () => {
      const b = root.baseScale;
      RG.killTweens(root.scale);
      root.scale.set(b);
      RG.tween(root.scale, { to: { x: b * 1.32, y: b * 1.32 }, duration: 160, ease: RG.E.quadOut,
        onComplete: () => RG.tween(root.scale, { to: { x: b, y: b }, duration: 700, ease: RG.E.elasticOut }) });
    };
    return root;
  };

  /* ---------- NUT HERO (assembled from Spine source part images) ----------
     Used when no runtime Spine export (Nut.json + Nut.atlas) is present.
     Idle animation: soft bob, stem sway, cap tilt, glow pulse — no rotation.
     Size changes only via pop() when a fireball slams in. */
  A.makeNutHero = function (tex) {
    const root = new PIXI.Container();
    const aura = A.glow(C.purpleBright, 470, 0.5);
    const auraGold = A.glow(C.gold, 320, 0.3);
    const inner = new PIXI.Container();

    const glowS = new PIXI.Sprite(tex.glow);
    glowS.anchor.set(0.5);
    glowS.tint = 0xffc95e;
    glowS.blendMode = "add";
    glowS.width = 400; glowS.height = 430;
    glowS.position.set(0, -10);

    const tail = new PIXI.Sprite(tex.tail);
    tail.anchor.set(0.45, 0.92);
    tail.scale.set(0.45);
    tail.position.set(5, -130);

    const body = new PIXI.Sprite(tex.body);
    body.anchor.set(0.5);
    body.scale.set(0.55);
    body.position.set(0, 46);

    const head = new PIXI.Sprite(tex.head);
    head.anchor.set(0.5, 0.62);
    head.scale.set(0.57);
    head.position.set(0, -66);

    inner.addChild(glowS, tail, body, head);
    root.addChild(aura, auraGold, inner);

    let t = RG.rand(0, 100);
    root.update = (dms) => {
      t += dms / 1000;
      inner.y = Math.sin(t * 1.6) * 7;
      tail.rotation = Math.sin(t * 2.3) * 0.13;
      head.rotation = Math.sin(t * 1.6 + 0.8) * 0.035;
      glowS.alpha = 0.4 + 0.25 * Math.sin(t * 2);
      aura.alpha = 0.4 + 0.14 * Math.sin(t * 2.1);
      auraGold.alpha = 0.24 + 0.1 * Math.sin(t * 1.4 + 2);
    };
    root.bottomOffset = 161;
    root.baseScale = 1;
    root.pop = () => {
      const b = root.baseScale;
      RG.killTweens(root.scale);
      root.scale.set(b);
      RG.tween(root.scale, { to: { x: b * 1.32, y: b * 1.32 }, duration: 160, ease: RG.E.quadOut,
        onComplete: () => RG.tween(root.scale, { to: { x: b, y: b }, duration: 700, ease: RG.E.elasticOut }) });
    };
    return root;
  };

  /* ---------- diamond pile under the hero diamond ---------- */
  A.makePile = function (spanW) {
    const c = new PIXI.Container();
    const rows = [[0.95, 10, 22], [0.62, -14, 16], [0.34, -34, 12]]; // widthFactor, y, count
    for (const [wf, y, n] of rows) {
      for (let i = 0; i < n; i++) {
        const s = new PIXI.Sprite(RG.tex.mini);
        s.anchor.set(0.5);
        s.position.set(RG.rand(-spanW * wf / 2, spanW * wf / 2), y + RG.rand(-6, 6));
        s.scale.set(RG.rand(0.28, 0.48));
        s.rotation = RG.rand(-0.6, 0.6);
        s.tint = RG.pick([0xffffff, 0xf0e6ff, 0xdcebfb, 0xffffff]);
        c.addChild(s);
      }
    }
    return c;
  };

  /* ---------- fireball ---------- */
  A.makeFireball = function () {
    const c = new PIXI.Container();
    const halo = A.glow(0xff8c30, 130, 0.85);
    const core = new PIXI.Sprite(RG.tex.fire);
    core.anchor.set(0.5); core.scale.set(0.9);
    c.addChild(halo, core);
    let t = 0;
    c.update = (dms) => {
      t += dms / 1000;
      core.rotation += 0.2;
      core.scale.set(0.8 + 0.15 * Math.sin(t * 30));
    };
    c.aim = () => {};     // vector fireball is radially symmetric — nothing to aim
    c.stretch = () => {}; // …and nothing to stretch along the trail
    return c;
  };

  /* ---------- generic UI: round button ---------- */
  A.roundBtn = function (r, drawIcon) {
    const c = new PIXI.Container();
    const bg = new PIXI.Graphics()
      .circle(0, 0, r).fill({ color: C.panel, alpha: 0.92 })
      .circle(0, 0, r).stroke({ width: 3, color: C.line });
    const hl = new PIXI.Graphics().circle(0, 0, r).stroke({ width: 3, color: C.gold, alpha: 0 });
    const icon = new PIXI.Container();
    drawIcon(icon);
    c.addChild(bg, hl, icon);
    c.bgG = bg; c.hlG = hl; c.iconC = icon;
    c.eventMode = "static"; c.cursor = "pointer";
    c.on("pointerover", () => { hl.alpha = 1; });
    c.on("pointerout", () => { if (!c.activeGlow) hl.alpha = 0; });
    c.setActive = (on) => { c.activeGlow = on; hl.alpha = on ? 1 : 0; };
    c.press = () => {
      RG.killTweens(c.scale);
      c.scale.set(1);
      RG.tween(c.scale, { to: { x: 0.9, y: 0.9 }, duration: 70,
        onComplete: () => RG.tween(c.scale, { to: { x: 1, y: 1 }, duration: 180, ease: RG.E.backOut }) });
    };
    return c;
  };
})();
