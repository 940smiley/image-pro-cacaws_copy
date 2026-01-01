import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  base: '/image-pro-cacaws_copy/',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});
