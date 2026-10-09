// The PWA shortcuts in public/manifest.json open "/?view=<name>". Nothing read that parameter
// before, so every shortcut opened whatever view was saved last. These tests keep the manifest,
// the parser and the View enum in types.ts consistent.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SHORTCUT_VIEWS, shortcutView } from '../services/shortcutView.js';

const manifest = JSON.parse(readFileSync(new URL('../public/manifest.json', import.meta.url), 'utf8'));
const typesSource = readFileSync(new URL('../types.ts', import.meta.url), 'utf8');

// `export enum View { HOME = 'HOME', ... }` -> ['HOME', ...]
const viewValues = [...typesSource.match(/export enum View \{([^}]*)\}/)[1].matchAll(/=\s*'([A-Z_]+)'/g)].map((m) => m[1]);

test('the View enum was found in types.ts', () => {
  assert.ok(viewValues.length >= 5, `parsed: ${viewValues}`);
  assert.ok(viewValues.includes('SCANNER'));
});

test('every manifest shortcut opens a real view', () => {
  assert.ok(manifest.shortcuts.length > 0);
  for (const shortcut of manifest.shortcuts) {
    const { search } = new URL(shortcut.url, 'https://app.test');
    const view = shortcutView(search);
    assert.ok(view, `shortcut "${shortcut.name}" (${shortcut.url}) opens no known view`);
    assert.ok(viewValues.includes(view), `${view} is not a View in types.ts`);
  }
});

test('the shortcuts open the pages their names promise', () => {
  const byName = Object.fromEntries(manifest.shortcuts.map((s) => [s.short_name, shortcutView(new URL(s.url, 'https://app.test').search)]));
  assert.deepEqual(byName, { Scan: 'SCANNER', Map: 'MAP', Vault: 'COLLECTION' });
});

test('every mapped view exists in the View enum', () => {
  for (const view of Object.values(SHORTCUT_VIEWS)) assert.ok(viewValues.includes(view), view);
});

test('the parameter is read next to others, whatever its case', () => {
  assert.equal(shortcutView('?source=pwa&view=map'), 'MAP');
  assert.equal(shortcutView('?view=MAP'), 'MAP');
  assert.equal(shortcutView('?view=Collection&x=1'), 'COLLECTION');
});

test('anything else falls back to the saved view (null)', () => {
  for (const search of ['', '?', '?source=pwa', '?view=', '?view=unknown', '?view=admin', '?VIEW=map']) {
    assert.equal(shortcutView(search), null, JSON.stringify(search));
  }
});

test('names inherited from Object.prototype are not views', () => {
  for (const name of ['constructor', 'toString', '__proto__', 'hasOwnProperty', 'valueOf']) {
    assert.equal(shortcutView(`?view=${name}`), null, name);
  }
});
