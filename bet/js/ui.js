/* ============================================================
   ScorePick — ui: иконки, компоненты, тосты, шторки, конфетти
   ============================================================ */
(function () {
  'use strict';
  const HB = (window.HB = window.HB || {});
  const ui = (HB.ui = {});

  // ---------- Иконки (inline SVG) ----------
  const ICONS = {
    back:    '<path d="M15 18l-6-6 6-6"/>',
    plus:    '<path d="M12 5v14M5 12h14"/>',
    minus:   '<path d="M5 12h14"/>',
    copy:    '<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/>',
    share:   '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
    users:   '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
    user:    '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    clock:   '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    pin:     '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    cal:     '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    search:  '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>',
    trophy:  '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
    check:   '<path d="M20 6L9 17l-5-5"/>',
    close:   '<path d="M18 6L6 18M6 6l12 12"/>',
    chev:    '<path d="M9 18l6-6-6-6"/>',
    lock:    '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    edit:    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
    info:    '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    flame:   '<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 .5-2S6 10 6 13a6 6 0 0 0 12 0c0-5-6-11-6-11z"/>',
    bolt:    '<path d="M13 2L3 14h7l-1 8 10-12h-7l1-8z"/>',
    target:  '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    ticket:  '<path d="M3 9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2 2 2 0 0 0 0 6 2 2 0 0 1-2 2H5a2 2 0 0 1-2-2 2 2 0 0 0 0-6z"/><path d="M13 7v10"/>',
    star:    '<path d="M12 2l3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.3 3.2L7 14.2 2 9.4l7-.9L12 2z"/>',
    play:    '<path d="M6 4l14 8-14 8V4z"/>',
    arrowr:  '<path d="M5 12h14M13 6l6 6-6 6"/>',
    globe:   '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 4 9 14 14 0 0 1-4 9 14 14 0 0 1-4-9 14 14 0 0 1 4-9z"/>'
  };
  ui.icon = function (name, opts) {
    opts = opts || {};
    const w = opts.size || 22, sw = opts.stroke || 2;
    const fill = opts.fill ? 'currentColor' : 'none';
    return `<svg viewBox="0 0 24 24" width="${w}" height="${w}" fill="${fill}" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${ICONS[name] || ''}</svg>`;
  };

  // ---------- Компоненты (HTML-строки) ----------
  ui.crest = function (teamId, size) {
    const t = HB.team(teamId);
    const cls = size === 'sm' ? 'crest crest-sm' : size === 'lg' ? 'crest crest-lg' : 'crest';
    return `<div class="${cls}" style="--c:${t.color};--c2:${t.color2}">${t.short}</div>`;
  };

  ui.avatar = function (name, size) {
    const [a, b] = HB.avatarColors(name);
    const st = size ? `style="--av1:${a};--av2:${b};width:${size}px;height:${size}px;flex-basis:${size}px;font-size:${Math.round(size * 0.38)}px"` : `style="--av1:${a};--av2:${b}"`;
    return `<div class="avatar" ${st}>${HB.initials(name)}</div>`;
  };

  ui.statusBadge = function (fx) {
    if (fx.status === 'live') return `<span class="badge badge-live"><span class="dot"></span>${HB.i18n.t('badge.live')} ${fx.minute || ''}'</span>`;
    if (fx.status === 'finished') return `<span class="badge badge-done">${HB.i18n.t('badge.finished')}</span>`;
    return `<span class="badge badge-soon">${HB.fmtDay(fx.kickoff)} · ${HB.fmtTime(fx.kickoff)}</span>`;
  };

  // компактная карточка матча (для списков)
  ui.fixtureRow = function (fx) {
    const home = HB.team(fx.homeId), away = HB.team(fx.awayId), lg = HB.league(fx.leagueId);
    let mid;
    if (fx.status === 'live') mid = `<div class="score" style="color:var(--live)">${fx.score.home}<span style="color:var(--text-3)">:</span>${fx.score.away}</div><div class="lbl">${fx.minute}'</div>`;
    else if (fx.status === 'finished') mid = `<div class="score">${fx.score.home}:${fx.score.away}</div><div class="lbl">${HB.i18n.t('common.resultShort')}</div>`;
    else mid = `<div class="time">${HB.fmtTime(fx.kickoff)}</div><div class="lbl">${HB.fmtDay(fx.kickoff)}</div>`;
    return `
      <div class="fixture-head">
        <span class="fixture-league"><span>${lg.emoji}</span> ${HB.i18n.d(lg.name)}</span>
        ${fx.status === 'live' ? `<span class="badge badge-live"><span class="dot"></span>${HB.i18n.t('badge.live')}</span>` : ''}
      </div>
      <div class="fixture">
        <div class="fixture-teams">
          <div class="fixture-side home">
            ${ui.crest(fx.homeId)}
            <div style="min-width:0"><div class="tname">${home.name}</div><div class="tcity">${HB.i18n.d(home.city)}</div></div>
          </div>
          <div class="fixture-vs">${mid}</div>
          <div class="fixture-side away">
            ${ui.crest(fx.awayId)}
            <div style="min-width:0"><div class="tname">${away.name}</div><div class="tcity">${HB.i18n.d(away.city)}</div></div>
          </div>
        </div>
      </div>`;
  };

  // большой герой-матч (комната/результаты)
  ui.heroFixture = function (fx, midHtml) {
    const home = HB.team(fx.homeId), away = HB.team(fx.awayId), lg = HB.league(fx.leagueId);
    return `
      <div class="hero-fixture">
        <span class="fixture-league" style="justify-content:center">${lg.emoji} ${HB.i18n.d(lg.name)}</span>
        <div class="hf-teams">
          <div class="hf-team">${ui.crest(fx.homeId, 'lg')}<div class="tname">${home.name}</div></div>
          <div class="hf-mid">${midHtml}</div>
          <div class="hf-team">${ui.crest(fx.awayId, 'lg')}<div class="tname">${away.name}</div></div>
        </div>
        <div class="fixture-meta" style="justify-content:center">
          <span class="mi">${ui.icon('pin', { size: 14 })} ${HB.i18n.d(fx.venue) || '—'}</span>
          <span class="mi">${ui.icon('cal', { size: 14 })} ${HB.fmtDay(fx.kickoff)}, ${HB.fmtTime(fx.kickoff)}</span>
        </div>
      </div>`;
  };

  ui.avatarStack = function (names, max) {
    max = max || 4;
    const shown = names.slice(0, max);
    let html = '<div class="avatars">';
    shown.forEach((n) => { html += ui.avatar(n); });
    if (names.length > max) html += `<div class="avatar more">+${names.length - max}</div>`;
    return html + '</div>';
  };

  // ---------- Toast ----------
  ui.toast = function (msg, type) {
    const root = document.getElementById('toast-root');
    const el = document.createElement('div');
    el.className = 'toast ' + (type || 'ok');
    const ic = type === 'err' ? ui.icon('close', { size: 18 }) : ui.icon('check', { size: 18 });
    el.innerHTML = `<span class="t-ic">${ic}</span><span>${msg}</span>`;
    root.appendChild(el);
    HB.ui.haptic();
    setTimeout(() => {
      el.classList.add('out');
      setTimeout(() => el.remove(), 320);
    }, 2200);
  };

  // ---------- Sheet (нижняя шторка) ----------
  ui.sheet = function (innerHtml) {
    ui.closeSheet();
    const root = document.getElementById('sheet-root');
    const ov = document.createElement('div');
    ov.className = 'sheet-overlay';
    ov.innerHTML = `<div class="sheet"><div class="sheet-grab"></div>${innerHtml}</div>`;
    ov.addEventListener('click', (e) => { if (e.target === ov) ui.closeSheet(); });
    root.appendChild(ov);
    return ov;
  };
  ui.closeSheet = function () {
    const root = document.getElementById('sheet-root');
    if (root) root.innerHTML = '';
  };

  // ---------- Конфетти ----------
  ui.confetti = function () {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('div');
    c.className = 'confetti';
    const colors = ['#00E676', '#FFC233', '#8B5CF6', '#3B9CFF', '#FF2D55', '#1DE9B6'];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2 + Math.random() * 2 + 's';
      p.style.animationDelay = Math.random() * 0.6 + 's';
      p.style.transform = `scale(${0.6 + Math.random()})`;
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 4500);
  };

  // ---------- Копирование ----------
  ui.copy = async function (text) {
    try {
      await navigator.clipboard.writeText(text);
      ui.toast(HB.i18n.t('common.copied'), 'ok');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ui.toast(HB.i18n.t('common.copied'), 'ok'); } catch (_) { ui.toast(HB.i18n.t('common.copyFail'), 'err'); }
      ta.remove();
    }
  };

  // ---------- Поделиться ----------
  ui.share = async function (data) {
    if (navigator.share) {
      try { await navigator.share(data); return; } catch (e) {/* отменили */ return; }
    }
    ui.copy(data.url || data.text || '');
  };

  // ---------- Хаптика ----------
  ui.haptic = function (ms) {
    if (navigator.vibrate) { try { navigator.vibrate(ms || 8); } catch (e) {} }
  };
})();
