<script setup lang="ts">
import type { CountyInfo, TownInfo, SearchMode, BBox, DrawnArea } from '../../types'

const props = defineProps<{
  mode: SearchMode
  counties: CountyInfo[]
  towns: TownInfo[]
  selectedCountyId: string
  selectedTownId: string
  currentBbox?: BBox
  drawnArea?: DrawnArea | null
  isSearching: boolean
}>()

const emit = defineEmits<{
  (e: 'update:mode', mode: SearchMode): void
  (e: 'update:selectedCountyId', id: string): void
  (e: 'update:selectedTownId', id: string): void
  (e: 'search', keyword: string): void
  (e: 'clearDrawing'): void
}>()

const keyword = ref('')


const canSearch = computed(() => {
  if (!keyword.value.trim()) return false


  if (props.mode === 'region') {
    return !!props.currentBbox
  } else {
    return !!props.drawnArea
  }
})

const handleSearch = () => {
  if (canSearch.value) {
    emit('search', keyword.value.trim())
  }
}

const handleModeChange = (newMode: SearchMode) => {
  emit('update:mode', newMode)
}

const handleCountyChange = (e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  emit('update:selectedCountyId', value)
}

const handleTownChange = (e: Event) => {
  const value = (e.target as HTMLSelectElement).value
  emit('update:selectedTownId', value)
}

const drawnAreaDescription = computed(() => {
  if (!props.drawnArea) return ''

  const bbox = props.drawnArea.bbox
  const width = Math.abs(bbox.east - bbox.west) * 111 // Approximate km
  const height = Math.abs(bbox.north - bbox.south) * 111

  if (props.drawnArea.type === 'rectangle') {
    return `矩形區域 (約 ${width.toFixed(1)} x ${height.toFixed(1)} km)`
  } else {
    return `多邊形區域`
  }
})


</script>

<template>
  <div class="p-5 space-y-5">
    <!-- Mode Toggle -->
    <div>
      <label class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 block">搜尋模式</label>
      <div class="bg-base-200/80 rounded-xl p-1 flex gap-1">
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
          :class="mode === 'region'
            ? 'bg-primary text-primary-content shadow-sm'
            : 'text-base-content/60 hover:text-base-content hover:bg-base-100/50'"
          @click="handleModeChange('region')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          縣市/鄉鎮
        </button>
        <button
          class="flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 flex items-center justify-center gap-1.5"
          :class="mode === 'draw'
            ? 'bg-primary text-primary-content shadow-sm'
            : 'text-base-content/60 hover:text-base-content hover:bg-base-100/50'"
          @click="handleModeChange('draw')"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
          </svg>
          地圖圈選
        </button>
      </div>
    </div>

    <!-- Region Selection (when mode is 'region') -->
    <template v-if="mode === 'region'">
      <div>
        <label class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 block">縣市</label>
        <select
          class="select select-bordered w-full rounded-xl focus:outline-primary"
          :value="selectedCountyId"
          @change="handleCountyChange"
        >
          <option value="">請選擇縣市</option>
          <option v-for="county in counties" :key="county.id" :value="county.id">
            {{ county.name }}
          </option>
        </select>
      </div>

      <div>
        <label class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 block">鄉鎮市區（選填）</label>
        <select
          class="select select-bordered w-full rounded-xl focus:outline-primary"
          :value="selectedTownId"
          @change="handleTownChange"
          :disabled="!selectedCountyId || towns.length === 0"
        >
          <option value="">全縣市</option>
          <option v-for="town in towns" :key="town.id" :value="town.id">
            {{ town.name }}
          </option>
        </select>
      </div>
    </template>

    <!-- Drawing Info (when mode is 'draw') -->
    <template v-if="mode === 'draw'">
      <div class="bg-info/10 border border-info/20 rounded-xl p-3.5 flex items-start gap-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-info shrink-0 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd" />
        </svg>
        <span class="text-sm text-info">使用左上角工具列在地圖上畫出搜尋區域</span>
      </div>

      <div v-if="drawnArea" class="bg-success/10 border border-success/20 rounded-xl p-3.5">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <div class="w-8 h-8 rounded-lg bg-success/20 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-success" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
              </svg>
            </div>
            <div>
              <div class="text-sm font-semibold text-success">已選區域</div>
              <div class="text-xs text-base-content/60">{{ drawnAreaDescription }}</div>
            </div>
          </div>
          <button class="btn btn-xs btn-ghost btn-circle text-base-content/40 hover:text-error" @click="emit('clearDrawing')">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </template>

    <!-- Divider -->
    <div class="border-t border-base-300/50"></div>

    <!-- Keyword Input -->
    <div>
      <label class="text-xs font-semibold text-base-content/50 uppercase tracking-wider mb-2 block">搜尋關鍵字</label>
      <div class="relative">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-base-content/30" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
        </svg>
        <input
          v-model="keyword"
          type="text"
          placeholder="例如：電動車充電站、咖啡廳"
          class="input input-bordered w-full pl-10 rounded-xl focus:outline-primary"
          @keyup.enter="handleSearch"
        />
      </div>
    </div>

    <!-- Search Button -->
    <button
      class="btn btn-primary btn-block rounded-xl shadow-md hover:shadow-lg transition-shadow"
      :disabled="!canSearch || isSearching"
      @click="handleSearch"
    >
      <span v-if="isSearching" class="loading loading-spinner loading-sm"></span>
      <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" />
      </svg>
      <span>{{ isSearching ? '搜尋中...' : '開始搜尋' }}</span>
    </button>

    <!-- Hint -->
    <p class="text-xs text-base-content/40 text-center">
      <template v-if="mode === 'region'">
        請先選擇縣市，再輸入關鍵字搜尋
      </template>
      <template v-else>
        請在地圖上圈選區域，再輸入關鍵字搜尋
      </template>
    </p>
  </div>
</template>
