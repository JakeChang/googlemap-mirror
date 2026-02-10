<script setup lang="ts">
import type { PlaceResult } from '../../types'

const props = defineProps<{
  result: PlaceResult
  isHighlighted: boolean
}>()

const emit = defineEmits<{
  (e: 'click'): void
  (e: 'mouseenter'): void
  (e: 'mouseleave'): void
}>()

const copied = ref(false)

const copyToClipboard = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    copied.value = true
    setTimeout(() => { copied.value = false }, 1500)
  } catch (err) {
    console.error('Failed to copy:', err)
  }
}
</script>

<template>
  <div
    class="group rounded-xl border cursor-pointer transition-all duration-200"
    :class="isHighlighted
      ? 'border-primary/40 bg-primary/5 shadow-md shadow-primary/10'
      : 'border-base-300/50 bg-base-100 hover:border-base-300 hover:shadow-sm'"
    @click="emit('click')"
    @mouseenter="emit('mouseenter')"
    @mouseleave="emit('mouseleave')"
  >
    <div class="p-3.5">
      <!-- Name & Rating Row -->
      <div class="flex items-start justify-between gap-2">
        <h3 class="text-sm font-bold line-clamp-1 flex-1">
          {{ result.name }}
        </h3>
        <span v-if="result.rating" class="flex items-center gap-0.5 text-xs shrink-0 bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-amber-500" viewBox="0 0 20 20" fill="currentColor">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
          {{ result.rating }}
          <span v-if="result.reviewCount" class="text-amber-600/60">({{ result.reviewCount }})</span>
        </span>
      </div>

      <!-- Category -->
      <div v-if="result.category" class="mt-1.5">
        <span class="text-xs bg-base-200/80 text-base-content/60 px-2 py-0.5 rounded-md">
          {{ result.category }}
        </span>
      </div>

      <!-- Address -->
      <p class="text-xs text-base-content/50 mt-2 line-clamp-2 leading-relaxed">
        {{ result.address || '地址未提供' }}
      </p>

      <!-- Footer: Coordinates & Actions -->
      <div class="flex items-center justify-between mt-2.5 pt-2.5 border-t border-base-300/30">
        <div class="flex items-center gap-1 text-xs text-base-content/40">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
          </svg>
          <span>{{ result.lat.toFixed(5) }}, {{ result.lng.toFixed(5) }}</span>
          <button
            class="btn btn-ghost btn-xs p-0 min-h-0 h-auto opacity-0 group-hover:opacity-100 transition-opacity"
            @click.stop="copyToClipboard(`${result.lat}, ${result.lng}`)"
            title="複製座標"
          >
            <svg v-if="!copied" xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
              <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-success" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <a
          :href="result.googleMapsUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="text-xs text-primary/70 hover:text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
          @click.stop
        >
          Google Maps
          <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
            <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
          </svg>
        </a>
      </div>
    </div>
  </div>
</template>
