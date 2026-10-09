/**
 * Guard against shipping a Gemini API key in the public JavaScript bundle.
 *
 * vite.config.ts defines `process.env.API_KEY` / `process.env.GEMINI_API_KEY`
 * from the build environment, so any bundle built while a key is set contains
 * it, and anyone can read it from the page and spend the owner's quota.
 *
 * The decision is keyed on Vite's `command`, NOT on `--mode`: `vite build` is
 * `command === 'build'` whatever mode name it is given (`production`, `staging`,
 * `--mode anything`). An earlier version checked `mode === 'production'` and was
 * bypassed by `vite build --mode staging`.
 */

export const REFUSAL_MESSAGE =
  'Refusing to build: GEMINI_API_KEY would be inlined into the public JavaScript bundle, ' +
  'where anyone can read and abuse it. Call Gemini from a server you control instead ' +
  '(see docs/ROLE_AND_PLAN.md), or set ALLOW_CLIENT_GEMINI_KEY=true to accept the risk knowingly.';

/**
 * @param {'build' | 'serve'} command Vite's command. Every `vite build` is 'build'.
 * @param {Record<string, string | undefined>} env Environment as returned by Vite's loadEnv.
 * @returns {string | null} A refusal message, or null if the build may proceed.
 */
export function clientKeyGuardMessage(command, env) {
  // The dev server and `vite preview` do not produce a bundle to publish.
  if (command !== 'build') return null;
  if (!env.GEMINI_API_KEY) return null;
  if (env.ALLOW_CLIENT_GEMINI_KEY === 'true') return null;
  return REFUSAL_MESSAGE;
}
