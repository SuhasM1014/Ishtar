import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'Ishtar: Private Feminine Wellness',
        short_name: 'Ishtar',
        description: 'Private feminine wellness intelligence. Your data stays on your device.',
        theme_color: '#6b2d5c',
        background_color: '#fbf6f9',
        display: 'standalone',
        start_url: '.',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
      workbox: {
        // Model weights are cached by WebLLM / Transformers.js themselves; only the app shell is precached.
        maximumFileSizeToCacheInBytes: 12 * 1024 * 1024,
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
      },
    }),
  ],
  optimizeDeps: {
    exclude: ['@mlc-ai/web-llm', '@huggingface/transformers'],
  },
  build: {
    target: 'es2022',
    chunkSizeWarningLimit: 8000,
  },
});
