import type { Draft } from './model';

/** Keeps the actual LevelEditor instance and its entire workspace/history alive. */
export function testInGodot(draft: Draft): void {
  const target = new URL(new URLSearchParams(location.search).get('godotPreview') || 'https://charliegghaccount.github.io/godot-test-goal-in-one/');
  if (target.protocol !== 'https:' && !(target.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(target.hostname))) {
    throw new Error('Godot preview requires HTTPS (or localhost for development).');
  }
  const token = crypto.randomUUID();
  target.searchParams.set('studio', '1');
  target.searchParams.set('token', token);
  target.searchParams.set('parentOrigin', location.origin);
  const dialog = document.createElement('dialog');
  dialog.className = 'godot-preview';
  dialog.setAttribute('aria-label', 'Godot level test');
  const bar = document.createElement('header');
  const back = document.createElement('button');
  back.textContent = 'Return to Editor';
  const status = document.createElement('span');
  status.setAttribute('role', 'status');
  status.textContent = 'Loading the Godot engine…';
  const frame = document.createElement('iframe');
  frame.title = 'Native Godot gameplay';
  frame.allow = 'autoplay; fullscreen';
  frame.src = target.href;
  bar.append(back, status);
  dialog.append(bar, frame);
  document.body.append(dialog);
  const timeout = window.setTimeout(() => { status.textContent = 'Godot is taking longer to load. Check your connection or return and retry.'; }, 60000);
  const listener = (e: MessageEvent) => {
    if (e.source !== frame.contentWindow || e.origin !== target.origin || e.data?.token !== token) return;
    if (e.data.type === 'gio:ready') {
      status.textContent = 'Validating and loading your edited level…';
      frame.contentWindow!.postMessage({ type: 'gio:level', token, json: JSON.stringify(draft) }, target.origin);
    } else if (e.data.type === 'gio:loaded') {
      clearTimeout(timeout);
      status.textContent = 'Godot physics • Test only — campaign progress is unchanged';
      frame.focus();
    } else if (e.data.type === 'gio:error') {
      clearTimeout(timeout);
      frame.style.visibility = 'hidden';
      status.textContent = 'Cannot test this level: ' + (Array.isArray(e.data.errors) ? e.data.errors.join('; ') : 'Invalid level');
    } else if (e.data.type === 'gio:return') dialog.close();
  };
  window.addEventListener('message', listener);
  back.onclick = () => dialog.close();
  dialog.addEventListener('keydown', e => e.stopPropagation());
  dialog.addEventListener('close', () => {
    window.removeEventListener('message', listener);
    clearTimeout(timeout);
    frame.src = 'about:blank';
    dialog.remove();
  }, { once: true });
  dialog.showModal();
}
