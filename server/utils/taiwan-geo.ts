import { readFileSync } from 'fs'
import { join } from 'path'

export interface CountyFeature {
  type: 'Feature'
  properties: {
    county: string
    county_id: string
    area: number
    sort: number
  }
  geometry: {
    type: 'MultiPolygon' | 'Polygon'
    coordinates: number[][][][] | number[][][]
  }
}

export interface CountiesGeoJSON {
  type: 'FeatureCollection'
  features: CountyFeature[]
}

export interface CountyInfo {
  id: string
  name: string
  area: number
}

// Township types
export interface TownFeature {
  type: 'Feature'
  properties: {
    town: string
    county: string
    town_id: string
    county_id: string
    area: number
    sort: number
  }
  geometry: {
    type: 'MultiPolygon' | 'Polygon'
    coordinates: number[][][][] | number[][][]
  }
}

export interface TownsGeoJSON {
  type: 'FeatureCollection'
  features: TownFeature[]
}

export interface TownInfo {
  id: string
  name: string
  countyId: string
  countyName: string
  area: number
}

// Cache for loaded GeoJSON data
let cachedCountiesGeoJSON: CountiesGeoJSON | null = null
let cachedTownsGeoJSON: TownsGeoJSON | null = null

// 縣市名稱對照表 (舊名 → 新名)
const COUNTY_NAME_MAP: Record<string, string> = {
  '臺北市': '台北市',
  '新北市': '新北市',
  '桃園縣': '桃園市',  // 2014 升格
  '臺中市': '台中市',
  '臺南市': '台南市',
  '高雄市': '高雄市',
  '基隆市': '基隆市',
  '新竹市': '新竹市',
  '新竹縣': '新竹縣',
  '苗栗縣': '苗栗縣',
  '彰化縣': '彰化縣',
  '南投縣': '南投縣',
  '雲林縣': '雲林縣',
  '嘉義市': '嘉義市',
  '嘉義縣': '嘉義縣',
  '屏東縣': '屏東縣',
  '宜蘭縣': '宜蘭縣',
  '花蓮縣': '花蓮縣',
  '臺東縣': '台東縣',
  '澎湖縣': '澎湖縣',
  '金門縣': '金門縣',
  '連江縣': '連江縣'
}

/**
 * Get updated county name
 */
export function getUpdatedCountyName(originalName: string): string {
  return COUNTY_NAME_MAP[originalName] || originalName
}

/**
 * Calculate center latitude of a county for sorting
 */
function calculateCenterLatitude(geometry: CountyFeature['geometry']): number {
  const coords = geometry.type === 'MultiPolygon'
    ? (geometry.coordinates as number[][][][]).flat(2)
    : (geometry.coordinates as number[][][]).flat()

  const sumLat = coords.reduce((sum, coord) => sum + coord[1], 0)
  return sumLat / coords.length
}

/**
 * Load Taiwan counties GeoJSON data with caching
 */
export function loadTaiwanCountiesGeoJSON(): CountiesGeoJSON {
  if (cachedCountiesGeoJSON) {
    return cachedCountiesGeoJSON
  }

  const dataPath = join(process.cwd(), 'server/data/taiwan-counties.json')
  const rawData = readFileSync(dataPath, 'utf-8')
  cachedCountiesGeoJSON = JSON.parse(rawData) as CountiesGeoJSON

  return cachedCountiesGeoJSON
}

/**
 * Load Taiwan towns GeoJSON data with caching
 */
export function loadTaiwanTownsGeoJSON(): TownsGeoJSON {
  if (cachedTownsGeoJSON) {
    return cachedTownsGeoJSON
  }

  const dataPath = join(process.cwd(), 'server/data/taiwan-towns.json')
  const rawData = readFileSync(dataPath, 'utf-8')
  cachedTownsGeoJSON = JSON.parse(rawData) as TownsGeoJSON

  return cachedTownsGeoJSON
}

/**
 * Get list of all Taiwan counties, sorted from north to south
 */
export function getTaiwanCountiesList(): CountyInfo[] {
  const geojson = loadTaiwanCountiesGeoJSON()

  return geojson.features
    .map(feature => ({
      id: feature.properties.county_id,
      name: getUpdatedCountyName(feature.properties.county),
      area: feature.properties.area,
      centerLat: calculateCenterLatitude(feature.geometry)
    }))
    // 由北到南排序 (緯度由高到低)
    .sort((a, b) => b.centerLat - a.centerLat)
    .map(({ id, name, area }) => ({ id, name, area }))
}

/**
 * Get a specific county by ID
 */
export function getCountyById(countyId: string): CountyFeature | null {
  const geojson = loadTaiwanCountiesGeoJSON()
  return geojson.features.find(f => f.properties.county_id === countyId) || null
}

/**
 * Normalize coordinates to MultiPolygon format
 * Returns array of polygons, where each polygon is an array of rings (outer + holes)
 */
export function normalizeToMultiPolygon(geometry: CountyFeature['geometry']): number[][][][] {
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates as number[][][][]
  }
  // Polygon -> wrap in array to make it MultiPolygon
  return [geometry.coordinates as number[][][]]
}

/**
 * Calculate bounding box from MultiPolygon coordinates
 * Returns [west, south, east, north]
 */
export function calculateBboxFromMultiPolygon(multiPolygon: number[][][][]): {
  west: number
  south: number
  east: number
  north: number
} {
  let minLon = Infinity
  let maxLon = -Infinity
  let minLat = Infinity
  let maxLat = -Infinity

  for (const polygon of multiPolygon) {
    for (const ring of polygon) {
      for (const coord of ring) {
        const [lon, lat] = coord
        if (lon < minLon) minLon = lon
        if (lon > maxLon) maxLon = lon
        if (lat < minLat) minLat = lat
        if (lat > maxLat) maxLat = lat
      }
    }
  }

  return {
    west: minLon,
    south: minLat,
    east: maxLon,
    north: maxLat
  }
}

/**
 * Get county bounding box
 */
export function getCountyBbox(countyId: string): {
  west: number
  south: number
  east: number
  north: number
} | null {
  const county = getCountyById(countyId)
  if (!county) return null

  const multiPolygon = normalizeToMultiPolygon(county.geometry)
  return calculateBboxFromMultiPolygon(multiPolygon)
}

// ============ Township Functions ============

/**
 * Calculate center latitude for a geometry (used for sorting)
 */
function calculateGeometryCenterLatitude(geometry: TownFeature['geometry']): number {
  const coords = geometry.type === 'MultiPolygon'
    ? (geometry.coordinates as number[][][][]).flat(2)
    : (geometry.coordinates as number[][][]).flat()

  const sumLat = coords.reduce((sum, coord) => sum + coord[1], 0)
  return sumLat / coords.length
}

/**
 * Get list of towns for a specific county, sorted from north to south
 */
export function getTownsByCountyId(countyId: string): TownInfo[] {
  const geojson = loadTaiwanTownsGeoJSON()

  return geojson.features
    .filter(f => f.properties.county_id === countyId)
    .map(feature => ({
      id: feature.properties.town_id,
      name: feature.properties.town,
      countyId: feature.properties.county_id,
      countyName: getUpdatedCountyName(feature.properties.county),
      area: feature.properties.area,
      centerLat: calculateGeometryCenterLatitude(feature.geometry)
    }))
    // 由北到南排序 (緯度由高到低)
    .sort((a, b) => b.centerLat - a.centerLat)
    .map(({ id, name, countyId, countyName, area }) => ({ id, name, countyId, countyName, area }))
}

/**
 * Get a specific town by ID
 */
export function getTownById(townId: string): TownFeature | null {
  const geojson = loadTaiwanTownsGeoJSON()
  return geojson.features.find(f => f.properties.town_id === townId) || null
}

/**
 * Get town bounding box
 */
export function getTownBbox(townId: string): {
  west: number
  south: number
  east: number
  north: number
} | null {
  const town = getTownById(townId)
  if (!town) return null

  const multiPolygon = normalizeTownToMultiPolygon(town.geometry)
  return calculateBboxFromMultiPolygon(multiPolygon)
}

/**
 * Normalize town geometry to MultiPolygon format
 */
export function normalizeTownToMultiPolygon(geometry: TownFeature['geometry']): number[][][][] {
  if (geometry.type === 'MultiPolygon') {
    return geometry.coordinates as number[][][][]
  }
  return [geometry.coordinates as number[][][]]
}

/**
 * Calculate center point of a bounding box
 */
export function getBboxCenter(bbox: { west: number; south: number; east: number; north: number }): { lat: number; lng: number } {
  return {
    lat: (bbox.south + bbox.north) / 2,
    lng: (bbox.west + bbox.east) / 2
  }
}
