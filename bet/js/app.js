/* ============================================================
   ScorePick — app: роутер, навигация, действия, запуск
   ============================================================ */
(function () {
  'use strict';
  const HB = (window.HB = window.HB || {});
  const ui = HB.ui;
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  const boot = document.getElementById('boot');
  const bootMsg = document.getElementById('boot-msg');

  // маршруты: имя -> { tab, flow }
  const TAB_OF = { home: 'home', fixtures: 'fixtures' };
  const FLOW = { create: true, join: true }; // экраны-флоу: прячем таббар

  const router = (HB.router = { current: { name: 'home', params: {} } });

  function parse() {
    let h = location.hash.replace(/^#\/?/, '');
    if (!h) return { name: 'home', params: {} };
    const parts = h.split('/');
    const name = parts[0];
    if ((name === 'room' || name === 'results') && parts[1]) {
      return { name, params: { id: decodeURIComponent(parts[1]) } };
    }
    return { name, params: {} };
  }

  router.render = function () {
    const route = parse();
    const factory = HB.screens[route.name] || HB.screens.home;
    if (!HB.screens[route.name]) route.name = 'home';
    router.current = route;

    let screen;
    try {
      screen = factory(route.params);
    } catch (err) {
      console.error(err);
      screen = { html: `<div class="empty"><div class="e-ic">⚠️</div><h3>${HB.i18n.t('boot.errorTitle')}</h3><p>${esc(String(err.message || err))}</p><a class="btn" href="#/home" style="max-width:220px;margin:0 auto">${HB.i18n.t('boot.toHome')}</a></div>` };
    }

    view.classList.remove('view');
    void view.offsetWidth;          // перезапуск анимации входа
    view.className = 'view view-' + route.name + (FLOW[route.name] ? ' no-tab' : '');
    view.innerHTML = screen.html;
    if (screen.onMount) screen.onMount(view);

    // таббар
    tabbar.style.display = FLOW[route.name] ? 'none' : '';
    const activeTab = TAB_OF[route.name] || (route.name === 'create' ? 'fixtures' : null);
    tabbar.querySelectorAll('.tab').forEach((t) => t.classList.toggle('active', t.dataset.tab === activeTab));

    view.scrollTop = 0;
    window.scrollTo(0, 0);
  };

  // ---------- Глобальные действия (делегирование) ----------
  document.addEventListener('click', function (e) {
    const t = e.target.closest('[data-action]');
    if (!t) return;
    const action = t.dataset.action;

    switch (action) {
      case 'back': {
        e.preventDefault();
        if (history.length > 1) history.back();
        else location.hash = '#/home';
        break;
      }
      case 'create-game':
      case 'quick-create':
        e.preventDefault(); location.hash = '#/fixtures'; break;

      case 'lang':
        e.preventDefault(); openLangPicker(); break;

      case 'join-code': {
        const inp = document.getElementById('home-code');
        tryJoinByCode(inp ? inp.value : ''); break;
      }
      case 'copy-code': {
        const code = (HB.currentRoom && HB.currentRoom.code) || router.current.params.id;
        if (code) ui.copy(code);
        break;
      }
      case 'share-room': {
        const room = HB.currentRoom;
        const code = (room && room.code) || router.current.params.id;
        const url = location.origin + location.pathname + '#/join';
        ui.share({ title: 'ScorePick', text: HB.i18n.t('share.invite', { title: (room && room.title) || 'ScorePick', code }), url });
        break;
      }
      case 'share-results': {
        ui.share({ title: 'ScorePick', text: (t.dataset.text || HB.i18n.t('share.resultsFallback')) + ' ⚽🏆', url: location.href });
        break;
      }
      case 'add-player': openAddPlayer(); break;
      case 'join-here': openJoinHere(); break;
      case 'close-sheet': ui.closeSheet(); break;
    }
  });

  function tryJoinByCode(code) {
    code = String(code || '').toUpperCase().trim();
    if (code.length < 4) { ui.toast(HB.i18n.t('err.codeLen'), 'err'); return; }
    // валидацию комнаты делает экран входа (async GET /rooms/{code})
    HB.session.pendingCode = code; HB.saveSession();
    location.hash = '#/join';
  }

  // ---------- Шторка: выбор языка ----------
  function openLangPicker() {
    const cur = HB.i18n.lang;
    const opts = HB.i18n.available.map((l) => `
      <button class="lang-opt ${l.code === cur ? 'active' : ''}" data-lang="${l.code}">
        <span class="lang-flag" aria-hidden="true">${l.flag}</span>
        <span class="lang-name">${l.native}</span>
        ${l.code === cur ? `<span class="lang-check">${ui.icon('check', { size: 20 })}</span>` : ''}
      </button>`).join('');
    ui.sheet(`
      <h3>${HB.i18n.t('lang.title')}</h3>
      <p class="muted mb-16" style="font-size:13.5px">${HB.i18n.t('lang.subtitle')}</p>
      <div class="lang-list">${opts}</div>
    `);
    const root = document.getElementById('sheet-root');
    root.querySelectorAll('[data-lang]').forEach((b) => b.addEventListener('click', () => HB.i18n.set(b.dataset.lang)));
  }

  // ---------- Шторка: добавить игрока (хост) ----------
  function openAddPlayer() {
    const room = HB.currentRoom;
    const code = (room && room.code) || router.current.params.id;
    if (!code) return;
    const taken = (room ? room.participants : []).map((p) => p.name.toLowerCase());
    const suggestions = (HB.data.players || []).filter((n) => !taken.includes(n.toLowerCase())).slice(0, 6);
    ui.sheet(`
      <h3>${HB.i18n.t('sheet.addTitle')}</h3>
      <p class="muted mb-16" style="font-size:13.5px">${HB.i18n.t('sheet.addText')}</p>
      <div class="field"><div class="input-icon">${ui.icon('user', { size: 20 })}<input class="input" id="ap-name" maxlength="20" placeholder="${esc(HB.i18n.t('sheet.playerName'))}" /></div></div>
      ${suggestions.length ? `<div class="dim mb-8" style="font-size:12px">${HB.i18n.t('sheet.quickPick')}</div><div class="chips" style="flex-wrap:wrap;overflow:visible">${suggestions.map((n) => `<button class="chip" data-suggest="${esc(n)}">${esc(n)}</button>`).join('')}</div>` : ''}
      <button class="btn mt-16" id="ap-add">${ui.icon('plus', { size: 20 })} ${HB.i18n.t('sheet.addToRoom')}</button>
    `);
    const root = document.getElementById('sheet-root');
    const input = root.querySelector('#ap-name');
    const btn = root.querySelector('#ap-add');
    root.querySelectorAll('[data-suggest]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.suggest; }));
    btn.addEventListener('click', async () => {
      const nm = input.value.trim();
      if (!nm) { ui.toast(HB.i18n.t('sheet.enterName'), 'err'); return; }
      if (taken.includes(nm.toLowerCase())) { ui.toast(HB.i18n.t('sheet.existing'), 'err'); return; }
      btn.disabled = true;
      try {
        await HB.api.addParticipant(code, nm);
        ui.closeSheet(); ui.toast(HB.i18n.t('sheet.addedToGame', { name: nm }), 'ok'); HB.router.render();
      } catch (err) { btn.disabled = false; ui.toast(ui.apiMsg(err), 'err'); }
    });
  }

  // ---------- Шторка: присоединиться самому ----------
  function openJoinHere() {
    const room = HB.currentRoom;
    const code = (room && room.code) || router.current.params.id;
    if (!code) return;
    ui.sheet(`
      <h3>${HB.i18n.t('sheet.joinTitle')}</h3>
      <p class="muted mb-16" style="font-size:13.5px">${HB.i18n.t('sheet.joinText')}</p>
      <div class="field"><div class="input-icon">${ui.icon('user', { size: 20 })}<input class="input" id="jh-name" maxlength="20" placeholder="${esc(HB.i18n.t('sheet.joinAsk'))}" value="${esc(HB.session.me || '')}" /></div></div>
      <button class="btn" id="jh-add">${ui.icon('check', { size: 20 })} ${HB.i18n.t('sheet.joinBtn')}</button>
    `);
    const root = document.getElementById('sheet-root');
    const btn = root.querySelector('#jh-add');
    btn.addEventListener('click', async () => {
      const nm = root.querySelector('#jh-name').value.trim();
      if (!nm) { ui.toast(HB.i18n.t('sheet.enterName'), 'err'); return; }
      btn.disabled = true;
      try {
        await HB.api.joinRoom(code, nm);
        HB.session.me = nm; HB.saveSession();
        ui.closeSheet(); ui.toast(HB.i18n.t('join.joined'), 'ok'); HB.router.render();
      } catch (err) { btn.disabled = false; ui.toast(ui.apiMsg(err), 'err'); }
    });
  }

  // ---------- Запуск ----------
  window.addEventListener('hashchange', () => { ui.closeSheet(); router.render(); });

  async function start() {
    HB.i18n.init();   // выбрать язык и локализовать статический каркас (до загрузки данных)
    try {
      await HB.load();
      router.render();
      requestAnimationFrame(() => boot.classList.add('hide'));
      setTimeout(() => { boot.style.display = 'none'; }, 600);
    } catch (err) {
      console.error(err);
      boot.classList.add('error');
      document.querySelector('.boot-ball').textContent = '⚠️';
      const isFile = location.protocol === 'file:';
      bootMsg.dataset.locked = '1';   // не перезаписывать применением языка
      bootMsg.innerHTML = isFile
        ? HB.i18n.t('boot.fileError')
        : HB.i18n.t('boot.loadError', { msg: esc(String(err.message || err)) });
    }
  }

  start();
})();
