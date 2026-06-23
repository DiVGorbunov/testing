/* ============================================================
   ScorePick — api: клиент реального бэкенда (Fastify, RFC7807)
   Контракт: https://scorepick.onrender.com/docs

   ВАЖНО: в OpenAPI описаны только тела ЗАПРОСОВ и параметры —
   формы ОТВЕТОВ не задокументированы. Поэтому запросы (методы,
   пути, заголовки, тела) сделаны строго по контракту, а разбор
   ответов — толерантный к типичным формам (несколько алиасов
   на поле). Когда кэш фикстур наполнится — достаточно подправить
   normalize*-функции под реальный payload.
   ============================================================ */
(function () {
  'use strict';
  const HB = (window.HB = window.HB || {});

  const BASE = 'https://scorepick.onrender.com';
  const ID_KEY = 'scorepick_identities_v1';
  const ACTIVE_KEY = 'scorepick_active_room_v1';

  // ---------- Ошибка API (RFC7807) ----------
  function ApiError(status, detail, body) {
    this.name = 'ApiError';
    this.status = status;            // 0 — сеть/CORS; иначе HTTP-код
    this.detail = detail || 'Request failed';
    this.body = body || null;        // { type, title, status, detail }
    this.isNetwork = status === 0;
    this.isNotFound = status === 404;
    this.message = this.detail;
  }
  ApiError.prototype = Object.create(Error.prototype);
  HB.ApiError = ApiError;

  // ---------- Хранилище идентичностей (по коду комнаты) ----------
  // { [code]: { ownerId?, participantId?, name?, created? } }
  // Создатель: meParticipantId служит И как x-participant-id (свой прогноз),
  // И как x-owner-id (добавление участников). Поэтому у создателя ownerId === participantId.
  function readIds() { try { return JSON.parse(localStorage.getItem(ID_KEY)) || {}; } catch (e) { return {}; } }
  function writeIds(map) { try { localStorage.setItem(ID_KEY, JSON.stringify(map)); } catch (e) {} }
  function identity(code) { return readIds()[String(code).toUpperCase()] || null; }
  function saveIdentity(code, patch) {
    const map = readIds(); const k = String(code).toUpperCase();
    map[k] = Object.assign({}, map[k], patch); writeIds(map); return map[k];
  }
  function authHeaders(code) {
    const id = identity(code) || {};
    const h = {};
    if (id.ownerId) h['x-owner-id'] = id.ownerId;
    if (id.participantId) h['x-participant-id'] = id.participantId;
    return h;
  }

  // ---------- Активная комната пользователя (одна) ----------
  // Сохраняется в localStorage, чтобы после переоткрытия браузера комната не терялась.
  function getActive() { try { return localStorage.getItem(ACTIVE_KEY) || null; } catch (e) { return null; } }
  function setActive(code) { try { code ? localStorage.setItem(ACTIVE_KEY, String(code).toUpperCase()) : localStorage.removeItem(ACTIVE_KEY); } catch (e) {} }

  // ---------- Низкоуровневый запрос ----------
  async function call(method, path, opts) {
    opts = opts || {};
    const headers = Object.assign({ Accept: 'application/json' }, opts.headers || {});
    let bodyStr;
    if (opts.body !== undefined) { headers['Content-Type'] = 'application/json'; bodyStr = JSON.stringify(opts.body); }

    let res;
    try {
      res = await fetch(BASE + path, { method, headers, body: bodyStr, cache: 'no-store' });
    } catch (e) {
      throw new ApiError(0, (e && e.message) || 'Network error');
    }

    const text = await res.text();
    let data = null;
    if (text) { try { data = JSON.parse(text); } catch (_) { data = text; } }

    if (!res.ok) {
      const detail = (data && typeof data === 'object' && (data.detail || data.title || data.message)) || ('HTTP ' + res.status);
      throw new ApiError(res.status, detail, data);
    }
    return { data, headers: res.headers };
  }

  // ---------- Нормализация: команда / лига / матч ----------
  function abbr(name) {
    const words = String(name).trim().split(/\s+/).filter(Boolean);
    if (words.length >= 2) return (words[0][0] + words[1][0] + (words[2] ? words[2][0] : words[0][1] || '')).toUpperCase();
    return String(name).replace(/[^A-Za-zА-Яа-я]/g, '').slice(0, 3).toUpperCase() || '??';
  }
  function slug(s) { return String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'x'; }
  function upsert(arr, obj) {
    if (!obj || !obj.id) return obj;
    const i = arr.findIndex((x) => x.id === obj.id);
    if (i >= 0) arr[i] = Object.assign({}, arr[i], obj); else arr.push(obj);
    return obj;
  }

  function normTeam(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') raw = { name: raw };
    const name = raw.name || raw.teamName || raw.shortName || raw.title || 'Team';
    const id = String(raw.id != null ? raw.id : (raw.teamId != null ? raw.teamId : slug(name)));
    const colors = (HB.avatarColors ? HB.avatarColors(name) : ['#00E676', '#0091ea']);
    const team = {
      id, name,
      short: String(raw.short || raw.shortName || raw.code || raw.tla || raw.abbreviation || abbr(name)).toUpperCase().slice(0, 4),
      color: raw.color || raw.primaryColor || colors[0],
      color2: raw.color2 || raw.secondaryColor || colors[1],
      city: raw.city || raw.country || raw.area || '',
      logo: raw.logo || raw.crest || raw.logoUrl || raw.image || null
    };
    if (HB.data && HB.data.teams) upsert(HB.data.teams, team);
    return team;
  }

  function normLeague(raw) {
    if (!raw) return null;
    if (typeof raw === 'string') raw = { name: raw };
    const name = raw.name || raw.leagueName || raw.competition || 'League';
    const id = String(raw.id != null ? raw.id : (raw.leagueId != null ? raw.leagueId : slug(name)));
    const league = {
      id, name,
      short: String(raw.short || raw.code || abbr(name)).toUpperCase().slice(0, 5),
      emoji: raw.emoji || '⚽',
      color: raw.color || '#3D6DFF',
      logo: raw.logo || raw.crest || raw.logoUrl || null
    };
    if (HB.data && HB.data.leagues) upsert(HB.data.leagues, league);
    return league;
  }

  function mapStatus(s) {
    const v = String(s || '').toLowerCase();
    if (/(^|_)(live|in_play|inplay|1h|2h|ht|et|pen|playing)/.test(v) || v === 'live') return 'live';
    if (/(ft|finished|final|aet|ended|complete|fulltime|full_time)/.test(v)) return 'finished';
    return 'upcoming';
  }

  function pick(/* obj, keys... */) {
    const obj = arguments[0];
    for (let i = 1; i < arguments.length; i++) {
      const v = obj && obj[arguments[i]];
      if (v !== undefined && v !== null) return v;
    }
    return undefined;
  }

  function normScore(raw) {
    const sc = pick(raw, 'score', 'goals', 'result', 'fulltime');
    if (sc && typeof sc === 'object') {
      const h = pick(sc, 'home', 'h', 'homeScore'), a = pick(sc, 'away', 'a', 'awayScore');
      if (h != null && a != null) return { home: +h, away: +a };
    }
    const h = pick(raw, 'homeScore', 'homeGoals', 'goalsHome');
    const a = pick(raw, 'awayScore', 'awayGoals', 'goalsAway');
    if (h != null && a != null) return { home: +h, away: +a };
    return null;
  }

  // API-матч → внутренняя модель приложения; регистрирует команды/лигу/матч в HB.data
  function normalizeFixture(raw) {
    if (!raw) return null;
    const homeRaw = pick(raw, 'home', 'homeTeam') || (raw.teams && raw.teams.home);
    const awayRaw = pick(raw, 'away', 'awayTeam') || (raw.teams && raw.teams.away);
    const home = normTeam(homeRaw);
    const away = normTeam(awayRaw);
    const league = normLeague(pick(raw, 'league', 'leagueName', 'competition', 'tournament'));
    const status = mapStatus(pick(raw, 'status', 'fixtureStatus', 'state', 'phase'));
    const score = normScore(raw) || (status === 'upcoming' ? null : { home: 0, away: 0 });
    const fx = {
      id: String(pick(raw, 'id', 'fixtureId', 'matchId') || (home && away ? home.id + '-' + away.id : slug(JSON.stringify(raw)))),
      leagueId: league ? league.id : null,
      homeId: home ? home.id : null,
      awayId: away ? away.id : null,
      kickoff: pick(raw, 'kickoff', 'kickoffAt', 'startTime', 'startsAt', 'utcDate', 'date', 'datetime') || new Date().toISOString(),
      status,
      minute: pick(raw, 'minute', 'elapsed', 'clock') || null,
      score,
      venue: (function () { const v = pick(raw, 'venue', 'stadium', 'arena'); return v && typeof v === 'object' ? (v.name || '') : (v || ''); })()
    };
    if (HB.data && HB.data.fixtures) upsert(HB.data.fixtures, fx);
    return fx;
  }

  // API-комната → внутренняя модель
  function normalizeRoom(raw) {
    if (!raw) return null;
    const room = raw.room || raw;
    const fixtureRaw = pick(room, 'fixture', 'match');
    const fixture = fixtureRaw ? normalizeFixture(fixtureRaw) : null;
    const partsRaw = pick(room, 'participants', 'players', 'members') || [];
    const participants = (Array.isArray(partsRaw) ? partsRaw : []).map((p) => ({
      id: pick(p, 'id', 'participantId') || null,
      name: pick(p, 'name', 'displayName') || '—',
      isCreator: !!(pick(p, 'isOwner', 'isCreator', 'owner')),
      prediction: (function () {
        const pr = pick(p, 'prediction', 'pick', 'guess');
        if (pr && pr.home != null && pr.away != null) return { home: +pr.home, away: +pr.away };
        if (p.predictionHome != null && p.predictionAway != null) return { home: +p.predictionHome, away: +p.predictionAway };
        return null;
      })()
    }));
    return {
      id: pick(room, 'code', 'id') || null,
      code: pick(room, 'code') || pick(room, 'id') || '',
      title: pick(room, 'title', 'name') || 'Room',
      creator: pick(room, 'ownerName', 'creator', 'owner') || (participants.find((p) => p.isCreator) || {}).name || '',
      fixtureId: fixture ? fixture.id : pick(room, 'fixtureId'),
      createdAt: pick(room, 'createdAt', 'created_at') || null,
      participants,
      _api: true
    };
  }

  // API-таблица → массив строк рейтинга
  function normalizeStandings(raw) {
    const rows = (raw && (raw.items || raw.standings || raw.rows)) || (Array.isArray(raw) ? raw : []);
    return rows.map((r, i) => ({
      name: pick(r, 'name', 'participantName') || '—',
      id: pick(r, 'participantId', 'id') || null,
      points: +(pick(r, 'points', 'score', 'total') || 0),
      rank: pick(r, 'rank', 'position') || (i + 1),
      isCreator: !!pick(r, 'isOwner', 'isCreator'),
      prediction: (function () {
        const pr = pick(r, 'prediction', 'pick');
        return pr && pr.home != null ? { home: +pr.home, away: +pr.away } : null;
      })()
    }));
  }

  // ---------- Публичный клиент ----------
  HB.api = {
    base: BASE,
    identity, saveIdentity,
    activeRoom: getActive, setActiveRoom: setActive,
    normalizeFixture, normalizeRoom, normalizeStandings,

    health() { return call('GET', '/health').then((r) => r.data); },

    // Список матчей на сегодня → [внутренний матч]
    async fixturesToday() {
      const { data } = await call('GET', '/api/v1/fixtures/today');
      const items = (data && (data.items || data.fixtures)) || (Array.isArray(data) ? data : []);
      return items.map(normalizeFixture).filter(Boolean);
    },

    // Создать комнату → { room, participantId }. Создатель: id = и участник, и владелец.
    async createRoom({ title, fixtureId, ownerName }) {
      const { data } = await call('POST', '/api/v1/rooms', { body: { title, fixtureId, ownerName } });
      const room = normalizeRoom(data);
      const pid = pick(data, 'meParticipantId', 'participantId') || null;
      if (room.code) {
        saveIdentity(room.code, { participantId: pid, ownerId: pid, name: ownerName, created: true });
        setActive(room.code);
      }
      return { room, participantId: pid };
    },

    // Получить комнату по коду
    async getRoom(code) {
      const { data } = await call('GET', '/api/v1/rooms/' + encodeURIComponent(code), { headers: authHeaders(code) });
      return normalizeRoom(data);
    },

    // Присоединиться → { participantId }
    async joinRoom(code, name) {
      const { data } = await call('POST', '/api/v1/rooms/' + encodeURIComponent(code) + '/join', { body: { name } });
      const participantId = pick(data, 'participantId', 'meParticipantId', 'id') || null;
      const realCode = pick(data, 'code') || code;
      saveIdentity(realCode, { participantId, name, created: false });
      setActive(realCode);
      return { participantId, code: realCode };
    },

    // Хост добавляет участника
    async addParticipant(code, name) {
      const { data } = await call('POST', '/api/v1/rooms/' + encodeURIComponent(code) + '/participants', { body: { name }, headers: authHeaders(code) });
      return { id: pick(data, 'participantId', 'id') || null, name };
    },

    // Сохранить прогноз участника
    async setPrediction(code, participantId, home, away) {
      const { data } = await call('PUT',
        '/api/v1/rooms/' + encodeURIComponent(code) + '/participants/' + encodeURIComponent(participantId) + '/prediction',
        { body: { home, away }, headers: authHeaders(code) });
      return data;
    },

    // Таблица результатов комнаты
    async standings(code) {
      const { data } = await call('GET', '/api/v1/rooms/' + encodeURIComponent(code) + '/standings', { headers: authHeaders(code) });
      return normalizeStandings(data);
    }
  };
})();
