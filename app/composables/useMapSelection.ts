import type { BBox, DrawnArea } from '../../types'

export function useMapSelection() {
  const drawnArea = ref<DrawnArea | null>(null)
  const isDrawing = ref(false)

  const setDrawnArea = (area: DrawnArea | null) => {
    drawnArea.value = area
  }

  const clearDrawnArea = () => {
    drawnArea.value = null
  }

  const startDrawing = () => {
    isDrawing.value = true
  }

  const stopDrawing = () => {
    isDrawing.value = false
  }

  // Calculate center from bbox
  const drawnAreaCenter = computed(() => {
    if (!drawnArea.value) return null

    if (drawnArea.value.center) {
      return drawnArea.value.center
    }

    const bbox = drawnArea.value.bbox
    return {
      lat: (bbox.south + bbox.north) / 2,
      lng: (bbox.west + bbox.east) / 2
    }
  })

  const hasDrawnArea = computed(() => !!drawnArea.value)

  return {
    drawnArea,
    isDrawing,
    drawnAreaCenter,
    hasDrawnArea,
    setDrawnArea,
    clearDrawnArea,
    startDrawing,
    stopDrawing
  }
}
