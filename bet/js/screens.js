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
    return {
      html: `
      ${topbar('', { right: `<button class="icon-btn" data-action="lang" aria-label="${esc(HB.i18n.t('lang.title'))}">${ui.icon('globe')}</button>` })}
      <div class="home-top">
      <section class="home-hero fade-up">
        <span class="ball">⚽</span>
        <div class="brand"><div class="brand-mark">⚽</div><div class="brand-name">Score<b>Pick</b></div></div>
        <h2>${HB.i18n.t('home.headline')}</h2>
        <p>${esc(HB.i18n.d(d.app.tagline))} ${HB.i18n.t('home.intro')}</p>
        <div class="mt-24"><button class="btn" data-action="create-game">${ui.icon('bolt', { size: 20 })} ${HB.i18n.t('home.create')}</button></div>
      </section>

      <div class="home-aside">
      <div id="home-live" style="display:none"></div>
      <div class="card glass mt-16 fade-up d1">
        <label style="display:block;font-size:13px;font-weight:600;color:var(--text-2);margin:0 2px 9px">${HB.i18n.t('home.enterCode')}</label>
        <div class="row">
          <input class="input input-code" id="home-code" inputmode="text" autocomplete="off" maxlength="6" placeholder="• • • • • •" />
        </div>
        <button class="btn btn-ghost mt-16" data-action="join-code">${ui.icon('arrowr', { size: 20 })} ${HB.i18n.t('common.join')}</button>
      </div>
      </div>
      </div>

      <div id="home-room"></div>

      <div class="section-title fade-up d3"><h2>${HB.i18n.t('home.upcoming')}</h2><a class="link" href="#/fixtures">${HB.i18n.t('home.allMatches')}</a></div>
      <div id="home-upcoming" class="fade-up d3"></div>
      `,
      onMount(view) {
        const codeInput = view.querySelector('#home-code');
        codeInput.addEventListener('input', () => { codeInput.value = codeInput.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });

        const liveEl = view.querySelector('#home-live');
        const upEl = view.querySelector('#home-upcoming');
        ui.asyncSlot(upEl, () => HB.api.fixturesToday(), (list) => {
          // живой матч → в правую колонку
          const live = list.filter((f) => f.status === 'live');
          if (live.length) {
            const fx = live[0], h = HB.team(fx.homeId), a = HB.team(fx.awayId);
            const sc = fx.score || { home: 0, away: 0 };
            liveEl.style.display = '';
            liveEl.innerHTML = `<a class="live-strip card-tap mt-16" href="#/fixtures">
              <span class="badge badge-live"><span class="dot"></span>${HB.i18n.t('badge.live')}</span>
              <span class="ls-txt">${HB.i18n.t('home.liveNow')} <b>${esc(h.name)} ${sc.home}:${sc.away} ${esc(a.name)}</b>${fx.minute ? ' · ' + fx.minute + "'" : ''}</span>
              ${ui.icon('chev', { size: 18 })}
            </a>`;
          }
          const upcoming = list.filter((f) => f.status === 'upcoming').sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff)).slice(0, 6);
          if (!upcoming.length) return ui.empty({ icon: '📅', title: HB.i18n.t('state.noUpcomingTitle'), text: HB.i18n.t('state.noUpcomingText') });
          return `<div class="stack">${upcoming.map((fx) => `<a class="card card-tap" href="#/fixtures">${ui.fixtureRow(fx)}</a>`).join('')}</div>`;
        }, {
          loadingLabel: HB.i18n.t('state.loadingMatches'),
          empty: { icon: '📅', title: HB.i18n.t('state.noMatchesTitle'), text: HB.i18n.t('state.noMatchesText') }
        });

        // «Твоя комната»: одна активная комната, сохранённая между сессиями
        const roomEl = view.querySelector('#home-room');
        const activeCode = HB.api.activeRoom();
        if (activeCode) {
          HB.api.getRoom(activeCode).then((room) => {
            HB.currentRoom = room;
            const fx = room.fixtureId ? HB.fixture(room.fixtureId) : null;
            roomEl.innerHTML = `
              <div class="section-title fade-up d2"><h2>${HB.i18n.t('home.yourRoom')}</h2></div>
              <a class="card card-tap fade-up d2" href="#/room/${esc(room.code)}">
                ${fx ? ui.fixtureRow(fx) : ''}
                <div class="row-between mt-16" style="padding-top:14px;border-top:1px solid var(--stroke)">
                  <span style="font-weight:700;font-size:15px">${esc(room.title)}</span>
                  <span class="dim" style="font-size:12.5px;display:inline-flex;align-items:center;gap:6px">${ui.icon('users', { size: 14 })} ${room.participants.length} · <b style="letter-spacing:.12em">${esc(room.code)}</b></span>
                </div>
              </a>`;
          }).catch((err) => {
            // комната пропала/недоступна — забываем активную, секцию не показываем
            if (err && err.isNotFound) HB.api.setActiveRoom(null);
            roomEl.innerHTML = '';
          });
        }
      }
    };
  };

  /* ============================================================
     2. ВЫБОР МАТЧА
     ============================================================ */
  const fxFilter = { day: 'all', league: 'all', q: '' };

  S.fixtures = function () {
    return {
      html: `
      ${topbar(HB.i18n.t('fixtures.title'), { back: true, sub: HB.i18n.t('fixtures.sub') })}
      <div id="fx-async"></div>
      `,
      onMount(view) {
        const slot = view.querySelector('#fx-async');
        const notFinished = (f) => f.status !== 'finished';

        ui.asyncSlot(slot, () => HB.api.fixturesToday(),
          (all) => buildFixturesUI(all.filter(notFinished)),
          {
            loadingLabel: HB.i18n.t('state.loadingMatches'),
            isEmpty: (all) => all.filter(notFinished).length === 0,
            empty: { icon: '⚽', title: HB.i18n.t('state.noMatchesTitle'), text: HB.i18n.t('state.noMatchesText') },
            onMount: (el, all) => wireFixtures(el, all.filter(notFinished))
          });
      }
    };
  };

  function buildFixturesUI(list) {
    const days = [...new Set(list.map((f) => HB.dayKey(f.kickoff)))];
    const dayChips = [{ k: 'all', label: HB.i18n.t('common.all') }, { k: 'live', label: HB.i18n.t('fixtures.live') }]
      .concat(days.map((k) => ({ k, label: HB.fmtDay(list.find((f) => HB.dayKey(f.kickoff) === k).kickoff) })));
    const leagueIds = [...new Set(list.map((f) => f.leagueId).filter(Boolean))];
    return `
      <div class="input-icon mb-16">${ui.icon('search', { size: 20 })}<input class="input" id="fx-search" placeholder="${esc(HB.i18n.t('fixtures.search'))}" value="${esc(fxFilter.q)}" /></div>
      <div class="chips" id="fx-days">
        ${dayChips.map((c) => `<button class="chip ${fxFilter.day === c.k ? 'active' : ''}" data-day="${c.k}">${c.label}</button>`).join('')}
      </div>
      <div class="chips" id="fx-leagues">
        <button class="chip ${fxFilter.league === 'all' ? 'active' : ''}" data-league="all">${HB.i18n.t('common.allLeagues')}</button>
        ${leagueIds.map((id) => { const l = HB.league(id); return `<button class="chip ${fxFilter.league === id ? 'active' : ''}" data-league="${id}"><span class="chip-emoji">${l.emoji}</span> ${esc(l.short)}</button>`; }).join('')}
      </div>
      <div id="fx-list" class="mt-16"></div>`;
  }

  function wireFixtures(root, all) {
    const listEl = root.querySelector('#fx-list');

    function matches() {
      let list = all.slice();
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
      const groups = {};
      list.forEach((f) => { const k = HB.dayKey(f.kickoff); (groups[k] = groups[k] || []).push(f); });
      listEl.innerHTML = Object.keys(groups).map((k) => `
        <div class="section-title" style="margin-top:18px"><h2>${HB.fmtDay(groups[k][0].kickoff)}</h2><span class="dim" style="font-size:13px">${groups[k].length} ${HB.i18n.plural(groups[k].length, 'matches')}</span></div>
        <div class="stack">
          ${groups[k].map((fx) => `<button class="card card-tap" style="text-align:left;width:100%" data-pick="${esc(fx.id)}">${ui.fixtureRow(fx)}<div class="row-between mt-16"><span class="dim" style="font-size:12.5px">${ui.icon('pin', { size: 13 })} ${esc(HB.i18n.d(fx.venue))}</span><span class="badge badge-gold">${HB.i18n.t('fixtures.pick')} ${ui.icon('arrowr', { size: 13 })}</span></div></button>`).join('')}
        </div>`).join('');
    }

    root.querySelector('#fx-days').addEventListener('click', (e) => {
      const b = e.target.closest('[data-day]'); if (!b) return;
      fxFilter.day = b.dataset.day;
      root.querySelectorAll('#fx-days .chip').forEach((c) => c.classList.toggle('active', c === b));
      renderList();
    });
    root.querySelector('#fx-leagues').addEventListener('click', (e) => {
      const b = e.target.closest('[data-league]'); if (!b) return;
      fxFilter.league = b.dataset.league;
      root.querySelectorAll('#fx-leagues .chip').forEach((c) => c.classList.toggle('active', c === b));
      renderList();
    });
    root.querySelector('#fx-search').addEventListener('input', (e) => { fxFilter.q = e.target.value; renderList(); });
    listEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-pick]'); if (!b) return;
      HB.session.draftFixtureId = b.dataset.pick; HB.saveSession();
      ui.haptic(12); go('#/create');
    });

    renderList();
  }

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
        const btn = view.querySelector('#cr-submit');
        btn.addEventListener('click', async () => {
          const nm = name.value.trim();
          if (!nm) { ui.toast(HB.i18n.t('create.errName'), 'err'); name.focus(); return; }
          const roomTitle = title.value.trim() || (HB.team(fx.homeId).short + ' – ' + HB.team(fx.awayId).short);
          btn.disabled = true;
          try {
            const { room } = await HB.api.createRoom({ title: roomTitle, fixtureId: fx.id, ownerName: nm });
            HB.session.me = nm; HB.session.draftFixtureId = null; HB.saveSession();
            ui.toast(HB.i18n.t('create.created'), 'ok');
            go('#/room/' + room.code);
          } catch (err) {
            btn.disabled = false;
            ui.toast(ui.apiMsg(err), 'err');
          }
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
        let room = null, seq = 0, timer = null;

        const errCard = (msg) => `<div class="card glass text-c" style="border-color:rgba(255,45,85,.35)"><span class="muted">${msg}</span></div>`;

        async function lookup() {
          code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
          const val = code.value;
          if (val.length < 4) { room = null; preview.innerHTML = ''; nameBox.style.display = 'none'; submit.disabled = true; return; }
          const my = ++seq;
          preview.innerHTML = ui.loading();
          nameBox.style.display = 'none'; submit.disabled = true;
          try {
            const r = await HB.api.getRoom(val);
            if (my !== seq) return;
            room = r;
            const fx = r.fixtureId ? HB.fixture(r.fixtureId) : null;
            preview.innerHTML = `<div class="card fade-up"><div class="row-between mb-16"><span class="h-eyebrow">${esc(r.title)}</span><span class="badge">${r.participants.length} ${HB.i18n.plural(r.participants.length, 'players')}</span></div>${fx ? ui.fixtureRow(fx) : ''}<div class="mt-16">${ui.avatarStack(r.participants.map((p) => p.name), 6)}</div></div>`;
            nameBox.style.display = ''; submit.disabled = false;
          } catch (err) {
            if (my !== seq) return;
            room = null; nameBox.style.display = 'none'; submit.disabled = true;
            preview.innerHTML = errCard(err && err.isNotFound ? HB.i18n.t('join.notFound', { code: esc(val) }) : esc(ui.apiMsg(err)));
          }
        }

        code.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(lookup, 350); });
        submit.addEventListener('click', async () => {
          if (!room) return;
          const nm = view.querySelector('#jn-name').value.trim();
          if (!nm) { ui.toast(HB.i18n.t('join.errName'), 'err'); return; }
          submit.disabled = true;
          try {
            await HB.api.joinRoom(room.code, nm);
            HB.session.me = nm; HB.session.pendingCode = null; HB.saveSession();
            ui.toast(HB.i18n.t('join.joined'), 'ok');
            go('#/room/' + room.code);
          } catch (err) { submit.disabled = false; ui.toast(ui.apiMsg(err), 'err'); }
        });
        if (preset) lookup();
      }
    };
  };

  /* ============================================================
     5. ДЕТАЛИ КОМНАТЫ (основной экран)
     ============================================================ */
  S.room = function (params) {
    const code = String(params.id || '').toUpperCase();
    return {
      html: `
      ${topbar(HB.i18n.t('state.loadingRoom'), { back: true, right: `<button class="icon-btn" data-action="share-room" aria-label="${esc(HB.i18n.t('common.share'))}">${ui.icon('share')}</button>` })}

      <div class="room-main">
      <div id="rm-hero">${ui.loading(HB.i18n.t('state.loadingRoom'))}</div>

      <div class="code-box mt-16 fade-up">
        <div>
          <div class="cb-label">${HB.i18n.t('join.codeTitle')}</div>
          <div class="cb-code">${esc(code)}</div>
        </div>
        <div class="cb-actions">
          <button class="icon-btn" data-action="copy-code" aria-label="${esc(HB.i18n.t('common.copy'))}">${ui.icon('copy', { size: 19 })}</button>
          <button class="icon-btn" data-action="share-room" aria-label="${esc(HB.i18n.t('common.share'))}">${ui.icon('share', { size: 19 })}</button>
        </div>
      </div>

      <div id="rm-progress"></div>
      <div id="rm-predictor" class="mt-16"></div>
      </div>

      <div class="room-side"><div id="rs-content"></div></div>
      `,
      onMount(view) { loadRoom(view, code); }
    };
  };

  async function loadRoom(view, code) {
    const heroEl = view.querySelector('#rm-hero');
    try {
      const room = await HB.api.getRoom(code);
      HB.currentRoom = room;
      const fx = room.fixtureId ? HB.fixture(room.fixtureId) : null;
      let standings = null;
      if (fx && fx.status !== 'upcoming') { try { standings = await HB.api.standings(code); } catch (_) {} }
      renderRoom(view, room, fx, standings);
    } catch (err) {
      const isNF = err && err.isNotFound;
      view.querySelector('#rm-progress').innerHTML = '';
      view.querySelector('#rm-predictor').innerHTML = '';
      view.querySelector('#rs-content').innerHTML = '';
      heroEl.innerHTML = ui.empty(isNF
        ? { icon: '🔍', title: HB.i18n.t('redirect.roomNotFound'), action: `<a class="btn" href="#/home" style="max-width:220px;margin:6px auto 0">${HB.i18n.t('redirect.toHome')}</a>` }
        : { icon: '⚠️', title: HB.i18n.t('state.errorTitle'), text: ui.apiMsg(err), action: `<button class="btn btn-ghost" data-retry style="max-width:220px;margin:6px auto 0">${ui.icon('refresh', { size: 18 })} ${HB.i18n.t('state.retry')}</button>` });
      const r = heroEl.querySelector('[data-retry]'); if (r) r.addEventListener('click', () => loadRoom(view, code));
      const h1 = view.querySelector('.topbar h1'); if (h1) h1.textContent = HB.i18n.t(isNF ? 'redirect.roomNotFound' : 'state.errorTitle');
    }
  }

  function renderRoom(view, room, fx, standings) {
    const h1 = view.querySelector('.topbar h1'); if (h1) h1.textContent = room.title;
    const tbBody = view.querySelector('.topbar > div');
    if (fx && tbBody && !tbBody.querySelector('.sub')) {
      const s = document.createElement('div'); s.className = 'sub'; s.textContent = HB.i18n.d(HB.league(fx.leagueId).name); tbBody.appendChild(s);
    }

    const ident = HB.api.identity(room.code) || {};
    const me = ident.name || HB.session.me;
    const meP = (ident.participantId && room.participants.find((p) => p.id === ident.participantId)) ||
                (me && room.participants.find((p) => p.name === me)) || null;
    const isCreator = !!ident.ownerId || (meP && meP.isCreator);
    const myPid = (meP && meP.id) || ident.participantId || null;
    // API не отдаёт флаг владельца — помечаем свою строку как хоста, если мы создатель
    if (meP && ident.created) meP.isCreator = true;

    const status = fx ? fx.status : 'upcoming';
    const locked = status !== 'upcoming';
    const reveal = status !== 'upcoming';
    const actual = (fx && locked) ? (fx.score || { home: 0, away: 0 }) : null;

    // hero
    const heroEl = view.querySelector('#rm-hero');
    if (fx) {
      let mid;
      if (status === 'live') mid = `<div class="hf-score" style="color:var(--live)">${actual.home}<span class="sep">:</span>${actual.away}</div><div class="hf-status"><span class="badge badge-live"><span class="dot"></span>${fx.minute || ''}'</span></div>`;
      else if (status === 'finished') mid = `<div class="hf-score">${actual.home}<span class="sep">:</span>${actual.away}</div><div class="hf-status"><span class="badge badge-done">${HB.i18n.t('badge.final')}</span></div>`;
      else mid = `<div class="hf-time">${HB.fmtTime(fx.kickoff)}</div><div class="hf-status"><span class="badge badge-soon">${HB.fmtDay(fx.kickoff)}</span></div>`;
      heroEl.innerHTML = ui.heroFixture(fx, mid);
    } else heroEl.innerHTML = '';

    // прогресс
    const readyCount = room.participants.filter((p) => p.prediction).length;
    view.querySelector('#rm-progress').innerHTML = (!locked && room.participants.length)
      ? `<div class="mt-16 fade-up d1"><div class="row-between mb-8" style="padding:0 2px"><span class="muted" style="font-size:13px">${HB.i18n.t('room.progress')}</span><span class="muted tnum" style="font-size:13px">${readyCount}/${room.participants.length}</span></div><div class="prog"><i style="width:${Math.round(readyCount / room.participants.length * 100)}%"></i></div></div>`
      : '';

    // предиктор
    const predEl = view.querySelector('#rm-predictor');
    if (!me || !meP) {
      predEl.innerHTML = `<div class="card glass text-c fade-up d1"><div style="font-size:34px">🙋</div><h3 style="font-family:var(--display);font-size:17px;margin:6px 0 4px">${HB.i18n.t('room.joinTitle')}</h3><p class="muted" style="font-size:13.5px;margin-bottom:14px">${HB.i18n.t('room.joinText')}</p><button class="btn btn-ghost" data-action="join-here">${ui.icon('plus', { size: 20 })} ${HB.i18n.t('room.joinBtn')}</button></div>`;
    } else if (!locked && fx) {
      const d = draft(room.code, meP.prediction);
      predEl.innerHTML = predictorBlock(fx, d, meP.prediction);
      predEl.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => {
        const side = b.dataset.step, dir = +b.dataset.dir;
        d[side] = Math.max(0, Math.min(20, d[side] + dir)); updateStepperUI(predEl, d); ui.haptic(6);
      }));
      const saveBtn = predEl.querySelector('#save-pred');
      if (saveBtn) saveBtn.addEventListener('click', async () => {
        if (!myPid) { ui.toast(HB.i18n.t('state.errorTitle'), 'err'); return; }
        saveBtn.disabled = true;
        try {
          await HB.api.setPrediction(room.code, myPid, d.home, d.away);
          ui.haptic(14); ui.toast(HB.i18n.t('room.saved'), 'ok'); HB.router.render();
        } catch (err) { saveBtn.disabled = false; ui.toast(ui.apiMsg(err), 'err'); }
      });
    } else {
      const pts = HB.scoreFor(meP.prediction, actual);
      predEl.innerHTML = `<div class="card fade-up d1"><div class="row-between"><div><div class="h-eyebrow">${HB.i18n.t('room.yourPrediction')}</div><div style="font-family:var(--display);font-weight:800;font-size:26px;margin-top:6px">${meP.prediction ? meP.prediction.home + ' : ' + meP.prediction.away : '— : —'}</div></div><div class="rank-pts"><div class="v">${pts}</div><div class="u">${HB.cur()}</div></div></div></div>`;
    }

    // боковая колонка: игроки / таблица
    const ranking = reveal ? ((standings && standings.length) ? standings : HB.ranking(room, actual)) : null;
    view.querySelector('#rs-content').innerHTML = `
      <div class="section-title fade-up d2">
        <h2>${reveal ? HB.i18n.t('room.table') : HB.i18n.t('room.players')} · ${room.participants.length}</h2>
        ${isCreator ? `<button class="link" data-action="add-player">${HB.i18n.t('room.addPlayer')}</button>` : ''}
      </div>
      <div class="plist fade-up d2">
        ${reveal ? ranking.map((r, i) => rankRow(r, i, actual, me)).join('') : room.participants.map((p) => participantRow(p, me)).join('')}
      </div>
      ${status === 'live' ? `<div class="mt-24 fade-up d3"><a class="btn btn-gold" href="#/results/${room.code}">${ui.icon('trophy', { size: 20 })} ${HB.i18n.t('room.liveBoard')}</a></div>` : ''}
      ${status === 'finished' ? `<div class="mt-24 fade-up d3"><a class="btn btn-gold" href="#/results/${room.code}">${ui.icon('trophy', { size: 20 })} ${HB.i18n.t('room.seeResults')}</a></div>` : ''}
      ${status === 'upcoming' ? `<div class="card glass mt-24 text-c fade-up d3"><span class="muted" style="font-size:13px">${ui.icon('lock', { size: 15 })} ${HB.i18n.t('room.lockHint')}</span></div>` : ''}
    `;
  }

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
    const code = String(params.id || '').toUpperCase();
    return {
      html: `
      ${topbar(HB.i18n.t('state.loadingStandings'), { back: true, right: `<button class="icon-btn" data-action="share-results" aria-label="${esc(HB.i18n.t('common.share'))}">${ui.icon('share')}</button>` })}
      <div class="res-main"><div id="res-main">${ui.loading(HB.i18n.t('state.loadingStandings'))}</div></div>
      <div class="res-side"><div id="res-side"></div></div>
      `,
      onMount(view) { loadResults(view, code); }
    };
  };

  async function loadResults(view, code) {
    try {
      const room = await HB.api.getRoom(code);
      HB.currentRoom = room;
      const fx = room.fixtureId ? HB.fixture(room.fixtureId) : null;
      const actual = (fx && fx.score) ? fx.score : { home: 0, away: 0 };
      let ranking;
      try { ranking = await HB.api.standings(code); } catch (_) { ranking = HB.ranking(room, actual); }
      const isFinal = fx ? fx.status === 'finished' : true;
      renderResults(view, {
        title: room.title, backTo: '#/room/' + code, fx, actual, ranking, isFinal,
        live: fx ? fx.status === 'live' : false, minute: fx && fx.minute,
        shareText: HB.i18n.t('share.results', { title: room.title })
      });
      if (isFinal) setTimeout(() => ui.confetti(), 250);
    } catch (err) {
      const isNF = err && err.isNotFound;
      view.querySelector('#res-side').innerHTML = '';
      view.querySelector('#res-main').innerHTML = ui.empty(isNF
        ? { icon: '🔍', title: HB.i18n.t('redirect.roomNotFound'), action: `<a class="btn" href="#/home" style="max-width:220px;margin:6px auto 0">${HB.i18n.t('redirect.toHome')}</a>` }
        : { icon: '⚠️', title: HB.i18n.t('state.errorTitle'), text: ui.apiMsg(err), action: `<button class="btn btn-ghost" data-retry style="max-width:220px;margin:6px auto 0">${ui.icon('refresh', { size: 18 })} ${HB.i18n.t('state.retry')}</button>` });
      const r = view.querySelector('[data-retry]'); if (r) r.addEventListener('click', () => loadResults(view, code));
      const h1 = view.querySelector('.topbar h1'); if (h1) h1.textContent = HB.i18n.t(isNF ? 'redirect.roomNotFound' : 'state.errorTitle');
    }
  }

  function renderResults(view, o) {
    const { fx, actual, ranking, isFinal } = o;
    const winner = ranking[0] || { points: 0 };
    const winnerTie = ranking.filter((r) => r.points === winner.points && r.points > 0);

    const h1 = view.querySelector('.topbar h1'); if (h1) h1.textContent = isFinal ? HB.i18n.t('results.title') : HB.i18n.t('results.liveTitle');
    const tbBody = view.querySelector('.topbar > div');
    if (tbBody && !tbBody.querySelector('.sub')) { const s = document.createElement('div'); s.className = 'sub'; s.textContent = o.title; tbBody.appendChild(s); }
    const shareBtn = view.querySelector('[data-action="share-results"]'); if (shareBtn) shareBtn.dataset.text = o.shareText;

    let mid;
    if (o.live) mid = `<div class="hf-score" style="color:var(--live)">${actual.home}<span class="sep">:</span>${actual.away}</div><div class="hf-status"><span class="badge badge-live"><span class="dot"></span>${o.minute || ''}'</span></div>`;
    else mid = `<div class="hf-score">${actual.home}<span class="sep">:</span>${actual.away}</div><div class="hf-status"><span class="badge badge-done">${HB.i18n.t('badge.final')}</span></div>`;

    const winnerBlock = (winner && winner.points > 0)
      ? `<div class="card fade-up d1" style="background:radial-gradient(120% 90% at 50% 0%, rgba(255,194,51,.14), transparent 60%);border-color:rgba(255,194,51,.3)">
          <div class="trophy-wrap"><div class="trophy">🏆</div>
            <div class="winner-name">${esc(winnerTie.length > 1 ? HB.i18n.t('results.draw') : winner.name)}</div>
            <div class="winner-sub">${winnerTie.length > 1 ? winnerTie.map((w) => esc(w.name)).join(HB.i18n.t('results.tieJoin')) + ' ' + HB.i18n.t('results.tieSuffix') : HB.i18n.t('results.bestPred') + ' ' + (winner.prediction ? winner.prediction.home + ':' + winner.prediction.away : '—') + ' · ' + winner.points + ' ' + HB.cur()}</div>
          </div>
        </div>`
      : `<div class="card glass text-c fade-up d1"><div style="font-size:40px">🤷</div><div class="winner-sub mt-8">${isFinal ? HB.i18n.t('results.nobody') : HB.i18n.t('results.noPoints')}</div></div>`;

    view.querySelector('#res-main').innerHTML = `
      ${fx ? ui.heroFixture(fx, mid) : ''}
      <div class="mt-16">${winnerBlock}</div>
      <div class="card glass mt-24 fade-up d3">
        <div class="h-eyebrow mb-8">${HB.i18n.t('results.scoringTitle')}</div>
        ${HB.data.scoring.rules.map((rule) => `<div class="row-between" style="padding:7px 0;border-bottom:1px solid var(--stroke)"><span class="muted" style="font-size:13.5px"><b style="color:var(--text)">${esc(HB.i18n.d(rule.label))}</b> · ${esc(HB.i18n.d(rule.desc))}</span><span class="badge badge-gold">+${rule.points}</span></div>`).join('')}
      </div>
      ${o.live ? `<div class="card glass mt-16 text-c fade-up d3"><span class="muted" style="font-size:13px">${ui.icon('flame', { size: 15 })} ${HB.i18n.t('results.liveHint')}</span></div>` : ''}
    `;

    view.querySelector('#res-side').innerHTML = `
      <div class="section-title fade-up d2"><h2>${isFinal ? HB.i18n.t('results.finalTable') : HB.i18n.t('results.leadingNow')}</h2><span class="dim" style="font-size:13px">${ranking.length} ${HB.i18n.plural(ranking.length, 'players')}</span></div>
      <div class="plist fade-up d2">
        ${ranking.map((r, i) => resultRow(r, i, actual)).join('')}
      </div>
      <div class="mt-16 fade-up d3"><a class="btn btn-ghost" href="${o.backTo}">${ui.icon('back', { size: 20 })} ${HB.i18n.t('results.backToRoom')}</a></div>
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
     Помощники
     ============================================================ */
  function redirectNote(msg, hash, btn) {
    return `${topbar('', { back: true })}<div class="empty"><div class="e-ic">🤔</div><h3>${esc(msg)}</h3><a class="btn" href="${hash}" style="max-width:240px;margin:10px auto 0">${esc(btn)}</a></div>`;
  }
})();
