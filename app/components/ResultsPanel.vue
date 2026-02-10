<script setup lang="ts">
import type { PlaceResult } from '../../types'

const props = defineProps<{
  results: PlaceResult[]
  isSearching: boolean
  error: string | null
  searchedArea: string
  highlightedResultId: string | null
  progressCount: number
  progressStatus: string
  currentGrid: number
  totalGrids: number
}>()

const emit = defineEmits<{
  (e: 'resultClick', result: PlaceResult): void
  (e: 'resultHover', id: string | null): void
  (e: 'exportJson'): void
  (e: 'exportCsv'): void
}>()
</script>

<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b border-base-300/50">
      <div class="flex items-center justify-between">
        <h2 class="font-bold text-lg">搜尋結果</h2>
        <div v-if="results.length > 0 || (isSearching && progressCount > 0)" class="badge badge-primary badge-lg font-semibold">
          {{ isSearching ? progressCount : results.length }} 筆
        </div>
      </div>

      <!-- Export Buttons -->
      <div v-if="results.length > 0" class="flex gap-2 mt-3">
        <button class="btn btn-sm btn-outline rounded-lg flex-1" @click="emit('exportJson')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          匯出 JSON
        </button>
        <button class="btn btn-sm btn-outline rounded-lg flex-1" @click="emit('exportCsv')">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd" />
          </svg>
          匯出 CSV
        </button>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto custom-scrollbar p-4">
      <!-- Loading State with Progress -->
      <div v-if="isSearching" class="flex flex-col items-center justify-center h-full">
        <div class="relative">
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <div class="absolute inset-0 rounded-full animate-ping opacity-20 bg-primary"></div>
        </div>

        <!-- Progress Display -->
        <div class="mt-6 text-center w-full max-w-xs">
          <!-- Grid Progress -->
          <div v-if="totalGrids > 1" class="mb-4">
            <p class="text-xs text-base-content/50 mb-2">搜尋區域進度</p>
            <progress
              class="progress progress-primary w-full"
              :value="currentGrid"
              :max="totalGrids"
            ></progress>
            <p class="text-xs text-base-content/40 mt-1.5">{{ currentGrid }} / {{ totalGrids }}</p>
          </div>

          <p class="text-sm text-base-content/60 animate-search-pulse">{{ progressStatus || '準備搜尋...' }}</p>
          <p v-if="progressCount > 0" class="text-4xl font-bold text-primary mt-3">
            {{ progressCount }}
            <span class="text-sm font-normal text-base-content/50">筆</span>
          </p>
          <p class="text-xs text-base-content/40 mt-3">
            {{ totalGrids > 1 ? '大範圍搜尋中，自動切割區域...' : '搜尋中，請稍候...' }}
          </p>
        </div>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="alert alert-error rounded-xl">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6 shrink-0" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        <div>
          <h3 class="font-bold">搜尋失敗</h3>
          <p class="text-sm">{{ error }}</p>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="results.length === 0" class="flex flex-col items-center justify-center h-full text-base-content/40">
        <div class="w-20 h-20 rounded-2xl bg-base-200/80 flex items-center justify-center mb-5">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p class="text-sm font-medium text-base-content/50 mb-1">尚無搜尋結果</p>
        <p class="text-xs text-center leading-relaxed">
          選擇區域並輸入關鍵字<br/>開始搜尋 Google Maps 上的地點
        </p>
      </div>

      <!-- Results List -->
      <div v-else class="space-y-2.5">
        <TransitionGroup name="result-card">
          <ResultCard
            v-for="result in results"
            :key="result.id"
            :result="result"
            :is-highlighted="result.id === highlightedResultId"
            @click="emit('resultClick', result)"
            @mouseenter="emit('resultHover', result.id)"
            @mouseleave="emit('resultHover', null)"
          />
        </TransitionGroup>
      </div>
    </div>
  </div>
</template>
