/* ============================================================
   ScorePick — mock: ТЕСТОВЫЙ режим (локальные данные, без бэкенда)

   Переопределяет HB.api полной локальной реализацией с той же
   сигнатурой: матчи берутся из встроенного списка, комнаты живут
   в localStorage. Нужен, пока реальный бэкенд недоступен.

   Переключение:
     ?mock=1  — принудительно включить (запоминается)
     ?mock=0  — принудительно выключить → реальный API
   По умолчанию (DEFAULT_MOCK) сейчас ВКЛЮЧЁН.
   ============================================================ */
(function () {
  'use strict';
  const HB = window.HB;
  if (!HB || !HB.api) return;
  const real = HB.api;                       // реальный клиент — переиспользуем helpers
  const DEFAULT_MOCK = true;                 // бэкенд недоступен → тестовые данные по умолчанию
  const FLAG_KEY = 'scorepick_mock_v1';
  const ROOMS_KEY = 'scorepick_mock_rooms_v1';

  function enabled() {
    try {
      const u = new URLSearchParams(location.search);
      if (u.has('mock')) {
        const on = u.get('mock') !== '0' && u.get('mock') !== 'false';
        localStorage.setItem(FLAG_KEY, on ? '1' : '0');
        return on;
      }
      const saved = localStorage.getItem(FLAG_KEY);
      if (saved != null) return saved === '1';
    } catch (e) {}
    return DEFAULT_MOCK;
  }

  real.isMock = false;
  if (!enabled()) return;                    // оставляем реальный API

  // ---------- Утилиты ----------
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s = ''; for (let i = 0; i < 5; i++) s += A[Math.floor(Math.random() * A.length)]; return s; }
  function genId(pfx) { return pfx + '_' + Math.random().toString(36).slice(2, 10); }
  function readRooms() { try { return JSON.parse(localStorage.getItem(ROOMS_KEY)) || {}; } catch (e) { return {}; } }
  function writeRooms(m) { try { localStorage.setItem(ROOMS_KEY, JSON.stringify(m)); } catch (e) {} }
  function nf404(code) { return new HB.ApiError(404, "Room with code '" + String(code).toUpperCase() + "' not found."); }

  // ---------- Тестовые матчи (форма реального API, даты от «сейчас») ----------
  function mockFixtures() {
    const now = Date.now(), H = 3600000, D = 86400000;
    const at = (ms) => new Date(now + ms).toISOString();
    return [
      { fixtureId: 'tm_live', homeTeam: 'Real Madrid', awayTeam: 'Barcelona', leagueName: 'La Liga', venue: 'Santiago Bernabéu', kickoffAt: at(-55 * 60000), fixtureStatus: 'live', minute: 55, score: { home: 2, away: 1 } },
      { fixtureId: 'tm1', homeTeam: 'Arsenal', awayTeam: 'Chelsea', leagueName: 'Premier League', venue: 'Emirates Stadium', kickoffAt: at(3 * H), fixtureStatus: 'scheduled' },
      { fixtureId: 'tm2', homeTeam: 'Manchester City', awayTeam: 'Liverpool', leagueName: 'Premier League', venue: 'Etihad Stadium', kickoffAt: at(6 * H), fixtureStatus: 'scheduled' },
      { fixtureId: 'tm3', homeTeam: 'Bayern Munich', awayTeam: 'Borussia Dortmund', leagueName: 'Bundesliga', venue: 'Allianz Arena', kickoffAt: at(D + 2 * H), fixtureStatus: 'scheduled' },
      { fixtureId: 'tm4', homeTeam: 'Inter', awayTeam: 'Juventus', leagueName: 'Serie A', venue: 'San Siro', kickoffAt: at(D + 5 * H), fixtureStatus: 'scheduled' },
      { fixtureId: 'tm5', homeTeam: 'PSG', awayTeam: 'Marseille', leagueName: 'Ligue 1', venue: 'Parc des Princes', kickoffAt: at(2 * D), fixtureStatus: 'scheduled' },
      { fixtureId: 'tm6', homeTeam: 'Tottenham', awayTeam: 'Manchester United', leagueName: 'Premier League', venue: 'Tottenham Hotspur Stadium', kickoffAt: at(2 * D + 4 * H), fixtureStatus: 'scheduled' },
      { fixtureId: 'tm7', homeTeam: 'Atletico Madrid', awayTeam: 'Sevilla', leagueName: 'La Liga', venue: 'Metropolitano', kickoffAt: at(3 * D), fixtureStatus: 'scheduled' }
    ];
  }
  function fixtureById(id) { return mockFixtures().find((f) => f.fixtureId === id) || null; }

  // Таблица: очки считаем через HB.scoreFor (конфиг из settings.json)
  function computeStandings(room) {
    const sc = room.fixture && room.fixture.score;
    const actual = (sc && sc.home != null && sc.away != null) ? { home: sc.home, away: sc.away } : null;
    return room.participants
      .map((p) => ({ participantId: p.participantId, name: p.name, prediction: p.prediction, points: actual ? HB.scoreFor(p.prediction, actual) : 0 }))
      .sort((a, b) => b.points - a.points || a.name.localeCompare(b.name));
  }

  // ---------- Mock-клиент (та же сигнатура, что и реальный) ----------
  HB.api = {
    base: 'mock',
    isMock: true,
    identity: real.identity, saveIdentity: real.saveIdentity,
    activeRoom: real.activeRoom, setActiveRoom: real.setActiveRoom,
    normalizeFixture: real.normalizeFixture, normalizeRoom: real.normalizeRoom, normalizeStandings: real.normalizeStandings,

    async health() { await sleep(60); return { status: 'ok', mock: true }; },

    async fixturesToday() {
      await sleep(260);
      return mockFixtures().map(real.normalizeFixture).filter(Boolean);
    },

    async createRoom({ title, fixtureId, ownerName }) {
      await sleep(340);
      const fixture = fixtureById(fixtureId);
      if (!fixture) throw new HB.ApiError(404, "Fixture '" + fixtureId + "' not found.");
      const code = genCode(), pid = genId('part');
      const room = {
        roomId: genId('room'), code, title: title || 'Room', roomStatus: 'open',
        fixture: Object.assign({ score: { home: null, away: null } }, fixture),
        participants: [{ participantId: pid, name: ownerName, joinType: 'self', prediction: null, canEditPrediction: true }]
      };
      const map = readRooms(); map[code] = room; writeRooms(map);
      real.saveIdentity(code, { participantId: pid, ownerId: pid, name: ownerName, created: true });
      real.setActiveRoom(code);
      return { room: real.normalizeRoom(room), participantId: pid };
    },

    async getRoom(code) {
      await sleep(180);
      const room = readRooms()[String(code).toUpperCase()];
      if (!room) throw nf404(code);
      return real.normalizeRoom(room);
    },

    async joinRoom(code, name) {
      await sleep(320);
      code = String(code).toUpperCase();
      const map = readRooms(), room = map[code];
      if (!room) throw nf404(code);
      let p = room.participants.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!p) { p = { participantId: genId('part'), name, joinType: 'self', prediction: null, canEditPrediction: true }; room.participants.push(p); writeRooms(map); }
      real.saveIdentity(code, { participantId: p.participantId, name, created: false });
      real.setActiveRoom(code);
      return { participantId: p.participantId, code };
    },

    async addParticipant(code, name) {
      await sleep(240);
      code = String(code).toUpperCase();
      const map = readRooms(), room = map[code];
      if (!room) throw nf404(code);
      const p = { participantId: genId('part'), name, joinType: 'manual', prediction: null, canEditPrediction: true };
      room.participants.push(p); writeRooms(map);
      return { id: p.participantId, name };
    },

    async setPrediction(code, participantId, home, away) {
      await sleep(240);
      code = String(code).toUpperCase();
      const map = readRooms(), room = map[code];
      if (!room) throw nf404(code);
      const p = room.participants.find((x) => x.participantId === participantId);
      if (!p) throw new HB.ApiError(404, 'Participant not found.');
      p.prediction = { home: +home, away: +away }; writeRooms(map);
      return { participantId, prediction: p.prediction };
    },

    async standings(code) {
      await sleep(220);
      const room = readRooms()[String(code).toUpperCase()];
      if (!room) throw nf404(code);
      return real.normalizeStandings({ items: computeStandings(room) });
    }
  };

  // ---------- Индикатор тестового режима ----------
  function addBadge() {
    if (document.getElementById('mock-badge')) return;
    const b = document.createElement('div');
    b.id = 'mock-badge';
    b.className = 'mock-badge';
    b.textContent = '🧪 TEST DATA';              // локализованный текст проставит i18n.applyStatic
    (document.body || document.documentElement).appendChild(b);
  }
  if (document.body) addBadge(); else document.addEventListener('DOMContentLoaded', addBadge);

  try { console.info('[ScorePick] Тестовый режим (mock). Данные локальные. Для реального API: ?mock=0'); } catch (e) {}
})();
