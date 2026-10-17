# AGENTS.md

## Architecture & Runtime Notes
- **Frontend-only SPA**: React 19 + TypeScript + Vite 6 + Three.js (`@react-three/fiber`) served on port `3000`.
- **Backend / Persistence**: Uses client-side Firebase Auth (Google Sign-In) and Cloud Firestore configured in `firebase-applet-config.json` and `firebase.ts`. There is no local backend or database container.
- **AI Integration (`GEMINI_API_KEY`)**: `vite.config.ts` loads `GEMINI_API_KEY` from the environment and defines `process.env.API_KEY` and `process.env.GEMINI_API_KEY` for `@google/genai` in `services/geminiService.ts` and `components/CloverOverlay.tsx`. The app boots without `GEMINI_API_KEY` (falling back to default daily bounty data), while live rock identification, Clover chat, and media generation require a valid key.
- **Build Guard**: `build/clientKeyGuard.mjs` intentionally fails any `vite build` (`npm run build`) if `GEMINI_API_KEY` is non-empty in the environment unless `ALLOW_CLIENT_GEMINI_KEY=true`. The Vite dev server (`npm run dev`) is unaffected.

## Verification & Checks
- Dev server: `docker compose -f docker-compose.base44.yml up -d` (serves on `http://localhost:3000/`)
- Typecheck: `npm run lint` (`tsc --noEmit`)
- Unit / regression tests: `npm test` (validates client key guard, service worker caching, and PWA view shortcuts)
