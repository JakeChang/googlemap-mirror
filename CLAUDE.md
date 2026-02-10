# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start dev server (http://localhost:3000)
npm run build      # Build for production
npm run preview    # Preview production build
npm run postinstall # Run nuxt prepare (generates .nuxt types)
```

No test runner or linter is configured.

## Architecture

Google Maps 地點搜尋與視覺化工具，透過 Puppeteer 自動化爬取 Google Maps 搜尋結果，支援以台灣縣市/鄉鎮或地圖手繪區域作為搜尋範圍。

**Tech stack:** Nuxt 4 + Vue 3 + TypeScript strict + Tailwind CSS 4 + DaisyUI 5 + Leaflet + Puppeteer

### Frontend (`app/`)

三欄式佈局（`pages/index.vue`）：左側搜尋面板、中央地圖、右側結果列表。

- **Composables**: `useTaiwanRegion` (縣市鄉鎮選取與邊界資料)、`useMapSelection` (手繪區域狀態)、`useGoogleMapsSearch` (搜尋邏輯與 SSE 串流進度)
- **Components**: `SearchPanel` (搜尋控制)、`MapPreview.client.vue` (Leaflet 地圖，client-only)、`ResultsPanel` + `ResultCard` (結果顯示)
- **Map libraries**: Leaflet + leaflet.markercluster + @geoman-io/leaflet-geoman-free (繪圖工具)

### Backend (`server/`)

- **API endpoints**: `search-stream.post` (主要搜尋，SSE 串流)、`search.post` (一次性搜尋)、`rate-limit.get`、`taiwan-counties.get`、`taiwan-county/[id].get`、`taiwan-towns/[countyId].get`、`taiwan-town/[id].get`
- **`server/utils/google-maps-scraper.ts`**: Puppeteer 爬蟲核心，包含 bbox 網格切割、座標萃取、多邊形幾何過濾、頻率限制、UA 輪換
- **`server/utils/taiwan-geo.ts`**: 台灣行政區 GeoJSON 載入與快取、邊界計算、舊地名對照

### Key patterns

- 搜尋模式分 `region`（縣市選取）和 `draw`（地圖圈選），型別定義在 `types/index.ts`
- 大範圍搜尋會自動切割為網格（grid），透過 SSE 回傳即時進度
- Puppeteer 為 devDependency，透過 Nitro `externals` 設定排除打包
- 爬蟲參數皆可透過環境變數 `SCRAPER_*` 調整（見 `nuxt.config.ts` 的 `runtimeConfig`）
- 樣式使用 DaisyUI semantic color tokens（`base-100`、`primary`、`base-content` 等）
- 所有語言皆為繁體中文
