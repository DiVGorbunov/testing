/* ============================================================
   HighBet — store: загрузка данных, состояние, очки, помощники
   ============================================================ */
(function () {
  'use strict';

  const LS_KEY = 'highbet_state_v1';
  const SESSION_KEY = 'highbet_session_v1';

  const HB = (window.HB = window.HB || {});

  // ---- Состояние приложения ----
  HB.data = null;          // данные из settings.json (+ пользовательские комнаты)
  HB.session = {           // сессия пользователя (кто я, черновики)
    me: null,              // имя текущего игрока
    draftFixtureId: null,  // выбранный матч при создании
    pendingCode: null      // код для экрана входа
  };

  // ---- Загрузка ----
  HB.load = async function () {
    const res = await fetch('settings.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const base = await res.json();

    // подмешиваем сохранённые пользователем комнаты и правки
    const saved = readLS();
    if (saved) {
      // пользовательские комнаты добавляем/перезаписываем по id
      const byId = new Map(base.rooms.map((r) => [r.id, r]));
      (saved.rooms || []).forEach((r) => byId.set(r.id, r));
      base.rooms = Array.from(byId.values());
      base.history = saved.history && saved.history.length ? mergeHistory(base.history, saved.history) : base.history;
    }
    HB.data = base;

    const sess = readSession();
    if (sess) HB.session = Object.assign(HB.session, sess);
    return base;
  };

  function mergeHistory(base, extra) {
    const byId = new Map(base.map((h) => [h.id, h]));
    extra.forEach((h) => byId.set(h.id, h));
    return Array.from(byId.values());
  }

  // ---- Персистентность ----
  function readLS() {
    try { return JSON.parse(localStorage.getItem(LS_KEY)); } catch (e) { return null; }
  }
  HB.persist = function () {
    // сохраняем только пользовательские комнаты (те, что начинаются с user-) + всю историю
    try {
      const userRooms = HB.data.rooms.filter((r) => r._user);
      localStorage.setItem(LS_KEY, JSON.stringify({ rooms: userRooms, history: HB.data.history.filter((h) => h._user) }));
    } catch (e) {/* приватный режим */}
  };
  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  HB.saveSession = function () {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(HB.session)); } catch (e) {}
  };

  // ---- Аксессоры ----
  HB.team = (id) => HB.data.teams.find((t) => t.id === id) || { name: '—', short: '??', color: '#555', color2: '#fff', city: '' };
  HB.league = (id) => HB.data.leagues.find((l) => l.id === id) || { name: '—', short: '?', emoji: '⚽', color: '#555' };
  HB.fixture = (id) => HB.data.fixtures.find((f) => f.id === id);
  HB.room = (id) => HB.data.rooms.find((r) => r.id === id);
  HB.roomByCode = (code) => HB.data.rooms.find((r) => r.code.toUpperCase() === String(code || '').toUpperCase());
  HB.historyItem = (id) => HB.data.history.find((h) => h.id === id);

  // ---- Действия ----
  HB.createRoom = function ({ title, creator, fixtureId }) {
    const id = 'user-' + Date.now().toString(36);
    const room = {
      id,
      _user: true,
      code: genCode(),
      title: title || 'Моя игра',
      creator,
      fixtureId,
      createdAt: new Date().toISOString(),
      participants: [{ name: creator, isCreator: true, prediction: null }]
    };
    HB.data.rooms.unshift(room);
    HB.session.me = creator;
    HB.persist();
    HB.saveSession();
    return room;
  };

  HB.joinRoom = function (room, name) {
    if (!room.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) {
      room.participants.push({ name, prediction: null });
    }
    HB.session.me = name;
    if (room._user) HB.persist();
    HB.saveSession();
    return room;
  };

  HB.addParticipant = function (room, name) {
    if (room.participants.some((p) => p.name.toLowerCase() === name.toLowerCase())) return false;
    room.participants.push({ name, prediction: null });
    if (room._user) HB.persist();
    return true;
  };

  HB.setPrediction = function (room, name, home, away) {
    const p = room.participants.find((x) => x.name === name);
    if (p) p.prediction = { home, away };
    if (room._user) HB.persist();
  };

  // ---- Очки и рейтинг ----
  HB.scoreFor = function (prediction, actual) {
    const s = HB.data.scoring;
    if (!prediction || !actual) return 0;
    const ph = prediction.home, pa = prediction.away, ah = actual.home, aa = actual.away;
    if (ph === ah && pa === aa) return s.exactScore;            // точный счёт
    const po = Math.sign(ph - pa), ao = Math.sign(ah - aa);
    if (po === ao && (ph - pa) === (ah - aa)) return s.goalDifference; // исход + разница
    if (po === ao) return s.correctOutcome;                    // только исход
    return s.miss;
  };

  HB.closeness = function (prediction, actual) {
    if (!prediction || !actual) return Infinity;
    return Math.abs(prediction.home - actual.home) + Math.abs(prediction.away - actual.away);
  };

  // строит отсортированный рейтинг по фактическому/живому счёту
  HB.ranking = function (room, actualScore) {
    const rows = room.participants.map((p) => ({
      name: p.name,
      isCreator: p.isCreator,
      prediction: p.prediction,
      points: HB.scoreFor(p.prediction, actualScore),
      close: HB.closeness(p.prediction, actualScore)
    }));
    rows.sort((a, b) => b.points - a.points || a.close - b.close || a.name.localeCompare(b.name));
    return rows;
  };

  // ---- Помощники формата ----
  const MONTHS = ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];
  const WDAYS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

  HB.fmtTime = (iso) => {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  HB.fmtDate = (iso) => {
    const d = new Date(iso);
    return d.getDate() + ' ' + MONTHS[d.getMonth()];
  };
  HB.fmtDay = (iso) => {
    const d = new Date(iso), today = new Date();
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.round((dd - t0) / 86400000);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Завтра';
    if (diff === -1) return 'Вчера';
    return WDAYS[d.getDay()] + ', ' + d.getDate() + ' ' + MONTHS[d.getMonth()];
  };
  HB.dayKey = (iso) => { const d = new Date(iso); return d.getFullYear() + '-' + d.getMonth() + '-' + d.getDate(); };

  HB.statusOf = (fx) => fx.status; // 'upcoming' | 'live' | 'finished'

  function genCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  HB.genCode = genCode;

  // инициалы для аватара
  HB.initials = (name) => (name || '?').trim().slice(0, 2).toUpperCase();

  // стабильный цвет аватара по имени
  HB.avatarColors = function (name) {
    const palette = [
      ['#00E676', '#00B0FF'], ['#8B5CF6', '#EC4899'], ['#FFC233', '#FF6F00'],
      ['#FF2D55', '#FF9500'], ['#3B9CFF', '#00E5FF'], ['#1DE9B6', '#00BFA5'],
      ['#F472B6', '#A855F7'], ['#FBBF24', '#F59E0B']
    ];
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    return palette[h % palette.length];
  };
})();
