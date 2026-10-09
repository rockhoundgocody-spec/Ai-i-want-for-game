// The PWA shortcuts in public/manifest.json launch the app at "/?view=<name>". This maps that
// launch parameter to a View value (types.ts). It has no imports so a plain Node test can load it.

export const SHORTCUT_VIEWS = Object.freeze({
  scanner: 'SCANNER',
  map: 'MAP',
  collection: 'COLLECTION',
  home: 'HOME',
});

/**
 * @param {string} search  a location.search string, e.g. "?source=pwa&view=map"
 * @returns {string | null}  the View name to open, or null when the URL asks for none we know
 */
export function shortcutView(search) {
  const requested = new URLSearchParams(search).get('view')?.toLowerCase();
  // hasOwn: "?view=constructor" must not resolve to something inherited from Object.prototype.
  return requested && Object.hasOwn(SHORTCUT_VIEWS, requested) ? SHORTCUT_VIEWS[requested] : null;
}
