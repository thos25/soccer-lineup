import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['soccer.svg', 'apple-touch-icon-180x180.png', 'favicon.ico'],
      workbox: {
        navigateFallbackDenylist: [/firebase/],
        runtimeCaching: [
          {
            urlPattern: /firebaseio\.com|firebasedatabase\.app|googleapis\.com/,
            handler: 'NetworkOnly',
          },
        ],
      },
      manifest: {
        name: 'Soccer Lineup',
        short_name: 'Lineup',
        description: 'Generate fair rotation lineups for youth soccer games',
        theme_color: '#16a34a',
        background_color: '#f9fafb',
        display: 'standalone',
        orientation: 'portrait',
        start_url: './',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  base: './',
  test: {
    environment: 'node',
  },
})
