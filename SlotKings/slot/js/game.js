/* ============================================================
   ROYAL GEMS DELUXE — SlotKings demo slot
   game.js — boot, screens, reels engine, state machine, UI
   ============================================================ */
(function () {
  "use strict";
  const RG = window.RG, C = RG.C, COL = C.COL, A = RG.Art, AU = RG.Audio;
  const AUTOTEST = location.hash.indexOf("autotest") >= 0;

  const H_PITCH = C.CELL + 24;         // 176
  const V_PITCH = C.CELL + C.CELL_GAP; // 162
  const ROWS_H = C.CELL * 3 + C.CELL_GAP * 2; // 476
  const ROWS_W = C.CELL * 3 + 24 * 2;         // 504
  const L = C.STRIP.length;
  const mod = (n, m = L) => ((n % m) + m) % m;

  /* ---------------- state ---------------- */
  const S = {
    balance: C.START_BALANCE,
    betIdx: 0,
    get bet() { return C.BETS[this.betIdx]; },
    lastWin: 0,
    speed: 0,
    auto: false,
    holdHeld: false,
    state: "boot",           // boot | start | idle | spinning | present | fs
    paidSpins: 0,            // counts toward free spins trigger
    deadSpins: 0,            // rig helper
    fsMode: false,
    fsLeft: 0,
    fsTotal: 0,
    menuOpen: false,
  };
  const spd = () => C.SPEEDS[S.speed].dur;

  /* ---------------- app boot ---------------- */
  let app, root, bgLayer, gameRoot, startRoot, fxLayer, overlayLayer;
  const updaters = [];
  const onFrame = (fn) => updaters.push(fn);

  async function boot() {
    app = new PIXI.Application();
    await app.init({
      resizeTo: window,
      background: COL.bg,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
      autoStart: !AUTOTEST,
    });
    document.getElementById("stage").appendChild(app.canvas);

    A.bake(app);
    await loadHeroAssets();
    await loadShotAssets();

    bgLayer = new PIXI.Container();
    root = new PIXI.Container();
    app.stage.addChild(bgLayer, root);

    buildBackground();
    gameRoot = new PIXI.Container();
    gameRoot.visible = false;
    root.addChild(gameRoot);
    buildGame();

    startRoot = new PIXI.Container();
    root.addChild(startRoot);
    buildStartScreen();
    S.state = "start";

    app.ticker.add((tk) => {
      const dms = Math.min(tk.deltaMS, 100);
      RG.updateTweens(dms);
      for (const f of updaters) f(dms);
    });
    if (AUTOTEST) setInterval(() => app.ticker.update(performance.now()), 33);

    layout();
    onFrame(() => {
      if (app.screen.width !== lastW || app.screen.height !== lastH) layout();
    });

    document.getElementById("splash").classList.add("hidden");
    console.log("Royal Gems Deluxe — SlotKings demo ready");
  }

  /* ---------------- hero (Spine diamond) loading ----------------
     1) games/spine/diamond/export (runtime Spine export) -> real Spine playback
     2) games/spine/nut/*.png (source images)             -> assembled nut
     3) fallback                                          -> vector diamond   */
  const DIAMOND_INTRO_ANIM = "appear";   // played once on start
  const DIAMOND_MAIN_ANIM = "rotation";  // looped after the intro
  const DIAMOND_PUFF_ANIM = "puff";      // layered on track 1, rotation keeps running
  let diamondData = null;
  function buildSpineData(atlasText, skelJson, texSource) {
    const sp = window.spine;
    const atlas = new sp.TextureAtlas(atlasText);
    for (const page of atlas.pages) page.setTexture(sp.SpineTexture.from(texSource));
    const skeletonJson = new sp.SkeletonJson(new sp.AtlasAttachmentLoader(atlas));
    return skeletonJson.readSkeletonData(skelJson);
  }
  async function loadHeroAssets() {
    RG.makeHero = () => A.makeBigDiamond();
    // 1) embedded assets (diamond-data.js) — work over file:// too, no fetch
    if (window.spine && window.DIAMOND_ASSETS) {
      try {
        const D = window.DIAMOND_ASSETS;
        // img.onload + canvas instead of img.decode(): decode() can stall in
        // background tabs, and CanvasSource is universally supported in Pixi v8.
        const img = new Image();
        await Promise.race([
          new Promise((res, rej) => {
            img.onload = res;
            img.onerror = () => rej(new Error("embedded png failed to parse"));
            img.src = D.png;
          }),
          new Promise((_, rej) => setTimeout(() => rej(new Error("embedded png load timeout")), 8000)),
        ]);
        const cnv = document.createElement("canvas");
        cnv.width = img.naturalWidth; cnv.height = img.naturalHeight;
        cnv.getContext("2d").drawImage(img, 0, 0);
        const tex = PIXI.Texture.from(cnv);
        diamondData = buildSpineData(D.atlas, D.json, tex.source);
        RG.makeHero = makeSpineDiamond;
        console.log("Diamond hero: embedded Spine assets loaded, animations:",
          diamondData.animations.map((a) => a.name).join(", "));
        return;
      } catch (e) {
        console.info("Diamond hero: embedded assets failed — trying fetch", e);
      }
    }
    // 2) fetch from games/spine/diamond/export (needs an http server)
    if (window.spine) {
      try {
        const base = "../games/spine/diamond/export/";
        const [atlasText, json, pngTex] = await Promise.all([
          fetch(base + "diamond-pma.atlas").then((r) => { if (!r.ok) throw new Error("atlas " + r.status); return r.text(); }),
          fetch(base + "diamond-pro.json").then((r) => { if (!r.ok) throw new Error("json " + r.status); return r.json(); }),
          PIXI.Assets.load(base + "diamond-pma.png"),
        ]);
        diamondData = buildSpineData(atlasText, json, pngTex.source);
        RG.makeHero = makeSpineDiamond;
        console.log("Diamond hero: Spine export loaded via fetch");
        return;
      } catch (e) {
        console.info("Diamond hero: Spine export failed to load — falling back to nut parts", e);
      }
    }
    try {
      const base = "../games/spine/nut/";
      const [body, head, tail, glow] = await Promise.all(
        ["body.png", "head.png", "tail.png", "glow.png"].map((f) => PIXI.Assets.load(base + f)));
      RG.makeHero = () => A.makeNutHero({ body, head, tail, glow });
      console.log("Hero: assembled from games/spine/nut parts");
    } catch (e) {
      console.warn("Hero: falling back to vector diamond", e);
    }
  }

  function makeSpineDiamond() {
    const root = new PIXI.Container();
    const aura = A.glow(COL.purpleBright, 470, 0.55);
    const auraGold = A.glow(COL.gold, 330, 0.35);
    root.addChild(aura, auraGold);

    const s = new window.spine.Spine({ skeletonData: diamondData });
    s.autoUpdate = false; // we advance it from our own ticker loop for determinism
    s.state.data.defaultMix = 0.15; // smooth blend between queued animations
    const sp = window.spine;
    const anims = s.skeleton.data.animations.map((a) => a.name);
    const main = anims.includes(DIAMOND_MAIN_ANIM) ? DIAMOND_MAIN_ANIM : anims[0];

    // Union the visual bounds across one full rotation cycle so the figure is
    // centered on its average pose, not on frame 0 (which sits off-center).
    const probe = s.state.setAnimation(0, main, true);
    const dur = probe.animation.duration || 1;
    let minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;
    const off = new sp.Vector2(), size = new sp.Vector2();
    for (let i = 0; i < 10; i++) {
      probe.trackTime = (dur * i) / 10;
      s.state.apply(s.skeleton);
      if (sp.Physics) s.skeleton.updateWorldTransform(sp.Physics.update);
      else s.skeleton.updateWorldTransform();
      s.skeleton.getBounds(off, size);
      minX = Math.min(minX, off.x); minY = Math.min(minY, off.y);
      maxX = Math.max(maxX, off.x + size.x); maxY = Math.max(maxY, off.y + size.y);
    }
    const uw = maxX - minX, uh = maxY - minY;
    // normalize to 340px tall
    const k = 340 / Math.max(uh, 1);
    s.scale.set(k);
    // Horizontally the gem spins around the `holder` bone. Its silhouette is not
    // symmetric at every phase of the spin, so the union bounding box sits off
    // that axis and the figure reads as shifted sideways. Centre on the spin
    // axis itself; keep bounds for the vertical, which has no such axis.
    const holderBone = s.skeleton.findBone("holder");
    const axisX = holderBone ? holderBone.worldX : minX + uw / 2;
    s.position.set(-axisX * k, -(minY + uh / 2) * k);
    /* Alpha- and area-weighted centroid of the actually-visible quads: where the
       eye reads the gem's centre, as opposed to the bounding box (which counts
       fully transparent attachments too). */
    const visualCenterX = () => {
      let acc = 0, wsum = 0;
      const v = new Float32Array(8);
      for (const slot of s.skeleton.slots) {
        const att = slot.attachment;
        if (!att || !att.computeWorldVertices) continue;
        const a = slot.color.a;
        if (a <= 0.01) continue;
        att.computeWorldVertices(slot, v, 0, 2);
        const w = Math.hypot(v[2] - v[0], v[3] - v[1]);
        const h = Math.hypot(v[4] - v[2], v[5] - v[3]);
        const wgt = a * w * h;
        acc += ((v[0] + v[2] + v[4] + v[6]) / 4) * wgt;
        wsum += wgt;
      }
      return wsum ? acc / wsum : 0;
    };
    root.visualCenterX = visualCenterX;
    root.centerInfo = () => {
      const o = new sp.Vector2(), z = new sp.Vector2();
      s.skeleton.getBounds(o, z);
      return {
        axisXInContainer: +(holderBone ? holderBone.worldX * k + s.x : NaN).toFixed(2),
        visualCentroidX: +(visualCenterX() * k + s.x).toFixed(2),
        boundsCenterX: +((o.x + z.x / 2) * k + s.x).toFixed(2),
      };
    };
    root.addChild(s);
    root.spine = s;
    root.bottomOffset = 170; // content bottom sits 170px below origin (340 / 2)

    // Sequence: the whole "appear" compressed into 0.7s, then endless "rotation"
    s.state.clearTracks();
    s.skeleton.setToSetupPose();
    if (anims.includes(DIAMOND_INTRO_ANIM)) {
      const intro = s.state.setAnimation(0, DIAMOND_INTRO_ANIM, false);
      const introDur = intro.animation.duration || 0.7;
      intro.timeScale = introDur / 0.7;              // full intro in 0.7 real seconds
      s.state.addAnimation(0, main, true, introDur); // delay is in track time units
    } else {
      s.state.setAnimation(0, main, true);
    }

    let t = RG.rand(0, 100);
    root.update = (dms) => {
      t += dms / 1000;
      s.update(dms / 1000); // advance Spine animation
      aura.alpha = 0.42 + 0.14 * Math.sin(t * 2.1);
      auraGold.alpha = 0.26 + 0.1 * Math.sin(t * 1.4 + 2);
    };
    root.baseScale = 1;
    root.pop = () => {
      const b = root.baseScale;
      RG.killTweens(root.scale);
      root.scale.set(b);
      RG.tween(root.scale, { to: { x: b * 1.32, y: b * 1.32 }, duration: 160, ease: RG.E.quadOut,
        onComplete: () => RG.tween(root.scale, { to: { x: b, y: b }, duration: 700, ease: RG.E.elasticOut }) });
    };
    /* Spine-driven swell: plays on track 1 so `rotation` on track 0 is
       untouched and the diamond keeps spinning throughout. */
    root.puff = () => {
      if (!anims.includes(DIAMOND_PUFF_ANIM)) return false;
      s.state.setAnimation(1, DIAMOND_PUFF_ANIM, false);
      s.state.addEmptyAnimation(1, 0.1, 0); // release track 1 once it finishes
      return true;
    };
    return root;
  }

  /* ---------------- shot FX (Spineboy muzzle flash) ----------------
     Only the muzzle half of the `shoot` animation was extracted: the frame-by-
     frame flash, the additive glow and the four expanding rings. The `muzzle`
     bone is normalized to the origin firing along +X, so aiming is a container
     rotation. Falls back to the vector fireball if the assets are missing. */
  let muzzleData = null, liveShot = null, liveArc = null;
  // MeshRope re-derives its thickness from texture.height every time the texture
  // fires an update — and the burst texture is re-rendered every frame — so the
  // render texture's height *is* the on-screen beam thickness. Assigning
  // geometry.width per frame instead froze the rope's geometry, so keep the two
  // locked together rather than fighting the coupling.
  const SHOT_BEAM_WIDTH = 56;             // rope thickness on screen, px
  const SHOT_RT_W = 512, SHOT_RT_H = SHOT_BEAM_WIDTH;

  async function loadShotAssets() {
    if (!window.spine || !window.MUZZLE_ASSETS) return;
    try {
      const M = window.MUZZLE_ASSETS;
      const img = new Image();
      await Promise.race([
        new Promise((res, rej) => {
          img.onload = res;
          img.onerror = () => rej(new Error("muzzle png failed to parse"));
          img.src = M.png;
        }),
        new Promise((_, rej) => setTimeout(() => rej(new Error("muzzle png load timeout")), 8000)),
      ]);
      const cnv = document.createElement("canvas");
      cnv.width = img.naturalWidth; cnv.height = img.naturalHeight;
      cnv.getContext("2d").drawImage(img, 0, 0);
      const tex = PIXI.Texture.from(cnv);
      muzzleData = buildSpineData(M.atlas, M.json, tex.source);
      console.log("Shot FX: Spineboy muzzle flash loaded");
    } catch (e) {
      console.info("Shot FX: falling back to the vector fireball", e);
    }
  }

  const SHOT_LOOP_END = 0.24; // loop just the burst (flash + ring expansion)
  const SHOT_RATE = 1.6;

  /* A Spine object is rigid — stretched along a straight line it drifts off the
     curved trail. So the burst is rendered into an off-screen texture instead,
     and that texture is mapped onto the trail rope: the rope stretches it over
     the whole trail *and* bends it, so the animation keeps the trail's shape. */
  function makeShotBeam() {
    if (!muzzleData) return null; // caller falls back to the static flame texture
    const sp = window.spine;
    const holder = new PIXI.Container();
    // The muzzle slot carries no attachment before 0.0333s and after 0.2s, so a
    // single looping copy goes dark for ~30% of every cycle and visibly flickers.
    // Two copies staggered by half a loop keep at least one flash lit at all times.
    const layers = [];
    for (let i = 0; i < 2; i++) {
      const s = new window.spine.Spine({ skeletonData: muzzleData });
      s.autoUpdate = false;
      const tr = s.state.setAnimation(0, "shoot", true);
      tr.animationEnd = SHOT_LOOP_END;
      tr.timeScale = SHOT_RATE;
      tr.trackTime = (SHOT_LOOP_END / 2) * i; // half-cycle stagger
      holder.addChild(s);
      layers.push(s);
    }
    // Box covering the burst at its widest — the flash quads plus the fully
    // expanded rings — mapped to fill the render texture.
    const X0 = -120, X1 = 610, Y0 = -230, Y1 = 230;
    const sx = SHOT_RT_W / (X1 - X0), sy = SHOT_RT_H / (Y1 - Y0);
    holder.scale.set(sx, sy);
    holder.position.set(-X0 * sx, -Y0 * sy);
    const rt = PIXI.RenderTexture.create({ width: SHOT_RT_W, height: SHOT_RT_H });

    return {
      texture: rt,
      update(dms) {
        const dt = dms / 1000;
        for (const s of layers) {
          s.update(dt);
          // `holder` is detached from the stage, so the render pipeline does not
          // pose the skeleton the way it did while the object lived in fxLayer —
          // without this the flash attachments stay null and the beam is dark.
          s.state.apply(s.skeleton);
          if (sp.Physics) s.skeleton.updateWorldTransform(sp.Physics.update);
          else s.skeleton.updateWorldTransform();
        }
        app.renderer.render({ container: holder, target: rt, clear: true });
      },
      destroy() { rt.destroy(true); holder.destroy({ children: true }); },
      probe() {
        const flashes = layers.map((s) => {
          const sl = s.skeleton.findSlot("muzzle");
          return sl && sl.attachment ? sl.attachment.name : null;
        });
        const t = layers[0].state.tracks[0];
        return {
          rt: SHOT_RT_W + "x" + SHOT_RT_H,
          anim: t && t.animation ? t.animation.name : null,
          trackTimes: layers.map((s) => {
            const tr = s.state.tracks[0];
            return tr ? +tr.trackTime.toFixed(3) : null;
          }),
          flashes,                              // per-copy attachment
          lit: flashes.some((f) => f !== null), // false would mean a visible gap
        };
      },
    };
  }

  /* ---------------- responsive layout ----------------
     Two design canvases. Landscape keeps the original 1700x920 with the button
     column on the right; portrait switches to a taller canvas and re-flows the
     controls into a single row at the bottom. Everything that moves is
     positioned from applyMode() rather than baked into its geometry. */
  const PORTRAIT_W = 1020, PORTRAIT_H = 1700;
  let DW = C.DESIGN_W, DH = C.DESIGN_H; // current design canvas
  let uiMode = null;
  let lastW = 0, lastH = 0;
  const st = {}; // start-screen pieces, repositioned per mode

  /* The design canvas is letterboxed inside the window, and the background layer
     fills the whole window behind it. A dim sized to the canvas therefore left
     the background glows uncovered — so dims are drawn far outside it. */
  const DIM_PAD = 4000;
  const dimRect = (color, alpha) => new PIXI.Graphics()
    .rect(-DIM_PAD, -DIM_PAD, C.DESIGN_W + DIM_PAD * 2, C.DESIGN_H + DIM_PAD * 2)
    .fill({ color, alpha });

  function layout() {
    lastW = app.screen.width; lastH = app.screen.height;
    const want = lastW / lastH < 1.15 ? "port" : "land";
    if (want !== uiMode) applyMode(want);
    const s = Math.min(lastW / DW, lastH / DH);
    root.scale.set(s);
    root.position.set((lastW - DW * s) / 2, (lastH - DH * s) / 2);
    layoutBackground(lastW, lastH);
  }

  function applyMode(m) {
    uiMode = m;
    const port = m === "port";
    DW = port ? PORTRAIT_W : C.DESIGN_W;
    DH = port ? PORTRAIT_H : C.DESIGN_H;
    const cx = DW / 2;

    /* ---- reels: the whole block is offset, its inner geometry is untouched ---- */
    const reelTop = port ? 620 : C.REEL_TOP;
    if (reelsGroup) reelsGroup.position.set(cx - C.REEL_X, reelTop - C.REEL_TOP);
    if (winText) winText.position.set(cx, reelTop + ROWS_H / 2);
    if (toastC) toastC.position.set(cx, port ? 1078 : 812);

    /* ---- hero gem, pile, wordmark ---- */
    if (bigDia) {
      const k = port ? 2.2 : 2.88;
      bigDia.baseScale = k; bigDia.scale.set(k);
      bigDia.position.set(cx, port ? 330 : 111.2);
      bigDia.impactY = (port ? 330 : 111.2) + 20;
    }
    if (ui.pile) ui.pile.position.set(cx, port ? 470 : 296);
    if (ui.logo) ui.logo.position.set(cx, port ? 250 : 282);

    /* ---- jackpot ladder: left column, or a compact row across the top ---- */
    ladderItems.forEach((item, i) => {
      if (port) { item.scale.set(0.75); item.position.set(15 + i * 200, 40); }
      else { item.scale.set(1); item.position.set(92, 96 + i * 76); }
    });

    /* ---- bottom bar ---- */
    if (barBg) {
      const y0 = port ? 1120 : 852;
      barBg.clear()
        .rect(0, y0, DW, DH - y0).fill({ color: 0x0a0612, alpha: 0.88 })
        .moveTo(0, y0).lineTo(DW, y0).stroke({ width: 2, color: COL.line, alpha: 0.7 });
      if (port) {
        // two rows: win/balance, then the bet stepper — 1020px is too narrow for one
        lastWinL.position.set(40, y0 + 12); lastWinT.position.set(40, y0 + 32);
        balanceL.position.set(DW - 40, y0 + 12); balanceT.position.set(DW - 40, y0 + 32);
        betL.position.set(cx, y0 + 78); betT.position.set(cx, y0 + 98);
        betMinus.position.set(cx - 170, y0 + 100); betPlus.position.set(cx + 170, y0 + 100);
      } else {
        lastWinL.position.set(130, y0 + 10); lastWinT.position.set(130, y0 + 30);
        balanceL.position.set(1470, y0 + 10); balanceT.position.set(1470, y0 + 30);
        betL.position.set(cx, y0 + 10); betT.position.set(cx, y0 + 30);
        betMinus.position.set(cx - 150, y0 + 34); betPlus.position.set(cx + 150, y0 + 34);
      }
    }

    /* ---- controls: right column, or one row along the bottom ---- */
    if (spinBtn) {
      if (port) {
        const y = 1430;
        menuBtn.position.set(110, y);
        speedBtn.position.set(250, y);
        spinBtn.position.set(cx, y);
        autoBtn.position.set(DW - 250, y);
        soundBtn.position.set(DW - 110, y);
      } else {
        menuBtn.position.set(1580, 96);
        speedBtn.position.set(1580, 208);
        spinBtn.position.set(1580, 430);
        autoBtn.position.set(1580, 652);
        soundBtn.position.set(1580, 764);
      }
    }

    layoutStartScreen(port, cx);
  }

  function layoutStartScreen(port, cx) {
    if (!st.dia) return;
    const k = port ? 1.7 : 2.24;
    const pileY = port ? 900 : 800, diaBottom = port ? 864 : 764;
    st.dia.baseScale = k; st.dia.scale.set(k);
    // anchored by its bottom edge so it rests on the pile
    st.dia.position.set(cx, diaBottom - k * (st.dia.bottomOffset || 170));
    st.pile.position.set(cx, pileY);
    st.title.position.set(cx, port ? 1010 : 690);
    st.sub.position.set(cx, port ? 1082 : 758);
    st.blurb.position.set(cx, port ? 1160 : 822);
    st.tap.position.set(cx, port ? 1280 : 868);
    st.note.position.set(cx, port ? DH - 60 : 905);
    // the blurb is one long line — wrap it on the narrow canvas
    st.blurb.style.wordWrap = port;
    st.blurb.style.wordWrapWidth = DW - 120;
    st.blurb.style.align = "center";
  }

  /* ---------------- background (fills real window) ---------------- */
  let bgGlows = [], fsGlows = [], dust = [];
  function buildBackground() {
    const mk = (tint, alpha) => { const g = A.glow(tint, 100, alpha); bgLayer.addChild(g); return g; };
    bgGlows = [mk(COL.purpleDeep, 0.75), mk(COL.purple, 0.4), mk(0x2a0f45, 0.8), mk(COL.purpleBright, 0.22)];
    fsGlows = [mk(0xb8860b, 0), mk(0x8a2be2, 0), mk(0xc2452d, 0)];
    for (let i = 0; i < 16; i++) {
      const d = new PIXI.Sprite(RG.tex.glow);
      d.anchor.set(0.5); d.tint = Math.random() < 0.5 ? COL.gold : COL.purpleLight;
      d.width = d.height = RG.rand(3, 7);
      d.alpha = RG.rand(0.25, 0.7);
      d.spd = RG.rand(8, 26); d.ph = RG.rand(0, 9);
      bgLayer.addChild(d); dust.push(d);
    }
    let t = 0;
    onFrame((dms) => {
      t += dms / 1000;
      for (const d of dust) {
        d.y -= d.spd * dms / 1000;
        d.x += Math.sin(t + d.ph) * 0.15;
        if (d.y < -20) { d.y = lastH + 20; d.x = RG.rand(0, lastW); }
      }
    });
  }
  function layoutBackground(w, h) {
    const g = bgGlows;
    g[0].position.set(w * 0.12, h * 0.2);  g[0].width = g[0].height = w * 0.75;
    g[1].position.set(w * 0.88, h * 0.15); g[1].width = g[1].height = w * 0.6;
    g[2].position.set(w * 0.5, h * 1.05);  g[2].width = g[2].height = w * 0.9;
    g[3].position.set(w * 0.5, h * 0.45);  g[3].width = g[3].height = w * 0.55;
    fsGlows[0].position.set(w * 0.15, h * 0.25); fsGlows[0].width = fsGlows[0].height = w * 0.7;
    fsGlows[1].position.set(w * 0.85, h * 0.7);  fsGlows[1].width = fsGlows[1].height = w * 0.6;
    fsGlows[2].position.set(w * 0.5, h * 0.05);  fsGlows[2].width = fsGlows[2].height = w * 0.65;
    for (const d of dust) if (!d.placed) { d.placed = true; d.position.set(RG.rand(0, w), RG.rand(0, h)); }
  }
  function setFsAmbience(on) {
    const to = on ? [0.5, 0.3, 0.45] : [0, 0, 0];
    fsGlows.forEach((gl, i) => RG.tween(gl, { to: { alpha: to[i] }, duration: 900 }));
    bgGlows.forEach((gl) => RG.tween(gl, { to: { alpha: on ? 0.15 : [0.75, 0.4, 0.8, 0.22][bgGlows.indexOf(gl)] }, duration: 900 }));
  }

  /* ============================================================
     START SCREEN
     ============================================================ */
  function buildStartScreen() {
    const cx = DW / 2;
    // oversized so it still catches taps across the letterboxed area
    const cover = new PIXI.Graphics().rect(-DIM_PAD, -DIM_PAD, C.DESIGN_W + DIM_PAD * 2, C.DESIGN_H + DIM_PAD * 2)
      .fill({ color: 0, alpha: 0.001 });
    startRoot.addChild(cover);

    const dia = RG.makeHero();
    const pile = A.makePile(620); pile.scale.set(1.3);
    startRoot.addChild(pile, dia);
    startDiaRef = dia;
    st.dia = dia; st.pile = pile;
    onFrame((dms) => { if (startRoot.visible) dia.update(dms); });

    const title = new PIXI.Text({
      text: "ROYAL GEMS",
      style: {
        fontFamily: "Cinzel, serif", fontSize: 104, fontWeight: "800", fill: COL.gold,
        stroke: { color: 0x50380e, width: 8 }, letterSpacing: 6,
        dropShadow: { color: COL.purpleBright, blur: 26, distance: 0, alpha: 0.8 },
      },
    });
    title.anchor.set(0.5);
    const sub = new PIXI.Text({
      text: "D E L U X E",
      style: { fontFamily: "Cinzel, serif", fontSize: 30, fontWeight: "700", fill: COL.purpleLight, letterSpacing: 24 },
    });
    sub.anchor.set(0.5);
    const blurb = new PIXI.Text({
      text: "Land diamonds to strike the Crown Jackpots — 20 spins unlock FREE SPINS ×2!",
      style: { fontFamily: "Manrope, sans-serif", fontSize: 21, fill: COL.muted, align: "center" },
    });
    blurb.anchor.set(0.5);
    const tap = new PIXI.Text({
      text: "TAP ANYWHERE TO START!",
      style: {
        fontFamily: "Cinzel, serif", fontSize: 32, fontWeight: "700", fill: 0xffffff,
        letterSpacing: 4, dropShadow: { color: COL.gold, blur: 16, distance: 0, alpha: 0.9 },
      },
    });
    tap.anchor.set(0.5);
    const demoNote = new PIXI.Text({
      text: "SLOTKINGS DEMO — FUN CREDITS ONLY · 18+",
      style: { fontFamily: "Manrope, sans-serif", fontSize: 14, fill: COL.muted, letterSpacing: 2 },
    });
    demoNote.anchor.set(0.5); demoNote.alpha = 0.7;
    startRoot.addChild(title, sub, blurb, tap, demoNote);
    st.title = title; st.sub = sub; st.blurb = blurb; st.tap = tap; st.note = demoNote;

    let t = 0;
    onFrame((dms) => { if (startRoot.visible) { t += dms / 1000; tap.alpha = 0.55 + 0.45 * Math.sin(t * 4); } });

    startRoot.eventMode = "static";
    startRoot.cursor = "pointer";
    startRoot.once("pointerdown", beginGame);
  }

  function beginGame() {
    if (S.state !== "start") return;
    AU.init();
    AU.click();
    S.state = "idle";
    gameRoot.visible = true;
    gameRoot.alpha = 0;
    RG.tween(gameRoot, { to: { alpha: 1 }, duration: 450 });
    RG.tween(startRoot, {
      to: { alpha: 0 }, duration: 350,
      onComplete: () => { startRoot.visible = false; startRoot.eventMode = "none"; },
    });
  }

  /* ============================================================
     GAME SCREEN
     ============================================================ */
  let bigDia, startDiaRef, reels = [], cellsHi = [], winText, fsBanner, ladderUI = {}, toastC;
  let reelsGroup, barBg, lastWinL, lastWinT, balanceL, balanceT, betL, betT, betMinus, betPlus;
  const ladderItems = [];
  let ui = {};

  function buildGame() {
    const cx = C.REEL_X;
    fxLayer = new PIXI.Container();
    overlayLayer = new PIXI.Container();

    /* ----- hero diamond + pile + logo ----- */
    const pile = A.makePile(470); pile.position.set(cx, 296);
    bigDia = RG.makeHero();
    // 4x the previous 0.72 — the gem is ~979px tall and renders behind the reels.
    // Vertically it sits midway between the two placements tried: centred on the
    // canvas, and lifted clear above the "ROYAL GEMS" wordmark.
    const DIA_GAME_SCALE = 2.88;
    const Y_CENTRED = C.DESIGN_H / 2;                                        // 460
    const Y_ABOVE_LOGO = 252 - DIA_GAME_SCALE * (bigDia.bottomOffset || 170); // -237.6
    const DIA_Y = (Y_CENTRED + Y_ABOVE_LOGO) / 2;                            // 111.2
    bigDia.position.set(cx, DIA_Y);
    bigDia.baseScale = DIA_GAME_SCALE; bigDia.scale.set(DIA_GAME_SCALE);
    // the gem's centre is back inside the viewport, so the shot arc, slam flash
    // and payout text can aim at it directly again
    bigDia.impactY = DIA_Y + 20;
    onFrame((dms) => { if (gameRoot.visible) bigDia.update(dms); });
    const logo = new PIXI.Text({
      text: "ROYAL GEMS",
      style: {
        fontFamily: "Cinzel, serif", fontSize: 40, fontWeight: "800", fill: COL.gold,
        stroke: { color: 0x50380e, width: 5 }, letterSpacing: 3,
        dropShadow: { color: 0x000000, blur: 8, distance: 3, alpha: 0.6 },
      },
    });
    logo.anchor.set(0.5); logo.position.set(cx, 282);

    /* ----- reels frame + cells ----- */
    const frame = new PIXI.Graphics()
      .roundRect(cx - ROWS_W / 2 - 26, C.REEL_TOP - 26, ROWS_W + 52, ROWS_H + 52, 26)
      .fill({ color: 0x0d0818, alpha: 0.96 })
      .stroke({ width: 5, color: COL.gold, alpha: 0.9 });
    const frameInner = new PIXI.Graphics()
      .roundRect(cx - ROWS_W / 2 - 16, C.REEL_TOP - 16, ROWS_W + 32, ROWS_H + 32, 18)
      .stroke({ width: 2, color: COL.purpleBright, alpha: 0.5 });

    const cells = new PIXI.Container();
    for (let r = 0; r < 3; r++) for (let row = 0; row < 3; row++) {
      const x = cx - H_PITCH + r * H_PITCH - C.CELL / 2;
      const y = C.REEL_TOP + row * V_PITCH;
      cells.addChild(new PIXI.Graphics()
        .roundRect(x, y, C.CELL, C.CELL, 14)
        .fill(0x17102a)
        .stroke({ width: 2, color: COL.line, alpha: 0.8 }));
    }

    /* highlight overlays per cell */
    const hiC = new PIXI.Container();
    for (let r = 0; r < 3; r++) { cellsHi[r] = [];
      for (let row = 0; row < 3; row++) {
        const x = cx - H_PITCH + r * H_PITCH - C.CELL / 2;
        const y = C.REEL_TOP + row * V_PITCH;
        const h = new PIXI.Graphics()
          .roundRect(x, y, C.CELL, C.CELL, 14)
          .stroke({ width: 5, color: COL.gold });
        h.alpha = 0; cellsHi[r][row] = h; hiC.addChild(h);
      }
    }

    /* ----- reels ----- */
    const reelMask = new PIXI.Graphics()
      .rect(cx - ROWS_W / 2, C.REEL_TOP - 6, ROWS_W, ROWS_H + 12).fill(0xffffff);
    const reelsC = new PIXI.Container();
    reelsC.mask = reelMask;
    for (let i = 0; i < 3; i++) reels.push(makeReel(i, reelsC));
    onFrame(() => { for (const r of reels) r.refresh(); });

    /* free spins banner over the frame top */
    fsBanner = new PIXI.Container();
    const fbG = new PIXI.Graphics()
      .roundRect(-190, -24, 380, 48, 24)
      .fill({ color: 0x3a1004, alpha: 0.95 })
      .stroke({ width: 3, color: COL.gold });
    const fbT = new PIXI.Text({
      text: "FREE SPINS — ALL WINS ×2",
      style: { fontFamily: "Cinzel, serif", fontSize: 22, fontWeight: "800", fill: COL.goldLight, letterSpacing: 2 },
    });
    fbT.anchor.set(0.5);
    fsBanner.addChild(fbG, fbT);
    fsBanner.position.set(cx, C.REEL_TOP - 26);
    fsBanner.visible = false;

    /* floating win text above reels */
    winText = new PIXI.Text({
      text: "",
      style: {
        fontFamily: "Cinzel, serif", fontSize: 54, fontWeight: "800", fill: COL.goldLight,
        stroke: { color: 0x50380e, width: 6 },
        dropShadow: { color: 0x000000, blur: 10, distance: 2, alpha: 0.7 },
      },
    });
    winText.anchor.set(0.5);
    winText.position.set(cx, C.REEL_TOP + ROWS_H / 2);
    winText.visible = false;

    // The reel block keeps its internal geometry and is moved as a whole; cellXY()
    // adds this group's offset so effects outside it still line up.
    reelsGroup = new PIXI.Container();
    reelsGroup.addChild(frame, cells, reelsC, reelMask, frameInner, hiC, fsBanner);
    ui.pile = pile; ui.logo = logo;

    gameRoot.addChild(pile, bigDia, logo, reelsGroup, buildLadder(), buildBottomBar(), buildButtons(), fxLayer, winText, overlayLayer);
    buildToast();
    syncUI();
  }

  /* ---------------- reel factory ---------------- */
  function makeReel(i, parent) {
    const rc = new PIXI.Container();
    parent.addChild(rc);
    const xC = C.REEL_X - H_PITCH + i * H_PITCH;
    const seedStart = RG.randInt(0, L - 1);
    const reel = {
      i, seed: seedStart, scroll: 0, spinning: false,
      slots: [],
      stops: seedStart,
    };
    for (let k = 0; k < 4; k++) {
      const sp = new PIXI.Sprite(RG.tex.ruby);
      sp.anchor.set(0.5);
      sp.width = sp.height = C.CELL * 0.94;
      sp.x = xC;
      rc.addChild(sp);
      reel.slots.push(sp);
    }
    reel.refresh = () => {
      const fl = Math.floor(reel.scroll), f = reel.scroll - fl;
      for (let k = 0; k < 4; k++) {
        const sp = reel.slots[k];
        sp.texture = RG.tex[C.STRIP[mod(reel.seed - fl + k - 1)]];
        sp.y = C.REEL_TOP + (k - 1 + f) * V_PITCH + C.CELL / 2;
      }
    };
    reel.symbolAt = (row) => C.STRIP[mod(reel.stops + row)];
    reel.container = rc;
    reel.refresh();
    return reel;
  }

  function spinReel(reel, stopIdx, delayMs, durMs) {
    reel.spinning = true;
    reel.stops = stopIdx;
    for (const sp of reel.slots) { RG.killTweens(sp); sp.width = sp.height = C.CELL * 0.94; }
    const loops = 3 + reel.i;
    const total = mod(reel.seed - stopIdx) + L * loops;
    reel.scroll = 0;
    return new Promise((res) => {
      RG.tween(null, {
        duration: 190 * spd() + 60, delay: delayMs, ease: RG.E.quadIn,
        onUpdate: (v) => { reel.scroll = v * 2; },
        onComplete: () => {
          RG.tween(null, {
            duration: durMs, ease: RG.E.linear,
            onUpdate: (v) => { reel.scroll = 2 + v * (total - 6); },
            onComplete: () => {
              RG.tween(null, {
                duration: 430 * spd() + 90, ease: RG.E.cubicOut,
                onUpdate: (v) => { reel.scroll = total - 4 + v * 4; },
                onComplete: () => {
                  reel.scroll = 0; reel.seed = stopIdx; reel.refresh();
                  reel.spinning = false;
                  AU.reelStop(reel.i);
                  // landing bounce
                  RG.tween(reel.container, {
                    from: { y: 14 }, to: { y: 0 }, duration: 240, ease: RG.E.backOut,
                  });
                  res();
                },
              });
            },
          });
        },
      });
    });
  }

  /* ---------------- rig helpers (demo pacing) ---------------- */
  const stripPositionsOf = (sym) => {
    const out = [];
    for (let i = 0; i < L; i++) if (C.STRIP[i] === sym) out.push(i);
    return out;
  };
  function stopWithout(sym) {
    for (let tries = 0; tries < 60; tries++) {
      const s = RG.randInt(0, L - 1);
      if (C.STRIP[mod(s)] !== sym && C.STRIP[mod(s + 1)] !== sym && C.STRIP[mod(s + 2)] !== sym) return s;
    }
    return RG.randInt(0, L - 1);
  }
  function stopShowing(sym, row) {
    const pos = stripPositionsOf(sym);
    if (!pos.length) return RG.randInt(0, L - 1);
    return mod(RG.pick(pos) - row);
  }
  function pickStops() {
    // free spins: guaranteed diamonds on schedule + boosted wins
    if (S.fsMode) {
      const fsIdx = C.FREESPINS_COUNT - S.fsLeft; // 0-based current
      if (fsIdx === 4) return [0, 1, 2].map((r) => stopShowing("diamond", RG.randInt(0, 2))).map((v, r) => r < 2 ? v : stopWithout("diamond")); // 2 diamonds
      if (fsIdx === C.FREESPINS_COUNT - 1) return forceLineStops(RG.pick(["crown", "seven", "bell"]));
      if (Math.random() < 0.42) return forceLineStops(RG.pick(["bell", "bar", "ruby", "amethyst", "seven"]));
      return [stopRnd(), stopRnd(), stopRnd()];
    }
    // base: anti-frustration rig
    if (S.deadSpins >= 5) return forceLineStops(RG.pick(["bell", "bar", "ruby", "amethyst"]));
    return [stopRnd(), stopRnd(), stopRnd()];
  }
  const stopRnd = () => RG.randInt(0, L - 1);
  function forceLineStops(sym) {
    const line = RG.pick(LINES);
    return [0, 1, 2].map((r) => stopShowing(sym, line[r]));
  }

  /* ---------------- evaluation ---------------- */
  const LINES = [[0, 0, 0], [1, 1, 1], [2, 2, 2], [0, 1, 2], [2, 1, 0]];

  function evaluate() {
    const grid = reels.map((r) => [0, 1, 2].map((row) => r.symbolAt(row)));
    const lineWins = [];
    for (const line of LINES) {
      const syms = [grid[0][line[0]], grid[1][line[1]], grid[2][line[2]]];
      if (syms.includes("diamond")) continue;
      let base = syms.find((s) => s !== "wild");
      if (!base) base = "wild";
      if (syms.every((s) => s === base || s === "wild")) {
        lineWins.push({ line, sym: base, pay: C.PAYS[base] });
      }
    }
    const diamonds = [];
    grid.forEach((col, r) => col.forEach((s, row) => { if (s === "diamond") diamonds.push({ r, row }); }));
    return { grid, lineWins, diamonds };
  }

  /* ---------------- fireball + slam ---------------- */
  const cellLocalY = (row) => C.REEL_TOP + row * V_PITCH + C.CELL / 2;
  function cellXY(r, row) {
    const off = reelsGroup ? reelsGroup.position : { x: 0, y: 0 };
    return {
      x: off.x + C.REEL_X - H_PITCH + r * H_PITCH,
      y: off.y + cellLocalY(row),
    };
  }

  async function fireballFrom(r, row) {
    AU.fireball();
    const from = cellXY(r, row);
    const to = { x: bigDia.x, y: bigDia.impactY !== undefined ? bigDia.impactY : bigDia.y + 20 };
    /* Cubic Bezier from A to B with a gentle sideways bow.
       The offset is applied only to the first control point; the second sits
       exactly on the A->B line, so the tangent at t=1 is the straight A->B
       direction. The shot therefore leaves the cell on a slight curve and comes
       in dead straight — it never swings around at the end. */
    const dx = to.x - from.x, dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;                     // perpendicular unit
    const bow = len * 0.12 * (Math.random() < 0.5 ? -1 : 1); // which side to lean
    const c1x = from.x + dx * 0.35 + nx * bow, c1y = from.y + dy * 0.35 + ny * bow;
    const c2x = to.x - dx * 0.25, c2y = to.y - dy * 0.25;

    const bezX = (t) => { const u = 1 - t;
      return u * u * u * from.x + 3 * u * u * t * c1x + 3 * u * t * t * c2x + t * t * t * to.x; };
    const bezY = (t) => { const u = 1 - t;
      return u * u * u * from.y + 3 * u * u * t * c1y + 3 * u * t * t * c2y + t * t * t * to.y; };
    const angleAt = (t) => { const u = 1 - t;
      return Math.atan2(
        3 * u * u * (c1y - from.y) + 6 * u * t * (c2y - c1y) + 3 * t * t * (to.y - c2y),
        3 * u * u * (c1x - from.x) + 6 * u * t * (c2x - c1x) + 3 * t * t * (to.x - c2x)); };

    /* A MeshRope stretched along the curve: it grows out of the cell and
       reaches the diamond, so the flame reads as one continuous arc rather
       than a dot with a particle tail. */
    const N = 28;
    const pts = [];
    for (let i = 0; i < N; i++) pts.push(new PIXI.Point(from.x, from.y));
    // The rope carries the live muzzle animation, so the burst bends along the
    // arc instead of being a straight beam laid over a curved trail.
    const beam = makeShotBeam();
    const arc = new PIXI.MeshRope({
      texture: beam ? beam.texture : RG.tex.flameArc,
      points: pts, textureScale: 0, width: SHOT_BEAM_WIDTH,
    });
    arc.blendMode = "add";
    fxLayer.addChild(arc);
    liveShot = beam; liveArc = arc;

    let lastP = 0, wob = RG.rand(0, 9);
    const dur = 620 * Math.max(spd(), 0.45);
    await RG.tweenP(null, {
      duration: dur, ease: RG.E.quadIn,
      onUpdate: (v, p) => {
        const dms = Math.max((p - lastP) * dur, 0);
        lastP = p;
        wob += dms / 1000;
        // never let the span collapse to zero — coincident rope points give
        // degenerate segment normals
        const span = 0.03 + p * 0.97;
        // Points run head -> source, so u=0 of the animation (the muzzle itself)
        // lands on the head of the arc and its flare trails back down the curve.
        for (let i = 0; i < N; i++) {
          const f = i / (N - 1), t = span * (1 - f);
          // gentle flame wobble perpendicular to the path, strongest at the tail
          const a = angleAt(t) + Math.PI / 2;
          const amp = Math.sin(f * 7 + wob * 9) * 6 * f;
          pts[i].x = bezX(t) + Math.cos(a) * amp;
          pts[i].y = bezY(t) + Math.sin(a) * amp;
        }
        arc.alpha = Math.min(1, p / 0.1);
        if (beam) beam.update(dms);
      },
    });

    liveShot = null;
    slamDiamond();
    // let the arc hang for a beat after impact, then burn out. The beam owns the
    // rope's texture, so it is released only once the rope is gone.
    RG.tween(arc, {
      to: { alpha: 0 }, duration: 420, delay: 90,
      onComplete: () => { arc.destroy(); if (beam) beam.destroy(); },
    });
  }

  function slamDiamond() {
    AU.slam();
    bigDia.pop();
    // flash
    const hitY = bigDia.impactY !== undefined ? bigDia.impactY : bigDia.y;
    const fl = A.glow(0xffffff, 340, 0.9);
    fl.position.set(bigDia.x, hitY);
    fxLayer.addChild(fl);
    RG.tween(fl, { to: { alpha: 0 }, duration: 420, onComplete: () => fl.destroy() });
    RG.tween(fl, { to: { width: 620, height: 620 }, duration: 420 });
    // shards burst
    for (let i = 0; i < 15; i++) {
      const sh = new PIXI.Sprite(RG.tex.mini);
      sh.anchor.set(0.5);
      sh.position.set(bigDia.x + RG.rand(-30, 30), hitY + 30);
      sh.scale.set(RG.rand(0.22, 0.45));
      sh.vx = RG.rand(-6.5, 6.5); sh.vy = RG.rand(-10, -4);
      sh.vr = RG.rand(-0.25, 0.25); sh.life = 1;
      fxLayer.addChild(sh);
      burstShards.push(sh);
    }
    // micro screen shake
    RG.killTweens(gameRoot.position);
    RG.tween(null, {
      duration: 260,
      onUpdate: (v, p) => {
        const k = (1 - p) * 7;
        gameRoot.position.set(RG.rand(-k, k), RG.rand(-k, k));
      },
      onComplete: () => gameRoot.position.set(0, 0),
    });
  }
  const burstShards = [];
  function updateShards(dms) {
    const dt = dms / 16.6667;
    for (let i = burstShards.length - 1; i >= 0; i--) {
      const s = burstShards[i];
      s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 0.42 * dt;
      s.rotation += s.vr * dt;
      s.life -= dms / 1200; s.alpha = Math.max(0, s.life);
      if (s.life <= 0) { s.destroy(); burstShards.splice(i, 1); }
    }
  }

  /* ---------------- win presentation ---------------- */
  async function showLineWins(res, mult) {
    const winCells = new Set();
    for (const w of res.lineWins) w.line.forEach((row, r) => winCells.add(r + ":" + row));
    // dim others, pulse winners
    for (let r = 0; r < 3; r++) for (let row = 0; row < 3; row++) {
      const hit = winCells.has(r + ":" + row);
      const hi = cellsHi[r][row];
      if (hit) {
        hi.alpha = 1;
        // slot sprites live inside reelsGroup, so match against the local y
        const sp = reels[r].slots.find((s) => Math.abs(s.y - cellLocalY(row)) < 2);
        if (sp) {
          RG.tween(sp, { to: { width: C.CELL * 1.08, height: C.CELL * 1.08 }, duration: 180 * spd() + 60, ease: RG.E.quadOut,
            onComplete: () => RG.tween(sp, { to: { width: C.CELL * 0.94, height: C.CELL * 0.94 }, duration: 260 * spd() + 80, ease: RG.E.backOut }) });
        }
      }
    }
    AU.winSmall();
    const amount = res.lineWins.reduce((a, w) => a + w.pay, 0) * S.bet * mult;
    await countWinText(amount);
    for (let r = 0; r < 3; r++) for (let row = 0; row < 3; row++) cellsHi[r][row].alpha = 0;
    return amount;
  }

  function countWinText(amount) {
    winText.visible = true; winText.alpha = 1; winText.scale.set(0.6);
    RG.tween(winText.scale, { to: { x: 1, y: 1 }, duration: 260, ease: RG.E.backOut });
    const dur = (S.speed === 2 ? 350 : 900) * Math.max(spd(), 0.5);
    let lastTick = 0;
    return RG.tweenP(null, {
      duration: dur,
      onUpdate: (v) => {
        winText.text = "WIN  " + RG.fmt(amount * v);
        lastTick += 1;
        if (lastTick % 4 === 0) AU.countTick();
      },
      onComplete: () => {
        winText.text = "WIN  " + RG.fmt(amount);
        RG.tween(winText, { to: { alpha: 0 }, duration: 500, delay: 650, onComplete: () => { winText.visible = false; } });
      },
    });
  }

  function floatPay(x, y, txt) {
    const t = new PIXI.Text({
      text: txt,
      style: {
        fontFamily: "Cinzel, serif", fontSize: 36, fontWeight: "800", fill: COL.goldLight,
        stroke: { color: 0x50380e, width: 5 },
      },
    });
    t.anchor.set(0.5); t.position.set(x, y);
    fxLayer.addChild(t);
    RG.tween(t, { to: { y: y - 70, alpha: 0 }, duration: 1100, ease: RG.E.quadOut, onComplete: () => t.destroy() });
  }

  /* ============================================================
     SPIN FLOW
     ============================================================ */
  async function startSpin(paid = true) {
    if (S.state !== "idle") return;
    if (paid && S.balance < S.bet) { AU.buzz(); toast("Not enough balance — open MENU to reset"); S.auto = false; syncUI(); return; }
    S.state = "spinning";
    if (paid) { S.balance -= S.bet; }
    S.lastWin = 0;
    syncUI();
    AU.spinStart();

    const stops = pickStops();
    const durBase = 620 * spd();
    await Promise.all(reels.map((r, i) => spinReel(r, stops[i], i * 110 * spd(), durBase + i * 160 * spd())));

    S.state = "present";
    const res = evaluate();
    const mult = S.fsMode ? C.FS_MULT : 1;
    let win = 0;

    /* diamonds: fireball show + scatter pay */
    if (res.diamonds.length) {
      for (const d of res.diamonds) {
        await fireballFrom(d.r, d.row);
        await RG.sleep(120 * spd());
      }
      const n = Math.min(res.diamonds.length, 3);
      let dpay;
      if (S.fsMode && n >= 3) { dpay = C.GRAND_PAY * S.bet; flashLadder("grand"); }
      else {
        dpay = C.DIAMOND_PAY[n] * S.bet * mult;
        if (n === 2) flashLadder("minor");
        if (n >= 3) flashLadder("maxi");
      }
      win += dpay;
      floatPay(bigDia.x, (bigDia.impactY !== undefined ? bigDia.impactY : bigDia.y) + 60,
        "+" + RG.fmt(dpay));
      AU.winSmall();
      await RG.sleep(500 * spd());
    }

    /* line wins */
    if (res.lineWins.length) {
      if (res.lineWins.some((w) => w.sym === "wild")) flashLadder("major");
      if (res.lineWins.some((w) => w.sym === "bar")) flashLadder("mini");
      win += await showLineWins(res, mult);
      S.deadSpins = 0;
    } else if (!res.diamonds.length) {
      S.deadSpins++;
    } else {
      S.deadSpins = 0;
    }

    S.balance += win;
    S.lastWin = win;
    if (S.fsMode) S.fsTotal += win;
    syncUI();

    /* big win? */
    if (win >= C.BIGWIN_X * S.bet && !S.fsMode) {
      await bigWinOverlay(win);
    } else if (win >= C.BIGWIN_X * S.bet && S.fsMode) {
      await RG.sleep(300);
    }

    /* free spins bookkeeping */
    if (paid) {
      S.paidSpins++;
      if (S.paidSpins >= C.FREESPINS_AFTER) {
        S.paidSpins = 0;
        await runFreeSpins();
        S.state = "idle";
        syncUI();
        return;
      }
    }

    S.state = "idle";
    syncUI();

    /* hold-to-repeat & autoplay */
    if (!S.fsMode && (S.holdHeld || S.auto)) {
      setTimeout(() => { if (S.state === "idle" && (S.holdHeld || S.auto)) startSpin(true); }, 150);
    }
  }

  /* ============================================================
     FREE SPINS
     ============================================================ */
  async function runFreeSpins() {
    S.auto = false; S.holdHeld = false;
    await fsIntroOverlay();
    S.fsMode = true; S.fsLeft = C.FREESPINS_COUNT; S.fsTotal = 0;
    setFsAmbience(true);
    fsBanner.visible = true;
    fsBanner.scale.set(0);
    RG.tween(fsBanner.scale, { to: { x: 1, y: 1 }, duration: 420, ease: RG.E.backOut });
    syncUI();

    while (S.fsLeft > 0) {
      S.state = "idle";
      syncUI();
      await startSpin(false);
      S.fsLeft--;
      syncUI();
      await RG.sleep(260 * spd());
    }

    await bigWinOverlay(S.fsTotal, "TOTAL WIN");
    S.fsMode = false;
    setFsAmbience(false);
    fsBanner.visible = false;
    toast("Free spins finished — good luck!");
    syncUI();
  }

  function fsIntroOverlay() {
    return new Promise((res) => {
      AU.freespins();
      const ov = new PIXI.Container();
      const dim = dimRect(0x000000, 0.72);
      const t1 = new PIXI.Text({
        text: "FREE SPINS!",
        style: {
          fontFamily: "Cinzel, serif", fontSize: 120, fontWeight: "800", fill: COL.gold,
          stroke: { color: 0x50380e, width: 10 }, letterSpacing: 6,
          dropShadow: { color: 0xff7b2e, blur: 34, distance: 0, alpha: 0.9 },
        },
      });
      t1.anchor.set(0.5); t1.position.set(DW / 2, 380);
      const t2 = new PIXI.Text({
        text: C.FREESPINS_COUNT + " FREE SPINS — ALL WINS ×" + C.FS_MULT,
        style: { fontFamily: "Manrope, sans-serif", fontSize: 30, fontWeight: "700", fill: 0xffffff, letterSpacing: 3 },
      });
      t2.anchor.set(0.5); t2.position.set(DW / 2, 510);
      const t3 = new PIXI.Text({
        text: "3 DIAMONDS = GRAND ×" + C.GRAND_PAY,
        style: { fontFamily: "Cinzel, serif", fontSize: 24, fontWeight: "700", fill: COL.purpleLight, letterSpacing: 3 },
      });
      t3.anchor.set(0.5); t3.position.set(DW / 2, 570);
      ov.addChild(dim, t1, t2, t3);
      overlayLayer.addChild(ov);
      t1.scale.set(0);
      RG.tween(t1.scale, { to: { x: 1, y: 1 }, duration: 550, ease: RG.E.elasticOut });
      for (let i = 0; i < 22; i++) {
        const sh = new PIXI.Sprite(RG.tex.mini);
        sh.anchor.set(0.5);
        sh.position.set(DW / 2, 380);
        sh.scale.set(RG.rand(0.3, 0.6));
        sh.vx = RG.rand(-9, 9); sh.vy = RG.rand(-12, -2);
        sh.vr = RG.rand(-0.3, 0.3); sh.life = 1.3;
        fxLayer.addChild(sh); burstShards.push(sh);
      }
      const close = () => {
        RG.tween(ov, { to: { alpha: 0 }, duration: 320, onComplete: () => { ov.destroy({ children: true }); res(); } });
      };
      ov.eventMode = "static"; ov.cursor = "pointer";
      ov.once("pointerdown", close);
      setTimeout(close, 2600);
    });
  }

  /* ============================================================
     BIG WIN / TOTAL WIN OVERLAY (diamonds fly left -> right)
     ============================================================ */
  function bigWinOverlay(amount, forceTitle) {
    return new Promise((res) => {
      AU.bigwin();
      let title = forceTitle;
      if (!title) {
        title = amount >= C.ROYAL_X * S.bet ? "ROYAL WIN" : amount >= C.MEGA_X * S.bet ? "MEGA WIN" : "BIG WIN";
      }
      const ov = new PIXI.Container();
      const dim = dimRect(0x05030a, 0.78);
      const glow = A.glow(COL.purpleBright, 900, 0.5);
      glow.position.set(DW / 2, DH / 2 - 40);
      const rain = new PIXI.Container();
      const titleStyle = {
        fontFamily: "Cinzel, serif", fontSize: 128, fontWeight: "800", fill: COL.gold,
        stroke: { color: 0x50380e, width: 11 }, letterSpacing: 8,
        dropShadow: { color: COL.purpleBright, blur: 40, distance: 0, alpha: 1 },
      };
      const tT = new PIXI.Text({ text: title, style: titleStyle });
      tT.anchor.set(0.5); tT.position.set(DW / 2, 350);
      const shine = new PIXI.Text({ text: title, style: { ...titleStyle, fill: 0xffffff, stroke: { color: 0xffffff, width: 1 } } });
      shine.anchor.set(0.5); shine.position.set(DW / 2, 350); shine.alpha = 0;
      const aT = new PIXI.Text({
        text: "0.00",
        style: {
          fontFamily: "Cinzel, serif", fontSize: 88, fontWeight: "800", fill: 0xffffff,
          stroke: { color: COL.purpleDeep, width: 8 },
          dropShadow: { color: COL.gold, blur: 26, distance: 0, alpha: 0.9 },
        },
      });
      aT.anchor.set(0.5); aT.position.set(DW / 2, 520);
      const hint = new PIXI.Text({
        text: "TAP TO CONTINUE",
        style: { fontFamily: "Manrope, sans-serif", fontSize: 22, fontWeight: "700", fill: COL.muted, letterSpacing: 5 },
      });
      hint.anchor.set(0.5); hint.position.set(DW / 2, 650); hint.alpha = 0;
      ov.addChild(dim, glow, rain, tT, shine, aT, hint);
      overlayLayer.addChild(ov);

      /* diamond rain left -> right */
      const drops = [];
      let alive = true, spawnT = 0, tt = 0;
      const spawn = (x0) => {
        const d = new PIXI.Sprite(RG.tex.mini);
        d.anchor.set(0.5);
        d.position.set(x0 !== undefined ? x0 : -80, RG.rand(-40, DH + 40));
        d.vx = RG.rand(4.5, 13); d.vr = RG.rand(-0.12, 0.12);
        d.ph = RG.rand(0, 9);
        d.scale.set(RG.rand(0.35, 1.05));
        d.alpha = RG.rand(0.6, 1);
        rain.addChild(d); drops.push(d);
      };
      for (let i = 0; i < 26; i++) spawn(RG.rand(0, DW));
      const upd = (dms) => {
        if (!alive) return;
        tt += dms / 1000;
        const dt = dms / 16.6667;
        spawnT -= dms;
        if (spawnT <= 0 && drops.length < 46) { spawn(); spawnT = 90; }
        for (const d of drops) {
          d.x += d.vx * dt;
          d.y += Math.sin(tt * 2 + d.ph) * 0.6;
          d.rotation += d.vr * dt;
          if (d.x > DW + 90) { d.x = -80; d.y = RG.rand(-40, DH + 40); }
        }
        tT.scale.set(1 + 0.035 * Math.sin(tt * 5));
        shine.scale.set(tT.scale.x);
        shine.alpha = 0.25 + 0.25 * Math.sin(tt * 7);
        glow.alpha = 0.4 + 0.15 * Math.sin(tt * 3);
      };
      updaters.push(upd);

      tT.scale.set(0);
      RG.tween(tT.scale, { to: { x: 1, y: 1 }, duration: 600, ease: RG.E.elasticOut });

      /* count-up */
      let counting = true, countTw;
      let tickN = 0;
      countTw = RG.tween(null, {
        duration: 1900, delay: 350,
        onUpdate: (v) => {
          aT.text = RG.fmt(amount * v);
          if (++tickN % 3 === 0) AU.countTick();
        },
        onComplete: () => {
          counting = false;
          aT.text = RG.fmt(amount);
          RG.tween(hint, { to: { alpha: 1 }, duration: 400 });
        },
      });

      const close = () => {
        if (counting) {
          countTw.dead = true; counting = false;
          aT.text = RG.fmt(amount);
          RG.tween(hint, { to: { alpha: 1 }, duration: 300 });
          return;
        }
        alive = false;
        const ix = updaters.indexOf(upd);
        if (ix >= 0) updaters.splice(ix, 1);
        RG.tween(ov, { to: { alpha: 0 }, duration: 380, onComplete: () => { ov.destroy({ children: true }); res(); } });
      };
      ov.eventMode = "static"; ov.cursor = "pointer";
      ov.on("pointerdown", close);
    });
  }

  /* ============================================================
     LADDER (left)
     ============================================================ */
  function buildLadder() {
    const c = new PIXI.Container();
    const w = 250, h = 60;
    // Each item is drawn at its own origin so applyMode() can stack them in a
    // left column or spread them across the top as a row.
    C.LADDER.forEach((e) => {
      const item = new PIXI.Container();
      const bg = new PIXI.Graphics()
        .roundRect(0, 0, w, h, 14).fill({ color: COL.panel, alpha: 0.92 })
        .roundRect(0, 0, w, h, 14).stroke({ width: 2.5, color: COL.line });
      const bar = new PIXI.Graphics().roundRect(8, 8, 8, h - 16, 4).fill(e.color);
      const name = new PIXI.Text({
        text: e.label,
        style: { fontFamily: "Cinzel, serif", fontSize: 21, fontWeight: "800", fill: e.color, letterSpacing: 2 },
      });
      name.position.set(28, 8);
      const val = new PIXI.Text({
        text: RG.fmt(e.mult * S.bet),
        style: { fontFamily: "Manrope, sans-serif", fontSize: 21, fontWeight: "800", fill: COL.goldLight },
      });
      val.position.set(28, 31);
      const flash = new PIXI.Graphics().roundRect(0, 0, w, h, 14).stroke({ width: 5, color: 0xffffff });
      flash.alpha = 0;
      item.addChild(bg, bar, name, val, flash);
      c.addChild(item);
      ladderItems.push(item);
      ladderUI[e.key] = { item, val, flash, e };
    });
    return c;
  }
  function flashLadder(key) {
    const it = ladderUI[key];
    if (!it) return;
    RG.killTweens(it.item.scale);
    it.item.pivot.set(0, 0);
    RG.tween(null, {
      duration: 1300,
      onUpdate: (v, p) => { it.flash.alpha = Math.abs(Math.sin(p * Math.PI * 4)); },
      onComplete: () => { it.flash.alpha = 0; },
    });
  }
  function updateLadder() {
    for (const k in ladderUI) ladderUI[k].val.text = RG.fmt(ladderUI[k].e.mult * S.bet);
  }

  /* ============================================================
     BOTTOM BAR
     ============================================================ */
  function buildBottomBar() {
    const c = new PIXI.Container();
    barBg = new PIXI.Graphics(); // redrawn per mode, the bar width changes
    c.addChild(barBg);

    const label = (txt, anchor) => {
      const t = new PIXI.Text({
        text: txt,
        style: { fontFamily: "Manrope, sans-serif", fontSize: 16, fontWeight: "700", fill: COL.muted, letterSpacing: 3 },
      });
      t.anchor.set(anchor, 0); c.addChild(t); return t;
    };
    const value = (txt, anchor, color = 0xffffff) => {
      const t = new PIXI.Text({
        text: txt,
        style: { fontFamily: "Manrope, sans-serif", fontSize: 27, fontWeight: "800", fill: color },
      });
      t.anchor.set(anchor, 0); c.addChild(t); return t;
    };

    lastWinL = label("LAST WIN", 0);
    lastWinT = value("FUN 0.00", 0, COL.goldLight);
    balanceL = label("BALANCE", 1);
    balanceT = value("FUN " + RG.fmt(S.balance), 1);
    betL = label("BET", 0.5);
    betT = value("FUN " + RG.fmt(S.bet), 0.5, COL.goldLight);

    const mkBet = (sign) => {
      const b = A.roundBtn(26, (icon) => {
        const g = new PIXI.Graphics();
        g.roundRect(-11, -3, 22, 6, 3).fill(COL.gold);
        if (sign > 0) g.roundRect(-3, -11, 6, 22, 3).fill(COL.gold);
        icon.addChild(g);
      });
      c.addChild(b);
      b.on("pointerdown", () => {
        if (S.state !== "idle" || S.fsMode) return;
        b.press(); AU.betClick();
        S.betIdx = RG.clamp(S.betIdx + sign, 0, C.BETS.length - 1);
        syncUI(); updateLadder();
      });
      return b;
    };
    betMinus = mkBet(-1);
    betPlus = mkBet(1);
    return c;
  }

  /* ============================================================
     RIGHT BUTTON COLUMN
     ============================================================ */
  let spinBtn, spinLabel, fsCountT, autoBtn, soundBtn, speedBtn, menuBtn, spinArrows;
  function buildButtons() {
    const c = new PIXI.Container();
    const bx = 1580;

    /* menu */
    menuBtn = A.roundBtn(42, (icon) => {
      const g = new PIXI.Graphics();
      for (let i = 0; i < 3; i++) g.roundRect(-16, -12 + i * 11, 32, 5, 2.5).fill(COL.gold);
      icon.addChild(g);
    });
    menuBtn.position.set(bx, 96);
    menuBtn.on("pointerdown", () => { menuBtn.press(); openMenu(); });

    /* speed */
    speedBtn = A.roundBtn(42, (icon) => {
      icon.chevs = [];
      for (let i = 0; i < 3; i++) {
        const g = new PIXI.Graphics()
          .poly([-6, -14, 6, 0, -6, 14]).stroke({ width: 6, color: COL.gold, join: "round", cap: "round" });
        g.x = -16 + i * 14;
        icon.addChild(g); icon.chevs.push(g);
      }
    });
    speedBtn.position.set(bx, 208);
    speedBtn.on("pointerdown", () => {
      speedBtn.press(); AU.click();
      S.speed = (S.speed + 1) % 3;
      syncUI();
      toast("Speed: " + C.SPEEDS[S.speed].name);
    });

    /* spin (big) */
    spinBtn = new PIXI.Container();
    spinBtn.position.set(bx, 430);
    const ring = new PIXI.Graphics()
      .circle(0, 0, 100).fill({ color: COL.panel, alpha: 0.94 })
      .circle(0, 0, 100).stroke({ width: 5, color: COL.gold })
      .circle(0, 0, 78).fill({ color: COL.purpleDeep })
      .circle(0, 0, 78).stroke({ width: 3, color: COL.purpleBright, alpha: 0.8 });
    spinArrows = new PIXI.Graphics();
    for (const off of [0, Math.PI]) {
      const a0 = off + 0.35, a = off + Math.PI - 0.5;
      spinArrows.moveTo(Math.cos(a0) * 89, Math.sin(a0) * 89)
        .arc(0, 0, 89, a0, a).stroke({ width: 7, color: COL.purpleLight, cap: "round" });
      const ax = Math.cos(a) * 89, ay = Math.sin(a) * 89;
      spinArrows.poly([ax + Math.cos(a + 1.2) * 16, ay + Math.sin(a + 1.2) * 16, ax + Math.cos(a - 0.4) * 16, ay + Math.sin(a - 0.4) * 16, ax, ay]).fill(COL.purpleLight);
    }
    spinLabel = new PIXI.Text({
      text: "SPIN",
      style: {
        fontFamily: "Cinzel, serif", fontSize: 44, fontWeight: "800", fill: COL.goldLight,
        stroke: { color: 0x2a0f45, width: 5 }, letterSpacing: 2,
      },
    });
    spinLabel.anchor.set(0.5);
    fsCountT = new PIXI.Text({
      text: "",
      style: { fontFamily: "Manrope, sans-serif", fontSize: 17, fontWeight: "800", fill: COL.purpleLight, letterSpacing: 2 },
    });
    fsCountT.anchor.set(0.5); fsCountT.position.set(0, 40);
    const holdHint = new PIXI.Text({
      text: "HOLD TO REPEAT",
      style: { fontFamily: "Manrope, sans-serif", fontSize: 14, fontWeight: "700", fill: COL.muted, letterSpacing: 3 },
    });
    holdHint.anchor.set(0.5); holdHint.position.set(0, 128);
    spinBtn.addChild(ring, spinArrows, spinLabel, fsCountT, holdHint);
    spinBtn.eventMode = "static"; spinBtn.cursor = "pointer";
    spinBtn.on("pointerdown", () => {
      if (S.fsMode || S.menuOpen) return;
      S.holdHeld = true;
      RG.killTweens(spinBtn.scale);
      spinBtn.scale.set(1);
      RG.tween(spinBtn.scale, { to: { x: 0.92, y: 0.92 }, duration: 80,
        onComplete: () => RG.tween(spinBtn.scale, { to: { x: 1, y: 1 }, duration: 200, ease: RG.E.backOut }) });
      startSpin(true);
    });
    const release = () => { S.holdHeld = false; };
    window.addEventListener("pointerup", release);
    window.addEventListener("pointercancel", release);

    let arrT = 0;
    onFrame((dms) => {
      arrT += dms / 1000;
      spinArrows.rotation += (S.state === "spinning" ? 0.22 : 0.035) * dms / 16.6667;
    });

    /* auto */
    autoBtn = A.roundBtn(42, (icon) => {
      const t = new PIXI.Text({
        text: "A",
        style: { fontFamily: "Cinzel, serif", fontSize: 36, fontWeight: "800", fill: COL.gold },
      });
      t.anchor.set(0.5); t.position.set(0, 1);
      const arc = new PIXI.Graphics()
        .moveTo(Math.cos(-1.1) * 26, Math.sin(-1.1) * 26)
        .arc(0, 0, 26, -1.1, 4.2).stroke({ width: 4, color: COL.gold, cap: "round" });
      icon.addChild(arc, t);
    });
    autoBtn.position.set(bx, 652);
    autoBtn.on("pointerdown", () => {
      if (S.fsMode) return;
      autoBtn.press(); AU.click();
      S.auto = !S.auto;
      syncUI();
      if (S.auto && S.state === "idle") startSpin(true);
    });

    /* sound */
    soundBtn = A.roundBtn(42, (icon) => {
      const sp = new PIXI.Graphics()
        .poly([-18, -8, -8, -8, 2, -18, 2, 18, -8, 8, -18, 8]).fill(COL.gold);
      const w1 = new PIXI.Graphics()
        .moveTo(4 + Math.cos(-1) * 10, Math.sin(-1) * 10)
        .arc(4, 0, 10, -1, 1).stroke({ width: 4, color: COL.gold, cap: "round" });
      const w2 = new PIXI.Graphics()
        .moveTo(4 + Math.cos(-1) * 17, Math.sin(-1) * 17)
        .arc(4, 0, 17, -1, 1).stroke({ width: 4, color: COL.gold, cap: "round" });
      const off = new PIXI.Graphics().moveTo(-20, 20).lineTo(20, -20).stroke({ width: 6, color: 0xd23b5e, cap: "round" });
      off.visible = false;
      icon.addChild(sp, w1, w2, off);
      icon.waves = [w1, w2]; icon.offSlash = off;
    });
    soundBtn.position.set(bx, 764);
    soundBtn.on("pointerdown", () => {
      soundBtn.press();
      const on = AU.toggle();
      soundBtn.iconC.waves.forEach((w) => (w.visible = on));
      soundBtn.iconC.offSlash.visible = !on;
      if (on) AU.click();
    });

    c.addChild(menuBtn, speedBtn, spinBtn, autoBtn, soundBtn);
    return c;
  }

  /* ---------------- UI sync ---------------- */
  function syncUI() {
    balanceT.text = "FUN " + RG.fmt(S.balance);
    lastWinT.text = "FUN " + RG.fmt(S.lastWin);
    betT.text = "FUN " + RG.fmt(S.bet);
    speedBtn.iconC.chevs.forEach((ch, i) => (ch.alpha = i <= S.speed ? 1 : 0.25));
    autoBtn.setActive(S.auto);
    const canBet = S.state === "idle" && !S.fsMode;
    betMinus.alpha = canBet && S.betIdx > 0 ? 1 : 0.35;
    betPlus.alpha = canBet && S.betIdx < C.BETS.length - 1 ? 1 : 0.35;
    if (S.fsMode) {
      spinLabel.style.fontSize = 62;
      spinLabel.text = String(S.fsLeft);
      fsCountT.text = "FREE SPINS";
      spinBtn.alpha = 1;
    } else {
      spinLabel.style.fontSize = 44;
      spinLabel.text = S.auto ? "AUTO" : "SPIN";
      fsCountT.text = "";
      spinBtn.alpha = S.state === "idle" ? 1 : 0.85;
    }
    autoBtn.alpha = S.fsMode ? 0.4 : 1;
  }

  /* ============================================================
     MENU OVERLAY
     ============================================================ */
  function openMenu() {
    if (S.state !== "idle" || S.menuOpen || S.fsMode) return;
    S.menuOpen = true; S.auto = false; syncUI();
    AU.click();

    const ov = new PIXI.Container();
    const dim = dimRect(0x000000, 0.75);
    dim.eventMode = "static";
    const narrow = uiMode === "port";
    const pw = Math.min(1240, DW - 40), ph = narrow ? 1180 : 730;
    const px = (DW - pw) / 2, py = (DH - ph) / 2;
    const panel = new PIXI.Graphics()
      .roundRect(px, py, pw, ph, 26).fill({ color: 0x120b20, alpha: 0.98 })
      .roundRect(px, py, pw, ph, 26).stroke({ width: 4, color: COL.gold });
    const title = new PIXI.Text({
      text: "GAME INFO",
      style: { fontFamily: "Cinzel, serif", fontSize: 42, fontWeight: "800", fill: COL.gold, letterSpacing: 6 },
    });
    title.anchor.set(0.5, 0); title.position.set(DW / 2, py + 26);
    ov.addChild(dim, panel, title);

    /* paytable */
    const pays = [
      ["crown", "×50"], ["seven", "×25"], ["bell", "×15"], ["bar", "×10 · MINI"],
      ["ruby", "×8"], ["amethyst", "×5"], ["wild", "×100 · MAJOR"], ["diamond", "SCATTER"],
    ];
    const cols = narrow ? 2 : 4;             // 4 columns do not fit the narrow panel
    const colW = (pw - 180) / (cols - 1);
    pays.forEach(([sym, pay], i) => {
      const gx = px + 90 + (i % cols) * colW, gy = py + 120 + Math.floor(i / cols) * 180;
      const sp = new PIXI.Sprite(RG.tex[sym]);
      sp.anchor.set(0.5); sp.width = sp.height = 110;
      sp.position.set(gx, gy);
      const t = new PIXI.Text({
        text: pay,
        style: { fontFamily: "Manrope, sans-serif", fontSize: 21, fontWeight: "800", fill: COL.goldLight },
      });
      t.anchor.set(0.5, 0); t.position.set(gx, gy + 62);
      ov.addChild(sp, t);
    });

    const rules = new PIXI.Text({
      text:
        "5 LINES: 3 rows + 2 diagonals · WILD substitutes all except DIAMOND\n" +
        "DIAMOND fires into the Royal Gem:  1 = ×2 · 2 = MINOR ×20 · 3 = MAXI ×50\n" +
        "Every " + C.FREESPINS_AFTER + " spins trigger " + C.FREESPINS_COUNT + " FREE SPINS — all wins ×" + C.FS_MULT +
        " · 3 diamonds in FREE SPINS = GRAND ×" + C.GRAND_PAY + "\n" +
        "SlotKings demo · FUN credits only · Wins are for entertainment, RTP is simulated · 18+",
      style: {
        fontFamily: "Manrope, sans-serif", fontSize: 21, fill: COL.muted,
        align: "center", lineHeight: 36,
        wordWrap: true, wordWrapWidth: pw - 80,
      },
    });
    rules.anchor.set(0.5, 0);
    rules.position.set(DW / 2, py + (narrow ? 860 : 480));
    ov.addChild(rules);

    /* reset balance */
    const resetB = new PIXI.Container();
    const rbg = new PIXI.Graphics()
      .roundRect(-130, -28, 260, 56, 28).fill(COL.purpleDeep)
      .roundRect(-130, -28, 260, 56, 28).stroke({ width: 3, color: COL.purpleBright });
    const rt = new PIXI.Text({
      text: "RESET BALANCE",
      style: { fontFamily: "Manrope, sans-serif", fontSize: 20, fontWeight: "800", fill: 0xffffff, letterSpacing: 2 },
    });
    rt.anchor.set(0.5);
    resetB.addChild(rbg, rt);
    resetB.position.set(DW / 2, py + ph - 70);
    resetB.eventMode = "static"; resetB.cursor = "pointer";
    resetB.on("pointerdown", () => {
      S.balance = C.START_BALANCE; S.lastWin = 0; S.paidSpins = 0;
      AU.winSmall(); syncUI(); toast("Balance reset to FUN " + RG.fmt(C.START_BALANCE));
    });
    ov.addChild(resetB);

    /* close */
    const closeB = A.roundBtn(34, (icon) => {
      icon.addChild(new PIXI.Graphics()
        .moveTo(-12, -12).lineTo(12, 12).moveTo(12, -12).lineTo(-12, 12)
        .stroke({ width: 5, color: COL.gold, cap: "round" }));
    });
    closeB.position.set(px + pw - 46, py + 46);
    closeB.on("pointerdown", () => {
      AU.click();
      RG.tween(ov, { to: { alpha: 0 }, duration: 240, onComplete: () => { ov.destroy({ children: true }); S.menuOpen = false; } });
    });
    ov.addChild(closeB);

    ov.alpha = 0;
    RG.tween(ov, { to: { alpha: 1 }, duration: 260 });
    overlayLayer.addChild(ov);
  }

  /* ============================================================
     TOAST
     ============================================================ */
  let toastT, toastBg;
  function buildToast() {
    toastC = new PIXI.Container();
    toastBg = new PIXI.Graphics();
    toastT = new PIXI.Text({
      text: "",
      style: { fontFamily: "Manrope, sans-serif", fontSize: 21, fontWeight: "700", fill: 0xffffff },
    });
    toastT.anchor.set(0.5);
    toastC.addChild(toastBg, toastT);
    toastC.position.set(C.REEL_X, 812);
    toastC.visible = false;
    gameRoot.addChild(toastC);
  }
  function toast(msg) {
    toastT.text = msg;
    const w = toastT.width + 60;
    toastBg.clear()
      .roundRect(-w / 2, -24, w, 48, 24).fill({ color: COL.purpleDeep, alpha: 0.95 })
      .roundRect(-w / 2, -24, w, 48, 24).stroke({ width: 2.5, color: COL.purpleBright });
    toastC.visible = true;
    RG.killTweens(toastC);
    toastC.alpha = 0; toastC.y = 830;
    RG.tween(toastC, { to: { alpha: 1, y: 812 }, duration: 260 });
    RG.tween(toastC, { to: { alpha: 0 }, duration: 350, delay: 2100, onComplete: () => { toastC.visible = false; } });
  }

  /* ---------------- shard updater ---------------- */
  onFrameLater();
  function onFrameLater() { updaters.push(updateShards); }

  /* ---------------- debug hooks ---------------- */
  window.RGDEBUG = {
    state: () => ({
      state: S.state, balance: S.balance, bet: S.bet, lastWin: S.lastWin,
      paidSpins: S.paidSpins, fsMode: S.fsMode, fsLeft: S.fsLeft, speed: S.speed, auto: S.auto,
    }),
    start: beginGame,
    spin: () => startSpin(true),
    turbo: () => { S.speed = 2; syncUI(); },
    forceFS: () => { S.paidSpins = C.FREESPINS_AFTER - 1; },
    setBalance: (v) => { S.balance = v; syncUI(); },
    hero: () => {
      const s = bigDia && bigDia.spine;
      if (!s) return { spine: false, kind: bigDia ? "non-spine" : "none" };
      const tr = s.state.tracks[0];
      const lb = s.getLocalBounds();
      return {
        spine: true,
        anim: tr && tr.animation ? tr.animation.name : null,
        next: tr && tr.next && tr.next.animation ? tr.next.animation.name : null,
        trackTime: tr ? +tr.trackTime.toFixed(3) : null,
        loop: tr ? tr.loop : null,
        baseScale: bigDia.baseScale,
        scaleX: +bigDia.scale.x.toFixed(3),
        boundsW: Math.round(lb.width * s.scale.x),
        boundsH: Math.round(lb.height * s.scale.y),
        center: bigDia.centerInfo ? bigDia.centerInfo() : null,
        screenX: Math.round(bigDia.x),
      };
    },
    pop: () => bigDia && bigDia.pop && bigDia.pop(),
    puff: () => (bigDia && bigDia.puff ? bigDia.puff() : false),
    fire: (r, row) => fireballFrom(r === undefined ? 1 : r, row === undefined ? 1 : row),
    layout: () => {
      const btn = (b) => b ? { x: Math.round(b.x), y: Math.round(b.y) } : null;
      const fits = (o, pad) => o.x - pad >= 0 && o.x + pad <= DW && o.y - pad >= 0 && o.y + pad <= DH;
      const row = [menuBtn, speedBtn, spinBtn, autoBtn, soundBtn].map(btn);
      return {
        mode: uiMode, canvas: DW + "x" + DH,
        screen: lastW + "x" + lastH,
        scale: +root.scale.x.toFixed(3),
        buttons: row,
        buttonsSameRow: new Set(row.map((b) => b.y)).size === 1,
        buttonsFit: [menuBtn, speedBtn, autoBtn, soundBtn].every((b) => fits(b, 42)) && fits(spinBtn, 100),
        ladder: ladderItems.map((it) => ({ x: Math.round(it.x), y: Math.round(it.y), s: it.scale.x })),
        ladderFits: ladderItems.every((it) => it.x >= 0 && it.x + 250 * it.scale.x <= DW),
        reelsOffset: reelsGroup ? { x: Math.round(reelsGroup.x), y: Math.round(reelsGroup.y) } : null,
        reelsFit: (() => {
          const o = reelsGroup.position;
          const l = o.x + C.REEL_X - ROWS_W / 2 - 26, r = o.x + C.REEL_X + ROWS_W / 2 + 26;
          const t = o.y + C.REEL_TOP - 26, b = o.y + C.REEL_TOP + ROWS_H + 26;
          return l >= 0 && r <= DW && t >= 0 && b <= DH;
        })(),
        barTopY: Math.round(betT.y),
      };
    },
    shotFx: () => ({
      spineLoaded: !!muzzleData,
      beamWidthConst: SHOT_BEAM_WIDTH,
      // measured off the live rope geometry, not the constant
      ropeWidth: liveArc ? liveArc.geometry.width : null,
      rope: liveArc ? (() => {
        const g = liveArc.geometry;
        const p = g.positions, pts = g.points;
        const b = liveArc.getBounds();
        return {
          posLen: p.length,
          rawPos: Array.from(p.slice(0, 8)).map((n) => +n.toFixed(1)),
          pts: pts.slice(0, 3).map((q) => [Math.round(q.x), Math.round(q.y)]),
          ptGap: +Math.hypot(pts[1].x - pts[0].x, pts[1].y - pts[0].y).toFixed(2),
          boundsW: Math.round(b.width), boundsH: Math.round(b.height),
        };
      })() : null,
      live: liveShot && liveShot.probe ? liveShot.probe() : null,
    }),
    puffStart: () => (startDiaRef && startDiaRef.puff ? startDiaRef.puff() : false),
    startHero: () => {
      if (!startDiaRef) return null;
      const tr = startDiaRef.spine && startDiaRef.spine.state.tracks[0];
      return {
        x: startDiaRef.x, y: +startDiaRef.y.toFixed(1),
        scale: startDiaRef.scale.x,
        bottom: +(startDiaRef.y + startDiaRef.scale.y * (startDiaRef.bottomOffset || 0)).toFixed(1),
        top: +(startDiaRef.y - startDiaRef.scale.y * (startDiaRef.bottomOffset || 0)).toFixed(1),
        anim: tr && tr.animation ? tr.animation.name : null,
        timeScale: tr ? +tr.timeScale.toFixed(2) : null,
        next: tr && tr.next && tr.next.animation ? tr.next.animation.name : null,
      };
    },
  };

  /* ---------------- go ---------------- */
  function start() {
    if (!window.PIXI) {
      document.getElementById("splash").innerHTML =
        '<p style="color:#c77dff;font:600 18px Manrope,sans-serif">Failed to load PixiJS (no internet?)</p>';
      return;
    }
    boot().catch((e) => {
      console.error(e);
      const el = document.getElementById("splash");
      el.classList.remove("hidden");
      el.innerHTML = '<p style="color:#c77dff;font:600 16px Manrope,sans-serif">Boot error: ' + e.message + "</p>";
    });
  }
  // This file is injected dynamically, so DOMContentLoaded may already have
  // fired by the time it runs — waiting on it unconditionally would hang.
  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
