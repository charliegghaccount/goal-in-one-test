// Publish only the static build, without checking out branches or touching source files.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = join(root, 'dist');
const git = (args, options = {}) =>
  execFileSync('git', args, { cwd: root, encoding: 'utf8', ...options }).trim();
const remote = new URL(git(['remote', 'get-url', 'origin']));
if (
  remote.hostname !== 'github.com' ||
  remote.pathname.replace(/\.git$/, '').toLowerCase() !== '/charliegghaccount/goal-in-one-test'
) {
  throw new Error(
    'The origin must be the connected charliegghaccount/goal-in-one-test repository.',
  );
}
if (!readFileSync(join(dist, 'index.html'), 'utf8').includes('/goal-in-one-test/assets/')) {
  throw new Error(
    'Run npm run build:pages first to generate the correct GitHub Pages asset paths.',
  );
}
writeFileSync(join(dist, '.nojekyll'), '');
const temporary = mkdtempSync(join(root, '.cache', 'pages-'));
try {
  const gitDir = git(['rev-parse', '--absolute-git-dir']);
  const env = { ...process.env, GIT_INDEX_FILE: join(temporary, 'index') };
  const siteGit = (args) =>
    git(['--git-dir', gitDir, '--work-tree', dist, ...args], { cwd: dist, env });
  const remoteRef = git(['ls-remote', '--heads', 'origin', 'refs/heads/gh-pages']);
  const parents = [];
  if (remoteRef) {
    git(['fetch', '--no-tags', 'origin', 'refs/heads/gh-pages']);
    parents.push('-p', git(['rev-parse', 'FETCH_HEAD']));
  }
  siteGit(['read-tree', '--empty']);
  siteGit(['add', '--all', '--', '.']);
  const tree = siteGit(['write-tree']);
  const commit = git(['commit-tree', tree, ...parents, '-m', 'Deploy Goal In One to GitHub Pages']);
  const dryRun = process.argv.includes('--dry-run');
  execFileSync(
    'git',
    ['push', ...(dryRun ? ['--dry-run'] : []), 'origin', `${commit}:refs/heads/gh-pages`],
    { cwd: root, stdio: 'inherit' },
  );
  console.log(
    dryRun
      ? 'Pages push check passed; nothing published.'
      : 'Static site published to the gh-pages branch.',
  );
  console.log(
    'Pages URL (once enabled in repository settings): https://charliegghaccount.github.io/goal-in-one-test/',
  );
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
