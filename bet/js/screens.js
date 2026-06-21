/* ============================================================
   ScorePick — screens: рендер всех экранов + их интерактив
   Каждый экран: { html, onMount?(view) }
   ============================================================ */
(function () {
  'use strict';
  const HB = (window.HB = window.HB || {});
  const ui = HB.ui;
  const S = (HB.screens = {});

  const go = (hash) => { location.hash = hash; };
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // черновики прогнозов (на время сессии экрана)
  const drafts = {};

  // ---------- Топбар ----------
  function topbar(title, opts) {
    opts = opts || {};
    const left = opts.back
      ? `<button class="icon-btn" data-action="back" aria-label="${esc(HB.i18n.t('common.back'))}">${ui.icon('back')}</button>`
      : `<div class="brand"><div class="brand-mark">⚽</div></div>`;
    const right = opts.right || '';
    return `<header class="topbar">
      ${left}
      <div style="flex:1;min-width:0">
        <h1>${esc(title)}</h1>
        ${opts.sub ? `<div class="sub">${esc(opts.sub)}</div>` : ''}
      </div>
      ${right}
    </header>`;
  }

  /* ============================================================
     1. ГЛАВНАЯ
     ============================================================ */
  S.home = function () {
    const d = HB.data;
    const live = d.fixtures.filter((f) => f.status === 'live');
    const upcoming = d.fixtures.filter((f) => f.status === 'upcoming')
      .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 4);
    const rooms = d.rooms.slice(0, 2);
    const totalPlayers = new Set(d.rooms.flatMap((r) => r.participants.map((p) => p.name))).size;

    let liveHtml = '';
    if (live.length) {
      const fx = live[0]; const h = HB.team(fx.homeId), a = HB.team(fx.awayId);
      liveHtml = `<a class="live-strip card-tap" href="#/fixtures">
        <span class="badge badge-live"><span class="dot"></span>${HB.i18n.t('badge.live')}</span>
        <span class="ls-txt">${HB.i18n.t('home.liveNow')} <b>${esc(h.name)} ${fx.score.home}:${fx.score.away} ${esc(a.name)}</b> · ${fx.minute}'</span>
        ${ui.icon('chev', { size: 18 })}
      </a>`;
    }

    return {
      html: `
      ${topbar('', { right: `<button class="icon-btn" data-action="lang" aria-label="${esc(HB.i18n.t('lang.title'))}">${ui.icon('globe')}</button><a class="icon-btn" href="#/history" aria-label="${esc(HB.i18n.t('nav.history'))}">${ui.icon('clock')}</a>` })}
      <div class="home-top">
      <section class="home-hero fade-up">
        <span class="ball">⚽</span>
        <div class="brand"><div class="brand-mark">⚽</div><div class="brand-name">Score<b>Pick</b></div></div>
        <h2>${HB.i18n.t('home.headline')}</h2>
        <p>${esc(HB.i18n.d(d.app.tagline))} ${HB.i18n.t('home.intro')}</p>
        <div class="mt-24"><button class="btn" data-action="create-game">${ui.icon('bolt', { size: 20 })} ${HB.i18n.t('home.create')}</button></div>
      </section>

      <div class="home-aside">
      ${liveHtml ? `<div class="mt-16 fade-up d1">${liveHtml}</div>` : ''}

      <div class="card glass mt-16 fade-up d1">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--text-2);margin:0 2px 9px">${HB.i18n.t('home.enterCode')}</label>
        <div class="row">
          <input class="input input-code" id="home-code" inputmode="text" autocomplete="off" maxlength="6" placeholder="• • • • • •" />
        </div>
        <button class="btn btn-ghost mt-16" data-action="join-code">${ui.icon('arrowr', { size: 20 })} ${HB.i18n.t('common.join')}</button>
      </div>

      <div class="stat-grid mt-24 fade-up d2">
        <div class="stat"><div class="v green">${d.rooms.length}</div><div class="l">${HB.i18n.t('home.statGames')}</div></div>
        <div class="stat"><div class="v gold">${totalPlayers}</div><div class="l">${HB.i18n.t('home.statPlayers')}</div></div>
        <div class="stat"><div class="v">${d.fixtures.length}</div><div class="l">${HB.i18n.t('home.statMatches')}</div></div>
      </div>
      </div>
      </div>

      ${rooms.length ? `
      <div class="section-title fade-up d2"><h2>${HB.i18n.t('home.yourRooms')}</h2><a class="link" href="#/rooms">${HB.i18n.t('home.seeAll')}</a></div>
      <div class="stack">
        ${rooms.map((r) => roomCard(r)).join('')}
      </div>` : ''}

      <div class="section-title fade-up d3"><h2>${HB.i18n.t('home.upcoming')}</h2><a class="link" href="#/fixtures">${HB.i18n.t('home.allMatches')}</a></div>
      <div class="stack fade-up d3">
        ${upcoming.map((fx) => `<a class="card card-tap" href="#/fixtures">${ui.fixtureRow(fx)}</a>`).join('')}
      </div>
      `,
      onMount(view) {
        const codeInput = view.querySelector('#home-code');
        codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      }
    };
  };

  function roomCard(r) {
    const fx = HB.fixture(r.fixtureId);
    const names = r.participants.map((p) => p.name);
    const lg = fx ? HB.league(fx.leagueId) : null;
    const status = fx ? ui.statusBadge(fx) : '';
    const sub = fx ? `${HB.team(fx.homeId).short} – ${HB.team(fx.awayId).short}` : '';
    return `<a class="card card-tap" href="#/room/${r.id}">
      <div class="room-card">
        <div class="crest" style="--c:${lg ? lg.color : '#333'};--c2:#fff;font-size:18px">${lg ? lg.emoji : '⚽'}</div>
        <div class="rc-body">
          <div class="rc-title">${esc(r.title)}</div>
          <div class="rc-sub">${esc(sub)} · ${status}</div>
          <div class="mt-8">${ui.avatarStack(names, 5)}</div>
        </div>
        <span class="chev">${ui.icon('chev', { size: 20 })}</span>
      </div>
    </a>`;
  }

  /* ============================================================
     2. ВЫБОР МАТЧА
     ============================================================ */
  const fxFilter = { day: 'all', league: 'all', q: '' };

  S.fixtures = function () {
    const days = [...new Set(HB.data.fixtures.filter((f) => f.status !== 'finished').map((f) => HB.dayKey(f.kickoff)))];
    const dayChips = [{ k: 'all', label: HB.i18n.t('common.all') }, { k: 'live', label: HB.i18n.t('fixtures.live') }]
      .concat(days.map((k) => {
        const fx = HB.data.fixtures.find((f) => HB.dayKey(f.kickoff) === k);
        return { k, label: HB.fmtDay(fx.kickoff) };
      }));

    return {
      html: `
      ${topbar(HB.i18n.t('fixtures.title'), { back: true, sub: HB.i18n.t('fixtures.sub') })}
      <div class="input-icon mb-16">${ui.icon('search', { size: 20 })}<input class="input" id="fx-search" placeholder="${esc(HB.i18n.t('fixtures.search'))}" value="${esc(fxFilter.q)}" /></div>
      <div class="chips" id="fx-days">
        ${dayChips.map((c) => `<button class="chip ${fxFilter.day === c.k ? 'active' : ''}" data-day="${c.k}">${c.label}</button>`).join('')}
      </div>
      <div class="chips" id="fx-leagues">
        <button class="chip ${fxFilter.league === 'all' ? 'active' : ''}" data-league="all">${HB.i18n.t('common.allLeagues')}</button>
        ${HB.data.leagues.map((l) => `<button class="chip ${fxFilter.league === l.id ? 'active' : ''}" data-league="${l.id}"><span class="chip-emoji">${l.emoji}</span> ${esc(l.short)}</button>`).join('')}
      </div>
      <div id="fx-list" class="mt-16"></div>
      `,
      onMount(view) {
        const listEl = view.querySelector('#fx-list');

        function matches() {
          let list = HB.data.fixtures.filter((f) => f.status !== 'finished');
          if (fxFilter.day === 'live') list = list.filter((f) => f.status === 'live');
          else if (fxFilter.day !== 'all') list = list.filter((f) => HB.dayKey(f.kickoff) === fxFilter.day);
          if (fxFilter.league !== 'all') list = list.filter((f) => f.leagueId === fxFilter.league);
          if (fxFilter.q.trim()) {
            const q = fxFilter.q.trim().toLowerCase();
            list = list.filter((f) => {
              const h = HB.team(f.homeId), a = HB.team(f.awayId);
              return (h.name + h.city + a.name + a.city).toLowerCase().includes(q);
            });
          }
          return list.sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
        }

        function renderList() {
          const list = matches();
          if (!list.length) {
            listEl.innerHTML = `<div class="empty"><div class="e-ic">🔎</div><h3>${HB.i18n.t('fixtures.emptyTitle')}</h3><p>${HB.i18n.t('fixtures.emptyText')}</p></div>`;
            return;
          }
          // группировка по дням
          const groups = {};
          list.forEach((f) => { const k = HB.dayKey(f.kickoff); (groups[k] = groups[k] || []).push(f); });
          listEl.innerHTML = Object.keys(groups).map((k) => `
            <div class="section-title" style="margin-top:18px"><h2>${HB.fmtDay(groups[k][0].kickoff)}</h2><span class="dim" style="font-size:13px">${groups[k].length} ${HB.i18n.plural(groups[k].length, 'matches')}</span></div>
            <div class="stack">
              ${groups[k].map((fx) => `<button class="card card-tap" style="text-align:left;width:100%" data-pick="${fx.id}">${ui.fixtureRow(fx)}<div class="row-between mt-16"><span class="dim" style="font-size:12.5px">${ui.icon('pin', { size: 13 })} ${esc(HB.i18n.d(fx.venue))}</span><span class="badge badge-gold">${HB.i18n.t('fixtures.pick')} ${ui.icon('arrowr', { size: 13 })}</span></div></button>`).join('')}
            </div>`).join('');
        }

        view.querySelector('#fx-days').addEventListener('click', (e) => {
          const b = e.target.closest('[data-day]'); if (!b) return;
          fxFilter.day = b.dataset.day;
          view.querySelectorAll('#fx-days .chip').forEach((c) => c.classList.toggle('active', c === b));
          renderList();
        });
        view.querySelector('#fx-leagues').addEventListener('click', (e) => {
          const b = e.target.closest('[data-league]'); if (!b) return;
          fxFilter.league = b.dataset.league;
          view.querySelectorAll('#fx-leagues .chip').forEach((c) => c.classList.toggle('active', c === b));
          renderList();
        });
        view.querySelector('#fx-search').addEventListener('input', (e) => { fxFilter.q = e.target.value; renderList(); });
        listEl.addEventListener('click', (e) => {
          const b = e.target.closest('[data-pick]'); if (!b) return;
          HB.session.draftFixtureId = b.dataset.pick; HB.saveSession();
          ui.haptic(12); go('#/create');
        });

        renderList();
      }
    };
  };

  /* ============================================================
     3. СОЗДАНИЕ КОМНАТЫ
     ============================================================ */
  S.create = function () {
    const fx = HB.fixture(HB.session.draftFixtureId);
    if (!fx) return { html: redirectNote(HB.i18n.t('redirect.pickFirst'), '#/fixtures', HB.i18n.t('redirect.pickMatch')) };
    const namePh = HB.i18n.t('create.namePlaceholder', { home: HB.team(fx.homeId).name, away: HB.team(fx.awayId).name });

    return {
      html: `
      ${topbar(HB.i18n.t('create.title'), { back: true, sub: HB.i18n.t('create.sub') })}
      <div class="card fade-up">${ui.fixtureRow(fx)}<div class="fixture-meta"><span class="mi">${ui.icon('pin', { size: 14 })} ${esc(HB.i18n.d(fx.venue))}</span><span class="mi">${ui.icon('cal', { size: 14 })} ${HB.fmtDay(fx.kickoff)}, ${HB.fmtTime(fx.kickoff)}</span></div></div>

      <div class="card mt-16 fade-up d1">
        <div class="field">
          <label>${HB.i18n.t('create.roomName')}</label>
          <input class="input" id="cr-title" maxlength="40" placeholder="${esc(namePh)}" value="" />
        </div>
        <div class="field" style="margin-bottom:4px">
          <label>${HB.i18n.t('create.yourNameCreator')}</label>
          <div class="input-icon">${ui.icon('user', { size: 20 })}<input class="input" id="cr-name" maxlength="20" placeholder="${esc(HB.i18n.t('create.yourNameAsk'))}" value="${esc(HB.session.me || '')}" /></div>
        </div>
      </div>

      <div class="card glass mt-16 fade-up d2">
        <div class="row" style="align-items:flex-start;gap:10px">
          <span style="color:var(--gold)">${ui.icon('info', { size: 20 })}</span>
          <div class="muted" style="font-size:13px;line-height:1.5">${HB.i18n.t('create.info')}</div>
        </div>
      </div>

      <div class="mt-24 fade-up d3"><button class="btn" id="cr-submit">${ui.icon('check', { size: 20 })} ${HB.i18n.t('create.submit')}</button></div>
      `,
      onMount(view) {
        const title = view.querySelector('#cr-title');
        const name = view.querySelector('#cr-name');
        view.querySelector('#cr-submit').addEventListener('click', () => {
          const nm = name.value.trim();
          if (!nm) { ui.toast(HB.i18n.t('create.errName'), 'err'); name.focus(); return; }
          const room = HB.createRoom({ title: title.value.trim() || (HB.team(fx.homeId).short + ' – ' + HB.team(fx.awayId).short), creator: nm, fixtureId: fx.id });
          HB.session.draftFixtureId = null; HB.saveSession();
          ui.toast(HB.i18n.t('create.created'), 'ok');
          go('#/room/' + room.id);
        });
      }
    };
  };

  /* ============================================================
     4. ВХОД В КОМНАТУ
     ============================================================ */
  S.join = function () {
    const preset = HB.session.pendingCode || '';
    return {
      html: `
      ${topbar(HB.i18n.t('join.title'), { back: true, sub: HB.i18n.t('join.sub') })}
      <div class="card fade-up text-c">
        <div style="font-size:46px;margin:6px 0 4px">🎟️</div>
        <h3 style="font-family:var(--display);font-size:18px">${HB.i18n.t('join.codeTitle')}</h3>
        <p class="muted" style="font-size:13.5px;margin:6px auto 16px;max-width:26ch">${HB.i18n.t('join.codeHint')}</p>
        <input class="input input-code" id="jn-code" inputmode="text" autocomplete="off" maxlength="6" placeholder="• • • • • •" value="${esc(preset)}" />
      </div>
      <div id="jn-preview" class="mt-16"></div>
      <div class="card mt-16 fade-up d1" id="jn-namebox" style="display:none">
        <div class="field" style="margin-bottom:4px">
          <label>${HB.i18n.t('join.yourName')}</label>
          <div class="input-icon">${ui.icon('user', { size: 20 })}<input class="input" id="jn-name" maxlength="20" placeholder="${esc(HB.i18n.t('create.yourNameAsk'))}" value="${esc(HB.session.me || '')}" /></div>
        </div>
      </div>
      <div class="mt-24 fade-up d2"><button class="btn" id="jn-submit" disabled>${ui.icon('arrowr', { size: 20 })} ${HB.i18n.t('common.join')}</button></div>
      `,
      onMount(view) {
        const code = view.querySelector('#jn-code');
        const preview = view.querySelector('#jn-preview');
        const nameBox = view.querySelector('#jn-namebox');
        const submit = view.querySelector('#jn-submit');
        let room = null;

        function refresh() {
          code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          room = code.value.length === 6 ? HB.roomByCode(code.value) : null;
          if (code.value.length === 6 && !room) {
            preview.innerHTML = `<div class="card glass text-c" style="border-color:rgba(255,45,85,.35)"><span class="muted">${HB.i18n.t('join.notFound', { code: esc(code.value) })}</span></div>`;
            nameBox.style.display = 'none'; submit.disabled = true; return;
          }
          if (!room) { preview.innerHTML = ''; nameBox.style.display = 'none'; submit.disabled = true; return; }
          const fx = HB.fixture(room.fixtureId);
          preview.innerHTML = `<div class="card fade-up"><div class="row-between mb-16"><span class="h-eyebrow">${esc(room.title)}</span><span class="badge">${room.participants.length} ${HB.i18n.plural(room.participants.length, 'players')}</span></div>${ui.fixtureRow(fx)}<div class="mt-16">${ui.avatarStack(room.participants.map((p) => p.name), 6)}</div></div>`;
          nameBox.style.display = ''; submit.disabled = false;
        }

        code.addEventListener('input', refresh);
        submit.addEventListener('click', () => {
          if (!room) return;
          const nm = view.querySelector('#jn-name').value.trim();
          if (!nm) { ui.toast(HB.i18n.t('join.errName'), 'err'); return; }
          HB.joinRoom(room, nm);
          HB.session.pendingCode = null; HB.saveSession();
          ui.toast(HB.i18n.t('join.joined'), 'ok');
          go('#/room/' + room.id);
        });
        if (preset) refresh();
      }
    };
  };

  /* ============================================================
     5. ДЕТАЛИ КОМНАТЫ (основной экран)
     ============================================================ */
  S.room = function (params) {
    const room = HB.room(params.id);
    if (!room) return { html: redirectNote(HB.i18n.t('redirect.roomNotFound'), '#/home', HB.i18n.t('redirect.toHome')) };
    const fx = HB.fixture(room.fixtureId);
    const me = HB.session.me;
    const meP = room.participants.find((p) => p.name === me);
    const isCreator = meP && meP.isCreator;
    const locked = fx.status !== 'upcoming';                 // прогнозы закрыты после старта
    const reveal = fx.status !== 'upcoming';                 // показывать ли чужие прогнозы
    const actual = fx.status === 'upcoming' ? null : fx.score;

    // герой: середина зависит от статуса
    let mid;
    if (fx.status === 'live') mid = `<div class="hf-score" style="color:var(--live)">${fx.score.home}<span class="sep">:</span>${fx.score.away}</div><div class="hf-status"><span class="badge badge-live"><span class="dot"></span>${fx.minute}'</span></div>`;
    else if (fx.status === 'finished') mid = `<div class="hf-score">${fx.score.home}<span class="sep">:</span>${fx.score.away}</div><div class="hf-status"><span class="badge badge-done">${HB.i18n.t('badge.final')}</span></div>`;
    else mid = `<div class="hf-time">${HB.fmtTime(fx.kickoff)}</div><div class="hf-status"><span class="badge badge-soon">${HB.fmtDay(fx.kickoff)}</span></div>`;

    const ranking = reveal ? HB.ranking(room, actual) : null;
    const readyCount = room.participants.filter((p) => p.prediction).length;

    // блок прогноза
    let predictorHtml = '';
    if (!me || !meP) {
      predictorHtml = `<div class="card glass text-c fade-up d1">
        <div style="font-size:34px">🙋</div>
        <h3 style="font-family:var(--display);font-size:17px;margin:6px 0 4px">${HB.i18n.t('room.joinTitle')}</h3>
        <p class="muted" style="font-size:13.5px;margin-bottom:14px">${HB.i18n.t('room.joinText')}</p>
        <button class="btn btn-ghost" data-action="join-here">${ui.icon('plus', { size: 20 })} ${HB.i18n.t('room.joinBtn')}</button>
      </div>`;
    } else if (!locked) {
      const d = draft(room.id, meP.prediction);
      predictorHtml = predictorBlock(fx, d, meP.prediction);
    } else {
      // закрыто: показать мой прогноз и мои очки
      const pts = HB.scoreFor(meP.prediction, actual);
      predictorHtml = `<div class="card fade-up d1"><div class="row-between"><div><div class="h-eyebrow">${HB.i18n.t('room.yourPrediction')}</div><div style="font-family:var(--display);font-weight:800;font-size:26px;margin-top:6px">${meP.prediction ? meP.prediction.home + ' : ' + meP.prediction.away : '— : —'}</div></div><div class="rank-pts"><div class="v">${pts}</div><div class="u">${HB.cur()}</div></div></div></div>`;
    }

    return {
      html: `
      ${topbar(room.title, { back: true, sub: HB.i18n.d(HB.league(fx.leagueId).name), right: `<button class="icon-btn" data-action="share-room" aria-label="${esc(HB.i18n.t('common.share'))}">${ui.icon('share')}</button>` })}

      <div class="room-main">
      ${ui.heroFixture(fx, mid)}

      <div class="code-box mt-16 fade-up">
        <div>
          <div class="cb-label">${HB.i18n.t('join.codeTitle')}</div>
          <div class="cb-code">${esc(room.code)}</div>
        </div>
        <div class="cb-actions">
          <button class="icon-btn" data-action="copy-code" aria-label="${esc(HB.i18n.t('common.copy'))}">${ui.icon('copy', { size: 19 })}</button>
          <button class="icon-btn" data-action="share-room" aria-label="${esc(HB.i18n.t('common.share'))}">${ui.icon('share', { size: 19 })}</button>
        </div>
      </div>

      ${!locked ? `<div class="mt-16 fade-up d1"><div class="row-between mb-8" style="padding:0 2px"><span class="muted" style="font-size:13px">${HB.i18n.t('room.progress')}</span><span class="muted tnum" style="font-size:13px">${readyCount}/${room.participants.length}</span></div><div class="prog"><i style="width:${Math.round(readyCount / room.participants.length * 100)}%"></i></div></div>` : ''}

      <div class="mt-16">${predictorHtml}</div>
      </div>

      <div class="room-side">
      <div class="section-title fade-up d2">
        <h2>${reveal ? HB.i18n.t('room.table') : HB.i18n.t('room.players')} · ${room.participants.length}</h2>
        ${isCreator ? `<button class="link" data-action="add-player">${HB.i18n.t('room.addPlayer')}</button>` : ''}
      </div>

      <div class="plist fade-up d2">
        ${reveal
          ? ranking.map((r, i) => rankRow(r, i, actual, me)).join('')
          : room.participants.map((p) => participantRow(p, me)).join('')}
      </div>

      ${fx.status === 'live' ? `<div class="mt-24 fade-up d3"><a class="btn btn-gold" href="#/results/${room.id}">${ui.icon('trophy', { size: 20 })} ${HB.i18n.t('room.liveBoard')}</a></div>` : ''}
      ${fx.status === 'finished' ? `<div class="mt-24 fade-up d3"><a class="btn btn-gold" href="#/results/${room.id}">${ui.icon('trophy', { size: 20 })} ${HB.i18n.t('room.seeResults')}</a></div>` : ''}
      ${fx.status === 'upcoming' ? `<div class="card glass mt-24 text-c fade-up d3"><span class="muted" style="font-size:13px">${ui.icon('lock', { size: 15 })} ${HB.i18n.t('room.lockHint')}</span></div>` : ''}
      </div>
      `,
      onMount(view) {
        const room2 = HB.room(params.id);
        // степпер
        view.querySelectorAll('[data-step]').forEach((b) => {
          b.addEventListener('click', () => {
            const side = b.dataset.step, dir = +b.dataset.dir;
            const d = drafts[room2.id];
            d[side] = Math.max(0, Math.min(20, d[side] + dir));
            updateStepperUI(view, d);
            ui.haptic(6);
          });
        });
        const saveBtn = view.querySelector('#save-pred');
        if (saveBtn) saveBtn.addEventListener('click', () => {
          const d = drafts[room2.id];
          HB.setPrediction(room2, HB.session.me, d.home, d.away);
          ui.haptic(14); ui.toast(HB.i18n.t('room.saved'), 'ok');
          HB.router.render();
        });
      }
    };
  };

  // степпер-прогноз
  function draft(roomId, existing) {
    if (!drafts[roomId]) drafts[roomId] = { home: existing ? existing.home : 1, away: existing ? existing.away : 1 };
    return drafts[roomId];
  }
  function predictorBlock(fx, d, existing) {
    const h = HB.team(fx.homeId), a = HB.team(fx.awayId);
    return `<div class="card predictor fade-up d1">
      <div class="row-between" style="padding:0 2px 4px"><span class="h-eyebrow">${existing ? HB.i18n.t('room.changePrediction') : HB.i18n.t('room.yourPrediction')}</span>${existing ? `<span class="badge badge-gold">${ui.icon('check', { size: 13 })} ${HB.i18n.t('room.made')}</span>` : ''}</div>
      <div class="pr-teams">
        ${stepperSide('home', h, d.home)}
        <div class="pr-vs">:</div>
        ${stepperSide('away', a, d.away)}
      </div>
      <button class="btn mt-16" id="save-pred">${ui.icon('check', { size: 20 })} ${existing ? HB.i18n.t('room.update') : HB.i18n.t('room.save')}</button>
    </div>`;
  }
  function stepperSide(side, team, val) {
    return `<div class="stepper">
      <div class="st-name">${ui.crest(team.id, 'sm')} <span style="max-width:7ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(team.short)}</span></div>
      <div class="st-val" id="val-${side}" style="background:var(--surface-2)">${val}</div>
      <div class="step-btns">
        <button class="step-btn" data-step="${side}" data-dir="-1" aria-label="${esc(HB.i18n.t('common.minus'))}">${ui.icon('minus', { size: 20 })}</button>
        <button class="step-btn" data-step="${side}" data-dir="1" aria-label="${esc(HB.i18n.t('common.plus'))}">${ui.icon('plus', { size: 20 })}</button>
      </div>
    </div>`;
  }
  function updateStepperUI(view, d) {
    const vh = view.querySelector('#val-home'), va = view.querySelector('#val-away');
    if (vh) vh.textContent = d.home;
    if (va) va.textContent = d.away;
  }

  function participantRow(p, me) {
    const ready = !!p.prediction;
    return `<div class="prow ${p.name === me ? 'me' : ''}">
      ${ui.avatar(p.name)}
      <div class="pinfo">
        <div class="pname">${esc(p.name)}
          ${p.name === me ? `<span class="minitag you">${HB.i18n.t('room.you')}</span>` : ''}
          ${p.isCreator ? `<span class="minitag host">${HB.i18n.t('room.host')}</span>` : ''}
        </div>
        <div class="ptag">${ready ? HB.i18n.t('room.predMade') : HB.i18n.t('room.predWait')}</div>
      </div>
      <div class="pred-pill ${ready ? '' : 'empty'}">${ready ? (ui.icon('check', { size: 15 })) : HB.i18n.t('room.notReady')}</div>
    </div>`;
  }

  function rankRow(r, i, actual, me) {
    const ready = !!r.prediction;
    const exact = ready && actual && r.prediction.home === actual.home && r.prediction.away === actual.away;
    return `<div class="prow ${r.name === me ? 'me' : ''}">
      <div class="rank-num">${i + 1}</div>
      ${ui.avatar(r.name)}
      <div class="pinfo">
        <div class="pname">${esc(r.name)}
          ${i === 0 && r.points > 0 ? '<span class="crown">' + ui.icon('trophy', { size: 15 }) + '</span>' : ''}
          ${r.name === me ? `<span class="minitag you">${HB.i18n.t('room.you')}</span>` : ''}
        </div>
        <div class="ptag">${HB.i18n.t('room.predLabel')}: <b style="color:var(--text-2)">${ready ? r.prediction.home + ':' + r.prediction.away : '—'}</b>${exact ? ` · <span style="color:var(--primary)">${HB.i18n.t('room.exact')}</span>` : ''}</div>
      </div>
      <div class="rank-pts"><div class="v">${r.points}</div><div class="u">${HB.cur()}</div></div>
    </div>`;
  }

  /* ============================================================
     6. РЕЗУЛЬТАТЫ  (для комнаты: live-таблица или финал)
     ============================================================ */
  S.results = function (params) {
    const room = HB.room(params.id);
    if (!room) return { html: redirectNote(HB.i18n.t('redirect.roomNotFound'), '#/home', HB.i18n.t('redirect.toHome')) };
    const fx = HB.fixture(room.fixtureId);
    const actual = fx.score || { home: 0, away: 0 };
    const ranking = HB.ranking(room, actual);
    const isFinal = fx.status === 'finished';
    return {
      html: resultsView({
        title: room.title,
        backTo: '#/room/' + room.id,
        fx, actual, ranking, isFinal,
        live: fx.status === 'live', minute: fx.minute,
        shareText: HB.i18n.t('share.results', { title: room.title })
      }),
      onMount(view) { if (isFinal) setTimeout(() => ui.confetti(), 250); }
    };
  };

  // ---------- РЕКАП из истории ----------
  S.recap = function (params) {
    const h = HB.historyItem(params.id);
    if (!h) return { html: redirectNote(HB.i18n.t('redirect.gameNotFound'), '#/history', HB.i18n.t('redirect.toHistory')) };
    const fx = { homeId: h.fixture.homeId, awayId: h.fixture.awayId, leagueId: h.fixture.leagueId, kickoff: h.fixture.kickoff, venue: h.fixture.venue, status: 'finished', score: h.finalScore };
    const ranking = h.participants.map((p) => ({ name: p.name, prediction: p.prediction, points: p.points, close: HB.closeness(p.prediction, h.finalScore) }))
      .sort((a, b) => b.points - a.points || a.close - b.close);
    return {
      html: resultsView({ title: h.title, backTo: '#/history', fx, actual: h.finalScore, ranking, isFinal: true, shareText: HB.i18n.t('share.results', { title: h.title }) }),
      onMount() { setTimeout(() => ui.confetti(), 250); }
    };
  };

  function resultsView(o) {
    const { fx, actual, ranking, isFinal } = o;
    const winner = ranking[0];
    const winnerTie = ranking.filter((r) => r.points === winner.points && r.points > 0);
    let mid;
    if (o.live) mid = `<div class="hf-score" style="color:var(--live)">${actual.home}<span class="sep">:</span>${actual.away}</div><div class="hf-status"><span class="badge badge-live"><span class="dot"></span>${o.minute}'</span></div>`;
    else mid = `<div class="hf-score">${actual.home}<span class="sep">:</span>${actual.away}</div><div class="hf-status"><span class="badge badge-done">${HB.i18n.t('badge.final')}</span></div>`;

    const winnerBlock = (winner && winner.points > 0)
      ? `<div class="card fade-up d1" style="background:radial-gradient(120% 90% at 50% 0%, rgba(255,194,51,.14), transparent 60%);border-color:rgba(255,194,51,.3)">
          <div class="trophy-wrap"><div class="trophy">🏆</div>
            <div class="winner-name">${esc(winnerTie.length > 1 ? HB.i18n.t('results.draw') : winner.name)}</div>
            <div class="winner-sub">${winnerTie.length > 1 ? winnerTie.map((w) => esc(w.name)).join(HB.i18n.t('results.tieJoin')) + ' ' + HB.i18n.t('results.tieSuffix') : HB.i18n.t('results.bestPred') + ' ' + (winner.prediction ? winner.prediction.home + ':' + winner.prediction.away : '—') + ' · ' + winner.points + ' ' + HB.cur()}</div>
          </div>
        </div>`
      : `<div class="card glass text-c fade-up d1"><div style="font-size:40px">🤷</div><div class="winner-sub mt-8">${isFinal ? HB.i18n.t('results.nobody') : HB.i18n.t('results.noPoints')}</div></div>`;

    return `
      ${topbar(isFinal ? HB.i18n.t('results.title') : HB.i18n.t('results.liveTitle'), { back: true, sub: o.title, right: `<button class="icon-btn" data-action="share-results" data-text="${esc(o.shareText)}" aria-label="${esc(HB.i18n.t('common.share'))}">${ui.icon('share')}</button>` })}
      <div class="res-main">
      ${ui.heroFixture(fx, mid)}
      <div class="mt-16">${winnerBlock}</div>

      <div class="card glass mt-24 fade-up d3">
        <div class="h-eyebrow mb-8">${HB.i18n.t('results.scoringTitle')}</div>
        ${HB.data.scoring.rules.map((rule) => `<div class="row-between" style="padding:7px 0;border-bottom:1px solid var(--stroke)"><span class="muted" style="font-size:13.5px"><b style="color:var(--text)">${esc(HB.i18n.d(rule.label))}</b> · ${esc(HB.i18n.d(rule.desc))}</span><span class="badge badge-gold">+${rule.points}</span></div>`).join('')}
      </div>

      ${o.live ? `<div class="card glass mt-16 text-c fade-up d3"><span class="muted" style="font-size:13px">${ui.icon('flame', { size: 15 })} ${HB.i18n.t('results.liveHint')}</span></div>` : ''}
      </div>

      <div class="res-side">
      <div class="section-title fade-up d2"><h2>${isFinal ? HB.i18n.t('results.finalTable') : HB.i18n.t('results.leadingNow')}</h2><span class="dim" style="font-size:13px">${ranking.length} ${HB.i18n.plural(ranking.length, 'players')}</span></div>
      <div class="plist fade-up d2">
        ${ranking.map((r, i) => resultRow(r, i, actual)).join('')}
      </div>

      <div class="mt-16 fade-up d3"><a class="btn btn-ghost" href="${o.backTo}">${ui.icon('back', { size: 20 })} ${HB.i18n.t('results.backToRoom')}</a></div>
      </div>
    `;
  }

  function resultRow(r, i, actual) {
    const ready = !!r.prediction;
    const exact = ready && r.prediction.home === actual.home && r.prediction.away === actual.away;
    const rank = i < 3 ? 'r' + (i + 1) : '';
    return `<div class="rank-row ${rank}">
      <div class="rank-num">${i + 1}</div>
      ${ui.avatar(r.name)}
      <div class="pinfo">
        <div class="pname">${esc(r.name)} ${exact ? `<span class="badge badge-gold" style="padding:2px 7px;font-size:10px">${HB.i18n.t('results.exactTag')}</span>` : ''}</div>
        <div class="rank-pred">${HB.i18n.t('room.predLabel')}: ${ready ? r.prediction.home + ':' + r.prediction.away : '—'}</div>
      </div>
      <div class="rank-pts"><div class="v">${r.points}</div><div class="u">${HB.cur()}</div></div>
    </div>`;
  }

  /* ============================================================
     ДОП: СПИСОК КОМНАТ
     ============================================================ */
  S.rooms = function () {
    const rooms = HB.data.rooms;
    return {
      html: `
      ${topbar(HB.i18n.t('rooms.title'), { sub: HB.i18n.t('rooms.sub'), right: `<button class="icon-btn" data-action="create-game" aria-label="${esc(HB.i18n.t('nav.create'))}">${ui.icon('plus')}</button>` })}
      <div class="card glass fade-up">
        <div class="row">
          <input class="input input-code" id="rooms-code" maxlength="6" placeholder="• • • • • •" />
          <button class="btn btn-sm" data-action="join-code-rooms" style="flex:0 0 auto">${ui.icon('arrowr', { size: 18 })}</button>
        </div>
        <div class="dim text-c" style="font-size:12.5px;margin-top:10px">${HB.i18n.t('rooms.joinHint')}</div>
      </div>
      ${rooms.length ? `<div class="stack mt-16 fade-up d1">${rooms.map((r) => roomCard(r)).join('')}</div>`
        : `<div class="empty"><div class="e-ic">📭</div><h3>${HB.i18n.t('rooms.emptyTitle')}</h3><p>${HB.i18n.t('rooms.emptyText')}</p><button class="btn" data-action="create-game" style="max-width:220px;margin:0 auto">${ui.icon('bolt', { size: 20 })} ${HB.i18n.t('home.create')}</button></div>`}
      `,
      onMount(view) {
        const code = view.querySelector('#rooms-code');
        if (code) code.addEventListener('input', () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
      }
    };
  };

  /* ============================================================
     7. ИСТОРИЯ
     ============================================================ */
  S.history = function () {
    const hist = HB.data.history;
    const wins = {};
    hist.forEach((h) => { wins[h.winner] = (wins[h.winner] || 0) + 1; });
    const topWinner = Object.keys(wins).sort((a, b) => wins[b] - wins[a])[0];

    return {
      html: `
      ${topbar(HB.i18n.t('history.title'), { sub: HB.i18n.t('history.sub') })}
      ${hist.length ? `
      <div class="stat-grid fade-up">
        <div class="stat"><div class="v">${hist.length}</div><div class="l">${HB.i18n.t('history.statPlayed')}</div></div>
        <div class="stat"><div class="v gold">${topWinner ? esc(topWinner) : '—'}</div><div class="l">${HB.i18n.t('history.statTopWinner')}</div></div>
        <div class="stat"><div class="v green">${Object.keys(wins).length}</div><div class="l">${HB.i18n.t('history.statWinners')}</div></div>
      </div>
      <div class="section-title fade-up d1"><h2>${HB.i18n.t('history.archive')}</h2></div>
      <div class="stack fade-up d1">
        ${hist.slice().sort((a, b) => new Date(b.fixture.kickoff) - new Date(a.fixture.kickoff)).map((h) => historyCard(h)).join('')}
      </div>`
      : `<div class="empty"><div class="e-ic">📜</div><h3>${HB.i18n.t('history.emptyTitle')}</h3><p>${HB.i18n.t('history.emptyText')}</p></div>`}
      `
    };
  };

  function historyCard(h) {
    const fx = { homeId: h.fixture.homeId, awayId: h.fixture.awayId, leagueId: h.fixture.leagueId, kickoff: h.fixture.kickoff, status: 'finished', score: h.finalScore };
    return `<a class="card card-tap" href="#/recap/${h.id}">
      <div class="row-between mb-16">
        <span class="rc-title" style="font-size:15px">${esc(h.title)}</span>
        <span class="dim" style="display:inline-flex;align-items:center;gap:5px;font-size:12px">${ui.icon('cal', { size: 13 })} ${HB.fmtDate(h.fixture.kickoff)}</span>
      </div>
      ${ui.fixtureRow(fx)}
      <div class="row-between mt-16" style="padding-top:14px;border-top:1px solid var(--stroke)">
        <span class="row" style="gap:8px">${ui.avatar(h.winner, 28)}<span style="font-size:13.5px"><span class="dim">${HB.i18n.t('history.winner')}</span> <b>${esc(h.winner)}</b></span></span>
        <span class="badge badge-gold">${ui.icon('trophy', { size: 13 })} ${Math.max.apply(null, h.participants.map((p) => p.points))} ${HB.cur()}</span>
      </div>
    </a>`;
  }

  /* ============================================================
     Помощники
     ============================================================ */
  function redirectNote(msg, hash, btn) {
    return `${topbar('', { back: true })}<div class="empty"><div class="e-ic">🤔</div><h3>${esc(msg)}</h3><a class="btn" href="${hash}" style="max-width:240px;margin:10px auto 0">${esc(btn)}</a></div>`;
  }
  HB.screens._roomCard = roomCard;
})();
