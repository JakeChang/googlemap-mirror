import { scrapeGoogleMapsWithProgress, type ScraperConfig } from '../utils/google-maps-scraper'
import { getBboxCenter } from '../utils/taiwan-geo'
import type { SearchRequest } from '../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody<SearchRequest>(event)
  const runtimeConfig = useRuntimeConfig(event)
  const scraperConfig = runtimeConfig.scraper as ScraperConfig

  // Validate request
  if (!body.keyword || !body.keyword.trim()) {
    throw createError({
      statusCode: 400,
      message: '請輸入搜尋關鍵字'
    })
  }

  if (!body.bbox) {
    throw createError({
      statusCode: 400,
      message: '請選擇搜尋區域'
    })
  }

  // Calculate center if not provided
  let centerLat = body.centerLat
  let centerLng = body.centerLng

  if (!centerLat || !centerLng) {
    const center = getBboxCenter(body.bbox)
    centerLat = center.lat
    centerLng = center.lng
  }

  // Set up SSE headers
  setHeader(event, 'Content-Type', 'text/event-stream')
  setHeader(event, 'Cache-Control', 'no-cache')
  setHeader(event, 'Connection', 'keep-alive')

  const sendEvent = (data: any) => {
    event.node.res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  console.log(`Starting search for "${body.keyword}" in area centered at ${centerLat}, ${centerLng}`)

  try {
    const results = await scrapeGoogleMapsWithProgress(
      {
        keyword: body.keyword.trim(),
        centerLat,
        centerLng,
        bbox: body.bbox,
        geometry: body.geometry,
        maxResults: scraperConfig.maxResults
      },
      (progress) => {
        sendEvent({
          type: 'progress',
          count: progress.count,
          status: progress.status,
          currentGrid: progress.currentGrid,
          totalGrids: progress.totalGrids
        })
      },
      scraperConfig
    )

    // Send final results
    sendEvent({
      type: 'complete',
      results,
      totalCount: results.length
    })

    console.log(`Search complete, found ${results.length} results`)

  } catch (error: any) {
    console.error('Search failed:', error)
    sendEvent({
      type: 'error',
      message: error.message || '搜尋失敗'
    })
  }

  event.node.res.end()
})
