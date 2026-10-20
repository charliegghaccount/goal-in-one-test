import './style.css';
import { levels, type Level, type Point } from './levels';
import { FootballSimulation, MAX_PULL, rating, STEP } from './simulation';
import { Renderer } from './render';
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
  resultShown = false;
let last = performance.now(),
  accumulator = 0,
  currentId = 1,
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
  return `<header class="topbar"><button class="brand" data-action="home" aria-label="Goal In One home"><span class="brand-mark">${icon('ball')}</span><span>GOAL<span class="brand-in">IN</span>ONE<span class="brand-dot">.</span><small>FOOTBALL. REIMAGINED.</small></span></button><span class="nav-tag">BIG IDEAS. BEAUTIFUL GOALS.</span><nav aria-label="Main navigation"><button class="text-button" data-action="levels">${icon('grid')} <span>LEVELS</span></button><span class="nav-divider"></span>${button('sound', progress.sound ? 'Mute sound' : 'Enable sound', progress.sound ? 'sound' : 'mute', 'icon-button sound-button')}${button('help', 'How to play', 'help')}</nav></header>`;
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
  app.innerHTML = `${header()}<main class="home"><section class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> THE FOOTBALL PHYSICS PUZZLER</div><h1>ONE BALL.<br>TEN GOALS.<br><em>MAKE IT COUNT.</em></h1><p>Over the wall. Across the gap. Into the net.<br>Line up your kick and find your own way to score.</p><div class="hero-actions"><button class="primary" data-action="play" data-id="${next}">${completed ? 'KEEP PLAYING' : 'KICK OFF'} ${icon('arrow')}</button><button class="secondary" data-action="levels">PICK A LEVEL ${icon('grid')}</button></div><div class="hero-note">${icon('mouse')} DRAG BACK. LET GO. GOAL.</div>${completed ? `<div class="home-progress">${completed} / ${levels.length} GOALS SCORED <span>·</span> ${totalStars()} STARS</div>` : ''}</section><section class="hero-art" aria-label="Football flying over stepped platforms toward an elevated soccer net"><div class="art-label">${icon('ball')} A NEW ANGLE ON THE BEAUTIFUL GAME</div><canvas id="scene" aria-hidden="true"></canvas><div class="hero-score"><span>YOUR NEXT</span><strong>GREAT GOAL.</strong>${icon('net')}</div><span class="art-corner">01 / FIRST TOUCH</span></section><section class="feature-strip"><div><span>01</span><p><strong>THE BALL IS IN YOUR HANDS.</strong><small>Drag, aim and release. Every kick counts.</small></p></div><div><span>10</span><p><strong>SMALL WORLDS. BIG CHALLENGES.</strong><small>Stepped platforms, springs and moving obstacles.</small></p></div><div>${icon('star')}<p><strong>THREE STARS. YOUR WAY.</strong><small>Find the net within the shot budget.</small></p></div></section></main><footer class="site-footer"><span>INSPIRED BY PHANTASMAGOR’S 2006 FOOTBALL PUZZLER</span><span>NO DOWNLOAD. JUST ONE MORE GOAL. ${icon('net')}</span></footer>`;
  sim = new FootballSimulation(levels[0]);
  renderer = new Renderer(document.querySelector('#scene')!);
  renderer.overview = true;
  bind();
}
function miniLevel(l: Level) {
  const g = l.goal;
  return `<svg viewBox="0 0 ${l.width} 720" aria-hidden="true" class="mini-course"><circle cx="${l.width - 200}" cy="130" r="60" fill="#fff8c4"/><path d="M0 520Q300 230 650 470T${l.width} 450V720H0" fill="#8fd6bd"/>${(l.water ?? []).map((w) => `<rect x="${w.x}" y="${w.y}" width="${w.w}" height="120" fill="#37bce3"/>`).join('')}${l.terrain.map((t) => `<g transform="rotate(${((t.angle ?? 0) * 180) / Math.PI} ${t.x + t.w / 2} ${t.y + t.h / 2})"><rect x="${t.x}" y="${t.y}" width="${t.w}" height="${t.h}" fill="${t.kind === 'stone' ? '#54798c' : '#ad7655'}"/><rect x="${t.x}" y="${t.y}" width="${t.w}" height="15" fill="${t.kind === 'stone' ? '#7a9aab' : '#4bbb6d'}"/></g>`).join('')}${(l.pads ?? []).map((p) => `<rect x="${p.x}" y="${p.y - 6}" width="${p.w}" height="16" fill="#ffbd47"/>`).join('')}${(l.movers ?? []).map((m) => `<rect x="${m.x - m.w / 2}" y="${m.y - m.h / 2}" width="${m.w}" height="${m.h}" fill="#ffbd47"/>`).join('')}<rect x="${g.x}" y="${g.y - g.h}" width="${g.w}" height="${g.h}" fill="#edfaff44" stroke="#fff" stroke-width="9"/>${[0.25, 0.5, 0.75].map((f) => `<path d="M${g.x + g.w * f} ${g.y - g.h}v${g.h}M${g.x} ${g.y - g.h * f}h${g.w}" stroke="#fff" stroke-width="4"/>`).join('')}<circle cx="${l.start.x}" cy="${l.start.y}" r="16" fill="#fff" stroke="#17394f" stroke-width="4"/><path d="m${l.start.x} ${l.start.y - 7} 7 5-3 8h-8l-3-8z" fill="#17394f"/></svg>`;
}
function levelSelect() {
  cleanup();
  screen = 'levels';
  app.innerHTML = `${header()}<main class="select-page"><div class="section-heading"><div><div class="eyebrow">THE CHALLENGE BOARD</div><h1>FIND YOUR <em>ANGLE.</em></h1><p>Ten football puzzles. Ten ways to make the net move.</p></div><div class="progress-card">${icon('star')}<strong>${totalStars()}<span> / ${levels.length * 3}</span></strong><span>STARS COLLECTED</span></div></div><div class="level-grid">${levels.map((l) => `<button class="level-card theme-${l.theme}" data-action="play" data-id="${l.id}" aria-label="Play level ${l.id}: ${l.name}, ${l.par} shots maximum"><div class="level-art"><span class="level-number">${String(l.id).padStart(2, '0')}</span>${miniLevel(l)}${progress.best[l.id] ? `<span class="completed-mark">${icon('check')}</span>` : ''}</div><div class="level-card-copy"><h2>${l.name}</h2><div><span>${l.par} KICKS MAX ${progress.best[l.id] ? `· BEST ${progress.best[l.id]}` : ''}</span>${stars(progress.best[l.id] ? rating(progress.best[l.id], l) : 0)}</div></div></button>`).join('')}</div><p class="selection-note">All levels are open. Best scores save on this browser.${!storageOK ? ' Storage unavailable: progress lasts for this visit.' : ''}</p></main>`;
  bind();
}
function play(id: number) {
  cleanup();
  screen = 'game';
  currentId = Math.max(1, Math.min(levels.length, id));
  resultShown = false;
  precise = false;
  sim = new FootballSimulation(levels[currentId - 1]);
  const l = sim.level;
  app.innerHTML = `${header()}<main class="game-page"><div class="game-heading"><div class="course-title"><button class="back-button" data-action="levels" aria-label="Back to levels">${icon('back')}</button><div><div class="eyebrow">LEVEL ${String(l.id).padStart(2, '0')} / ${String(levels.length).padStart(2, '0')} <span>·</span> FOOTBALL PHYSICS</div><h1>${l.name}</h1></div></div><div class="round-stats"><div><span>SHOTS</span><strong><b id="shots" aria-live="polite">0</b><small> / ${l.par}</small></strong></div><div><span>REMAINING</span><strong id="remaining">${l.par}</strong></div><div class="par-stat"><span>PAR LIMIT</span><strong>${l.par}</strong></div>${button('restart', 'Retry level (R)', 'restart')}${button('pause', 'Pause game (P)', 'pause')}</div></div><div class="game-stage"><canvas id="scene" tabindex="0" aria-label="Football puzzle. Drag backwards from the ball and release to kick into the net." aria-describedby="level-tip"></canvas><div class="stage-topline"><span class="course-pill">${icon('net')} LEVEL ${String(l.id).padStart(2, '0')}</span><span class="status-pill" id="status">YOUR KICK. YOUR ANGLE.</span><button class="stage-help" data-action="help" aria-label="Show controls">${icon('mouse')}</button></div><div class="stage-bottomline"><span id="power-label">DRAG BACK FROM THE BALL</span><div class="camera-controls">${button('pan-left', 'Pan camera left (A)', 'back')}${button('overview', 'Toggle full level view', 'zoom')}${button('follow', 'Follow ball', 'ball')}${button('pan-right', 'Pan camera right (D)', 'arrow')}</div></div></div><div class="game-underbar"><p id="level-tip">${icon('help')} ${l.tip}</p><button class="text-button precise-toggle" data-action="precise" aria-expanded="false">${icon('aim')} PRECISE AIM</button></div><div id="precise-controls" class="precise-controls" hidden><label>Angle <input type="range" min="-30" max="210" value="35" id="angle"/><output id="angle-value">35°</output></label><label>Power <input type="range" min="5" max="100" value="75" id="power"/><output id="power-value">75%</output></label><button class="primary small" data-action="shoot" id="shoot-button">KICK ${icon('arrow')}</button></div><div class="game-footer"><div class="star-targets">${icon('star')} 3 STARS ≤ ${l.starShots[0]} ${l.starShots[0] === 1 ? 'KICK' : 'KICKS'} <span>·</span> 2 STARS ≤ ${l.starShots[1]} <span>·</span> SCORE BY ${l.par}</div><nav aria-label="Levels">${levels.map((x) => `<button data-action="play" data-id="${x.id}" aria-label="Level ${x.id}" ${x.id === l.id ? 'aria-current="step"' : ''} class="${progress.best[x.id] ? 'done' : ''}">${progress.best[x.id] ? icon('check') : String(x.id).padStart(2, '0')}</button>`).join('')}</nav><span class="save-note">${icon(storageOK ? 'check' : 'help')} ${storageOK ? 'SAVED ON THIS BROWSER' : 'SESSION ONLY'}</span></div></main>`;
  renderer = new Renderer(document.querySelector('#scene')!);
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
  const ok = sim.shoot(p);
  if (ok) renderer?.follow();
  return ok;
}
function bindCanvas() {
  const canvas = renderer!.canvas;
  canvas.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 || sim.phase !== 'ready' || document.querySelector('.modal-backdrop'))
      return;
    const p = renderer!.toWorld(e.clientX, e.clientY);
    if (
      Math.hypot(p.x - sim.ball.position.x, p.y - sim.ball.position.y) >
      Math.max(34, 25 / renderer!.scale)
    )
      return;
    e.preventDefault();
    audio.unlock();
    canvas.focus({ preventScroll: true });
    dragging = true;
    activePointer = e.pointerId;
    aimOrigin = { ...sim.ball.position };
    pull = { x: 0, y: 0 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging || e.pointerId !== activePointer || !aimOrigin) return;
    const p = renderer!.toWorld(e.clientX, e.clientY);
    pull = { x: p.x - aimOrigin.x, y: p.y - aimOrigin.y };
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
  if (a === 'pause') pause();
  if (a === 'precise') {
    precise = !precise;
    document.querySelector<HTMLElement>('#precise-controls')!.hidden = !precise;
    el?.setAttribute('aria-expanded', String(precise));
  }
  if (a === 'shoot') {
    cancelDrag();
    kick(getAim());
  }
  if (a === 'overview' && renderer && !dragging) {
    renderer.overview = !renderer.overview;
    renderer.manualPan = null;
  }
  if (a === 'follow' && renderer && !dragging) renderer.follow();
  if ((a === 'pan-left' || a === 'pan-right') && renderer && !dragging) {
    renderer.overview = false;
    renderer.pan(a === 'pan-left' ? -350 : 350, sim.level.width);
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
    `<button class="modal-close icon-button" data-close aria-label="Close instructions">${icon('close')}</button><div class="modal-emblem">${icon('ball')}</div><div class="eyebrow">THE BEAUTIFUL GAME. A DIFFERENT ANGLE.</div><h2>FIND THE NET.</h2><p>Press the football. Drag backwards to set direction and power. Release to kick.</p><div class="help-rows"><p><strong>Aim & cancel</strong><span>Pull farther for more power. Return to the ball’s dead zone or press Escape to cancel.</span></p><p><strong>Wait for rest</strong><span>Both movement and spin must settle before your next kick.</span></p><p><strong>Score properly</strong><span>The whole ball must cross the open left side of the net. Hitting its back or crossbar alone is not a goal.</span></p><p><strong>Beat the budget</strong><span>PAR is a hard kick limit. Your last kick can still score. Out-of-play attempts count.</span></p><p><strong>Keyboard & camera</strong><span>↑ ↓ angle · ← → power · Space kick<br>A / D pan · R retry · P pause · L levels<br>Use the overview and follow-ball buttons to explore.</span></p></div><button class="primary" data-close>LET’S KICK IT ${icon('arrow')}</button>`,
    'How to play',
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
  const l = sim.level,
    won = sim.phase === 'won',
    n = won ? rating(sim.shots, l) : 0,
    prior = progress.best[l.id];
  if (won) {
    recordBest(progress, l.id, sim.shots);
    persist();
  }
  modal(
    `<div class="completion-kicker">${icon(won ? 'net' : 'restart')} ${won ? 'LEVEL COMPLETE' : 'SHOT BUDGET USED'} · ${String(l.id).padStart(2, '0')}</div>${won ? `<div class="completion-stars">${stars(n)}</div>` : '<div class="failure-ball">↗</div>'}<h2>${won ? (l.id === levels.length ? 'FINAL WHISTLE!' : 'GOOOAL!') : 'ANOTHER ANGLE?'}</h2><p>${won ? 'Through the opening. Into the net. Beautiful.' : `You used all ${l.par} kicks. Reset the level and find a new route.`}</p><div class="completion-stats"><div><span>SHOTS</span><strong>${sim.shots}</strong></div><div><span>PAR LIMIT</span><strong>${l.par}</strong></div><div><span>BEST</span><strong>${progress.best[l.id] ?? '—'}</strong></div></div><div class="personal-best">${won ? (!prior || sim.shots < prior ? 'NEW PERSONAL BEST' : 'A GOAL WORTH REPLAYING') : 'EVERY RETRY IS A FRESH START'}</div><div class="completion-actions"><button class="primary" data-action="${!won ? 'restart' : l.id === levels.length ? 'levels' : 'next'}">${!won ? 'RETRY LEVEL' : l.id === levels.length ? 'ALL LEVELS' : 'NEXT LEVEL'} ${icon('arrow')}</button>${won ? '<button class="secondary" data-action="restart">PLAY AGAIN</button>' : ''}<button class="text-button" data-action="levels">BACK TO LEVELS</button></div>${!storageOK ? '<small>Browser storage is unavailable. Progress lasts for this visit.</small>' : ''}`,
    won ? 'Goal scored' : 'Out of shots',
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
  if (k === 'a') action('pan-left');
  if (k === 'd') action('pan-right');
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
    if (screen === 'game' && !document.hidden && !modalOpen) {
      accumulator += dt * 1000;
      while (accumulator >= STEP) {
        sim.step();
        accumulator -= STEP;
      }
      for (const e of sim.events.splice(0)) {
        if (!reducedMotion) renderer.effect(e);
        audio.play(e.type);
      }
      document.querySelector('#shots')!.textContent = String(sim.shots);
      document.querySelector('#remaining')!.textContent = String(sim.remaining);
      const status = document.querySelector('#status')!;
      status.textContent =
        sim.phase === 'ready'
          ? 'YOUR KICK. YOUR ANGLE.'
          : sim.phase === 'respawning'
            ? 'OUT OF PLAY. RESETTING…'
            : sim.phase === 'scoring' || sim.phase === 'won'
              ? 'THAT’S A GOAL!'
              : sim.phase === 'failed'
                ? 'OUT OF SHOTS'
                : 'LET IT ROLL. WAIT FOR REST.';
      document.querySelector('#power-label')!.textContent = pull
        ? `KICK POWER ${Math.min(100, Math.round((Math.hypot(pull.x, pull.y) / MAX_PULL) * 100))}% · ESC TO CANCEL`
        : sim.phase === 'ready'
          ? 'DRAG BACK FROM THE BALL'
          : sim.phase === 'scoring' || sim.phase === 'won'
            ? 'GOAL!'
            : sim.phase === 'failed'
              ? 'RETRY TO PLAY AGAIN'
              : 'BALL IN MOTION';
      const shoot = document.querySelector<HTMLButtonElement>('#shoot-button');
      if (shoot) shoot.disabled = sim.phase !== 'ready';
      if ((sim.phase === 'won' || sim.phase === 'failed') && !resultShown) result();
    }
    renderer.render(
      sim,
      modalOpen ? 0 : dt,
      pull ?? (precise && sim.phase === 'ready' ? getAim() : null),
      screen === 'home',
      reducedMotion,
      dragging || modalOpen,
    );
  }
  requestAnimationFrame(frame);
}
home();
requestAnimationFrame(frame);
