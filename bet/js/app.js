/* ============================================================
   HighBet — app: роутер, навигация, действия, запуск
   ============================================================ */
(function () {
  'use strict';
  const HB = (window.HB = window.HB || {});
  const ui = HB.ui;

  const view = document.getElementById('view');
  const tabbar = document.getElementById('tabbar');
  const boot = document.getElementById('boot');
  const bootMsg = document.getElementById('boot-msg');

  // маршруты: имя -> { tab, flow }
  const TAB_OF = { home: 'home', fixtures: 'fixtures', rooms: 'rooms', history: 'history' };
  const FLOW = { create: true, join: true }; // экраны-флоу: прячем таббар

  const router = (HB.router = { current: { name: 'home', params: {} } });

  function parse() {
    let h = location.hash.replace(/^#\/?/, '');
    if (!h) return { name: 'home', params: {} };
    const parts = h.split('/');
    const name = parts[0];
    if ((name === 'room' || name === 'results' || name === 'recap') && parts[1]) {
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
      screen = { html: `<div class="empty"><div class="e-ic">⚠️</div><h3>Что-то пошло не так</h3><p>${String(err.message || err)}</p><a class="btn" href="#/home" style="max-width:220px;margin:0 auto">На главную</a></div>` };
    }

    view.classList.remove('view');
    void view.offsetWidth;          // перезапуск анимации входа
    view.className = 'view' + (FLOW[route.name] ? ' no-tab' : '');
    view.innerHTML = screen.html;
    if (screen.onMount) screen.onMount(view);

    // таббар
    tabbar.style.display = FLOW[route.name] ? 'none' : '';
    const activeTab = TAB_OF[route.name] || (route.name === 'room' || route.name === 'results' ? 'rooms' : route.name === 'recap' ? 'history' : route.name === 'create' ? 'fixtures' : null);
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

      case 'join-code': {
        const inp = document.getElementById('home-code');
        tryJoinByCode(inp ? inp.value : ''); break;
      }
      case 'join-code-rooms': {
        const inp = document.getElementById('rooms-code');
        tryJoinByCode(inp ? inp.value : ''); break;
      }
      case 'copy-code': {
        const room = HB.room(router.current.params.id);
        if (room) ui.copy(room.code);
        break;
      }
      case 'share-room': {
        const room = HB.room(router.current.params.id);
        if (room) {
          const url = location.origin + location.pathname + '#/join';
          ui.share({ title: 'HighBet', text: `Заходи в игру «${room.title}» — код ${room.code}`, url });
        }
        break;
      }
      case 'share-results': {
        ui.share({ title: 'HighBet', text: (t.dataset.text || 'Результаты в HighBet') + ' ⚽🏆', url: location.href });
        break;
      }
      case 'add-player': openAddPlayer(); break;
      case 'join-here': openJoinHere(); break;
      case 'close-sheet': ui.closeSheet(); break;
    }
  });

  function tryJoinByCode(code) {
    code = String(code || '').toUpperCase().trim();
    if (code.length !== 6) { ui.toast('Введи код из 6 символов', 'err'); return; }
    const room = HB.roomByCode(code);
    if (!room) { ui.toast('Комната не найдена', 'err'); return; }
    HB.session.pendingCode = code; HB.saveSession();
    location.hash = '#/join';
  }

  // ---------- Шторка: добавить игрока (хост) ----------
  function openAddPlayer() {
    const room = HB.room(router.current.params.id);
    if (!room) return;
    const suggestions = HB.data.players.filter((n) => !room.participants.some((p) => p.name.toLowerCase() === n.toLowerCase())).slice(0, 6);
    ui.sheet(`
      <h3>Добавить игрока</h3>
      <p class="muted mb-16" style="font-size:13.5px">Добавь друга вручную — он сможет сделать прогноз</p>
      <div class="field"><div class="input-icon">${ui.icon('user', { size: 20 })}<input class="input" id="ap-name" maxlength="20" placeholder="Имя игрока" /></div></div>
      ${suggestions.length ? `<div class="dim mb-8" style="font-size:12px">Быстрый выбор</div><div class="chips" style="flex-wrap:wrap;overflow:visible">${suggestions.map((n) => `<button class="chip" data-suggest="${n}">${n}</button>`).join('')}</div>` : ''}
      <button class="btn mt-16" id="ap-add">${ui.icon('plus', { size: 20 })} Добавить в комнату</button>
    `);
    const root = document.getElementById('sheet-root');
    const input = root.querySelector('#ap-name');
    root.querySelectorAll('[data-suggest]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.suggest; }));
    root.querySelector('#ap-add').addEventListener('click', () => {
      const nm = input.value.trim();
      if (!nm) { ui.toast('Введи имя', 'err'); return; }
      if (HB.addParticipant(room, nm)) { ui.closeSheet(); ui.toast(nm + ' в игре', 'ok'); HB.router.render(); }
      else ui.toast('Такой игрок уже есть', 'err');
    });
  }

  // ---------- Шторка: присоединиться самому ----------
  function openJoinHere() {
    const room = HB.room(router.current.params.id);
    if (!room) return;
    ui.sheet(`
      <h3>Сыграть в этой комнате</h3>
      <p class="muted mb-16" style="font-size:13.5px">Введи имя — и делай прогноз на матч</p>
      <div class="field"><div class="input-icon">${ui.icon('user', { size: 20 })}<input class="input" id="jh-name" maxlength="20" placeholder="Как тебя зовут?" value="${HB.session.me || ''}" /></div></div>
      <button class="btn" id="jh-add">${ui.icon('check', { size: 20 })} Присоединиться</button>
    `);
    const root = document.getElementById('sheet-root');
    root.querySelector('#jh-add').addEventListener('click', () => {
      const nm = root.querySelector('#jh-name').value.trim();
      if (!nm) { ui.toast('Введи имя', 'err'); return; }
      HB.joinRoom(room, nm);
      ui.closeSheet(); ui.toast('Ты в игре! 🎉', 'ok'); HB.router.render();
    });
  }

  // ---------- Запуск ----------
  window.addEventListener('hashchange', () => { ui.closeSheet(); router.render(); });

  async function start() {
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
      bootMsg.innerHTML = isFile
        ? `Не удалось загрузить <code>settings.json</code> — браузер блокирует чтение файлов с диска.<br><br>Запусти локальный сервер в папке проекта:<br><br><code>python -m http.server 8080</code><br>и открой <code>http://localhost:8080</code>`
        : `Не удалось загрузить данные: ${String(err.message || err)}<br><br>Проверь, что рядом лежит <code>settings.json</code>.`;
    }
  }

  start();
})();
