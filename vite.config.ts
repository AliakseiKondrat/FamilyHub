import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// Relative base so the same build works on GitHub Pages (/FamilyHub/) and on a custom domain.
export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Our own service worker (src/sw.ts) so it can receive push notifications.
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      injectManifest: { globPatterns: ['**/*.{js,css,html,png,svg}'] },
      includeAssets: ['favicon.svg', 'icons/apple-touch-icon.png'],
      manifest: {
        name: 'Family Hub',
        short_name: 'Family Hub',
        description: 'Наш общий дом: продукты, задачи, календарь, бюджет и всё остальное',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'any',
        background_color: '#4338ca',
        theme_color: '#4338ca',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        // Android: long-press the icon for these, and "Share → Family Hub" from any app (iOS ignores both).
        shortcuts: [
          { name: 'Продукты', short_name: 'Продукты', url: './?open=groceries', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Задачи', short_name: 'Задачи', url: './?open=tasks', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
          { name: 'Входящие', short_name: 'Входящие', url: './?open=inbox', icons: [{ src: 'icons/icon-192.png', sizes: '192x192' }] },
        ],
        share_target: { action: './', method: 'GET', params: { title: 'title', text: 'text', url: 'url' } },
      },
    }),
  ],
})
