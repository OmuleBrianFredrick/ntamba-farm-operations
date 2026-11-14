import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Ntamba Farm Operations',
        short_name: 'Ntamba Farm',
        description: 'Offline-first farm operations, finance and QHSE management.',
        theme_color: '#063d2b',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/ntamba-logo.png', sizes: '192x192', type: 'image/png' },
          { src: '/ntamba-logo.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { navigateFallback: '/index.html' },
    }),
  ],
})
