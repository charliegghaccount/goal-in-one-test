import { developerPanel } from './developer';
import { loadPhysics, type PhysicsConfig } from './physics';
let activePhysics = loadPhysics();
const developerMode = new URLSearchParams(location.search).has('dev');
const logoUrl = new URL('./assets/logo.svg', import.meta.url).href;
const ballArtUrl = new URL('./assets/football.svg', import.meta.url).href;
import './style.css';
import { levels, arenaPolygon, segments, WALL_WIDTH, type Level, type Point } from './levels';
import { FootballSimulation, MAX_PULL, rating, STEP } from './simulation';
import { Renderer, viewBounds } from './render';
import { Audio } from './audio';
import { readProgress, recordBest, saveProgress } from './progress';
const app = document.querySelector<HTMLDivElement>('#app')!;
const audio = new Audio(),
  progress = readProgress();
audio.enabled = progress.sound;
let screen: 'home' | 'levels' | 'game' = 'home',
  sim: FootballSimulation,
  renderer: Renderer | null = null;
let pull: Point | null = null,
  dragging = false,
  activePointer: number | null = null,
  aimOrigin: Point | null = null,
  aimScale = 1,
  resultShown = false;
let roundSerial = 0;
let last = performance.now(),
  accumulator = 0,
  currentId = 1,
  levelPage = 0,
  precise = false,
  aimAngle = 35,
  aimPower = 75,
  storageOK = saveProgress(progress);
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const paths: Record<string, string> = {
  ball: '<circle cx="12" cy="12" r="9"/><path d="m12 7 4.7 3.4-1.8 5.5H9.1l-1.8-5.5zM12 3v4M3.5 9l3.8 1.4M6.5 19l2.6-3.1m8.4 3.1-2.6-3.1M20.5 9l-3.8 1.4"/>',
  net: '<path d="M3 20V5h18v15zM3 10h18M3 15h18M9 5v15m6-15v15"/>',
  arrow: '<path d="M4 12h16m-6-6 6 6-6 6"/>',
  back: '<path d="m14 6-6 6 6 6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>',
  restart: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  sound: '<path d="m11 4-5 4H3v8h3l5 4zM16 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"/>',
  mute: '<path d="m11 4-5 4H3v8h3l5 4zm5 5 6 6m0-6-6 6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4 2c-1.5.7-1.5 1.5-1.5 2M12 17h.01"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
  star: '<path d="m12 2 3 6.3 7 .9-5.1 4.9 1.3 6.9-6.2-3.3L5.8 21l1.3-6.9L2 9.2l7-.9z"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  aim: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 1v4m0 14v4M1 12h4m14 0h4"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  zoom: '<path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5"/>',
  play: '<path d="m8 4 12 8-12 8z"/>',
  mouse: '<rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7"/>',
};
function icon(name: string, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.ball}</svg>`;
}
function stars(n: number) {
  return `<span class="stars" aria-label="${n} out of 3 stars">${[1, 2, 3].map((i) => icon('star', i <= n ? 'earned' : '')).join('')}</span>`;
}
function button(action: string, label: string, i: string, cls = 'icon-button') {
  return `<button type="button" data-action="${action}" class="${cls}" title="${label}" aria-label="${label}">${icon(i)}</button>`;
}
function header() {
  return `<header class="topbar"><button class="brand" data-action="home" aria-label="Goal In One home"><span class="brand-mark">${icon('ball')}</span><span>GOAL<span class="brand-in">IN</span>ONE<span class="brand-dot">.</span><small>FOOTBALL PHYSICS.</small></span></button><span class="nav-tag">BIG IDEAS. BEAUTIFUL GOALS.</span><nav aria-label="Main navigation"><button class="text-button" data-action="levels">${icon('grid')} <span>LEVELS</span></button><span class="nav-divider"></span>${button('sound', progress.sound ? 'Mute sound' : 'Enable sound', progress.sound ? 'sound' : 'mute', 'icon-button sound-button')}${button('settings', 'Settings', 'aim')}${button('help', 'How to play', 'help')}</nav></header>`;
}
function persist() {
  storageOK = saveProgress(progress);
}
function cancelDrag() {
  dragging = false;
  activePointer = null;
  pull = null;
  aimOrigin = null;
}
function cleanup() {
  cancelDrag();
  audio.stopVoice();
  renderer = null;
  sim?.destroy();
  document.querySelector('.modal-backdrop')?.remove();
  accumulator = 0;
}
function totalStars() {
  return levels.reduce((s, l) => s + (progress.best[l.id] ? rating(progress.best[l.id], l) : 0), 0);
}
function home() {
  cleanup();
  screen = 'home';
  const completed = Object.keys(progress.best).length,
    next = levels.find((l) => !progress.best[l.id])?.id ?? 1;
  app.innerHTML = `${header()}<main class="home park-home"><section class="hero-copy"><div class="eyebrow">PARK & TREELINE</div><h1><img class="game-logo" src="${logoUrl}" alt="Goal In One"/></h1><p>One ball. ${levels.length} goals. Your perfect shot.</p><div class="hero-actions"><button class="primary" data-action="play" data-id="${next}">${icon('play')} ${completed ? 'CONTINUE' : 'PLAY'}</button><button class="secondary" data-action="levels">${icon('grid')} LEVEL SELECT</button><button class="secondary" data-action="settings">${icon('aim')} SETTINGS</button></div><div class="hero-note">DRAG BACK. LET GO. GOAL.</div>${completed ? `<div class="home-progress">${completed} / ${levels.length} GOALS · ${totalStars()} STARS</div>` : ''}</section><img class="park-football" src="${ballArtUrl}" alt="" aria-hidden="true"/></main><footer class="site-footer"><span>${levels.length} ARENAS · UNLIMITED KICKS</span><span>ONE MORE PERFECT SHOT.</span></footer>`;

  bind();
}
function miniLevel(l: Level) {
  const b = viewBounds(l),
    g = l.goal;
  const path = (p: Point[]) => p.map((v, i) => `${i ? 'L' : 'M'}${v.x} ${v.y}`).join(' ') + ' Z';
  return `<svg viewBox="${b.x} ${b.y} ${b.w} ${b.h}" aria-hidden="true" class="mini-course"><rect x="0" y="0" width="1280" height="720" fill="transparent"/><path d="${path(arenaPolygon(l))}" fill="#e1f8ff55"/>${l.obstacles.map((o) => `<path d="${path(o.points)}" fill="#bc8244"/>`).join('')}${segments(
    l,
  )
    .map(
      (s) =>
        `<path d="M${s.a.x} ${s.a.y} L${s.b.x} ${s.b.y}" stroke="${s.kind === 'goal' ? '#48df35' : '#8b542a'}" stroke-width="${WALL_WIDTH}" stroke-linecap="round"/>`,
    )
    .join(
      '',
    )}${l.surfaces.map((s) => `<path d="M${s.x} ${s.y - 6}h${s.w}" stroke="${s.kind === 'forward' ? '#83d44b' : s.kind === 'backward' ? '#ed9e35' : '#ed4b52'}" stroke-width="8"/>`).join('')}${l.movers.map((m) => `<rect x="${m.x + (m.axis === 'x' ? m.travel : 0) - m.w / 2}" y="${m.y + (m.axis === 'x' ? 0 : m.travel) - m.h / 2}" width="${m.w}" height="${m.h}" fill="#bc8244"/>`).join('')}<circle cx="${l.start.x}" cy="${l.start.y}" r="16" fill="#fff" stroke="#17394f" stroke-width="3"/><path d="m${l.start.x} ${l.start.y - 7} 7 5-3 8h-8l-3-8z" fill="#17394f"/></svg>`;
}
function levelSelect() {
  cleanup();
  screen = 'levels';
  app.innerHTML = `${header()}<main class="select-page"><div class="section-heading"><div><div class="eyebrow">PARK & TREELINE</div><h1>PICK YOUR <em>PERFECT SHOT.</em></h1><p>${levels.length} grass arenas. Unlimited kicks in every level.</p></div><div class="progress-card">${icon('star')}<strong>${totalStars()}<span> / ${levels.length * 3}</span></strong><span>STARS COLLECTED</span></div></div><div class="level-grid">${levels
    .slice(levelPage * 20, levelPage * 20 + 20)
    .map(
      (l) =>
        `<button class="level-card ${progress.best[l.id] ? 'level-done' : 'level-open'}" data-action="play" data-id="${l.id}" aria-label="Play level ${l.id}: ${l.name}, unlimited kicks, par ${l.par}"><div class="level-art"><span class="level-number">${String(l.id).padStart(2, '0')}</span>${miniLevel(l)}${progress.best[l.id] ? `<span class="completed-mark">${icon('check')}</span>` : ''}</div><div class="level-card-copy"><h2>${l.name}</h2><div><span>${progress.best[l.id] ? 'SCORED' : 'OPEN'} · PAR ${l.par} ${progress.best[l.id] ? `· BEST ${progress.best[l.id]}` : ''}</span>${stars(progress.best[l.id] ? rating(progress.best[l.id], l) : 0)}</div></div></button>`,
    )
    .join(
      '',
    )}</div><div class="level-paging">${levelPage > 0 ? '<button class="secondary" data-action="previous-page">PREVIOUS</button>' : ''}${(levelPage + 1) * 20 < levels.length ? '<button class="secondary" data-action="next-page">MORE ARENAS</button>' : ''}</div><p class="selection-note">All levels are open. Best scores save on this browser.${!storageOK ? ' Storage unavailable: progress lasts for this visit.' : ''}</p></main>`;
  bind();
}
function play(id: number) {
  cleanup();
  screen = 'game';
  currentId = Math.max(1, Math.min(levels.length, id));
  resultShown = false;
  roundSerial++;
  precise = false;
  sim = new FootballSimulation(levels[currentId - 1], activePhysics);
  const l = sim.level;
  app.innerHTML = `${header()}<main class="game-page"><div class="game-heading"><div class="course-title"><button class="back-button" data-action="levels" aria-label="Back to levels">${icon('back')}</button><div><div class="eyebrow">LEVEL ${String(l.id).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')} <span>·</span> FOOTBALL PHYSICS</div><h1>${l.name}</h1></div></div><div class="round-stats"><div><span>SHOTS</span><strong><b id="shots" aria-live="polite">0</b></strong></div><div><span>KICKS</span><strong class="unlimited">∞</strong></div><div class="par-stat"><span>PAR</span><strong>${l.par}</strong></div>${button('restart', 'Retry level (R)', 'restart')}${button('pause', 'Pause game (P)', 'pause')}</div></div><div class="game-stage"><canvas id="scene" tabindex="0" aria-label="Football puzzle. Drag backwards anywhere and release to kick into the net, even while moving." aria-describedby="level-tip"></canvas><div class="stage-topline"><span class="course-pill">${icon('net')} LEVEL ${String(l.id).padStart(2, '0')}</span><span class="status-pill" id="status">YOUR KICK. YOUR ANGLE.</span><button class="stage-help" data-action="help" aria-label="Show controls">${icon('mouse')}</button></div><div class="stage-bottomline"><span id="power-label">DRAG ANYWHERE TO KICK</span></div></div><div class="game-underbar"><p id="level-tip">${icon('help')} ${l.tip}</p><button class="text-button precise-toggle" data-action="precise" aria-expanded="false">${icon('aim')} PRECISE AIM</button></div><div id="precise-controls" class="precise-controls" hidden><label>Angle <input type="range" min="-30" max="210" value="35" id="angle"/><output id="angle-value">35°</output></label><label>Power <input type="range" min="5" max="100" value="75" id="power"/><output id="power-value">75%</output></label><button class="primary small" data-action="shoot" id="shoot-button">KICK ${icon('arrow')}</button></div><div class="game-footer"><div class="star-targets">${icon('star')} 3 STARS ≤ ${l.starShots[0]} ${l.starShots[0] === 1 ? 'KICK' : 'KICKS'} <span>·</span> 2 STARS ≤ ${l.starShots[1]} <span>·</span> UNLIMITED KICKS</div><nav aria-label="Levels">${levels
    .filter((x) => Math.floor((x.id - 1) / 10) === Math.floor((l.id - 1) / 10))
    .map(
      (x) =>
        `<button data-action="play" data-id="${x.id}" aria-label="Level ${x.id}" ${x.id === l.id ? 'aria-current="step"' : ''} class="${progress.best[x.id] ? 'done' : ''}">${progress.best[x.id] ? icon('check') : String(x.id).padStart(2, '0')}</button>`,
    )
    .join(
      '',
    )}</nav><span class="save-note">${icon(storageOK ? 'check' : 'help')} ${storageOK ? 'SAVED ON THIS BROWSER' : 'SESSION ONLY'}</span></div></main>`;
  renderer = new Renderer(document.querySelector('#scene')!);
  if (l.camera) {
    document.querySelector('.game-page')!.classList.add('vnext-game');
    const stats = document.querySelector('.round-stats')!;
    if (l.camera.mode !== 'fixed')
      stats.insertAdjacentHTML(
        'afterbegin',
        button('overview', 'Arena overview (pauses play)', 'zoom'),
      );
    stats.insertAdjacentHTML(
      'beforeend',
      button(
        'sound',
        progress.sound ? 'Mute sound' : 'Enable sound',
        progress.sound ? 'sound' : 'mute',
        'icon-button sound-button arena-sound',
      ),
    );
  }
  const bounds =
    l.camera && l.camera.mode !== 'fixed'
      ? { w: l.camera.viewWidth, h: l.camera.viewHeight }
      : viewBounds(l);
  renderer.canvas.style.aspectRatio = String(bounds.w / bounds.h);
  bind();
  bindCanvas();
  syncAim();
  document.querySelector<HTMLInputElement>('#angle')!.addEventListener('input', (e) => {
    aimAngle = +(e.target as HTMLInputElement).value;
    syncAim();
  });
  document.querySelector<HTMLInputElement>('#power')!.addEventListener('input', (e) => {
    aimPower = +(e.target as HTMLInputElement).value;
    syncAim();
  });
}
function getAim(): Point {
  const a = (aimAngle * Math.PI) / 180;
  return {
    x: (-Math.cos(a) * MAX_PULL * aimPower) / 100,
    y: (Math.sin(a) * MAX_PULL * aimPower) / 100,
  };
}
function syncAim() {
  for (const [id, v] of [
    ['angle', aimAngle],
    ['power', aimPower],
  ] as const) {
    const el = document.querySelector<HTMLInputElement>('#' + id),
      out = document.querySelector('#' + id + '-value');
    if (el) el.value = String(v);
    if (out) out.textContent = String(v) + (id === 'angle' ? '°' : '%');
  }
}
function kick(p: Point) {
  return renderer?.camera.overview ? false : sim.shoot(p);
}
function bindCanvas() {
  const canvas = renderer!.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (
      e.button !== 0 ||
      !sim.canKick ||
      renderer!.camera.overview ||
      document.querySelector('.modal-backdrop')
    )
      return;
    e.preventDefault();
    audio.unlock();
    canvas.focus({ preventScroll: true });
    dragging = true;
    activePointer = e.pointerId;
    aimOrigin = { x: e.clientX, y: e.clientY };
    aimScale = renderer!.scale;
    pull = { x: 0, y: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== activePointer || !aimOrigin) return;
    // Screen-space displacement keeps a stationary finger's power steady while the world scrolls.
    pull = { x: (e.clientX - aimOrigin.x) / aimScale, y: (e.clientY - aimOrigin.y) / aimScale };
  });
  canvas.addEventListener('pointerup', (e) => {
    if (!dragging || e.pointerId !== activePointer) return;
    const shot = pull;
    cancelDrag();
    if (shot) kick(shot);
  });
  canvas.addEventListener('pointercancel', cancelDrag);
  canvas.addEventListener('lostpointercapture', cancelDrag);
}
function bind() {
  app
    .querySelectorAll<HTMLButtonElement>('[data-action]')
    .forEach((el) => el.addEventListener('click', () => action(el.dataset.action!, el)));
}
function action(a: string, el?: HTMLButtonElement) {
  audio.unlock();
  audio.play('ui');
  if (a === 'next-page') {
    levelPage++;
    levelSelect();
  }
  if (a === 'previous-page') {
    levelPage--;
    levelSelect();
  }
  if (a === 'home') home();
  if (a === 'levels') levelSelect();
  if (a === 'play') play(Number(el?.dataset.id));
  if (a === 'restart') play(currentId);
  if (a === 'next') play(currentId + 1);
  if (a === 'sound') {
    progress.sound = !progress.sound;
    audio.enabled = progress.sound;
    if (progress.sound) audio.unlock();
    persist();
    app.querySelectorAll('.sound-button').forEach((b) => {
      b.innerHTML = icon(progress.sound ? 'sound' : 'mute');
      b.setAttribute('aria-label', progress.sound ? 'Mute sound' : 'Enable sound');
      b.setAttribute('title', progress.sound ? 'Mute sound' : 'Enable sound');
    });
  }
  if (a === 'help') help();
  if (a === 'settings') settings();
  if (a === 'developer') {
    document.querySelector('.modal-backdrop')?.remove();
    developerPanel(
      activePhysics,
      (c) => {
        activePhysics = c;
        sim?.updateConfig(c);
      },
      play,
      () => {
        levelPage = 0;
        levelSelect();
      },
    );
  }
  if (a === 'pause') pause();
  if (a === 'overview' && renderer) {
    cancelDrag();
    renderer.camera.setOverview(!renderer.camera.overview);
    if (!renderer.camera.overview) {
      renderer.resize(sim.level);
      renderer.camera.resetTo(sim.ball.position);
    }
    accumulator = 0;
    if (el) {
      el.setAttribute(
        'aria-label',
        renderer.camera.overview ? 'Return to play' : 'Arena overview (pauses play)',
      );
      el.setAttribute('aria-pressed', String(renderer.camera.overview));
    }
  }
  if (a === 'precise') {
    precise = !precise;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = !precise;
    el?.setAttribute('aria-expanded', String(precise));
  }
  if (a === 'shoot') {
    cancelDrag();
    kick(getAim());
  }
}
function modal(content: string, label: string, closable = false) {
  cancelDrag();
  accumulator = 0;
  const previous = document.activeElement as HTMLElement | null,
    overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.innerHTML = `<section class="modal" role="dialog" aria-modal="true" aria-label="${label}">${content}</section>`;
  app.append(overlay);
  const close = () => {
    overlay.remove();
    accumulator = 0;
    last = performance.now();
    previous?.focus();
  };
  overlay.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', close));
  overlay
    .querySelectorAll<HTMLButtonElement>('[data-action]')
    .forEach((b) => b.addEventListener('click', () => action(b.dataset.action!, b)));
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && closable) {
      e.stopPropagation();
      close();
    }
    if (e.key === 'Tab') {
      const els = [...overlay.querySelectorAll<HTMLButtonElement>('button')],
        first = els[0],
        end = els.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        end?.focus();
      } else if (!e.shiftKey && document.activeElement === end) {
        e.preventDefault();
        first?.focus();
      }
    }
  });
  overlay.querySelector('button')?.focus();
  return overlay;
}
function help() {
  if (document.querySelector('.modal-backdrop')) return;
  modal(
    `<button class="modal-close icon-button" data-close aria-label="Close instructions">${icon('close')}</button><div class="modal-emblem">${icon('ball')}</div><div class="eyebrow">THE BEAUTIFUL GAME. A DIFFERENT ANGLE.</div><h2>FIND THE NET.</h2><p>Drag anywhere in the arena to set direction and power. Release to add a kick, at rest or in mid-air.</p><div class="help-rows"><p><strong>Aim & cancel</strong><span>Pull farther for more power. Return to the ball’s dead zone or press Escape to cancel.</span></p><p><strong>Kick any time</strong><span>Drag anywhere in the arena, even while the ball moves. Each kick adds to its existing momentum.</span></p><p><strong>Score properly</strong><span>The whole ball must cross the open left side of the net. Hitting its back or crossbar alone is not a goal.</span></p><p><strong>Unlimited kicks</strong><span>Par is a score target. You can always keep playing. The red strip resets position and keeps every shot already taken.</span></p><p><strong>Keyboard</strong><span>↑ ↓ angle · ← → power · Space kick<br>R retry · P pause · L levels<br>Compact arenas stay in view. Larger arenas follow the ball; use the map button to pause and see the whole course.</span></p></div><button class="primary" data-close>LET’S KICK IT ${icon('arrow')}</button>`,
    'How to play',
    true,
  );
}
function settings() {
  modal(
    `<button class="modal-close icon-button" data-close aria-label="Close settings">${icon('close')}</button><div class="modal-emblem">${icon('aim')}</div><h2>YOUR GAME.</h2><p>Grass arenas · mouse, touch or keyboard.<br>Unlimited kicks. Correct your shot in mid-air.</p><div class="completion-actions"><button class="secondary sound-button" data-action="sound">${icon(progress.sound ? 'sound' : 'mute')}</button><p>Sound preference saves on this browser.</p>${developerMode ? '<button class="secondary" data-action="developer">DEVELOPER PHYSICS</button>' : ''}<button class="primary" data-close>BACK TO GAME</button></div>`,
    'Settings',
    true,
  );
}
function pause() {
  if (screen !== 'game' || document.querySelector('.modal-backdrop')) return;
  modal(
    `<div class="modal-emblem">${icon('pause')}</div><div class="eyebrow">TAKE A BREATHER</div><h2>HALF TIME.</h2><p>Your ball and the obstacles are paused.</p><div class="completion-actions"><button class="primary" data-close>RESUME ${icon('play')}</button><button class="secondary" data-action="restart">${icon('restart')} RETRY LEVEL</button><button class="text-button" data-action="levels">ALL LEVELS</button></div>`,
    'Game paused',
    true,
  );
}
function result() {
  resultShown = true;
  app.dataset.celebration = sim.shots === 1 ? 'one-shot' : 'standard';
  const l = sim.level,
    n = rating(sim.shots, l),
    prior = progress.best[l.id];
  recordBest(progress, l.id, sim.shots);
  persist();
  modal(
    `<div class="completion-kicker">${icon('net')} LEVEL COMPLETE · ${String(l.id).padStart(2, '0')}</div><div class="completion-stars">${stars(n)}</div><h2>${sim.shots === 1 ? 'GOAL IN ONE!' : l.id === levels.length ? 'FINAL WHISTLE!' : 'GOOOAL!'}</h2><p>Through the opening. Into the net. Keep finding your angle.</p><div class="completion-stats"><div><span>SHOTS</span><strong>${sim.shots}</strong></div><div><span>PAR</span><strong>${l.par}</strong></div><div><span>BEST</span><strong>${progress.best[l.id]}</strong></div></div><div class="personal-best">${!prior || sim.shots < prior ? 'NEW PERSONAL BEST' : 'A GOAL WORTH REPLAYING'}</div><div class="completion-actions"><button class="primary" data-action="${l.id === levels.length ? 'levels' : 'next'}">${l.id === levels.length ? 'ALL LEVELS' : 'NEXT LEVEL'} ${icon('arrow')}</button><button class="secondary" data-action="restart">PLAY AGAIN</button><button class="text-button" data-action="levels">BACK TO LEVELS</button></div>${!storageOK ? '<small>Browser storage is unavailable. Progress lasts for this visit.</small>' : ''}`,
    'Goal scored',
  );
}
window.addEventListener('keydown', (e) => {
  if (
    screen !== 'game' ||
    document.querySelector('.modal-backdrop') ||
    (e.target as HTMLElement).matches('input,button')
  )
    return;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
    e.preventDefault();
    audio.unlock();
    precise = true;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = false;
    document.querySelector('.precise-toggle')?.setAttribute('aria-expanded', 'true');
    if (e.key === 'ArrowUp') aimAngle = Math.min(210, aimAngle + 2);
    if (e.key === 'ArrowDown') aimAngle = Math.max(-30, aimAngle - 2);
    if (e.key === 'ArrowLeft') aimPower = Math.max(5, aimPower - 2);
    if (e.key === 'ArrowRight') aimPower = Math.min(100, aimPower + 2);
    if (e.key === ' ' && !e.repeat) {
      cancelDrag();
      kick(getAim());
    }
    syncAim();
  }
  const k = e.key.toLowerCase();
  if (k === 'r') play(currentId);
  if (k === 'l') levelSelect();
  if (k === 'p') pause();
  if (e.key === 'Escape') {
    cancelDrag();
    precise = false;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = true;
  }
});
window.addEventListener('blur', cancelDrag);
document.addEventListener('visibilitychange', () => {
  last = performance.now();
  accumulator = 0;
  cancelDrag();
});
function frame(now: number) {
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  if (renderer && sim) {
    const modalOpen = !!document.querySelector('.modal-backdrop');
    if (screen === 'game' && !document.hidden && !modalOpen && !renderer.camera.overview) {
      accumulator += dt * 1000;
      while (accumulator >= STEP) {
        sim.step();
        accumulator -= STEP;
      }
      for (const e of sim.events.splice(0)) {
        if (!reducedMotion) renderer.effect(e);
        if (e.type === 'win') audio.celebrate(sim.shots, roundSerial);
        else audio.play(e.type);
      }
      document.querySelector('#shots')!.textContent = String(sim.shots);
      const status = document.querySelector('#status')!;
      status.textContent =
        sim.phase === 'scoring' || sim.phase === 'won'
          ? 'THAT’S A GOAL!'
          : dragging
            ? 'RELEASE TO ADD A KICK'
            : sim.phase === 'moving'
              ? 'KICK AGAIN ANY TIME'
              : 'DRAG ANYWHERE TO KICK';
      document.querySelector('#power-label')!.textContent = pull
        ? `KICK POWER ${Math.min(100, Math.round((Math.hypot(pull.x, pull.y) / MAX_PULL) * 100))}% · ESC TO CANCEL`
        : sim.canKick
          ? 'DRAG ANYWHERE · UNLIMITED KICKS'
          : 'GOAL!';
      const shoot = document.querySelector<HTMLButtonElement>('#shoot-button');
      if (shoot) shoot.disabled = !sim.canKick;
      if (sim.phase === 'won' && !resultShown) result();
    }
    renderer.render(
      sim,
      modalOpen || renderer.camera.overview ? 0 : dt,
      pull ?? (precise && sim.canKick ? getAim() : null),
      screen === 'home',
      reducedMotion,
      dragging || modalOpen,
    );
  }
  requestAnimationFrame(frame);
}
home();
requestAnimationFrame(frame);
