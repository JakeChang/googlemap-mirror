<script setup lang="ts">
import type { PlaceResult, DrawnArea, SearchMode } from '../../types'

const {
  mode,
  counties,
  selectedCountyId,
  selectedCountyData,
  towns,
  selectedTownId,
  selectedTownData,
  currentBoundary,
  currentBbox,
  currentGeometry,
  currentRegionName,
  loadCounties,
  selectCounty,
  loadTowns,
  selectTown,
  resetTownSelection
} = useTaiwanRegion()

const {
  drawnArea,
  setDrawnArea,
  clearDrawnArea
} = useMapSelection()

const {
  results,
  isSearching,
  error,
  searchedArea,
  highlightedResultId,
  progressCount,
  progressStatus,
  currentGrid,
  totalGrids,
  search,
  highlightResult,
  exportAsJson,
  exportAsCsv
} = useGoogleMapsSearch()

// Load counties on mount
onMounted(() => {
  loadCounties()
})

// Watch county selection
watch(selectedCountyId, async (newId) => {
  if (newId) {
    // Reset town selection first (but keep towns array)
    selectedTownId.value = ''
    selectedTownData.value = null
    // Then load county and towns data
    await selectCounty(newId)
    await loadTowns(newId)
  } else {
    resetTownSelection()
  }
})

// Watch town selection
watch(selectedTownId, async (newId) => {
  if (newId) {
    await selectTown(newId)
  } else if (selectedCountyId.value) {
    // Reset to county level if town is cleared
    await selectCounty(selectedCountyId.value)
  }
})

// Handle mode change
const handleModeChange = (newMode: SearchMode) => {
  mode.value = newMode
}

// Handle county ID change
const handleCountyIdChange = (id: string) => {
  selectedCountyId.value = id
}

// Handle town ID change
const handleTownIdChange = (id: string) => {
  selectedTownId.value = id
}

// Handle drawn area
const handleDrawn = (area: DrawnArea) => {
  setDrawnArea(area)
}

// Handle draw cleared
const handleDrawCleared = () => {
  clearDrawnArea()
}

// Handle search
const handleSearch = async (keyword: string) => {
  const bbox = mode.value === 'region' ? currentBbox.value : drawnArea.value?.bbox

  if (!bbox) return

  const center = mode.value === 'region' && currentBbox.value
    ? {
        lat: (currentBbox.value.south + currentBbox.value.north) / 2,
        lng: (currentBbox.value.west + currentBbox.value.east) / 2
      }
    : drawnArea.value?.center || {
        lat: (bbox.south + bbox.north) / 2,
        lng: (bbox.west + bbox.east) / 2
      }

  // Get geometry for precise filtering (region mode only)
  const geometry = mode.value === 'region' ? currentGeometry.value : undefined

  await search({
    keyword,
    mode: mode.value,
    countyId: mode.value === 'region' ? selectedCountyId.value : undefined,
    townId: mode.value === 'region' ? selectedTownId.value : undefined,
    bbox,
    centerLat: center.lat,
    centerLng: center.lng,
    geometry
  })
}

// Handle result click
const handleResultClick = (result: PlaceResult) => {
  highlightResult(result.id)
}

// Handle marker click from map
const handleMarkerClick = (result: PlaceResult) => {
  highlightResult(result.id)
}
</script>

<template>
  <div class="h-screen flex flex-col bg-base-200/50">
    <!-- Header -->
    <header class="bg-gradient-to-r from-primary to-secondary px-5 py-3 shadow-md">
      <div class="flex items-center justify-between">
        <h1 class="text-lg font-bold text-primary-content flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
            </svg>
          </div>
          Google Maps 搜尋工具
        </h1>
        <div class="text-sm text-primary-content/70">
          搜尋 Google Maps 上的地點資料
        </div>
      </div>
    </header>

    <!-- Main Content - Three Column Layout -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left Panel - Search -->
      <aside class="w-80 bg-base-100 border-r border-base-300/50 flex-shrink-0 overflow-y-auto custom-scrollbar shadow-sm">
        <SearchPanel
          :mode="mode"
          :counties="counties"
          :towns="towns"
          :selected-county-id="selectedCountyId"
          :selected-town-id="selectedTownId"
          :current-bbox="currentBbox"
          :drawn-area="drawnArea"
          :is-searching="isSearching"
          @update:mode="handleModeChange"
          @update:selected-county-id="handleCountyIdChange"
          @update:selected-town-id="handleTownIdChange"
          @search="handleSearch"
          @clear-drawing="clearDrawnArea"
        />
      </aside>

      <!-- Center - Map -->
      <div class="flex-1 relative">
        <ClientOnly>
          <MapPreview
            :mode="mode"
            :region-boundary="mode === 'region' ? currentBoundary : undefined"
            :region-bbox="mode === 'region' ? currentBbox : undefined"
            :results="results"
            :highlighted-result-id="highlightedResultId"
            :drawn-area="mode === 'draw' ? drawnArea : undefined"
            @drawn="handleDrawn"
            @draw-cleared="handleDrawCleared"
            @marker-click="handleMarkerClick"
          />
          <template #fallback>
            <div class="w-full h-full flex items-center justify-center bg-base-200">
              <span class="loading loading-spinner loading-lg text-primary"></span>
            </div>
          </template>
        </ClientOnly>

        <!-- Map Legend -->
        <div class="absolute bottom-4 left-4 glass-panel rounded-xl shadow-lg p-3.5 text-xs border border-base-300/30">
          <div class="font-semibold mb-2.5 text-base-content/80">圖例</div>
          <div class="flex items-center gap-2.5 mb-2">
            <div class="w-3.5 h-3.5 rounded-full bg-secondary border-2 border-white shadow-sm"></div>
            <span class="text-base-content/70">搜尋結果</span>
          </div>
          <div class="flex items-center gap-2.5">
            <div class="w-3.5 h-3.5 rounded-full bg-primary border-2 border-white shadow-sm ring-2 ring-primary/30"></div>
            <span class="text-base-content/70">選中地點</span>
          </div>
        </div>
      </div>

      <!-- Right Panel - Results -->
      <aside class="w-96 bg-base-100 border-l border-base-300/50 flex-shrink-0 overflow-hidden shadow-sm">
        <ResultsPanel
          :results="results"
          :is-searching="isSearching"
          :error="error"
          :searched-area="searchedArea"
          :highlighted-result-id="highlightedResultId"
          :progress-count="progressCount"
          :progress-status="progressStatus"
          :current-grid="currentGrid"
          :total-grids="totalGrids"
          @result-click="handleResultClick"
          @result-hover="highlightResult"
          @export-json="exportAsJson"
          @export-csv="exportAsCsv"
        />
      </aside>
    </main>
  </div>
</template>
