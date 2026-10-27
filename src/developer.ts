import { campaign } from './campaign';
import {
  defaultPhysics,
  physicsRanges,
  sanitizePhysics,
  savePhysics,
  loadPhysics,
  type PhysicsConfig,
} from './physics';
const labels: Record<keyof PhysicsConfig, string> = {
  groundFriction: 'Ground friction',
  restitution: 'Ball bounce',
  airResistance: 'Air resistance',
  spinDamping: 'Spin damping',
  maxAngularVelocity: 'Maximum spin',
  kickStrength: 'Kick strength',
  momentumRetention: 'Kick momentum retention',
  boostAcceleration: 'Boost acceleration',
  springStrength: 'Spring multiplier',
  windStrength: 'Wind multiplier',
};
export function developerPanel(
  config: PhysicsConfig,
  apply: (c: PhysicsConfig) => void,
  jump: (id: number) => void,
  showLevels: () => void,
) {
  const levels = campaign().playable();
  const esc = (v: string) =>
    v.replace(
      /[&<>"']/g,
      (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
    );
  const overlay = document.createElement('div');
  overlay.className = 'modal-backdrop';
  overlay.innerHTML = `<section class="modal developer-panel" role="dialog" aria-modal="true" aria-label="Developer physics"><button class="modal-close icon-button" id="dev-close" aria-label="Close developer panel">×</button><h2>PHYSICS LAB</h2><p>Developer mode · all levels unlocked. Settings apply when play resumes. No restart needed.</p><label>Jump to level <select id="dev-level">${levels.map((l) => `<option value="${l.id}">${l.id} · ${esc(l.name)}</option>`).join('')}</select></label><p id="dev-tip"></p><div class="dev-actions"><button class="secondary" id="dev-jump">PLAY LEVEL</button><button class="secondary" id="dev-unlock">UNLOCK ALL / LEVEL SELECT</button></div><div class="dev-fields">${(Object.keys(labels) as (keyof PhysicsConfig)[]).map((k) => `<label>${labels[k]}<input data-physics="${k}" aria-label="${labels[k]}" type="range" min="${physicsRanges[k][0]}" max="${physicsRanges[k][1]}" step="${physicsRanges[k][2]}"/><output data-value="${k}"></output></label>`).join('')}</div><div class="dev-actions"><button class="primary" id="dev-save">SAVE LOCALLY</button><button class="secondary" id="dev-restore">RESTORE SAVED</button><button class="secondary" id="dev-defaults">RESET DEFAULTS</button><button class="secondary" id="dev-export">COPY / EXPORT JSON</button></div><textarea id="dev-json" aria-label="Physics configuration JSON" rows="4"></textarea><button class="secondary" id="dev-import">IMPORT JSON</button><p id="dev-status" role="status"></p></section>`;
  document.querySelector('#app')!.append(overlay);
  let current = sanitizePhysics(config);
  const $ = (s: string) => overlay.querySelector<HTMLElement>(s)!;
  const status = (t: string) => {
    $('#dev-status').textContent = t;
  };
  const sync = () => {
    for (const k of Object.keys(labels) as (keyof PhysicsConfig)[]) {
      (overlay.querySelector(`[data-physics="${k}"]`) as HTMLInputElement).value = String(
        current[k],
      );
      overlay.querySelector(`[data-value="${k}"]`)!.textContent = String(current[k]);
    }
    apply(current);
  };
  overlay.querySelectorAll<HTMLInputElement>('[data-physics]').forEach((i) =>
    i.addEventListener('input', () => {
      current = sanitizePhysics({ ...current, [i.dataset.physics!]: +i.value });
      sync();
      status('Applied live. Save to retain for future visits.');
    }),
  );
  $('#dev-close').onclick = () => overlay.remove();
  $('#dev-save').onclick = () =>
    status(
      savePhysics(current)
        ? 'Saved on this browser.'
        : 'Storage unavailable; settings remain active for this visit.',
    );
  $('#dev-restore').onclick = () => {
    current = loadPhysics();
    sync();
    status('Restored saved configuration.');
  };
  $('#dev-defaults').onclick = () => {
    current = { ...defaultPhysics };
    sync();
    status('Defaults applied. Save to persist.');
  };
  $('#dev-export').onclick = async () => {
    const text = JSON.stringify(current, null, 2);
    ($('#dev-json') as HTMLTextAreaElement).value = text;
    try {
      await navigator.clipboard.writeText(text);
      status('Copied JSON.');
    } catch {
      status('JSON is ready to copy from the text box.');
    }
  };
  $('#dev-import').onclick = () => {
    try {
      const raw = JSON.parse(($('#dev-json') as HTMLTextAreaElement).value);
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw Error();
      current = sanitizePhysics(raw);
      sync();
      status('Imported with safe limits. Save to persist.');
    } catch {
      status('Invalid JSON: enter a configuration object.');
    }
  };
  const select = $('#dev-level') as HTMLSelectElement;
  const tip = () => {
    $('#dev-tip').textContent =
      levels[+select.value - 1]?.tip ?? 'No published levels. Open Level Studio to publish one.';
  };
  select.onchange = tip;
  tip();
  $('#dev-jump').onclick = () => {
    overlay.remove();
    jump(+select.value);
  };
  $('#dev-unlock').onclick = () => {
    overlay.remove();
    showLevels();
  };
  overlay.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      overlay.remove();
    }
    if (e.key === 'Tab') {
      const fields = [...overlay.querySelectorAll<HTMLElement>('button,input,select,textarea')],
        first = fields[0],
        last = fields.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  });
  sync();
  $('#dev-close').focus();
  return overlay;
}
