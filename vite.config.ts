import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { clientKeyGuardMessage } from './build/clientKeyGuard.mjs';

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, '.', '');

    // Everything in `define` below is inlined into the public JavaScript bundle.
    // A bundle built while a real Gemini key is set lets any visitor extract it from
    // the page and spend your quota, so ANY `vite build` (whatever its --mode) is
    // refused unless the operator opts in knowingly. The dev server is unaffected.
    const refusal = clientKeyGuardMessage(command, env);
    if (refusal) throw new Error(refusal);

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
