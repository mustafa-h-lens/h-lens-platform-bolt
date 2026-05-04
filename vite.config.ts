import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';

function tryExec(cmd: string, fallback: string): string {
  try { return execSync(cmd).toString().trim(); } catch { return fallback; }
}

const commitHash = tryExec('git rev-parse --short HEAD', 'unknown');
const commitMsg = tryExec('git log -1 --format=%s', '');
const commitDate = tryExec('git log -1 --format=%ci', new Date().toISOString());

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    __GIT_COMMIT__: JSON.stringify(commitHash),
    __GIT_MSG__: JSON.stringify(commitMsg),
    __GIT_DATE__: JSON.stringify(commitDate),
  },
  server: {
    port: 5190,
    strictPort: true,
  },
  preview: {
    port: 5190,
    strictPort: true,
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          supabase: ['@supabase/supabase-js'],
          icons: ['lucide-react'],
        },
      },
    },
  },
});
