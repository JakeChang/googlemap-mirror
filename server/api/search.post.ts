import { scrapeGoogleMaps } from '../utils/google-maps-scraper'
import { getBboxCenter } from '../utils/taiwan-geo'
import type { SearchRequest, SearchResponse } from '../../types'

export default defineEventHandler(async (event) => {
  const body = await readBody<SearchRequest>(event)

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

  // Determine searched area name
  let searchedArea = '自訂區域'
  if (body.mode === 'region') {
    // The area name should be passed from frontend or looked up
    searchedArea = '選定區域'
  }

  console.log(`Starting search for "${body.keyword}" in area centered at ${centerLat}, ${centerLng}`)

  try {
    const results = await scrapeGoogleMaps({
      keyword: body.keyword.trim(),
      centerLat,
      centerLng,
      bbox: body.bbox,
      maxResults: 60
    })

    const response: SearchResponse = {
      results,
      totalCount: results.length,
      searchedArea
    }

    console.log(`Search complete, found ${results.length} results`)

    return response
  } catch (error: any) {
    console.error('Search failed:', error)
    throw createError({
      statusCode: 500,
      message: `搜尋失敗: ${error.message || '未知錯誤'}`
    })
  }
})
