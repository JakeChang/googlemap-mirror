import type { PlaceResult, SearchRequest, SearchResponse, BBox } from '../../types'

export function useGoogleMapsSearch() {
  const results = ref<PlaceResult[]>([])
  const isSearching = ref(false)
  const error = ref<string | null>(null)
  const searchedArea = ref('')
  const highlightedResultId = ref<string | null>(null)

  // Progress tracking
  const progressCount = ref(0)
  const progressStatus = ref('')
  const currentGrid = ref(0)
  const totalGrids = ref(0)

  const search = async (request: SearchRequest) => {
    isSearching.value = true
    error.value = null
    results.value = []
    progressCount.value = 0
    progressStatus.value = '準備搜尋...'

    try {
      // Use SSE for streaming progress
      const response = await fetch('/api/search-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(request)
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error('No response body')
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))

              if (data.type === 'progress') {
                progressCount.value = data.count
                progressStatus.value = data.status
                if (data.currentGrid) currentGrid.value = data.currentGrid
                if (data.totalGrids) totalGrids.value = data.totalGrids
              } else if (data.type === 'complete') {
                results.value = data.results
                searchedArea.value = '搜尋完成'
                progressStatus.value = `搜尋完成，共 ${data.totalCount} 筆`
              } else if (data.type === 'error') {
                error.value = data.message
              }
            } catch (e) {
              // Ignore parse errors for incomplete data
            }
          }
        }
      }

      return { results: results.value, totalCount: results.value.length }
    } catch (e: any) {
      error.value = e.message || '搜尋失敗'
      console.error('Search failed:', e)
      return null
    } finally {
      isSearching.value = false
    }
  }

  const clearResults = () => {
    results.value = []
    searchedArea.value = ''
    error.value = null
    progressCount.value = 0
    progressStatus.value = ''
    currentGrid.value = 0
    totalGrids.value = 0
  }

  const highlightResult = (id: string | null) => {
    highlightedResultId.value = id
  }

  // Export results as JSON
  const exportAsJson = () => {
    if (results.value.length === 0) return

    const dataStr = JSON.stringify(results.value, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `google-maps-results-${Date.now()}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  // Export results as CSV
  const exportAsCsv = () => {
    if (results.value.length === 0) return

    const headers = ['名稱', '地址', '緯度', '經度', 'Google Maps 連結', '評分', '評論數', '類別']
    const rows = results.value.map(r => [
      r.name,
      r.address,
      r.lat.toString(),
      r.lng.toString(),
      r.googleMapsUrl,
      r.rating?.toString() || '',
      r.reviewCount?.toString() || '',
      r.category || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `google-maps-results-${Date.now()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const resultCount = computed(() => results.value.length)

  return {
    results,
    isSearching,
    error,
    searchedArea,
    highlightedResultId,
    resultCount,
    progressCount,
    progressStatus,
    currentGrid,
    totalGrids,
    search,
    clearResults,
    highlightResult,
    exportAsJson,
    exportAsCsv
  }
}
