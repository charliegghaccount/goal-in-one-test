import { prepareNativeStorage } from './native-runtime';
async function start() {
  try {
    await prepareNativeStorage();
    await import('./main');
  } catch {
    document.body.textContent =
      'Your saved game could not be opened. Please retry; your data has not been reset.';
    const retry = document.createElement('button');
    retry.textContent = 'Retry';
    retry.onclick = () => location.reload();
    document.body.append(retry);
  }
}
window.addEventListener('native-save-error', () => {
  if (document.querySelector('#native-save-warning')) return;
  const warning = document.createElement('p');
  warning.id = 'native-save-warning';
  warning.setAttribute('role', 'alert');
  warning.textContent =
    'Native backup failed. Keep the app open and export your campaign before reinstalling.';
  warning.style.cssText =
    'position:fixed;bottom:0;left:0;right:0;background:#542710;color:white;padding:12px;z-index:100';
  document.body.append(warning);
});
void start();
