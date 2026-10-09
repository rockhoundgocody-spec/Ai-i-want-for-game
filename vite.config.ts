import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');

    // Everything in `define` below is inlined into the public JavaScript bundle.
    // A production build that contains a real Gemini key lets any visitor extract
    // it from the page and spend your quota, so refuse unless the operator opts in
    // knowingly. Local development (`vite`) is unaffected.
    if (mode === 'production' && env.GEMINI_API_KEY && env.ALLOW_CLIENT_GEMINI_KEY !== 'true') {
      throw new Error(
        'Refusing to build: GEMINI_API_KEY would be inlined into the public JavaScript bundle, ' +
        'where anyone can read and abuse it. Call Gemini from a server you control instead ' +
        '(see docs/ROLE_AND_PLAN.md), or set ALLOW_CLIENT_GEMINI_KEY=true to accept the risk knowingly.'
      );
    }

    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
        'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
