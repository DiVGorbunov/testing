/* ============================================================
   ScorePick — i18n: локализация интерфейса (en / ru)
   - t(key, params)  — строки интерфейса
   - d(value)        — строки-данные из settings.json (ru-источник → перевод)
   - plural(n, name) — множественное число по правилам языка
   - cal()           — календарные данные (месяцы, дни, относительные дни)
   - detect/set/init — выбор и сохранение языка
   ============================================================ */
(function () {
  'use strict';
  const HB = (window.HB = window.HB || {});

  const LANG_KEY = 'scorepick_lang_v1';
  const DEFAULT = 'en';

  // Доступные языки (для переключателя)
  const AVAILABLE = [
    { code: 'en', label: 'English', native: 'English', flag: '🇬🇧' },
    { code: 'ru', label: 'Russian', native: 'Русский', flag: '🇷🇺' }
  ];

  // ---------- Словари интерфейса ----------
  const DICT = {
    en: {
      doc: {
        title: 'ScorePick — Predict the Score',
        desc: 'ScorePick — a social football score-prediction game for a group of friends.'
      },
      nav: { home: 'Home', fixtures: 'Matches', create: 'Create game', aria: 'Main navigation' },
      boot: {
        loading: 'Loading data…',
        errorTitle: 'Something went wrong',
        toHome: 'Go home',
        fileError: "Couldn't load <code>settings.json</code> — the browser blocks reading files from disk.<br><br>Start a local server in the project folder:<br><br><code>python -m http.server 8080</code><br>and open <code>http://localhost:8080</code>",
        loadError: "Couldn't load data: {msg}<br><br>Make sure <code>settings.json</code> sits next to the app."
      },
      common: {
        join: 'Join', all: 'All', allLeagues: 'All leagues', selectMatch: 'Select match',
        back: 'Back', share: 'Share', copy: 'Copy', copied: 'Copied', copyFail: 'Could not copy',
        resultShort: 'final', minus: 'minus', plus: 'plus'
      },
      lang: { title: 'Language', subtitle: 'Choose your language' },
      home: {
        headline: 'Predict the score.<br>Take the win.',
        intro: 'Gather your friends, pick a match and battle for the most accurate prediction.',
        liveNow: 'Live now',
        create: 'Create game',
        enterCode: 'Enter a room code',
        yourRoom: 'Your room',
        upcoming: 'Upcoming matches', allMatches: 'All matches'
      },
      fixtures: {
        title: 'Pick a match', sub: 'Choose a match to play',
        search: 'Search team or city…',
        live: '🔴 Live',
        emptyTitle: 'Nothing found', emptyText: 'Try changing the filters or your search.',
        pick: 'Pick'
      },
      create: {
        title: 'New game', sub: 'Set up the room',
        roomName: 'Room name', namePlaceholder: 'e.g. “{home} – {away}”',
        yourNameCreator: 'Your name (creator)', yourNameAsk: "What's your name?",
        info: 'Once created, you\'ll get a <b style="color:var(--text)">room code</b> — send it to your friends so they can join and make predictions.',
        submit: 'Create room',
        errName: 'Enter your name', created: 'Room created 🎉', defaultTitle: 'My game'
      },
      join: {
        title: 'Join a game', sub: 'Enter the invite code',
        codeTitle: 'Room code', codeHint: 'Ask the code from whoever created the game',
        notFound: 'Room with code <b style="color:var(--live)">{code}</b> not found',
        yourName: 'Your name', errName: 'Enter your name', joined: "You're in! 🎉"
      },
      room: {
        yourPrediction: 'Your prediction', changePrediction: 'Change prediction',
        made: 'Made', save: 'Save prediction', update: 'Update prediction', saved: 'Prediction saved ✅',
        progress: 'Predictions made',
        table: 'Table', players: 'Players', addPlayer: '+ Add',
        liveBoard: 'Live leaderboard', seeResults: 'See results',
        lockHint: 'Predictions open for everyone at kickoff',
        joinTitle: 'Join the game', joinText: 'Add yourself to make a prediction', joinBtn: "I'm in",
        you: 'You', host: 'Host',
        predMade: 'Prediction made', predWait: 'Waiting for prediction…', notReady: 'not ready',
        predLabel: 'Prediction', exact: 'exact!'
      },
      results: {
        title: 'Results', liveTitle: 'Live table',
        draw: 'Draw!', tieJoin: ' and ', tieSuffix: '— tied', bestPred: 'Best prediction:',
        nobody: 'Nobody guessed it — it happens!', noPoints: 'No points yet',
        finalTable: 'Final table', leadingNow: 'Leading now',
        scoringTitle: 'How points work',
        liveHint: 'The table updates as the match goes on',
        backToRoom: 'Back to room', exactTag: 'EXACT'
      },
      badge: { live: 'LIVE', finished: 'Finished', final: 'Final' },
      sheet: {
        addTitle: 'Add player', addText: 'Add a friend manually — they\'ll be able to predict',
        playerName: 'Player name', quickPick: 'Quick pick', addToRoom: 'Add to room',
        existing: 'That player already exists', enterName: 'Enter a name', addedToGame: '{name} is in the game',
        joinTitle: 'Play in this room', joinText: 'Enter your name and predict the match',
        joinAsk: "What's your name?", joinBtn: 'Join'
      },
      err: { codeLen: 'Enter the room code' },
      redirect: {
        pickFirst: 'Pick a match first', pickMatch: 'Pick a match',
        roomNotFound: 'Room not found', toHome: 'Go home'
      },
      share: { invite: 'Join the game “{title}” — code {code}', results: 'Game “{title}” on ScorePick', resultsFallback: 'Results on ScorePick' },
      state: {
        loadingMatches: 'Loading matches…', loadingRoom: 'Loading room…', loadingStandings: 'Loading table…',
        errorTitle: 'Something went wrong', offlineTitle: 'No connection', retry: 'Retry',
        noMatchesTitle: 'No matches today', noMatchesText: 'There are no fixtures available right now. Check back later.',
        noUpcomingTitle: 'No upcoming matches', noUpcomingText: 'Nothing scheduled at the moment.',
        noStandingsTitle: 'No table yet', noStandingsText: 'It will appear once players make predictions.'
      },
      currency: 'pts',
      plural: { players: ['player', 'players'], matches: ['match', 'matches'] }
    },

    ru: {
      doc: {
        title: 'ScorePick — Угадай счёт',
        desc: 'ScorePick — социальная игра-предсказание счёта футбольных матчей для компании друзей.'
      },
      nav: { home: 'Главная', fixtures: 'Матчи', create: 'Создать игру', aria: 'Главная навигация' },
      boot: {
        loading: 'Загружаем данные…',
        errorTitle: 'Что-то пошло не так',
        toHome: 'На главную',
        fileError: 'Не удалось загрузить <code>settings.json</code> — браузер блокирует чтение файлов с диска.<br><br>Запусти локальный сервер в папке проекта:<br><br><code>python -m http.server 8080</code><br>и открой <code>http://localhost:8080</code>',
        loadError: 'Не удалось загрузить данные: {msg}<br><br>Проверь, что рядом лежит <code>settings.json</code>.'
      },
      common: {
        join: 'Присоединиться', all: 'Все', allLeagues: 'Все лиги', selectMatch: 'Выбрать матч',
        back: 'Назад', share: 'Поделиться', copy: 'Копировать', copied: 'Скопировано', copyFail: 'Не удалось скопировать',
        resultShort: 'итог', minus: 'минус', plus: 'плюс'
      },
      lang: { title: 'Язык', subtitle: 'Выбери язык интерфейса' },
      home: {
        headline: 'Угадай счёт.<br>Забери победу.',
        intro: 'Собери друзей, выберите матч и поборитесь за точный прогноз.',
        liveNow: 'Сейчас идёт',
        create: 'Создать игру',
        enterCode: 'Войти по коду комнаты',
        yourRoom: 'Твоя комната',
        upcoming: 'Ближайшие матчи', allMatches: 'Все матчи'
      },
      fixtures: {
        title: 'Выбор матча', sub: 'Выбери матч для игры',
        search: 'Поиск команды или города…',
        live: '🔴 Live',
        emptyTitle: 'Ничего не нашлось', emptyText: 'Попробуй изменить фильтры или поиск.',
        pick: 'Выбрать'
      },
      create: {
        title: 'Новая игра', sub: 'Настрой комнату',
        roomName: 'Название комнаты', namePlaceholder: 'Напр. «{home} – {away}»',
        yourNameCreator: 'Твоё имя (создатель)', yourNameAsk: 'Как тебя зовут?',
        info: 'После создания ты получишь <b style="color:var(--text)">код комнаты</b> — отправь его друзьям, чтобы они присоединились и сделали прогнозы.',
        submit: 'Создать комнату',
        errName: 'Введи своё имя', created: 'Комната создана 🎉', defaultTitle: 'Моя игра'
      },
      join: {
        title: 'Вход в игру', sub: 'Введи код приглашения',
        codeTitle: 'Код комнаты', codeHint: 'Спроси код у того, кто создал игру',
        notFound: 'Комната с кодом <b style="color:var(--live)">{code}</b> не найдена',
        yourName: 'Твоё имя', errName: 'Введи своё имя', joined: 'Ты в игре! 🎉'
      },
      room: {
        yourPrediction: 'Твой прогноз', changePrediction: 'Изменить прогноз',
        made: 'Сделан', save: 'Сохранить прогноз', update: 'Обновить прогноз', saved: 'Прогноз сохранён ✅',
        progress: 'Сделали прогноз',
        table: 'Таблица', players: 'Игроки', addPlayer: '+ Добавить',
        liveBoard: 'Live-таблица лидеров', seeResults: 'Смотреть результаты',
        lockHint: 'Прогнозы откроются для всех на старте матча',
        joinTitle: 'Присоединяйся к игре', joinText: 'Добавь себя, чтобы сделать прогноз', joinBtn: 'Я в игре',
        you: 'Ты', host: 'Хост',
        predMade: 'Прогноз сделан', predWait: 'Ждём прогноз…', notReady: 'не готов',
        predLabel: 'Прогноз', exact: 'точно!'
      },
      results: {
        title: 'Результаты', liveTitle: 'Live-таблица',
        draw: 'Ничья!', tieJoin: ' и ', tieSuffix: '— поровну', bestPred: 'Лучший прогноз:',
        nobody: 'Никто не угадал — бывает!', noPoints: 'Пока очков нет',
        finalTable: 'Итоговая таблица', leadingNow: 'Сейчас лидируют',
        scoringTitle: 'Как считаются очки',
        liveHint: 'Таблица обновляется по ходу матча',
        backToRoom: 'Назад в комнату', exactTag: 'ТОЧНО'
      },
      badge: { live: 'LIVE', finished: 'Завершён', final: 'Финал' },
      sheet: {
        addTitle: 'Добавить игрока', addText: 'Добавь друга вручную — он сможет сделать прогноз',
        playerName: 'Имя игрока', quickPick: 'Быстрый выбор', addToRoom: 'Добавить в комнату',
        existing: 'Такой игрок уже есть', enterName: 'Введи имя', addedToGame: '{name} в игре',
        joinTitle: 'Сыграть в этой комнате', joinText: 'Введи имя — и делай прогноз на матч',
        joinAsk: 'Как тебя зовут?', joinBtn: 'Присоединиться'
      },
      err: { codeLen: 'Введи код комнаты' },
      redirect: {
        pickFirst: 'Сначала выбери матч', pickMatch: 'Выбрать матч',
        roomNotFound: 'Комната не найдена', toHome: 'На главную'
      },
      share: { invite: 'Заходи в игру «{title}» — код {code}', results: 'Игра «{title}» в ScorePick', resultsFallback: 'Результаты в ScorePick' },
      state: {
        loadingMatches: 'Загружаем матчи…', loadingRoom: 'Загружаем комнату…', loadingStandings: 'Загружаем таблицу…',
        errorTitle: 'Что-то пошло не так', offlineTitle: 'Нет связи', retry: 'Повторить',
        noMatchesTitle: 'Сегодня матчей нет', noMatchesText: 'Сейчас нет доступных матчей. Загляни позже.',
        noUpcomingTitle: 'Нет ближайших матчей', noUpcomingText: 'Пока ничего не запланировано.',
        noStandingsTitle: 'Таблицы пока нет', noStandingsText: 'Она появится, когда игроки сделают прогнозы.'
      },
      currency: 'очк.',
      plural: { players: ['игрок', 'игрока', 'игроков'], matches: ['матч', 'матча', 'матчей'] }
    }
  };

  // ---------- Календарные данные ----------
  const CAL = {
    en: {
      months: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
      wdays: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
      today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday'
    },
    ru: {
      months: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
      wdays: ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'],
      today: 'Сегодня', tomorrow: 'Завтра', yesterday: 'Вчера'
    }
  };

  // ---------- Данные из settings.json (ru-источник → перевод) ----------
  // Перевод выполняется по исходной русской строке. Если перевода нет — возвращаем исходник.
  const DATA_MAP = {
    en: {
      // лиги
      'Лига Чемпионов': 'Champions League',
      // города
      'Лондон': 'London', 'Ливерпуль': 'Liverpool', 'Манчестер': 'Manchester', 'Ньюкасл': 'Newcastle',
      'Мадрид': 'Madrid', 'Барселона': 'Barcelona', 'Турин': 'Turin', 'Милан': 'Milan',
      'Неаполь': 'Naples', 'Мюнхен': 'Munich', 'Дортмунд': 'Dortmund', 'Париж': 'Paris',
      // стадионы
      'Сантьяго Бернабеу': 'Santiago Bernabéu', 'Эмирейтс': 'Emirates Stadium', 'Олд Траффорд': 'Old Trafford',
      'Камп Ноу': 'Camp Nou', 'Альянц Стэдиум': 'Allianz Stadium', 'Альянц Арена': 'Allianz Arena',
      'Парк де Пренс': 'Parc des Princes', 'Сан-Сиро': 'San Siro', 'Этихад': 'Etihad Stadium',
      "Сент-Джеймс Парк": "St James' Park", 'Уэмбли': 'Wembley',
      // очки / правила / слоган
      'очк.': 'pts',
      'Угадай счёт. Забери победу.': 'Predict the score. Take the win.',
      'Точный счёт': 'Exact score', 'Разница мячей': 'Goal difference',
      'Исход матча': 'Match outcome', 'Мимо': 'Miss',
      'Угадал счёт матча полностью': 'Guessed the full match score',
      'Угадал исход и разницу голов': 'Guessed the outcome and goal difference',
      'Угадал победителя или ничью': 'Guessed the winner or a draw',
      'Не угадал ничего': 'Guessed nothing'
    }
  };

  // ---------- Ядро ----------
  const i18n = (HB.i18n = {
    lang: DEFAULT,
    available: AVAILABLE,

    // достать значение по «dotted.path» из словаря языка с откатом на en
    _get(lang, key) {
      const walk = (obj) => key.split('.').reduce((o, k) => (o == null ? undefined : o[k]), obj);
      let v = walk(DICT[lang]);
      if (v == null && lang !== DEFAULT) v = walk(DICT[DEFAULT]);
      return v;
    },

    // строка интерфейса с подстановкой {param}
    t(key, params) {
      let v = this._get(this.lang, key);
      if (v == null) return key;
      if (params) v = String(v).replace(/\{(\w+)\}/g, (m, p) => (params[p] != null ? params[p] : m));
      return v;
    },

    // строка-данные из settings.json
    d(value) {
      if (value == null) return value;
      const map = DATA_MAP[this.lang];
      return (map && map[value]) || value;
    },

    // множественное число: возвращает слово (без числа)
    plural(n, name) {
      const forms = this._get(this.lang, 'plural.' + name) || [];
      if (this.lang === 'ru') {
        const m10 = n % 10, m100 = n % 100;
        if (m10 === 1 && m100 !== 11) return forms[0];
        if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return forms[1];
        return forms[2];
      }
      return n === 1 ? forms[0] : forms[1];
    },

    // календарные данные текущего языка
    cal() { return CAL[this.lang] || CAL[DEFAULT]; },

    // ---------- Выбор языка ----------
    supported(code) { return AVAILABLE.some((l) => l.code === code); },

    detect() {
      // 1) сохранённый выбор
      let saved = null;
      try { saved = localStorage.getItem(LANG_KEY); } catch (e) {}
      if (saved && this.supported(saved)) return saved;
      // 2) язык браузера
      const navLangs = (navigator.languages && navigator.languages.length)
        ? navigator.languages
        : [navigator.language || navigator.userLanguage || ''];
      for (const l of navLangs) {
        const code = String(l).toLowerCase().split('-')[0];
        if (this.supported(code)) return code;
      }
      // 3) дефолт
      return DEFAULT;
    },

    init() {
      this.lang = this.detect();
      this.applyStatic();
    },

    set(lang) {
      ui.closeSheetIfAny();
      if (!this.supported(lang) || lang === this.lang) return;
      this.lang = lang;
      try { localStorage.setItem(LANG_KEY, lang); } catch (e) {}
      this.applyStatic();
      if (HB.router && HB.router.render) HB.router.render();
    },

    // обновить статический DOM, не управляемый роутером
    applyStatic() {
      const root = document.documentElement;
      if (root) root.setAttribute('lang', this.lang);
      try { document.title = this.t('doc.title'); } catch (e) {}

      const meta = document.querySelector('meta[name="description"]');
      if (meta) meta.setAttribute('content', this.t('doc.desc'));

      // навигация (нижний таббар на мобайле / боковая панель на десктопе)
      const tabbar = document.getElementById('tabbar');
      if (tabbar) {
        tabbar.setAttribute('aria-label', this.t('nav.aria'));
        tabbar.querySelectorAll('.tab[data-tab]').forEach((tab) => {
          const lbl = tab.querySelector('.tab-label');
          if (lbl) lbl.textContent = this.t('nav.' + tab.dataset.tab);
        });
        const fab = tabbar.querySelector('.tab-fab');
        if (fab) {
          fab.setAttribute('aria-label', this.t('nav.create'));
          const fabLbl = fab.querySelector('.fab-label');
          if (fabLbl) fabLbl.textContent = this.t('nav.create');
        }
        const langBtn = tabbar.querySelector('.side-lang');
        if (langBtn) {
          langBtn.setAttribute('aria-label', this.t('lang.title'));
          const langLbl = langBtn.querySelector('.side-lang-label');
          if (langLbl) langLbl.textContent = this.t('lang.title');
        }
      }

      // экран загрузки (если ещё виден)
      const bootMsg = document.getElementById('boot-msg');
      if (bootMsg && !bootMsg.dataset.locked) bootMsg.textContent = this.t('boot.loading');
    }
  });

  // безопасный доступ к ui (может грузиться позже)
  const ui = (HB.ui = HB.ui || {});
  if (!ui.closeSheetIfAny) ui.closeSheetIfAny = function () { if (HB.ui && HB.ui.closeSheet) HB.ui.closeSheet(); };
})();
