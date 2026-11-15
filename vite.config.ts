import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Rutas relativas: la app funciona tanto en la raíz de un dominio como en una subcarpeta (GitHub Pages).
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icono.svg'],
      manifest: {
        name: 'Planificador EBI',
        short_name: 'Planificador',
        description: 'Planificaciones docentes a partir de los programas de Educación Básica Integrada (Uruguay).',
        lang: 'es-UY',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#1d4ed8',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Todo queda guardado en el equipo para funcionar sin conexión (incluida la generación de PDF).
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        // El generador de hojas de actividades es una página aparte: no se reemplaza por la app.
        navigateFallbackDenylist: [/\/actividades\//],
      },
    }),
  ],
  server: { port: 5173 },
});
