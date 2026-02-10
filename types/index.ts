// Geo types
export interface BBox {
  west: number
  south: number
  east: number
  north: number
}

// Taiwan County types
export interface CountyInfo {
  id: string
  name: string
  area: number
}

export interface CountyData {
  id: string
  name: string
  bbox: BBox
  geometry: {
    type: 'MultiPolygon'
    coordinates: number[][][][]
  }
}

// Taiwan Town types
export interface TownInfo {
  id: string
  name: string
  countyId: string
  countyName: string
  area: number
}

export interface TownData {
  id: string
  name: string
  countyId: string
  countyName: string
  bbox: BBox
  geometry: {
    type: 'MultiPolygon'
    coordinates: number[][][][]
  }
}

// Search Mode
export type SearchMode = 'region' | 'draw'

// Place Result from Google Maps scraping
export interface PlaceResult {
  id: string
  name: string
  address: string
  lat: number
  lng: number
  googleMapsUrl: string
  rating?: number
  reviewCount?: number
  category?: string
  phone?: string
}

// Search Request
export interface SearchRequest {
  keyword: string
  mode: SearchMode
  // For region mode
  countyId?: string
  townId?: string
  // Bounding box for filtering results
  bbox: BBox
  // Center point for search
  centerLat: number
  centerLng: number
  // Polygon geometry for precise filtering (optional)
  geometry?: {
    type: 'MultiPolygon' | 'Polygon'
    coordinates: number[][][][] | number[][][]
  }
}

// Search Response
export interface SearchResponse {
  results: PlaceResult[]
  totalCount: number
  searchedArea: string
}

// Custom drawn area
export interface DrawnArea {
  type: 'rectangle' | 'polygon' | 'circle'
  coordinates: number[][] | number[][][] // For rectangle/polygon
  center?: { lat: number; lng: number } // For circle
  radius?: number // For circle (in meters)
  bbox: BBox
}
