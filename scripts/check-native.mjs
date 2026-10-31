import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
const files = (dir) =>
  readdirSync(dir).flatMap((n) =>
    statSync(join(dir, n)).isDirectory() ? files(join(dir, n)) : [join(dir, n)],
  );
const config = JSON.parse(readFileSync('ios/App/App/capacitor.config.json', 'utf8'));
assert.equal(config.appId, 'com.goalinone.game');
assert.ok(!config.server?.url);
const html = readFileSync('dist-native/index.html', 'utf8');
assert.ok(!html.includes('/goal-in-one-test/'));
assert.ok(html.includes('./assets/'));
for (const path of files('dist-native')) {
  const other = path.replace('dist-native', 'ios/App/App/public');
  assert.ok(existsSync(other), other);
  const hash = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
  assert.equal(hash(path), hash(other), path);
}
const assets = files('dist-native/assets');
assert.equal(assets.filter((p) => p.endsWith('.mp3')).length, 4);
assert.ok(assets.some((p) => p.includes('background-')));
assert.ok(assets.some((p) => p.includes('texture-')));
for (const ref of html.matchAll(/(?:src|href)="([^"]+)"/g))
  if (!ref[1].startsWith('data:')) assert.ok(existsSync(join('dist-native', ref[1])), ref[1]);
const plist = readFileSync('ios/App/App/Info.plist', 'utf8');
assert.ok(!plist.includes('UIInterfaceOrientationPortrait'));
assert.ok(
  plist.includes('UIInterfaceOrientationLandscapeLeft') &&
    plist.includes('UIInterfaceOrientationLandscapeRight'),
);
console.log(
  JSON.stringify({
    bundledFiles: files('dist-native').length,
    mp3: 4,
    identicalNativeCopy: true,
    landscapeOnly: true,
    remoteServer: false,
  }),
);
