/* ═══════════════════════════════════════════════
   Наша маленькая история — game logic
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* ── Helpers ─────────────────────────────── */
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const wait = (ms) => new Promise((res) => setTimeout(res, ms));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const shuffle = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const CFG = (window.GAME_CONFIG && window.GAME_CONFIG.firstHug) || {};
  const KEY = 'our-little-story-v1';
  const TOTAL = 8;

  const LEVELS = [
    { id: 'meet', icon: '🗺️', title: 'Первая встреча' },
    { id: 'hug', icon: '🤗', title: 'Первые объятия' },
    { id: 'bonn', icon: '🏠', title: 'Загадка из Бонна' },
    { id: 'food', icon: '🍣', title: 'Суши или пицца?' },
    { id: 'phrase', icon: '😂', title: 'Та самая фраза' },
    { id: 'value', icon: '🌷', title: 'Что я в тебе ценю?' },
    { id: 'hearts', icon: '💗', title: 'Пять сердечек' },
    { id: 'wish', icon: '🌠', title: 'Одно желание' },
  ];

  /* ── State (localStorage) ────────────────── */
  const fresh = () => ({ v: 1, started: false, prologue: false, done: 0, answers: {}, hearts: [], muted: false, letterRead: false });
  let S = load();
  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = Object.assign(fresh(), JSON.parse(raw));
        data.done = Math.max(0, Math.min(TOTAL, Number(data.done) || 0));
        if (!Array.isArray(data.hearts)) data.hearts = [];
        if (!data.answers || typeof data.answers !== 'object') data.answers = {};
        return data;
      }
    } catch (e) { /* storage unavailable */ }
    return fresh();
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* ignore */ }
  }
  function resetProgress() {
    const muted = S.muted;
    S = fresh();
    S.muted = muted;
    save();
  }

  /* ── DOM refs ────────────────────────────── */
  const stage = $('#stage');
  const hud = $('#hud');
  const fx = $('#fx');
  const trans = $('#transition');
  const toastEl = $('#toast');
  const btnSound = $('#btn-sound');
  let currentEl = null;
  let currentName = '';
  let busy = false;

  /* ── Sound ───────────────────────────────── */
  function syncSoundBtn() {
    Sound.setMuted(S.muted);
    btnSound.classList.toggle('is-muted', S.muted);
    btnSound.setAttribute('aria-label', S.muted ? 'Включить звук' : 'Выключить звук');
  }
  const sfx = (n) => Sound.play(n);
  btnSound.addEventListener('click', () => {
    S.muted = !S.muted;
    save();
    syncSoundBtn();
    if (!S.muted) sfx('pop');
    toast(S.muted ? 'Звук выключен 🔇' : 'Звук включён 🔊');
  });
  // iOS: unlock audio on first touch
  document.addEventListener('pointerdown', () => Sound.unlock(), { once: true });

  /* ── FX ──────────────────────────────────── */
  function burst(x, y, chars, n) {
    if (reduceMotion) return;
    chars = chars || ['💗', '✨', '💖', '⭐', '🌸'];
    n = n || 16;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.textContent = pick(chars);
      const ang = rand(0, Math.PI * 2);
      const dist = rand(60, 150);
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.fontSize = rand(14, 28) + 'px';
      el.style.setProperty('--x', Math.cos(ang) * dist + 'px');
      el.style.setProperty('--y', Math.sin(ang) * dist - 40 + 'px');
      el.style.setProperty('--s', rand(0.7, 1.4).toFixed(2));
      el.style.setProperty('--r', rand(-90, 90) + 'deg');
      el.style.setProperty('--d', rand(0.9, 1.5).toFixed(2) + 's');
      fx.appendChild(el);
      setTimeout(() => el.remove(), 1700);
    }
  }
  function burstFrom(el, chars, n) {
    if (!el) return;
    const r = el.getBoundingClientRect();
    burst(r.left + r.width / 2, r.top + r.height / 2, chars, n);
  }
  function rain(chars, n) {
    if (reduceMotion) return;
    chars = chars || ['💗', '💖', '✨', '🌸', '💕'];
    n = n || 26;
    for (let i = 0; i < n; i++) {
      const el = document.createElement('i');
      el.className = 'rise';
      el.textContent = pick(chars);
      el.style.left = rand(2, 94) + 'vw';
      el.style.bottom = '-40px';
      el.style.fontSize = rand(16, 32) + 'px';
      el.style.setProperty('--x', rand(-60, 60) + 'px');
      el.style.setProperty('--s', rand(0.8, 1.3).toFixed(2));
      el.style.setProperty('--r', rand(-40, 40) + 'deg');
      const d = rand(3, 5.2);
      el.style.setProperty('--d', d.toFixed(2) + 's');
      el.style.animationDelay = rand(0, 1.4).toFixed(2) + 's';
      fx.appendChild(el);
      setTimeout(() => el.remove(), (d + 1.6) * 1000);
    }
  }

  let toastTimer = 0;
  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  function confirmDialog(opts) {
    return new Promise((resolve) => {
      const root = $('#modal-root');
      root.innerHTML = `
        <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="mdl-t">
          <div class="modal">
            <div class="emoji">${opts.emoji || '🤔'}</div>
            <h3 id="mdl-t">${opts.title}</h3>
            <p>${opts.text}</p>
            <div class="btn-row">
              <button class="btn soft" type="button" data-a="no">${opts.no || 'Отмена'}</button>
              <button class="btn" type="button" data-a="yes">${opts.yes || 'Да'}</button>
            </div>
          </div>
        </div>`;
      const close = (val) => { root.innerHTML = ''; resolve(val); };
      root.querySelector('[data-a="yes"]').addEventListener('click', () => { sfx('tap'); close(true); });
      root.querySelector('[data-a="no"]').addEventListener('click', () => { sfx('tap'); close(false); });
      root.querySelector('.modal-backdrop').addEventListener('click', (e) => { if (e.target === e.currentTarget) close(false); });
      root.querySelector('[data-a="yes"]').focus({ preventScroll: true });
    });
  }

  /* ── Mascot ──────────────────────────────── */
  const MASCOT_SVG = `
    <svg viewBox="0 0 100 100" aria-hidden="true">
      <ellipse cx="50" cy="95" rx="25" ry="3.5" fill="rgba(160,90,140,.16)"/>
      <g>
        <ellipse cx="33" cy="25" rx="8.5" ry="17" fill="#fff" stroke="#f2c3d4" stroke-width="2" transform="rotate(-16 33 25)"/>
        <ellipse cx="33" cy="26" rx="4" ry="11" fill="#ffd3e1" transform="rotate(-16 33 26)"/>
        <ellipse cx="67" cy="25" rx="8.5" ry="17" fill="#fff" stroke="#f2c3d4" stroke-width="2" transform="rotate(16 67 25)"/>
        <ellipse cx="67" cy="26" rx="4" ry="11" fill="#ffd3e1" transform="rotate(16 67 26)"/>
      </g>
      <path d="M50 30c22 0 36 14 36 33 0 19-15 30-36 30S14 82 14 63c0-19 14-33 36-33z" fill="#fff" stroke="#f2c3d4" stroke-width="2"/>
      <path d="M26 46c4-7 11-11 18-12" stroke="#fff" stroke-width="5" stroke-linecap="round" fill="none" opacity=".9"/>
      <ellipse cx="29" cy="69" rx="7" ry="4.5" fill="#ffc0d4" opacity=".85"/>
      <ellipse cx="71" cy="69" rx="7" ry="4.5" fill="#ffc0d4" opacity=".85"/>
      <g class="m-eyes">
        <ellipse cx="38" cy="60" rx="4.6" ry="5.4" fill="#4b3d5e"/>
        <ellipse cx="62" cy="60" rx="4.6" ry="5.4" fill="#4b3d5e"/>
        <circle cx="39.6" cy="58" r="1.7" fill="#fff"/>
        <circle cx="63.6" cy="58" r="1.7" fill="#fff"/>
      </g>
      <g class="m-eyes-laugh" stroke="#4b3d5e" stroke-width="3" stroke-linecap="round" fill="none">
        <path d="M33 61q5-7 10 0"/><path d="M57 61q5-7 10 0"/>
      </g>
      <path class="m-mouth mm-smile" d="M45 70q5 5 10 0" stroke="#4b3d5e" stroke-width="2.6" stroke-linecap="round" fill="none"/>
      <path class="m-mouth mm-open" d="M44 68.5q6 0 12 0q-1 8-6 8t-6-8z" fill="#e2668a" stroke="#4b3d5e" stroke-width="2" stroke-linejoin="round"/>
      <path class="m-mouth mm-laugh" d="M41 67h18q-1 12-9 12t-9-12z" fill="#e2668a" stroke="#4b3d5e" stroke-width="2.2" stroke-linejoin="round"/>
      <ellipse class="m-mouth mm-o" cx="50" cy="72" rx="3.2" ry="4" fill="#4b3d5e"/>
      <path d="M50 37c-2-3-7-2-6 2 1 3 6 5 6 5s5-2 6-5c1-4-4-5-6-2z" fill="#f7a8c2"/>
    </svg>`;
  const mascot = (mood, cls) => `<div class="mascot ${cls || ''}" data-mood="${mood || 'idle'}">${MASCOT_SVG}</div>`;
  const moodTimers = new WeakMap();
  function setMood(el, mood, back) {
    if (!el) return;
    clearTimeout(moodTimers.get(el));
    el.dataset.mood = 'idle';
    void el.offsetWidth;
    el.dataset.mood = mood;
    if (back !== false) moodTimers.set(el, setTimeout(() => { el.dataset.mood = 'idle'; }, 2400));
  }
  const buddy = (text) => `<div class="buddy">${mascot('idle')}<div class="bubble" aria-live="polite">${text}</div></div>`;
  function say(root, text, kind, mood) {
    const b = $('.bubble', root);
    if (!b) return;
    b.innerHTML = text;
    b.classList.remove('good', 'bad', 'pop');
    if (kind) b.classList.add(kind);
    void b.offsetWidth;
    b.classList.add('pop');
    if (mood) setMood($('.buddy .mascot', root), mood);
  }

  /* ── HUD ─────────────────────────────────── */
  function updateHud(name, idx) {
    hud.hidden = false;
    const minimal = name === 'intro';
    hud.classList.toggle('minimal', minimal);
    $('#btn-map').style.visibility = name === 'level' || name === 'final' ? 'visible' : 'hidden';
    $('#btn-restart').style.visibility = minimal ? 'hidden' : 'visible';
    $('.hud-progress', hud).style.visibility = minimal ? 'hidden' : 'visible';
    let text;
    if (name === 'level') text = `Уровень ${idx + 1} из ${TOTAL} · ${LEVELS[idx].title}`;
    else if (name === 'final') text = 'Финал ✨';
    else if (name === 'prologue') text = 'Пролог';
    else text = S.done >= TOTAL ? 'Все уровни пройдены 🎉' : `Пройдено ${S.done} из ${TOTAL}`;
    $('#hud-text').textContent = text;
    $('#hud-fill').style.width = (S.done / TOTAL) * 100 + '%';
  }

  $('#btn-map').addEventListener('click', () => { sfx('tap'); go('map'); });
  $('#btn-restart').addEventListener('click', async () => {
    sfx('tap');
    const ok = await confirmDialog({
      emoji: '🔄',
      title: 'Начать заново?',
      text: 'Весь прогресс сбросится, и приключение начнётся с самого начала.',
      yes: 'Да, заново',
    });
    if (ok) { resetProgress(); go('intro', null, { clouds: true }); }
  });

  /* ── Navigation ──────────────────────────── */
  const SCREENS = {};
  async function go(name, arg, opts) {
    if (busy) return;
    busy = true;
    opts = opts || {};
    try {
      const build = () => {
        if (currentEl && currentEl._cleanup) currentEl._cleanup();
        const el = document.createElement('section');
        el.className = 'screen';
        stage.innerHTML = '';
        stage.appendChild(el);
        currentEl = el;
        currentName = name;
        window.scrollTo(0, 0);
        updateHud(name, arg);
        SCREENS[name](el, arg);
      };
      if (opts.clouds && !reduceMotion) {
        sfx('whoosh');
        trans.className = 'transition in';
        await wait(820);
        build();
        trans.className = 'transition out';
        wait(820).then(() => { trans.className = 'transition'; });
      } else {
        if (currentEl) {
          currentEl.classList.add('leaving');
          await wait(260);
        }
        build();
      }
    } finally {
      busy = false;
    }
  }

  function nextButton(root, label, onClick) {
    const wrapEl = $('.next-slot', root);
    wrapEl.innerHTML = `<button class="btn block appear" type="button">${label} <span class="arrow">→</span></button>`;
    const b = $('button', wrapEl);
    b.addEventListener('click', () => { sfx('tap'); onClick(); }, { once: true });
    setTimeout(() => b.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' }), 450);
    return b;
  }

  function completeLevel(i, root) {
    const first = S.done === i;
    if (first) {
      S.done = i + 1;
      if (i === 6) S.hearts = [];
      save();
      updateHud('level', i);
    }
    const label = i === TOTAL - 1 ? 'К финалу ✨' : 'Дальше';
    nextButton(root, label, () => go('map', { unlocked: first ? i + 1 : null }));
  }

  function levelHead(i, place) {
    return `
      <div class="quest-head">
        <span class="eyebrow">Уровень ${i + 1}${place ? ' · ' + place : ''}</span>
        <h2 class="title">${LEVELS[i].title}</h2>
      </div>`;
  }

  /* ═══════════════════════════════════════════
     SCREEN: Intro
     ═══════════════════════════════════════════ */
  SCREENS.intro = (el) => {
    el.classList.add('intro');
    const resume = S.started;
    el.innerHTML = `
      <div class="wrap stagger">
        <div class="intro-art" aria-hidden="true">
          <span class="float f1">☁️</span><span class="float f2">💗</span><span class="float f3">✨</span><span class="float f4">🌸</span>
          ${mascot('idle')}
        </div>
        <h1 class="intro-title">Наша маленькая <span class="accent">история ❤️</span></h1>
        <div class="card intro-text">
          <p>Эта маленькая игра была создана специально для тебя.</p>
          <p>Поэтому устраивайся поудобнее и приготовься немного повеселиться 😂</p>
          <p>Впереди тебя ждут воспоминания, небольшие испытания и несколько секретов…</p>
        </div>
        <div class="intro-actions">
          ${resume
            ? `<button class="btn block" type="button" data-a="continue">Продолжить приключение <span class="arrow">→</span></button>
               <button class="btn soft block" type="button" data-a="restart">Начать заново</button>`
            : `<button class="btn block" type="button" data-a="start">Начать приключение <span class="arrow">→</span></button>`}
        </div>
      </div>`;
    const m = $('.mascot', el);
    m.addEventListener('click', () => { setMood(m, 'happy'); sfx('pop'); burstFrom(m, ['💗', '✨'], 8); });
    const a = (n) => $(`[data-a="${n}"]`, el);
    if (a('start')) a('start').addEventListener('click', () => {
      Sound.unlock();
      S.started = true;
      save();
      go('prologue', null, { clouds: true });
    });
    if (a('continue')) a('continue').addEventListener('click', () => {
      Sound.unlock();
      go(S.prologue ? 'map' : 'prologue', null, { clouds: true });
    });
    if (a('restart')) a('restart').addEventListener('click', async () => {
      const ok = await confirmDialog({ emoji: '🔄', title: 'Начать заново?', text: 'Весь прогресс сбросится, и приключение начнётся с самого начала.', yes: 'Да, заново' });
      if (!ok) return;
      resetProgress();
      S.started = true;
      save();
      go('prologue', null, { clouds: true });
    });
  };

  /* ═══════════════════════════════════════════
     SCREEN: Prologue — 30 December
     ═══════════════════════════════════════════ */
  SCREENS.prologue = (el) => {
    el.classList.add('with-hud');
    const dows = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
    // December 2025 starts on a Monday
    let cells = dows.map((d) => `<div class="dow">${d}</div>`).join('');
    for (let d = 1; d <= 31; d++) {
      const col = (d - 1) % 7;
      const we = col >= 5 ? ' we' : '';
      if (d === 30) {
        cells += `<div class="d special" aria-label="30 декабря">30
          <svg class="ring" viewBox="0 0 50 50" aria-hidden="true"><path d="M27 4C41 4 48 15 47 27 46 40 35 48 23 47 10 46 2 36 3 24 4 12 14 3 30 6" fill="none" stroke="#db5f89" stroke-width="2.4" stroke-linecap="round"/></svg>
          <span class="mini-heart" aria-hidden="true">💗</span></div>`;
      } else {
        cells += `<div class="d${we}">${d}</div>`;
      }
    }
    el.innerHTML = `
      <div class="wrap">
        <span class="eyebrow appear">✦ Пролог ✦</span>
        <div class="card calendar appear" style="animation-delay:.1s">
          <div class="cal-head">
            <div class="cal-month">ДЕКАБРЬ</div>
            <div class="cal-sub">тот самый день</div>
          </div>
          <div class="cal-grid">${cells}</div>
        </div>
        <div class="story">
          <p style="animation-delay:.9s">Иногда самые прекрасные истории начинаются совершенно случайно.</p>
          <p class="big" style="animation-delay:2.1s">Наша история началась 30 декабря.</p>
          <p style="animation-delay:3.3s">И я даже не представлял, сколько прекрасных моментов нас ждёт впереди.</p>
        </div>
        <button class="btn block appear" type="button" style="animation-delay:4.1s">Дальше <span class="arrow">→</span></button>
      </div>`;
    setTimeout(() => sfx('magic'), 1300);
    $('.btn', el).addEventListener('click', () => {
      sfx('tap');
      S.prologue = true;
      save();
      go('map', { first: true });
    });
  };

  /* ═══════════════════════════════════════════
     SCREEN: Adventure map
     ═══════════════════════════════════════════ */
  SCREENS.map = (el, arg) => {
    el.classList.add('with-hud');
    arg = arg || {};
    const xs = [28, 72, 30, 70, 28, 72, 30, 70, 50];
    const STEP = 122;
    const TOP = 96;
    const H = TOP + STEP * 8 + 90;
    const nodes = LEVELS.map((l, i) => ({ ...l, i })).concat([{ id: 'final', icon: '✉️', title: 'Письмо', i: 8 }]);
    const pts = nodes.map((n, i) => [xs[i], TOP + i * STEP]);
    const pathFor = (points) => points.reduce((d, p, i) => {
      if (i === 0) return `M${p[0]} ${p[1]}`;
      const q = points[i - 1];
      const my = (q[1] + p[1]) / 2;
      return d + ` C${q[0]} ${my} ${p[0]} ${my} ${p[0]} ${p[1]}`;
    }, '');
    const doneUpTo = Math.min(S.done, 8);
    const left = TOTAL - S.done;
    const sub = S.done === 0
      ? 'Первая остановка — Германия. Нажми на светящийся кружок ✨'
      : S.done >= TOTAL
        ? 'Все уровни пройдены! Осталось самое главное… ✉️'
        : `Так держать! Впереди ещё ${left} ${plural(left, 'уровень', 'уровня', 'уровней')} 💪`;

    const nodeHtml = nodes.map((n, i) => {
      let st = 'locked';
      if (i < S.done) st = 'done';
      else if (i === S.done) st = 'current';
      if (i === 8) st = S.done >= TOTAL ? (S.letterRead ? 'done' : 'current') : 'locked';
      const here = st === 'current' ? '<span class="you-here">ты здесь</span>' : '';
      const label = st === 'locked' ? `${n.title} (закрыто)` : n.title;
      return `<button class="node ${st}${i === 8 ? ' final' : ''}" type="button" data-i="${i}" style="left:${pts[i][0]}%;top:${pts[i][1]}px" aria-label="${esc(label)}">
          ${here}<span class="dot">${n.icon}</span><span class="lbl">${n.title}</span></button>`;
    }).join('');

    el.innerHTML = `
      <div class="wrap">
        <div class="map-head">
          <span class="eyebrow appear">🗺️ Карта приключения</span>
          <p class="subtitle appear" style="animation-delay:.08s">${sub}</p>
        </div>
        <div class="trail appear" style="height:${H}px;animation-delay:.12s">
          <svg class="trail-path" viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">
            <path d="${pathFor(pts)}" fill="none" stroke="#fff" stroke-width="16" stroke-linecap="round" vector-effect="non-scaling-stroke" opacity=".7"/>
            <path d="${pathFor(pts)}" fill="none" stroke="#cbbcf5" stroke-width="4" stroke-dasharray="2 12" stroke-linecap="round" vector-effect="non-scaling-stroke"/>
            ${doneUpTo > 0 ? `<path d="${pathFor(pts.slice(0, doneUpTo + 1))}" fill="none" stroke="#ec7fa3" stroke-width="5" stroke-dasharray="2 12" stroke-linecap="round" vector-effect="non-scaling-stroke"/>` : ''}
          </svg>
          ${nodeHtml}
        </div>
      </div>`;

    $$('.node', el).forEach((b) => {
      b.addEventListener('click', () => {
        const i = Number(b.dataset.i);
        if (b.classList.contains('locked')) {
          sfx('wrong');
          b.classList.remove('nope');
          void b.offsetWidth;
          b.classList.add('nope');
          toast(i === 8 ? 'Письмо откроется после всех уровней ✉️' : 'Сначала пройди предыдущий уровень 🔒');
          return;
        }
        sfx('pop');
        if (i === 8) go('final', null, { clouds: true });
        else go('level', i);
      });
    });

    const focusIdx = arg.unlocked != null ? arg.unlocked : Math.min(S.done, 8);
    const target = $(`.node[data-i="${focusIdx}"]`, el);
    if (target) {
      setTimeout(() => {
        const r = target.getBoundingClientRect();
        const y = window.scrollY + r.top - window.innerHeight / 2 + r.height / 2;
        window.scrollTo({ top: Math.max(0, y), behavior: reduceMotion ? 'auto' : 'smooth' });
      }, arg.first ? 500 : 250);
      if (arg.unlocked != null) {
        setTimeout(() => {
          target.classList.add('unlocking');
          sfx('correct');
          burstFrom($('.dot', target), ['✨', '💗', '⭐'], 14);
        }, 900);
      }
    }
  };

  function plural(n, one, few, many) {
    const m10 = n % 10, m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return one;
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return few;
    return many;
  }

  /* ═══════════════════════════════════════════
     SCREEN: Level dispatcher
     ═══════════════════════════════════════════ */
  SCREENS.level = (el, i) => {
    el.classList.add('with-hud');
    if (i > S.done) { // safety: never open a locked level
      el.innerHTML = '';
      setTimeout(() => go('map'), 0);
      return;
    }
    QUESTS[LEVELS[i].id](el, i);
  };

  const QUESTS = {};
  const PIN = 'M0 0C-2-7-13-12-13-23A13 13 0 1 1 13-23C13-12 2-7 0 0Z';

  /* ── Quest 1: First meeting ──────────────── */
  QUESTS.meet = (el, i) => {
    const cities = [
      { name: 'Köln', x: 162, y: 196, lx: -18, anchor: 'end' },
      { name: 'Bonn', x: 226, y: 290, lx: 18, anchor: 'start' },
      { name: 'Düsseldorf', x: 86, y: 66, lx: 18, anchor: 'start' },
      { name: 'Leverkusen', x: 182, y: 148, lx: 18, anchor: 'start' },
    ];
    const pins = cities.map((c) => `
      <g class="pin" data-city="${c.name}" transform="translate(${c.x} ${c.y})" role="button" tabindex="0" aria-label="${c.name}">
        <circle class="glow" cx="0" cy="-2" r="16" fill="#ec7fa3"/>
        <circle cx="0" cy="-14" r="26" fill="transparent"/>
        <g class="pin-body">
          <path d="${PIN}" fill="#fff" stroke="#ec7fa3" stroke-width="2.5"/>
          <circle class="pin-fill" cx="0" cy="-23" r="6" fill="#cbbcf5"/>
        </g>
        <text class="pin-label" x="${c.lx}" y="-16" text-anchor="${c.anchor}">${c.name}</text>
      </g>`).join('');

    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Германия')}
        <div class="scene card" style="padding:0">
          <svg class="de-map" viewBox="0 0 300 330" role="group" aria-label="Карта городов Германии">
            <defs>
              <linearGradient id="land" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4fbf3"/><stop offset="1" stop-color="#fdf3e7"/></linearGradient>
            </defs>
            <rect width="300" height="330" fill="#eaf2fb"/>
            <path d="M18 12 C80 0 190 6 280 18 C298 80 296 180 288 250 C282 300 250 324 200 326 C130 330 60 324 22 310 C6 240 4 120 18 12Z" fill="url(#land)" stroke="#e3d6c6" stroke-width="2" stroke-dasharray="5 6"/>
            <g opacity=".55">
              <ellipse cx="250" cy="80" rx="34" ry="22" fill="#dff1df"/>
              <ellipse cx="60" cy="250" rx="40" ry="26" fill="#dff1df"/>
              <ellipse cx="250" cy="215" rx="26" ry="18" fill="#e9e1fb"/>
            </g>
            <path d="M262 330 C246 312 232 300 226 284 C216 258 192 236 172 214 C154 194 160 172 168 156 C176 138 150 118 126 104 C104 92 84 82 82 62 C80 40 66 20 56 0" fill="none" stroke="#bfe0f5" stroke-width="12" stroke-linecap="round"/>
            <path class="river" d="M262 330 C246 312 232 300 226 284 C216 258 192 236 172 214 C154 194 160 172 168 156 C176 138 150 118 126 104 C104 92 84 82 82 62 C80 40 66 20 56 0" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>
            <text x="128" y="128" font-size="11" font-style="italic" fill="#7fb4d6" font-family="Nunito, sans-serif" font-weight="700" transform="rotate(32 128 128)">Rhein</text>
            <text x="22" y="320" font-size="10" fill="#b9a7c9" font-family="Nunito, sans-serif" font-weight="800" letter-spacing="1.5">NORDRHEIN-WESTFALEN</text>
            <g font-size="16" aria-hidden="true">
              <text x="232" y="62">🌳</text><text x="40" y="160">🌲</text><text x="244" y="250">🌳</text><text x="104" y="246">🌼</text><text x="214" y="118">🌷</text><text x="26" y="96">☁️</text>
            </g>
            <g transform="translate(262 300)" aria-hidden="true">
              <circle r="14" fill="#fff" stroke="#e3d6c6"/><path d="M0-10 3 0 0 10-3 0Z" fill="#ec7fa3"/><text y="-17" text-anchor="middle" font-size="8" font-weight="800" fill="#b9a7c9" font-family="Nunito, sans-serif">N</text>
            </g>
            ${pins}
          </svg>
        </div>
        <p class="q">В каком городе мы впервые встретились?</p>
        <div class="options">
          ${shuffle(cities).map((c) => `<button class="opt" type="button" data-city="${c.name}">📍 ${c.name}</button>`).join('')}
        </div>
        ${buddy('Подсказка: на карте можно нажимать прямо на города 📍')}
        <div class="next-slot next-wrap"></div>
      </div>`;

    let solved = false;
    const answer = (city) => {
      if (solved) return;
      const btn = $(`.opt[data-city="${city}"]`, el);
      const pin = $(`.pin[data-city="${city}"]`, el);
      if (city === 'Köln') {
        solved = true;
        $('.options', el).classList.add('locked');
        btn.classList.remove('is-wrong');
        btn.classList.add('is-right');
        pin.classList.add('is-right');
        sfx('correct');
        burstFrom(pin, ['💗', '✨', '⭐', '💖'], 18);
        say(el, 'Правильно! Именно здесь мы впервые встретились ❤️', 'good', 'happy');
        completeLevel(i, el);
      } else {
        sfx('wrong');
        [btn, pin].forEach((n) => { n.classList.remove('is-wrong'); void n.getBoundingClientRect(); n.classList.add('is-wrong'); });
        say(el, 'Хммм, кажется, GPS сегодня немного сломался 😂', 'bad', 'sad');
      }
    };
    $$('.opt', el).forEach((b) => b.addEventListener('click', () => answer(b.dataset.city)));
    $$('.pin', el).forEach((p) => {
      p.addEventListener('click', () => answer(p.dataset.city));
      p.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); answer(p.dataset.city); } });
    });
  };

  /* ── Quest 2: First hug ──────────────────── */
  QUESTS.hug = (el, i) => {
    const lat = parseFloat(CFG.lat), lng = parseFloat(CFG.lng);
    const hasCoords = isFinite(lat) && isFinite(lng);
    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Особое место')}
        <div class="scene card hug-map" style="padding:0">
          <div class="zoomer">
            <svg viewBox="0 0 300 315" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
              <rect width="300" height="315" fill="#f6f1e6"/>
              <path d="M-10 230 C60 210 90 260 160 250 C220 242 250 200 320 210 L320 330 L-10 330Z" fill="#cfe6f6"/>
              <path d="M-10 236 C60 216 90 266 160 256 C220 248 250 206 320 216" fill="none" stroke="#fff" stroke-width="2" stroke-dasharray="5 8" opacity=".8"/>
              <ellipse cx="70" cy="80" rx="62" ry="46" fill="#dcefd9"/>
              <ellipse cx="236" cy="108" rx="48" ry="34" fill="#e7f3e2"/>
              <ellipse cx="120" cy="190" rx="34" ry="18" fill="#e9e1fb"/>
              <g stroke="#fff" stroke-width="12" stroke-linecap="round" fill="none">
                <path d="M-10 150 C80 140 150 160 320 130"/>
                <path d="M186 -10 C176 60 190 120 184 330"/>
                <path d="M40 -10 C60 60 40 120 70 210"/>
              </g>
              <g stroke="#efe6d6" stroke-width="1.5" fill="none">
                <path d="M-10 150 C80 140 150 160 320 130"/>
                <path d="M186 -10 C176 60 190 120 184 330"/>
              </g>
              <g fill="#fbd3e0" stroke="#f2bccd" stroke-width="1.5">
                <rect x="210" y="160" width="26" height="22" rx="4"/><rect x="244" y="166" width="22" height="18" rx="4"/>
                <rect x="100" y="98" width="24" height="20" rx="4"/><rect x="130" y="104" width="20" height="16" rx="4"/>
              </g>
              <g fill="#e2d9fb" stroke="#d3c6f5" stroke-width="1.5">
                <rect x="218" y="40" width="28" height="22" rx="4"/><rect x="252" y="48" width="20" height="16" rx="4"/>
              </g>
              <g font-size="15">
                <text x="40" y="78">🌳</text><text x="76" y="62">🌳</text><text x="62" y="104">🌲</text><text x="226" y="114">🌳</text><text x="112" y="196">🌸</text><text x="262" y="268">⛵</text><text x="14" y="200">🌼</text>
              </g>
            </svg>
          </div>
          <div class="hug-pulse"></div>
          <div class="hug-pin"><svg viewBox="-16 -40 32 42"><path d="${PIN}" fill="#ec7fa3" stroke="#fff" stroke-width="2.5"/><path d="M0-15c-1.6-2.4-6-3-6.4 1-.3 3.2 4 5.8 6.4 7.6 2.4-1.8 6.7-4.4 6.4-7.6-.4-4-4.8-3.4-6.4-1z" transform="translate(0 -9)" fill="#fff"/></svg></div>
          <div class="hug-real"></div>
          <div class="hug-hint"><span class="hug-tag">📍 Здесь спрятано одно особенное место</span></div>
        </div>
        <div class="reveal-slot" style="display:flex;flex-direction:column;gap:14px"></div>
        <button class="btn block" type="button" data-a="show">Показать место 📍</button>
        <div class="next-slot next-wrap"></div>
      </div>`;

    // preload the photo; only shown if the file really exists
    let photoOk = false;
    if (CFG.photo) {
      const img = new Image();
      img.onload = () => { photoOk = img.naturalWidth > 0; };
      img.src = CFG.photo;
    }

    const showBtn = $('[data-a="show"]', el);
    showBtn.addEventListener('click', async () => {
      showBtn.disabled = true;
      sfx('whoosh');
      const map = $('.hug-map', el);
      $('.hug-hint', el).style.opacity = '0';
      map.classList.add('zoomed');
      await wait(reduceMotion ? 100 : 2300);
      showBtn.remove();
      sfx('magic');
      if (hasCoords) {
        const d = 0.0035;
        const real = $('.hug-real', el);
        real.innerHTML = `<iframe title="Карта места" loading="lazy" referrerpolicy="no-referrer"
          src="https://www.openstreetmap.org/export/embed.html?bbox=${lng - d}%2C${lat - d * 0.65}%2C${lng + d}%2C${lat + d * 0.65}&amp;layer=mapnik&amp;marker=${lat}%2C${lng}"></iframe>`;
        setTimeout(() => real.classList.add('show'), 600);
      }
      const slot = $('.reveal-slot', el);
      slot.innerHTML = `
        <div class="card reveal-text">
          <span class="ln" style="animation-delay:.1s">А здесь случился один из моментов, который я очень хочу сохранить в памяти.</span>
          <span class="ln hl" style="animation-delay:1.6s">Наши первые объятия ❤️</span>
        </div>`;
      slot.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
      await wait(reduceMotion ? 100 : 2400);
      burstFrom($('.hl', slot), ['💗', '✨', '🤗', '💖'], 16);
      sfx('heart');

      const placeName = (CFG.placeName || '').trim();
      const address = (CFG.address || '').trim();
      if (placeName || address || hasCoords) {
        const mapsUrl = hasCoords
          ? `https://maps.apple.com/?ll=${lat},${lng}&q=${encodeURIComponent(placeName || 'Особое место')}`
          : `https://maps.apple.com/?q=${encodeURIComponent(address || placeName)}`;
        slot.insertAdjacentHTML('beforeend', `
          <div class="card place-info appear">
            <div class="pi-ico">📍</div>
            <div style="flex:1;min-width:0">
              ${placeName ? `<div class="pi-name">${esc(placeName)}</div>` : ''}
              ${address ? `<div class="pi-addr">${esc(address)}</div>` : ''}
              <a class="pi-addr" href="${mapsUrl}" target="_blank" rel="noopener" style="color:var(--pink-600);font-weight:800">Открыть в Картах ↗</a>
            </div>
          </div>`);
      }
      if (photoOk) {
        slot.insertAdjacentHTML('beforeend', `
          <button class="polaroid" type="button" aria-label="Открыть фотографию">
            <span class="tape"></span>
            <img src="${esc(CFG.photo)}" alt="Наше фото" decoding="async" />
            <div class="cap">${esc((CFG.photoCaption || '').trim() || 'тот самый момент 🤍')}</div>
          </button>`);
        $('.polaroid', slot).addEventListener('click', () => openLightbox(CFG.photo));
      }
      completeLevel(i, el);
    });
  };

  function openLightbox(src) {
    sfx('pop');
    const lb = document.createElement('button');
    lb.type = 'button';
    lb.className = 'lightbox';
    lb.setAttribute('aria-label', 'Закрыть фото');
    lb.innerHTML = `<img src="${esc(src)}" alt="Наше фото" /><span class="close-hint">Нажми, чтобы закрыть</span>`;
    lb.addEventListener('click', () => lb.remove());
    document.body.appendChild(lb);
  }

  /* ── Quest 3: Bonn riddle ────────────────── */
  QUESTS.bonn = (el, i) => {
    const opts = [
      { k: 'rest', t: '🍝 В ресторан' },
      { k: 'walk', t: '🌳 На прогулку' },
      { k: 'home', t: '🏠 Домой' },
      { k: 'shop', t: '🛍️ В магазин' },
    ];
    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Bonn')}
        <div class="scene card bonn-scene" style="padding:0">
          <svg viewBox="0 0 290 200" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style="position:absolute;inset:0;width:100%;height:100%">
            <defs><linearGradient id="bsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e6ddff"/><stop offset="1" stop-color="#fde3ec"/></linearGradient></defs>
            <rect width="290" height="200" fill="url(#bsky)"/>
            <circle cx="244" cy="34" r="16" fill="#ffe3a3"/>
            <g fill="#fff" opacity=".9"><ellipse cx="60" cy="30" rx="26" ry="9"/><ellipse cx="74" cy="24" rx="14" ry="10"/><ellipse cx="170" cy="46" rx="20" ry="7"/></g>
            <path d="M0 132 C50 110 90 124 140 112 C190 100 240 118 290 106 L290 160 L0 160Z" fill="#dff1df"/>
            <rect x="0" y="150" width="290" height="20" fill="#f3e7d6"/>
            <path d="M0 160 h290" stroke="#e6d6c0" stroke-width="2" stroke-dasharray="8 8"/>
            <rect x="0" y="170" width="290" height="30" fill="#c9e4f6"/>
            <path d="M10 184 q10 -4 20 0 t20 0 M120 190 q10 -4 20 0 t20 0 M220 182 q10 -4 20 0 t20 0" stroke="#fff" stroke-width="1.5" fill="none" opacity=".8"/>
            <!-- city sign -->
            <g transform="translate(14 58)"><rect width="56" height="22" rx="5" fill="#ffe08a" stroke="#e8c45e" stroke-width="1.5"/><text x="28" y="15.5" text-anchor="middle" font-family="Nunito, sans-serif" font-size="12" font-weight="900" fill="#6b5a2b" letter-spacing="1">BONN</text><rect x="25" y="22" width="5" height="70" fill="#d8c9a8"/></g>
            <!-- restaurant -->
            <g transform="translate(78 92)"><rect width="46" height="58" rx="4" fill="#fff4ea" stroke="#f0d9c4" stroke-width="1.5"/><path d="M-4 14h54l-4-12h-46z" fill="#f7b5ca"/><path d="M4 2v12M14 2v12M24 2v12M34 2v12M44 2v12" stroke="#fff" stroke-width="3"/><rect x="16" y="34" width="14" height="24" rx="3" fill="#e9c9b0"/><text x="23" y="29" text-anchor="middle" font-size="11">🍝</text></g>
            <!-- shop -->
            <g transform="translate(132 98)"><rect width="40" height="52" rx="4" fill="#f1ebff" stroke="#dcd2f7" stroke-width="1.5"/><rect x="6" y="10" width="28" height="16" rx="3" fill="#fff"/><text x="20" y="22" text-anchor="middle" font-size="10">🛍️</text><rect x="13" y="32" width="14" height="20" rx="3" fill="#cbbcf5"/></g>
            <!-- park -->
            <g font-size="20"><text x="174" y="146">🌳</text></g>
            <!-- home -->
            <g transform="translate(206 76)"><path d="M-6 30 L32 2 L70 30Z" fill="#ec7fa3"/><rect x="2" y="28" width="60" height="46" rx="3" fill="#fff9f1" stroke="#f0d9c4" stroke-width="1.5"/><rect class="house-light" x="10" y="38" width="16" height="14" rx="2" fill="#e8e1f3"/><rect x="36" y="44" width="16" height="30" rx="3" fill="#c98f6e"/><circle cx="48" cy="60" r="1.6" fill="#ffe3a3"/><text x="32" y="22" text-anchor="middle" font-size="9" font-weight="900" fill="#fff" font-family="Nunito, sans-serif">ДОМ</text></g>
          </svg>
          <span class="dust d1">💨</span><span class="dust d2">💨</span><span class="dust d3">💨</span>
          <span class="home-heart">💗</span>
          <div class="runner">${mascot('idle')}</div>
        </div>
        <p class="q">Куда больше всего Камилла хотела в городе Bonn?</p>
        <div class="options">
          ${opts.map((o) => `<button class="opt" type="button" data-k="${o.k}">${o.t}</button>`).join('')}
        </div>
        ${buddy('Хмм… вспоминай хорошенько 🤔')}
        <div class="next-slot next-wrap"></div>
      </div>`;

    let solved = false;
    $$('.opt', el).forEach((b) => b.addEventListener('click', () => {
      if (solved) return;
      if (b.dataset.k === 'home') {
        solved = true;
        $('.options', el).classList.add('locked');
        b.classList.add('is-right');
        sfx('laugh');
        setTimeout(() => sfx('correct'), 500);
        say(el, 'АХАХАХ, ну конечно, домой! 😂', 'good', 'laugh');
        const scene = $('.bonn-scene', el);
        scene.classList.add('go-home');
        setMood($('.runner .mascot', el), 'laugh', false);
        setTimeout(() => burstFrom($('.home-heart', el), ['🏠', '😂', '💗', '✨'], 14), 1700);
        completeLevel(i, el);
      } else {
        sfx('wrong');
        b.classList.remove('is-wrong'); void b.offsetWidth; b.classList.add('is-wrong');
        setMood($('.runner .mascot', el), 'sad');
        say(el, 'Камилла, ну мы же знаем, куда ты на самом деле хотела 😂', 'bad', 'wow');
      }
    }));
  };

  /* ── Quest 4: Sushi or pizza ─────────────── */
  const SUSHI_SVG = `
    <svg viewBox="0 0 140 110" aria-hidden="true">
      <ellipse cx="70" cy="86" rx="62" ry="16" fill="#e7f3ee"/>
      <ellipse cx="70" cy="82" rx="60" ry="15" fill="#fff" stroke="#cfe9de" stroke-width="2"/>
      <g transform="translate(22 46)">
        <rect x="0" y="12" width="44" height="22" rx="11" fill="#fff" stroke="#eee6dc" stroke-width="2"/>
        <path d="M-2 18 C2 4 40 2 46 16 C48 22 40 22 22 22 C6 22 -3 23 -2 18Z" fill="#ff9e7a"/>
        <path d="M8 10 L12 20 M18 8 L22 19 M28 8 L32 19 M37 10 L40 18" stroke="#ffd0bd" stroke-width="2" stroke-linecap="round"/>
      </g>
      <g transform="translate(76 40)">
        <circle cx="20" cy="24" r="20" fill="#3e5a4a"/>
        <circle cx="20" cy="24" r="15" fill="#fff"/>
        <circle cx="20" cy="24" r="7" fill="#ff9e7a"/>
        <circle cx="17" cy="22" r="2.5" fill="#9ed8a8"/>
      </g>
      <g stroke="#d9a877" stroke-width="4" stroke-linecap="round"><path d="M28 30 L118 14"/><path d="M30 38 L120 24"/></g>
      <ellipse cx="44" cy="66" rx="5" ry="3" fill="#ffc0d4" opacity=".8"/><ellipse cx="66" cy="66" rx="5" ry="3" fill="#ffc0d4" opacity=".8"/>
      <circle cx="49" cy="62" r="2" fill="#4b3d5e"/><circle cx="61" cy="62" r="2" fill="#4b3d5e"/><path d="M52 66 q3 3 6 0" stroke="#4b3d5e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
    </svg>`;
  const PIZZA_SVG = `
    <svg viewBox="0 0 140 110" aria-hidden="true">
      <ellipse cx="70" cy="100" rx="40" ry="6" fill="rgba(200,140,80,.18)"/>
      <path d="M22 18 Q70 2 118 18 L72 100 Z" fill="#ffd36e" stroke="#f3b94c" stroke-width="2" stroke-linejoin="round"/>
      <path d="M20 16 Q70 -2 120 16 L116 26 Q70 10 24 26 Z" fill="#e9a35b" stroke="#d98d45" stroke-width="2" stroke-linejoin="round"/>
      <path d="M60 86 q2 10 -2 14" stroke="#ffd36e" stroke-width="5" stroke-linecap="round" fill="none"/>
      <circle cx="54" cy="40" r="8" fill="#ec6b6b"/><circle cx="88" cy="38" r="7" fill="#ec6b6b"/><circle cx="74" cy="64" r="7" fill="#ec6b6b"/>
      <circle cx="52" cy="38" r="2" fill="#f79393"/><circle cx="86" cy="36" r="2" fill="#f79393"/>
      <path d="M66 40 l4 -3 M98 50 l3 3 M60 58 l-3 2" stroke="#6cbf7a" stroke-width="3" stroke-linecap="round"/>
      <circle cx="62" cy="50" r="1.8" fill="#4b3d5e"/><circle cx="78" cy="50" r="1.8" fill="#4b3d5e"/><path d="M67 54 q3 3 6 0" stroke="#4b3d5e" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="57" cy="55" rx="4" ry="2.5" fill="#ffaab8" opacity=".8"/><ellipse cx="83" cy="55" rx="4" ry="2.5" fill="#ffaab8" opacity=".8"/>
    </svg>`;
  QUESTS.food = (el, i) => {
    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Вкусный выбор')}
        <p class="subtitle">Настал момент действительно сложного выбора…</p>
        <p class="q">Что сегодня выбирает Камилла?</p>
        <div class="food-grid">
          <button class="food sushi wiggle" type="button" data-k="sushi" aria-label="Суши">
            <span class="sad-face">🥺</span>${SUSHI_SVG}<span class="fname">Суши</span><span class="femoji">🍣</span>
          </button>
          <button class="food pizza wiggle" type="button" data-k="pizza" aria-label="Пицца">
            <span class="sad-face">🥺</span>${PIZZA_SVG}<span class="fname">Пицца</span><span class="femoji">🍕</span>
          </button>
        </div>
        ${buddy('Оба варианта прекрасны… Но выбрать нужно что-то одно 😏')}
        <div class="next-slot next-wrap"></div>
      </div>`;
    const reactions = {
      sushi: 'Суши! 🍣 Отличный выбор! Хотя пицца тоже немного расстроилась 😂',
      pizza: 'Пицца! 🍕 Отличный выбор! Хотя суши тоже немного расстроились 😂',
    };
    $$('.food', el).forEach((card) => card.addEventListener('click', () => {
      const grid = $('.food-grid', el);
      if (grid.classList.contains('chosen')) return;
      grid.classList.add('chosen');
      const k = card.dataset.k;
      $$('.food', el).forEach((c) => {
        c.classList.remove('wiggle');
        c.classList.add(c === card ? 'picked' : 'other');
      });
      S.answers.food = k;
      save();
      sfx('correct');
      burstFrom(card, k === 'sushi' ? ['🍣', '🍙', '✨', '💗'] : ['🍕', '🧀', '✨', '💗'], 18);
      say(el, reactions[k], 'good', 'happy');
      completeLevel(i, el);
    }));
  };

  /* ── Quest 5: The phrase ─────────────────── */
  QUESTS.phrase = (el, i) => {
    const WORDS = ['Я', 'хотел', 'лечь', 'но', 'потом', 'передумать'];
    const items = WORDS.map((t, id) => ({ id, t }));
    let bank = shuffle(items);
    while (bank.every((w, k) => w.id === k)) bank = shuffle(items);
    let placed = [];
    let solved = false;

    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Внутренняя шутка')}
        <p class="q">А теперь попробуй вспомнить одну очень интересную фразу…</p>
        <p class="subtitle" style="font-size:15px;margin-top:-8px">Нажимай на слова по порядку или перетаскивай их на листочек ✍️</p>
        <div class="slots" aria-label="Собранная фраза"></div>
        <div class="bank" aria-label="Слова"></div>
        <div class="btn-row">
          <button class="btn soft" type="button" data-a="reset">Сбросить</button>
          <button class="btn" type="button" data-a="check" disabled>Проверить</button>
        </div>
        ${buddy('Я в тебя верю! Эту фразу невозможно забыть 😂')}
        <div class="next-slot next-wrap"></div>
      </div>`;
    const slotsEl = $('.slots', el);
    const bankEl = $('.bank', el);
    const checkBtn = $('[data-a="check"]', el);
    const resetBtn = $('[data-a="reset"]', el);

    function render() {
      slotsEl.innerHTML = placed.length
        ? placed.map((w) => `<button class="word" type="button" data-id="${w.id}">${w.t}</button>`).join('')
        : '<span class="placeholder">Собери фразу здесь 👇</span>';
      bankEl.innerHTML = bank.map((w) => `<button class="word" type="button" data-id="${w.id}">${w.t}</button>`).join('');
      checkBtn.disabled = placed.length !== WORDS.length || solved;
      slotsEl.classList.remove('bad');
    }
    const findIn = (arr, id) => arr.findIndex((w) => w.id === id);
    function moveTo(id, target, beforeId) {
      let w;
      let k = findIn(bank, id);
      if (k > -1) w = bank.splice(k, 1)[0];
      else { k = findIn(placed, id); w = placed.splice(k, 1)[0]; }
      const arr = target === 'slots' ? placed : bank;
      const bi = beforeId != null ? findIn(arr, beforeId) : -1;
      if (bi > -1) arr.splice(bi, 0, w); else arr.push(w);
      sfx('tap');
      render();
    }

    // Tap or drag (pointer events work for touch + mouse)
    let drag = null;
    function onDown(e) {
      const btn = e.target.closest('.word');
      if (!btn || solved) return;
      drag = { id: Number(btn.dataset.id), from: btn.closest('.slots') ? 'slots' : 'bank', x: e.clientX, y: e.clientY, btn, moved: false, ghost: null, pid: e.pointerId };
    }
    function onMove(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      if (!drag.moved && Math.hypot(dx, dy) > 8) {
        drag.moved = true;
        drag.btn.classList.add('dragging');
        const g = drag.btn.cloneNode(true);
        g.classList.remove('dragging');
        g.classList.add('drag-ghost');
        document.body.appendChild(g);
        drag.ghost = g;
      }
      if (drag.moved) {
        e.preventDefault();
        drag.ghost.style.left = e.clientX + 'px';
        drag.ghost.style.top = e.clientY + 'px';
        const over = document.elementFromPoint(e.clientX, e.clientY);
        slotsEl.classList.toggle('drop-hover', !!(over && over.closest('.slots')));
      }
    }
    function onUp(e) {
      if (!drag || e.pointerId !== drag.pid) return;
      const d = drag;
      drag = null;
      slotsEl.classList.remove('drop-hover');
      if (d.ghost) d.ghost.remove();
      if (!d.moved) {
        moveTo(d.id, d.from === 'bank' ? 'slots' : 'bank');
        return;
      }
      d.btn.classList.remove('dragging');
      const over = document.elementFromPoint(e.clientX, e.clientY);
      if (over && over.closest('.slots')) {
        const ow = over.closest('.word');
        const beforeId = ow && Number(ow.dataset.id) !== d.id ? Number(ow.dataset.id) : null;
        moveTo(d.id, 'slots', beforeId);
      } else if (over && over.closest('.bank')) {
        moveTo(d.id, 'bank');
      } else {
        render();
      }
    }
    function onCancel() {
      if (!drag) return;
      if (drag.ghost) drag.ghost.remove();
      drag = null;
      slotsEl.classList.remove('drop-hover');
      render();
    }
    // Words handle clicks via pointer events; block the synthetic click
    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onCancel);
    el._cleanup = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onCancel);
    };
    // keyboard support
    el.addEventListener('keydown', (e) => {
      const btn = e.target.closest && e.target.closest('.word');
      if (!btn || solved || (e.key !== 'Enter' && e.key !== ' ')) return;
      e.preventDefault();
      moveTo(Number(btn.dataset.id), btn.closest('.slots') ? 'bank' : 'slots');
    });

    resetBtn.addEventListener('click', () => {
      if (solved) return;
      bank = shuffle(items);
      placed = [];
      sfx('pop');
      render();
    });
    checkBtn.addEventListener('click', () => {
      if (solved) return;
      const ok = placed.map((w) => w.t).join(' ') === WORDS.join(' ');
      if (ok) {
        solved = true;
        slotsEl.classList.add('good');
        render();
        slotsEl.classList.add('good');
        bankEl.hidden = true;
        resetBtn.closest('.btn-row').hidden = true;
        sfx('laugh');
        setTimeout(() => sfx('correct'), 450);
        slotsEl.insertAdjacentHTML('afterend', '<p class="phrase-final appear">«Я хотел лечь, но потом передумать»</p>');
        burstFrom(slotsEl, ['😂', '🤣', '💗', '✨'], 22);
        say(el, 'АХАХАХА, ну эту фразу мы точно не забудем 😂❤️', 'good', 'laugh');
        completeLevel(i, el);
      } else {
        sfx('wrong');
        slotsEl.classList.remove('bad'); void slotsEl.offsetWidth; slotsEl.classList.add('bad');
        say(el, pick([
          'Хмм, почти! Кажется, слова немного перепутались 😅 Попробуй ещё раз',
          'Не-а 😂 Звучит интересно, но фраза была другая! Нажми на слово, чтобы вернуть его',
          'Почти-почти! Поменяй пару слов местами 🤔',
        ]), 'bad', 'sad');
      }
    });
    render();
  };

  /* ── Quest 6: What I value ───────────────── */
  QUESTS.value = (el, i) => {
    const opts = ['Твоя улыбка', 'Твоя нежность', 'Твой характер', 'То, какая ты есть'];
    const icons = ['😊', '🌷', '✨', '💖'];
    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Небольшой вопрос')}
        <p class="q">Как думаешь, что мне больше всего нравится в тебе?</p>
        <div class="options single">
          ${opts.map((t, k) => `<button class="opt" type="button" data-k="${k}">${icons[k]} ${t}</button>`).join('')}
        </div>
        <div class="msg-slot"></div>
        <div class="next-slot next-wrap"></div>
      </div>`;
    let chosen = false;
    $$('.opt', el).forEach((b) => b.addEventListener('click', () => {
      if (chosen) return;
      chosen = true;
      $('.options', el).classList.add('locked');
      $$('.opt', el).forEach((o) => o.classList.add(o === b ? 'is-picked' : 'is-dim'));
      S.answers.value = opts[Number(b.dataset.k)];
      save();
      sfx('heart');
      burstFrom(b, ['💗', '✨', '🌸'], 12);
      $('.msg-slot', el).innerHTML = `
        <div class="card value-msg appear">
          На самом деле, мне нравится очень многое.
          <span class="hl">Но больше всего я ценю то, что ты просто есть в моей жизни.</span>
        </div>`;
      setTimeout(() => { rain(['💗', '🌸', '✨', '💕', '🌷'], 22); sfx('magic'); }, 400);
      completeLevel(i, el);
    }));
  };

  /* ── Quest 7: Five hearts ────────────────── */
  QUESTS.hearts = (el, i) => {
    const MESSAGES = [
      'Ты делаешь меня счастливее.',
      'С тобой даже обычные дни становятся особенными.',
      'Я очень ценю твою нежность.',
      'Мне дороги все наши моменты.',
      'Я очень рад, что встретил тебя.',
    ];
    const OBJS = [
      { id: 'cloud', e: '☁️', x: 20, y: 11, fs: 44, heart: true, label: 'Облачко' },
      { id: 'sun', e: '🌞', x: 84, y: 10, fs: 38, msg: 'Солнышко просто светит для тебя ☀️', label: 'Солнце' },
      { id: 'butterfly', e: '🦋', x: 54, y: 22, fs: 30, msg: 'Бабочка улетела дальше 🦋', label: 'Бабочка' },
      { id: 'tree', e: '🌳', x: 18, y: 42, fs: 56, heart: true, label: 'Дерево' },
      { id: 'house', e: '🏡', x: 76, y: 40, fs: 52, msg: 'Дома никого… все ушли искать сердечки 😄', label: 'Домик' },
      { id: 'mailbox', e: '📮', x: 48, y: 52, fs: 38, heart: true, label: 'Почтовый ящик' },
      { id: 'cat', e: '🐈', x: 30, y: 69, fs: 38, msg: 'Кот говорит, что это его территория 😼', label: 'Кот' },
      { id: 'mushroom', e: '🍄', x: 62, y: 72, fs: 32, msg: 'Это просто гриб. Очень красивый гриб 🍄', label: 'Гриб' },
      { id: 'basket', e: '🧺', x: 86, y: 66, fs: 38, heart: true, label: 'Корзинка' },
      { id: 'flower', e: '🌷', x: 12, y: 86, fs: 40, heart: true, label: 'Тюльпан' },
      { id: 'cup', e: '☕', x: 46, y: 88, fs: 32, msg: 'Чай уже остыл… но сердечка тут нет ☕', label: 'Чашка' },
      { id: 'sunflower', e: '🌻', x: 84, y: 88, fs: 38, msg: 'Тут только пчёлы. Пчёлы заняты 🐝', label: 'Подсолнух' },
    ];
    const replay = S.done > i;
    let found = replay ? [] : S.hearts.filter((id) => OBJS.some((o) => o.id === id && o.heart));
    let finished = false;

    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Поиски')}
        <p class="q">Где-то здесь спрятаны пять маленьких сердечек 💗</p>
        <div class="heart-counter" aria-label="Найдено сердечек">${'<span>💗</span>'.repeat(5)}</div>
        <div class="scene card garden" style="padding:0">
          <svg class="bg" viewBox="0 0 300 336" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 150 C60 120 120 150 170 130 C220 112 260 132 300 120 L300 336 L0 336Z" fill="#f3e9ff" opacity=".9"/>
            <path d="M0 190 C70 170 130 200 190 182 C240 168 270 180 300 172 L300 336 L0 336Z" fill="#e3f4e6"/>
            <path d="M0 256 C80 236 160 262 220 248 C260 240 285 246 300 242 L300 336 L0 336Z" fill="#d6efdc"/>
            <path d="M150 336 C140 300 170 280 150 250 C135 228 160 210 150 190" stroke="#fbf1e3" stroke-width="18" fill="none" stroke-linecap="round"/>
            <g stroke="#e9d6c2" stroke-width="3" stroke-linecap="round"><path d="M200 220 v18 M214 218 v18 M228 216 v18 M242 214 v18"/><path d="M196 226 h50"/></g>
            <g fill="#bfe3c6"><path d="M30 300 l4 -10 l4 10z"/><path d="M250 290 l4 -10 l4 10z"/><path d="M110 230 l3 -8 l3 8z"/></g>
          </svg>
          ${OBJS.map((o, k) => `<button class="obj" type="button" data-id="${o.id}" aria-label="${o.label}" style="left:${o.x}%;top:${o.y}%;--fs:${o.fs}px;--dl:${(-k * 0.37).toFixed(2)}s">${o.e}</button>`).join('')}
        </div>
        ${buddy('Нажимай на всё подряд — облака, деревья, даже на кота 🔍')}
        <div class="messages"></div>
        <div class="next-slot next-wrap"></div>
      </div>`;

    const counter = $$('.heart-counter span', el);
    const msgs = $('.messages', el);
    const scene = $('.garden', el);
    function addMsg(n, animate) {
      counter[n].classList.add('on');
      const d = document.createElement('div');
      d.className = 'msg';
      if (!animate) d.style.animation = 'none';
      d.innerHTML = `<span class="n">💗</span><span>${MESSAGES[n]}</span>`;
      msgs.appendChild(d);
    }
    found.forEach((id, n) => {
      addMsg(n, false);
      $(`.obj[data-id="${id}"]`, el).classList.add('found');
    });
    function peek(btn, text) {
      $$('.peek', scene).forEach((p) => p.remove());
      const p = document.createElement('span');
      p.className = 'peek';
      p.textContent = text;
      const left = parseFloat(btn.style.left);
      p.style.left = Math.min(78, Math.max(22, left)) + '%';
      p.style.top = btn.style.top;
      scene.appendChild(p);
      setTimeout(() => p.remove(), 1900);
    }
    function finish(animate) {
      finished = true;
      say(el, 'Ты нашла все пять сердечек! 💗 Каждое из них — правда.', 'good', animate ? 'happy' : null);
      if (animate) { setTimeout(() => { sfx('fanfare'); rain(); }, 300); }
      completeLevel(i, el);
    }
    if (found.length === 5) finish(false);

    $$('.obj', el).forEach((btn) => btn.addEventListener('click', () => {
      const o = OBJS.find((x) => x.id === btn.dataset.id);
      btn.classList.remove('tapped'); void btn.offsetWidth; btn.classList.add('tapped');
      if (o.heart && !found.includes(o.id)) {
        found.push(o.id);
        if (!replay) { S.hearts = found.slice(); save(); }
        btn.classList.add('found');
        const h = document.createElement('span');
        h.className = 'found-heart';
        h.textContent = '💗';
        h.style.left = btn.style.left;
        h.style.top = btn.style.top;
        scene.appendChild(h);
        setTimeout(() => h.remove(), 1400);
        sfx('heart');
        burstFrom(btn, ['💗', '✨', '💖'], 10);
        addMsg(found.length - 1, true);
        if (found.length === 5) finish(true);
        else say(el, `Сердечко ${found.length} из 5! Ищи дальше 🔍`, 'good', 'happy');
      } else if (o.heart) {
        sfx('tap');
        peek(btn, 'Это сердечко уже найдено 💗');
      } else {
        sfx('pop');
        peek(btn, o.msg);
      }
    }));
  };

  /* ── Quest 8: One wish ───────────────────── */
  QUESTS.wish = (el, i) => {
    const MAX = 300;
    el.innerHTML = `
      <div class="wrap">
        ${levelHead(i, 'Мечты')}
        <div class="card" style="display:flex;flex-direction:column;gap:16px">
          <p class="q" style="font-size:19px">Если бы мы могли прямо сейчас отправиться куда угодно или сделать что угодно вместе, что бы ты выбрала?</p>
          <div class="wish-form" style="display:flex;flex-direction:column;gap:14px">
            <label for="wish" class="sr" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)">Твоё желание</label>
            <textarea id="wish" class="wish-input" maxlength="${MAX}" rows="4" placeholder="Напиши здесь своё желание… ✨" enterkeyhint="done"></textarea>
            <div class="char-count"><span data-c>0</span> / ${MAX}</div>
            <button class="btn block" type="button" data-a="send" disabled>Отправить желание 🌠</button>
          </div>
          <div class="wish-result" hidden></div>
        </div>
        <div class="next-slot next-wrap"></div>
      </div>`;
    const ta = $('#wish', el);
    const send = $('[data-a="send"]', el);
    const form = $('.wish-form', el);
    const result = $('.wish-result', el);
    const count = $('[data-c]', el);
    const sync = () => { count.textContent = ta.value.length; send.disabled = !ta.value.trim(); };
    ta.addEventListener('input', sync);
    ta.value = S.answers.wish || '';
    sync();

    function showResult(animate) {
      const text = ta.value.trim();
      form.hidden = true;
      result.hidden = false;
      const stars = Array.from({ length: 18 }, () => `<span class="star" style="left:${rand(4, 96).toFixed(1)}%;top:${rand(4, 90).toFixed(1)}%;animation-delay:${rand(-3, 0).toFixed(2)}s"></span>`).join('');
      result.innerHTML = `
        <div class="wish-card">
          ${stars}<span class="shoot"></span>
          <div class="wc-label">Твоё желание</div>
          <div class="wc-text">«${esc(text)}»</div>
          <div class="wc-foot">Записано на звёздах ✨ Обязательно запомню!</div>
        </div>
        <button class="btn soft block" type="button" data-a="edit" style="margin-top:12px">✏️ Изменить</button>`;
      $('[data-a="edit"]', result).addEventListener('click', () => {
        sfx('tap');
        result.hidden = true;
        form.hidden = false;
        ta.focus();
      });
      if (animate) {
        sfx('magic');
        burstFrom($('.wish-card', result), ['⭐', '✨', '🌠', '💫'], 18);
      }
      completeLevel(i, el);
    }
    send.addEventListener('click', () => {
      if (!ta.value.trim()) return;
      ta.blur();
      S.answers.wish = ta.value.trim();
      save();
      showResult(true);
    });
  };

  /* ═══════════════════════════════════════════
     SCREEN: Final — the letter
     ═══════════════════════════════════════════ */
  const LETTER = [
    'Камилла ❤️',
    'Я просто хочу, чтобы ты знала, насколько сильно я тебя ценю. Ты стала очень дорогим и важным человеком в моей жизни, и я безумно рад, что именно с тобой могу разделять столько разных моментов.',
    'Мне нравится всё, что мы переживаем вместе: наши разговоры, смех, маленькие моменты и даже те дни, когда всё не так идеально. Я очень рад, что могу проживать всё это вместе с тобой.',
    'Спасибо тебе за то, что ты есть в моей жизни. Я искренне дорожу тобой и каждым моментом, который мы проводим вместе. И знаешь, я очень хочу, чтобы впереди у нас было ещё много-много таких моментов. ❤️',
  ];

  SCREENS.final = (el) => {
    if (S.done < TOTAL) { setTimeout(() => go('map'), 0); return; }
    el.classList.add('with-hud', 'final');
    document.body.classList.add('night');
    document.querySelector('meta[name="theme-color"]').setAttribute('content', '#211a48');

    // Night backdrop lives on <body> so it is never clipped by screen transforms
    const night = document.createElement('div');
    night.className = 'night-layer';
    const stars = Array.from({ length: 70 }, () => {
      const s = rand(1, 2.8).toFixed(1);
      return `<span class="st" style="left:${rand(0, 100).toFixed(1)}%;top:${rand(0, 75).toFixed(1)}%;width:${s}px;height:${s}px;--t:${rand(2, 5).toFixed(1)}s;--dl:${rand(-5, 0).toFixed(1)}s"></span>`;
    }).join('');
    const flies = Array.from({ length: 9 }, () => `<span class="firefly" style="left:${rand(5, 92).toFixed(1)}%;top:${rand(55, 92).toFixed(1)}%;--t:${rand(7, 12).toFixed(1)}s;--dl:${rand(-10, 0).toFixed(1)}s"></span>`).join('');
    night.innerHTML = `
      <div class="night-bg" aria-hidden="true">${stars}<div class="moon"></div>${flies}</div>
      <div class="night-flowers" aria-hidden="true">
        <svg viewBox="0 0 400 120" preserveAspectRatio="xMidYMax slice">
          <path d="M0 80 C80 60 140 90 220 74 C290 60 340 78 400 70 L400 120 L0 120Z" fill="#2c2358"/>
          <path d="M0 98 C90 84 170 104 260 92 C320 84 360 92 400 88 L400 120 L0 120Z" fill="#251d4c"/>
          <g stroke="#4b6a5a" stroke-width="2" fill="none">
            <path d="M30 104 q-2 -20 4 -34"/><path d="M62 100 q3 -16 -2 -28"/><path d="M340 98 q-3 -18 3 -30"/><path d="M372 102 q2 -16 -3 -26"/><path d="M300 104 q1 -12 -2 -20"/><path d="M100 104 q2 -12 -1 -18"/>
          </g>
          <g>
            <circle cx="34" cy="68" r="7" fill="#f7a6c3"/><circle cx="34" cy="68" r="2.5" fill="#ffe3a3"/>
            <circle cx="60" cy="70" r="6" fill="#cbbcf5"/><circle cx="60" cy="70" r="2" fill="#fff"/>
            <circle cx="343" cy="66" r="7" fill="#cbbcf5"/><circle cx="343" cy="66" r="2.5" fill="#ffe3a3"/>
            <circle cx="369" cy="74" r="6" fill="#f7a6c3"/><circle cx="369" cy="74" r="2" fill="#fff"/>
            <circle cx="298" cy="82" r="5" fill="#ffd6e6"/><circle cx="99" cy="84" r="5" fill="#ffd6e6"/>
          </g>
        </svg>
      </div>`;
    night.style.cssText = 'position:fixed;inset:0;z-index:0;pointer-events:none';
    document.body.insertBefore(night, document.body.firstChild);

    el.innerHTML = `
      <div class="wrap">
        <p class="lead appear" style="animation-delay:.3s">Ты прошла весь путь.<span class="hand">Но самое главное я оставил напоследок.</span></p>
        <div class="envelope-stage appear" style="animation-delay:.7s">
          <div class="envelope">
            <div class="env-back"></div>
            <div class="letter-peek"></div>
            <div class="env-front"></div>
            <div class="env-flap"></div>
            <div class="seal">❤</div>
          </div>
        </div>
        <button class="btn block appear" type="button" data-a="open" style="max-width:360px;animation-delay:1.1s">Открыть письмо ✉️</button>
        <div class="letter-slot" style="width:100%;display:flex;flex-direction:column;align-items:center;gap:26px"></div>
      </div>`;

    el._cleanup = () => {
      document.body.classList.remove('night');
      document.querySelector('meta[name="theme-color"]').setAttribute('content', '#fde8ef');
      night.remove();
    };

    setTimeout(() => sfx('magic'), 600);
    const openBtn = $('[data-a="open"]', el);
    openBtn.addEventListener('click', async () => {
      openBtn.disabled = true;
      openBtn.style.opacity = '0';
      const env = $('.envelope-stage', el);
      sfx('pop');
      env.classList.add('open');
      await wait(300);
      sfx('whoosh');
      await wait(reduceMotion ? 200 : 1500);
      sfx('magic');
      burstFrom(env, ['✨', '💗', '⭐', '🌸'], 20);
      env.classList.add('gone');
      $('.lead', el).style.transition = 'opacity .6s';
      $('.lead', el).style.opacity = '0';
      await wait(650);
      $('.lead', el).remove();
      env.remove();
      openBtn.remove();
      window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
      writeLetter($('.letter-slot', el));
      S.letterRead = true;
      save();
    });
  };

  function writeLetter(slot) {
    let delay = 0.5;
    const STEP = reduceMotion ? 0 : 0.085;
    const paras = LETTER.map((p, k) => {
      const words = p.split(' ').map((w) => {
        const span = `<span class="w" style="animation-delay:${delay.toFixed(2)}s">${esc(w)}</span>`;
        delay += STEP;
        return span;
      }).join(' ');
      delay += reduceMotion ? 0 : 0.5;
      return `<p${k === 0 ? ' class="greet"' : ''}>${words}</p>`;
    }).join('');
    const total = delay;
    slot.innerHTML = `
      <article class="paper" aria-label="Письмо">
        <div class="ink">${paras}</div>
      </article>
      <p class="ending">И это только начало нашей истории…</p>
      <div class="final-actions">
        <button class="btn soft block" type="button" data-a="map">🗺️ Вернуться к карте</button>
        <button class="btn soft block" type="button" data-a="again">🔄 Пройти игру заново</button>
      </div>`;
    const paper = $('.paper', slot);
    let shown = false;
    const showEnding = () => {
      if (shown) return;
      shown = true;
      $('.ending', slot).classList.add('show');
      $('.final-actions', slot).classList.add('show');
      sfx('fanfare');
      setTimeout(() => rain(['💗', '✨', '⭐', '🌸', '💫'], 30), 500);
    };
    const t = setTimeout(showEnding, (total + 0.8) * 1000);
    // tap the letter to finish writing instantly
    paper.addEventListener('click', () => {
      $$('.w', paper).forEach((w) => { w.style.animationDelay = '0s'; });
      clearTimeout(t);
      setTimeout(showEnding, 700);
    });
    $('[data-a="map"]', slot).addEventListener('click', () => { sfx('tap'); go('map', null, { clouds: true }); });
    $('[data-a="again"]', slot).addEventListener('click', async () => {
      sfx('tap');
      const ok = await confirmDialog({ emoji: '🔄', title: 'Пройти заново?', text: 'Прогресс сбросится, и приключение начнётся с самого начала.', yes: 'Да, заново' });
      if (ok) { resetProgress(); go('intro', null, { clouds: true }); }
    });
  }

  /* ── Boot ────────────────────────────────── */
  syncSoundBtn();
  go('intro');
})();
