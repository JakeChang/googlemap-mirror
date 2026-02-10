import puppeteer from 'puppeteer'
import type { Browser, Page } from 'puppeteer'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, multiPolygon, polygon } from '@turf/helpers'
import type { PlaceResult, BBox } from '../../types'

// Geometry type for precise filtering
type Geometry = {
  type: 'MultiPolygon' | 'Polygon'
  coordinates: number[][][][] | number[][][]
}

// User agents for rotation
const USER_AGENTS = [
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0'
]

// Random delay helper
const randomDelay = (min: number, max: number) =>
  new Promise(resolve => setTimeout(resolve, Math.random() * (max - min) + min))

// Get random user agent
const getRandomUserAgent = () =>
  USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)]

// Scraper configuration interface
export interface ScraperConfig {
  minInterval: number
  maxGrids: number
  maxResults: number
  pageDelayMin: number
  pageDelayMax: number
  scrollDelayMin: number
  scrollDelayMax: number
  gridDelayMin: number
  gridDelayMax: number
  gridSize: number
}

// Default configuration
const DEFAULT_CONFIG: ScraperConfig = {
  minInterval: 60000,
  maxGrids: 16,
  maxResults: 200,
  pageDelayMin: 3000,
  pageDelayMax: 5000,
  scrollDelayMin: 2000,
  scrollDelayMax: 3500,
  gridDelayMin: 3000,
  gridDelayMax: 5000,
  gridSize: 0.08
}

interface ScraperOptions {
  keyword: string
  centerLat: number
  centerLng: number
  bbox: BBox
  geometry?: Geometry
  maxResults?: number
}

interface ProgressCallback {
  (progress: { count: number; status: string; currentGrid?: number; totalGrids?: number }): void
}

// Rate limiting - track search interval
let lastSearchTime = 0

export function checkRateLimit(config: ScraperConfig): { allowed: boolean; message?: string } {
  const now = Date.now()
  const timeSinceLastSearch = now - lastSearchTime
  if (lastSearchTime > 0 && timeSinceLastSearch < config.minInterval) {
    const waitSeconds = Math.ceil((config.minInterval - timeSinceLastSearch) / 1000)
    return {
      allowed: false,
      message: `請等待 ${waitSeconds} 秒後再搜尋`
    }
  }

  return { allowed: true }
}

function recordSearch() {
  lastSearchTime = Date.now()
}

// Generate unique ID for place
const generatePlaceId = (name: string, lat: number, lng: number): string => {
  const str = `${name}-${lat.toFixed(6)}-${lng.toFixed(6)}`
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(36)
}

// Check if coordinates are within bounding box
const isWithinBbox = (lat: number, lng: number, bbox: BBox): boolean => {
  const withinLat = lat >= bbox.south && lat <= bbox.north
  const withinLng = lng >= bbox.west && lng <= bbox.east
  return withinLat && withinLng
}

// Check if coordinates are within polygon using precise geometry
const isWithinPolygon = (lat: number, lng: number, geometry: Geometry): boolean => {
  try {
    const pt = point([lng, lat]) // GeoJSON uses [lng, lat] order
    let poly
    if (geometry.type === 'MultiPolygon') {
      poly = multiPolygon(geometry.coordinates as number[][][][])
    } else {
      poly = polygon(geometry.coordinates as number[][][])
    }
    return booleanPointInPolygon(pt, poly)
  } catch (e) {
    console.error('Error checking point in polygon:', e)
    return true // Fallback to include the point if error
  }
}

// Check if coordinates are within the search area
// Uses precise polygon geometry if available, otherwise falls back to bbox
const isWithinSearchArea = (lat: number, lng: number, bbox: BBox, geometry?: Geometry): boolean => {
  // First do a quick bbox check (fast)
  if (!isWithinBbox(lat, lng, bbox)) {
    console.log(`FILTERED OUT (bbox): ${lat}, ${lng}`)
    return false
  }

  // If geometry is available, do precise polygon check
  if (geometry) {
    const inPolygon = isWithinPolygon(lat, lng, geometry)
    if (!inPolygon) {
      console.log(`FILTERED OUT (polygon): ${lat}, ${lng}`)
    }
    return inPolygon
  }

  return true
}

// Extract PRECISE coordinates from Google Maps URL
// Only use !3d!4d format which represents actual place location
// Skip @ format as it's often just the map viewport center
const extractCoordinates = (url: string): { lat: number; lng: number } | null => {
  // Only use precise patterns - !3d and !4d parameters
  // These are the actual place coordinates, not map center
  const precisePatterns = [
    // Pattern: !8m2!3dlat!4dlng (place marker coordinates - most reliable)
    /!8m2!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/,
    // Pattern: !3dlat!4dlng (general precise format)
    /!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/
  ]

  for (const pattern of precisePatterns) {
    const match = url.match(pattern)
    if (match) {
      const lat = parseFloat(match[1])
      const lng = parseFloat(match[2])
      if (!isNaN(lat) && !isNaN(lng) &&
        lat >= -90 && lat <= 90 &&
        lng >= -180 && lng <= 180) {
        console.log(`Extracted precise coords: ${lat}, ${lng} from URL`)
        return { lat, lng }
      }
    }
  }

  // If no precise coordinates found, return null (skip this result)
  // Don't use @ format as it's unreliable for filtering
  console.log(`No precise coords found in URL: ${url.substring(0, 100)}...`)
  return null
}

// Split bbox into smaller grids
function splitBboxIntoGrids(bbox: BBox, gridSize: number): BBox[] {
  const width = bbox.east - bbox.west
  const height = bbox.north - bbox.south

  // If small enough, return as is
  if (width <= gridSize && height <= gridSize) {
    return [bbox]
  }

  const grids: BBox[] = []
  const cols = Math.ceil(width / gridSize)
  const rows = Math.ceil(height / gridSize)

  const gridWidth = width / cols
  const gridHeight = height / rows

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      grids.push({
        west: bbox.west + col * gridWidth,
        east: bbox.west + (col + 1) * gridWidth,
        south: bbox.south + row * gridHeight,
        north: bbox.south + (row + 1) * gridHeight
      })
    }
  }

  return grids
}

// Get center of bbox
function getBboxCenter(bbox: BBox): { lat: number; lng: number } {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lng: (bbox.west + bbox.east) / 2
  }
}

// Calculate zoom level for a grid
function getZoomForBbox(bbox: BBox): number {
  const width = bbox.east - bbox.west
  const height = bbox.north - bbox.south
  const maxDimension = Math.max(width, height)

  if (maxDimension > 1) return 9
  if (maxDimension > 0.5) return 10
  if (maxDimension > 0.2) return 11
  if (maxDimension > 0.1) return 12
  if (maxDimension > 0.05) return 13
  if (maxDimension > 0.02) return 14
  return 15
}

export async function scrapeGoogleMaps(
  options: ScraperOptions,
  config: ScraperConfig = DEFAULT_CONFIG
): Promise<PlaceResult[]> {
  return scrapeGoogleMapsWithProgress(options, () => { }, config)
}

export async function scrapeGoogleMapsWithProgress(
  options: ScraperOptions,
  onProgress: ProgressCallback,
  config: ScraperConfig = DEFAULT_CONFIG
): Promise<PlaceResult[]> {
  const { keyword, bbox, geometry } = options
  const maxResults = options.maxResults || config.maxResults

  // Log the bbox being used for filtering
  console.log(`=== SEARCH AREA ===`)
  console.log(`Bbox: S:${bbox.south}, N:${bbox.north}, W:${bbox.west}, E:${bbox.east}`)
  console.log(`Geometry: ${geometry ? geometry.type : 'not provided (using bbox only)'}`)
  console.log(`===================`)

  // Check rate limit
  const rateCheck = checkRateLimit(config)
  if (!rateCheck.allowed) {
    throw new Error(rateCheck.message)
  }

  // Split into grids if needed
  let grids = splitBboxIntoGrids(bbox, config.gridSize)

  // Limit number of grids to prevent abuse
  if (grids.length > config.maxGrids) {
    console.log(`Area too large: ${grids.length} grids, limiting to ${config.maxGrids}`)
    grids = grids.slice(0, config.maxGrids)
    onProgress({
      count: 0,
      status: `區域較大，將搜尋前 ${config.maxGrids} 個區塊`,
      currentGrid: 0,
      totalGrids: config.maxGrids
    })
  }

  const totalGrids = grids.length
  console.log(`Search area split into ${totalGrids} grid(s)`)

  // Record this search
  recordSearch()

  let browser: Browser | null = null
  const allResults: PlaceResult[] = []
  const seenUrls = new Set<string>()
  const seenPlaceIds = new Set<string>()

  try {
    onProgress({ count: 0, status: '啟動瀏覽器...', currentGrid: 0, totalGrids })

    // Launch browser once for all grids
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        '--disable-blink-features=AutomationControlled'
      ]
    })

    const page = await browser.newPage()
    await page.setUserAgent(getRandomUserAgent())
    await page.setViewport({ width: 1920, height: 1080 })
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7'
    })
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined
      })
    })

    // Search each grid
    for (let gridIndex = 0; gridIndex < grids.length; gridIndex++) {
      const grid = grids[gridIndex]
      const gridCenter = getBboxCenter(grid)
      const zoom = getZoomForBbox(grid)

      onProgress({
        count: allResults.length,
        status: `搜尋區域 ${gridIndex + 1}/${totalGrids}...`,
        currentGrid: gridIndex + 1,
        totalGrids
      })

      const searchUrl = `https://www.google.com/maps/search/${encodeURIComponent(keyword)}/@${gridCenter.lat},${gridCenter.lng},${zoom}z?hl=zh-TW`

      console.log(`Grid ${gridIndex + 1}/${totalGrids}: ${searchUrl}`)

      try {
        await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 60000 })
        await randomDelay(config.pageDelayMin, config.pageDelayMax)

        // Find results container
        const resultsContainerSelectors = [
          'div[role="feed"]',
          'div.m6QErb[aria-label]',
          'div.m6QErb.DxyBCb',
          'div[aria-label*="結果"]'
        ]

        let resultsContainer: any = null
        for (const selector of resultsContainerSelectors) {
          try {
            resultsContainer = await page.$(selector)
            if (resultsContainer) break
          } catch {
            continue
          }
        }

        const scrollContainer = resultsContainer || (await page.$('div.m6QErb.DxyBCb.kA9KIf.dS8AEf.ecceSd'))

        if (scrollContainer) {
          let previousHeight = 0
          let scrollAttempts = 0
          const maxScrollAttempts = 5 // Less scrolling per grid

          while (scrollAttempts < maxScrollAttempts) {
            await page.evaluate((container: Element) => {
              container.scrollTop = container.scrollHeight
            }, scrollContainer)

            await randomDelay(config.scrollDelayMin, config.scrollDelayMax)

            const currentHeight = await page.evaluate((container: Element) => container.scrollHeight, scrollContainer)
            if (currentHeight === previousHeight) {
              scrollAttempts++
            } else {
              scrollAttempts = 0
            }
            previousHeight = currentHeight

            // Extract results (filtered by geometry in extractResultsFromPage)
            const newResults = await extractResultsFromPage(page, bbox, geometry, seenUrls, seenPlaceIds)
            for (const result of newResults) {
              // Double-check with precise geometry filter
              if (isWithinSearchArea(result.lat, result.lng, bbox, geometry)) {
                allResults.push(result)
              }
            }

            onProgress({
              count: allResults.length,
              status: `區域 ${gridIndex + 1}/${totalGrids}，已找到 ${allResults.length} 筆`,
              currentGrid: gridIndex + 1,
              totalGrids
            })

            if (allResults.length >= maxResults) break
          }
        } else {
          // Extract whatever is on the page
          const newResults = await extractResultsFromPage(page, bbox, geometry, seenUrls, seenPlaceIds)
          for (const result of newResults) {
            // Double-check with precise geometry filter
            if (isWithinSearchArea(result.lat, result.lng, bbox, geometry)) {
              allResults.push(result)
            }
          }
        }

        // Add delay between grids to avoid rate limiting
        if (gridIndex < grids.length - 1) {
          await randomDelay(config.gridDelayMin, config.gridDelayMax)
        }

      } catch (error) {
        console.error(`Error searching grid ${gridIndex + 1}:`, error)
        // Continue to next grid
      }

      if (allResults.length >= maxResults) break
    }

    // Final filter to ensure all results are within search area (using precise geometry if available)
    const filteredResults = allResults.filter(result =>
      isWithinSearchArea(result.lat, result.lng, bbox, geometry)
    )

    onProgress({
      count: filteredResults.length,
      status: `搜尋完成，共 ${filteredResults.length} 筆`,
      currentGrid: totalGrids,
      totalGrids
    })

    console.log(`Scraping complete, found ${filteredResults.length} results within search area (${allResults.length} total before filter)`)

    return filteredResults.slice(0, maxResults)

  } catch (error) {
    console.error('Scraping error:', error)
    throw error
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

async function extractResultsFromPage(
  page: Page,
  bbox: BBox,
  geometry: Geometry | undefined,
  seenUrls: Set<string>,
  seenPlaceIds: Set<string>
): Promise<PlaceResult[]> {
  const results: PlaceResult[] = []

  try {
    await randomDelay(300, 500)

    const placeData = await page.evaluate(() => {
      const places: any[] = []

      const itemSelectors = [
        'div.Nv2PK',
        'a[href*="/maps/place/"]',
        'div[jsaction*="mouseover:pane"]'
      ]

      for (const selector of itemSelectors) {
        const items = document.querySelectorAll(selector)
        if (items.length === 0) continue

        items.forEach(item => {
          try {
            const linkEl = item.tagName === 'A' ? item : item.querySelector('a[href*="/maps/place/"]')
            if (!linkEl) return

            const href = (linkEl as HTMLAnchorElement).href
            if (!href || !href.includes('/maps/place/')) return

            const nameEl = item.querySelector('.qBF1Pd, .fontHeadlineSmall, [role="heading"]') ||
              item.querySelector('div.fontBodyMedium > span:first-child')
            const name = nameEl?.textContent?.trim() || ''

            if (!name) return

            const addressEl = item.querySelector('.W4Efsd:last-child .W4Efsd span:not(.ZkP5Je)') ||
              item.querySelector('[data-tooltip*="地址"]')
            const addressParts: string[] = []
            if (addressEl) {
              const walker = document.createTreeWalker(addressEl, NodeFilter.SHOW_TEXT)
              let node
              while (node = walker.nextNode()) {
                const text = node.textContent?.trim()
                if (text && !text.startsWith('·')) {
                  addressParts.push(text)
                }
              }
            }
            const address = addressParts.join(' ').trim()

            const ratingEl = item.querySelector('.MW4etd, span.ZkP5Je[aria-hidden="true"]')
            const rating = ratingEl ? parseFloat(ratingEl.textContent || '0') : undefined

            const reviewEl = item.querySelector('.UY7F9, span.UY7F9')
            let reviewCount: number | undefined
            if (reviewEl) {
              const match = reviewEl.textContent?.match(/\(?([\d,]+)\)?/)
              if (match) {
                reviewCount = parseInt(match[1].replace(/,/g, ''))
              }
            }

            const categoryEl = item.querySelector('.W4Efsd .W4Efsd:first-child span:first-child') ||
              item.querySelector('.fontBodyMedium .fontBodyMedium span')
            const category = categoryEl?.textContent?.trim()

            places.push({
              name,
              address,
              href,
              rating,
              reviewCount,
              category
            })
          } catch (e) {
            // Skip this item on error
          }
        })

        if (places.length > 0) break
      }

      return places
    })

    for (const place of placeData) {
      if (seenUrls.has(place.href)) continue
      seenUrls.add(place.href)

      const coords = extractCoordinates(place.href)
      if (!coords) continue

      // Filter by precise geometry if available, otherwise use bbox
      if (!isWithinSearchArea(coords.lat, coords.lng, bbox, geometry)) continue

      const placeId = generatePlaceId(place.name, coords.lat, coords.lng)

      // Skip if we've seen this place (by ID)
      if (seenPlaceIds.has(placeId)) continue
      seenPlaceIds.add(placeId)

      const result: PlaceResult = {
        id: placeId,
        name: place.name,
        address: place.address || '',
        lat: coords.lat,
        lng: coords.lng,
        googleMapsUrl: place.href,
        rating: place.rating,
        reviewCount: place.reviewCount,
        category: place.category
      }

      results.push(result)
    }
  } catch (error) {
    console.error('Error extracting results:', error)
  }

  return results
}
