# Role of this repository, and the plan for it

Snapshot **2026-10-09** · `main` @ `ede71bf` · the full plan lives in **RHgo-v-2.0** under `docs/plan/` (on its `main` once the companion pull request is merged; until then see the draft PR on branch `claude/friendly-sagan-fsv41n`).

## Role: prototype quarry, not a product

This is a Google AI Studio prototype ("RockHound GO // NEURAL", v4.5): browser-side Gemini identification, Firebase Auth + Firestore, a React-Three-Fiber interface. `RHgo-v-2.0` is the active product and runs on a different architecture (Base44), so **there is nothing to merge**: only ideas to port, through the ledger below. Recommendation (pending owner sign-off, **D1**): no new features here, give it just enough hygiene to be safe, then archive it (**D7**).

## What the accompanying pull request changed

| Commit | Change | Verified by |
| --- | --- | --- |
| `security: remove the insecure, unrunnable Express/Mongo server` | Deleted `server/`: hardcoded JWT fallback secret, "MFA" that accepts any six digits, first user becomes admin, CORS reflecting any origin, no rate limit on `/auth/*`; its dependencies were not even in `package.json` | `tsc` clean; nothing imported it |
| `fix(pwa): ship manifest.json and sw.js` | They sat at the repo root, so Vite never copied them to `dist/`: no install, no offline cache, and the service-worker registration 404'd. Moved to `public/`, linked the manifest, dropped a `/index.css` link to a file that does not exist | clean build: `dist/` now contains both files |
| `security(build): refuse to inline GEMINI_API_KEY` | A build made with a key shipped it to every visitor. The build now fails closed unless `ALLOW_CLIENT_GEMINI_KEY=true`; `.env*` ignored | built with a dummy key: refused; with the opt-in the key appeared in `dist/assets/*.js`, proving the leak |
| `fix(build): apply the key guard to every --mode` | The first version only checked `mode === 'production'`, so `vite build --mode staging` still shipped the key (a review finding; reproduced: exit 0, key in the bundle). The guard now keys on Vite's `command === 'build'`, with regression tests that run the real CLI in four modes (`npm test`, also in CI) | the tests pass on the fix and **fail on the old guard** for `development`, `staging` and a custom mode |
| `ci+docs` | CI (type-check, build, PWA files present) and this document | run locally with the workflow's commands |

## Calling Gemini safely (what to do instead of a browser-side key)

Do not ship `GEMINI_API_KEY` in a browser bundle. Put the model calls behind a server you control:

1. A Cloud Function / Cloud Run service (or a Base44 function) exposes `identify`, `refine`, and the other calls, holding the key in a secret.
2. It verifies the caller's **Firebase ID token** and rejects anonymous requests; enable **App Check**.
3. It rate-limits **per user** (a counter document is enough) and enforces a **global daily budget** that stops paid calls when exceeded.
4. Prompts and response schemas live server-side; the browser sends the image and receives validated JSON.
5. Never put a key in a URL: `generateVeoVideo` currently appends `&key=...` to a download link (`services/geminiService.ts:79`).

If AI Studio's own deployment injects and proxies the key for you, that is a different and safer setup. Say so in the README so nobody builds with a key locally.

## Open issues (deliberately not changed in this PR)

| ID | Issue | Why not changed here |
| --- | --- | --- |
| G-3 | **Firestore rules let users write their own `xp`, `level`, `credits`, `isAdmin`** (`firestore.rules:128`; XP is computed in the browser, `services/api.ts`). `rocks` documents accept arbitrary extra fields and have no size cap on `imageUrl` | A correct fix moves XP/level to a server function, which changes the client. Needs `@firebase/rules-unit-testing` against the emulator first. Sketch: limit user updates to `diff().affectedKeys().hasOnly(['username','avatarUrl','settings'])`, require `hasOnly([...])` and size caps on `rocks` |
| G-4 | `isAdmin` is set client-side from an email string (`services/api.ts:142`) and stored in a self-writable document | UI gating only (the rules check `roles` and a verified email), but remove the field |
| G-5 | Scripts with no integrity pinning: Tailwind **Play CDN**, Leaflet from `unpkg`, plus an `esm.sh` import map that Vite makes dead. The import map may be required if this is re-imported into AI Studio, so check before deleting | Replace the Tailwind CDN with the build-time plugin |
| G-6 | Assets you do not own are fetched at runtime: `rock.glb` from `aistudiocdn.com`, and 10 MP3s from a third-party Google codelab bucket (`services/audioUtils.ts`) | Self-host them |
| G-7 | The Firebase web `apiKey` is committed (`firebase-applet-config.json`). That is normal for Firebase web apps | Restrict it by HTTP referrer in Google Cloud and enable App Check |
| G-8 | `migrated_prompt_history/` is 565 KB of AI Studio chat history (one email address, no secrets) | Owner's call: it is your record |
| perf | The entry chunk is 1.95 MB (504 kB gzipped) | Split Firebase, recharts and three/R3F with `manualChunks` |
| brand | Manifest icons are remote Flaticon URLs | Needs real brand PNGs |

Also **do not port**: the scanner's hard-coded "telemetry" (`components/Scanner.tsx:135`, `accuracy: 99.8`) and the manifest claim "military-grade AI precision": a science-forward product should not show invented readings.

## Feature ledger (what is worth porting)

Full table: `docs/plan/FEATURE_LEDGER.md` in RHgo-v-2.0.

| Pri | Asset | Why |
| --- | --- | --- |
| P2 | `components/DiscoveryReveal.tsx` | The directive says "make Scan the reveal moment". Port the **sequence** (flash, rarity beam, specimen, info), honouring `prefers-reduced-motion` |
| P2 | The `identifyRock` response schema | Crystal system, cleavage, hardness, petrology, formation genesis. Compare with RHgo's `identifySpecimen` and add missing educational fields; drop invented ones such as `estimatedValue` |
| P3 | `services/audioUtils.ts`, Clover persona/voice config | Compare with what RHgo already has |
| Skip | `FusionLab` (invents hybrid minerals), `AILab` (paid image/video generation), the holographic scanner telemetry | Conflicts with "science-forward"; cost and abuse surface |

## Retirement

Archive on GitHub (reversible) when the P1/P2 rows are ported or declined, no deployment still serves users from this repo, and the owner confirms (**D7**).
