/* ============================================================
   ScorePick — store: загрузка данных, состояние, очки, помощники
   ============================================================ */
(function () {
  'use strict';

  const SESSION_KEY = 'scorepick_session_v1';

  const HB = (window.HB = window.HB || {});

  // ---- Состояние приложения ----
  HB.data = null;          // статический конфиг (settings.json) + каталоги из API
  HB.session = {           // сессия пользователя (кто я, черновики)
    me: null,              // имя текущего игрока
    draftFixtureId: null,  // выбранный матч при создании
    pendingCode: null      // код для экрана входа
  };

  // ---- Загрузка ----
  // settings.json теперь — ТОЛЬКО статический конфиг: app, scoring, players и
  // teams/leagues как каталог-фолбэк. Матчи и комнаты приходят из реального
  // API (js/api.js); каталоги команд/лиг/матчей пополняются нормализаторами API.
  HB.load = async function () {
    const res = await fetch('settings.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('HTTP ' + res.status);
    const base = await res.json();
    base.fixtures = [];   // наполняется из API
    base.rooms = [];      // комнаты живут на бэкенде, тянутся по коду
    HB.data = base;

    const sess = readSession();
    if (sess) HB.session = Object.assign(HB.session, sess);
    return base;
  };

  // ---- Сессия ----
  function readSession() {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY)); } catch (e) { return null; }
  }
  HB.saveSession = function () {
    try { localStorage.setItem(SESSION_KEY, JSON.stringify(HB.session)); } catch (e) {}
  };

  // ---- Аксессоры (каталоги пополняются нормализаторами API) ----
  HB.team = (id) => HB.data.teams.find((t) => t.id === id) || { name: '—', short: '??', color: '#555', color2: '#fff', city: '', logo: null };
  HB.league = (id) => HB.data.leagues.find((l) => l.id === id) || { name: '—', short: '?', emoji: '⚽', color: '#555' };
  HB.fixture = (id) => HB.data.fixtures.find((f) => f.id === id);

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

  // ---- Помощники формата (локализованы через HB.i18n.cal) ----
  HB.fmtTime = (iso) => {
    const d = new Date(iso);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };
  HB.fmtDate = (iso) => {
    const d = new Date(iso);
    return d.getDate() + ' ' + HB.i18n.cal().months[d.getMonth()];
  };
  HB.fmtDay = (iso) => {
    const cal = HB.i18n.cal();
    const d = new Date(iso), today = new Date();
    const dd = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diff = Math.round((dd - t0) / 86400000);
    if (diff === 0) return cal.today;
    if (diff === 1) return cal.tomorrow;
    if (diff === -1) return cal.yesterday;
    return cal.wdays[d.getDay()] + ', ' + d.getDate() + ' ' + cal.months[d.getMonth()];
  };
  // локализованная валюта (источник — settings.json app.currency)
  HB.cur = () => HB.i18n.d(HB.data.app.currency);
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
