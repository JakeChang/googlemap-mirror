import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ['leaflet', 'leaflet.markercluster']
    }
  },
  css: ["./app/tailwind.css"],
  typescript: {
    strict: true
  },
  nitro: {
    externals: {
      inline: [],
      external: [
        'puppeteer',
        'puppeteer-extra',
        'puppeteer-extra-plugin-stealth'
      ]
    }
  },
  runtimeConfig: {
    // Server-side only (not exposed to client)
    scraper: {
      minInterval: parseInt(process.env.SCRAPER_MIN_INTERVAL || '60000'),
      maxGrids: parseInt(process.env.SCRAPER_MAX_GRIDS || '16'),
      maxResults: parseInt(process.env.SCRAPER_MAX_RESULTS || '200'),
      pageDelayMin: parseInt(process.env.SCRAPER_PAGE_DELAY_MIN || '3000'),
      pageDelayMax: parseInt(process.env.SCRAPER_PAGE_DELAY_MAX || '5000'),
      scrollDelayMin: parseInt(process.env.SCRAPER_SCROLL_DELAY_MIN || '2000'),
      scrollDelayMax: parseInt(process.env.SCRAPER_SCROLL_DELAY_MAX || '3500'),
      gridDelayMin: parseInt(process.env.SCRAPER_GRID_DELAY_MIN || '3000'),
      gridDelayMax: parseInt(process.env.SCRAPER_GRID_DELAY_MAX || '5000'),
      gridSize: parseFloat(process.env.SCRAPER_GRID_SIZE || '0.08')
    },
    // Public (exposed to client)
    public: {
    }
  }
})
