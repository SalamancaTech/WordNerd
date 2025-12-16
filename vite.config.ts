import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    // We still load env to check if we need to do anything special, but mostly we rely on import.meta.env in the code.
    const env = loadEnv(mode, '.', '');
    return {
      base: mode === 'production' ? '/WordNerd/' : '/',
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        // Polyfill process.env to prevent crashes in 3rd party libs (like @google/genai)
        // that might try to access it.
        'process.env': {},
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});
