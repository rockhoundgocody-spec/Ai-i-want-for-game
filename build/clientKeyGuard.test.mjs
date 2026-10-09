import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { clientKeyGuardMessage } from './clientKeyGuard.mjs';

const KEY = 'AIza-not-a-real-key';
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const viteBin = join(root, 'node_modules', 'vite', 'bin', 'vite.js');

test('a build with a key is refused unless explicitly allowed', () => {
  assert.match(clientKeyGuardMessage('build', { GEMINI_API_KEY: KEY }) ?? '', /Refusing to build/);
  assert.match(
    clientKeyGuardMessage('build', { GEMINI_API_KEY: KEY, ALLOW_CLIENT_GEMINI_KEY: 'false' }) ?? '',
    /Refusing to build/,
  );
  assert.equal(clientKeyGuardMessage('build', { GEMINI_API_KEY: KEY, ALLOW_CLIENT_GEMINI_KEY: 'true' }), null);
});

test('builds without a key, and the dev server, are unaffected', () => {
  assert.equal(clientKeyGuardMessage('build', {}), null);
  assert.equal(clientKeyGuardMessage('build', { GEMINI_API_KEY: '' }), null);
  assert.equal(clientKeyGuardMessage('serve', { GEMINI_API_KEY: KEY }), null);
});

// Regression: the first version only checked `mode === 'production'`, so
// `vite build --mode staging` (or any other mode) shipped the key. These run the
// real CLI; the guard fires while the config loads, so each takes about a second.
for (const mode of ['production', 'development', 'staging', 'any-custom-mode']) {
  test(`vite build --mode ${mode} refuses when a key is present`, () => {
    const outDir = mkdtempSync(join(tmpdir(), 'rh-keyguard-'));
    try {
      const run = spawnSync(process.execPath, [viteBin, 'build', '--mode', mode, '--outDir', outDir], {
        cwd: root,
        env: { ...process.env, GEMINI_API_KEY: KEY, ALLOW_CLIENT_GEMINI_KEY: '' },
        encoding: 'utf8',
      });
      assert.notEqual(run.status, 0, 'build must fail');
      assert.match(`${run.stdout}${run.stderr}`, /Refusing to build/);
      assert.deepEqual(readdirSync(outDir), [], 'no bundle may be written');
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
}
