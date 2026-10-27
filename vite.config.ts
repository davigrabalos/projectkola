import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// /api is served by the Worker (`npm run dev:api`, port 8787); the Vite dev and preview servers proxy to it.
const api = { '/api': 'http://localhost:8787' };

export default defineConfig({
  plugins: [react()],
  server: { proxy: api },
  preview: { proxy: api },
});
