<script setup lang="ts">
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import '@geoman-io/leaflet-geoman-free'
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css'
import 'leaflet.markercluster'
import 'leaflet.markercluster/dist/MarkerCluster.css'
import 'leaflet.markercluster/dist/MarkerCluster.Default.css'
import type { PlaceResult, BBox, DrawnArea, SearchMode } from '../../types'

const props = defineProps<{
  mode: SearchMode
  regionBoundary?: number[][][][]
  regionBbox?: BBox
  results?: PlaceResult[]
  highlightedResultId?: string | null
  drawnArea?: DrawnArea | null
}>()

const emit = defineEmits<{
  (e: 'drawn', area: DrawnArea): void
  (e: 'drawCleared'): void
  (e: 'markerClick', result: PlaceResult): void
}>()

const mapContainer = ref<HTMLDivElement>()
let map: L.Map | null = null
let regionPolygon: L.GeoJSON | null = null
let drawnLayer: L.Layer | null = null
let markerClusterGroup: L.MarkerClusterGroup | null = null
const markers = new Map<string, L.Marker>()

// Taiwan center coordinates
const TAIWAN_CENTER: L.LatLngExpression = [23.5, 121]
const TAIWAN_ZOOM = 7

// Custom marker icon
const createMarkerIcon = (highlighted: boolean = false) => {
  return L.divIcon({
    className: 'custom-marker',
    html: `<div class="w-6 h-6 rounded-full ${highlighted ? 'bg-primary ring-4 ring-primary/30' : 'bg-secondary'} border-2 border-white shadow-lg flex items-center justify-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3 text-white" viewBox="0 0 20 20" fill="currentColor">
        <path fill-rule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clip-rule="evenodd" />
      </svg>
    </div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 24],
    popupAnchor: [0, -24]
  })
}

const initMap = () => {
  if (!mapContainer.value || map) return

  map = L.map(mapContainer.value, {
    center: TAIWAN_CENTER,
    zoom: TAIWAN_ZOOM
  })

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map)

  // Initialize marker cluster group
  markerClusterGroup = L.markerClusterGroup({
    maxClusterRadius: 50,
    spiderfyOnMaxZoom: true,
    showCoverageOnHover: false,
    zoomToBoundsOnClick: true
  })
  map.addLayer(markerClusterGroup)

  // Initialize Leaflet-Geoman for drawing
  map.pm.addControls({
    position: 'topleft',
    drawCircle: false,
    drawCircleMarker: false,
    drawPolyline: false,
    drawMarker: false,
    drawText: false,
    editMode: false,
    dragMode: false,
    cutPolygon: false,
    rotateMode: false,
    removalMode: true
  })

  // Hide draw controls initially in region mode
  if (props.mode === 'region') {
    map.pm.removeControls()
  }

  // Listen to draw events
  map.on('pm:create', (e: any) => {
    // Remove previous drawn layer
    if (drawnLayer) {
      map!.removeLayer(drawnLayer)
    }

    drawnLayer = e.layer
    const layer = e.layer

    let area: DrawnArea

    if (e.shape === 'Rectangle') {
      const bounds = layer.getBounds()
      area = {
        type: 'rectangle',
        coordinates: [
          [bounds.getSouthWest().lng, bounds.getSouthWest().lat],
          [bounds.getNorthEast().lng, bounds.getSouthWest().lat],
          [bounds.getNorthEast().lng, bounds.getNorthEast().lat],
          [bounds.getSouthWest().lng, bounds.getNorthEast().lat],
          [bounds.getSouthWest().lng, bounds.getSouthWest().lat]
        ],
        bbox: {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth()
        }
      }
    } else if (e.shape === 'Polygon') {
      const latlngs = layer.getLatLngs()[0] as L.LatLng[]
      const coords = latlngs.map((ll: L.LatLng) => [ll.lng, ll.lat])
      coords.push(coords[0]) // Close the polygon

      const bounds = layer.getBounds()
      area = {
        type: 'polygon',
        coordinates: [coords],
        bbox: {
          west: bounds.getWest(),
          south: bounds.getSouth(),
          east: bounds.getEast(),
          north: bounds.getNorth()
        }
      }
    } else {
      return
    }

    emit('drawn', area)
  })

  map.on('pm:remove', () => {
    drawnLayer = null
    emit('drawCleared')
  })

  // Add region boundary if available
  if (props.regionBoundary && props.mode === 'region') {
    updateRegionPolygon()
  }
}

const updateRegionPolygon = () => {
  if (!map) return

  // Remove existing polygon
  if (regionPolygon) {
    map.removeLayer(regionPolygon)
    regionPolygon = null
  }

  if (props.regionBoundary && props.regionBoundary.length > 0 && props.mode === 'region') {
    const geojson: GeoJSON.Feature = {
      type: 'Feature',
      properties: {},
      geometry: {
        type: 'MultiPolygon',
        coordinates: props.regionBoundary
      }
    }

    regionPolygon = L.geoJSON(geojson, {
      style: {
        color: '#8b5cf6',
        weight: 3,
        fillColor: '#8b5cf6',
        fillOpacity: 0.15
      }
    }).addTo(map)

    // Fit map to region bounds
    if (props.regionBbox) {
      const bounds = L.latLngBounds(
        [props.regionBbox.south, props.regionBbox.west],
        [props.regionBbox.north, props.regionBbox.east]
      )
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }
}

const updateDrawnArea = () => {
  if (!map) return

  // Remove existing drawn layer
  if (drawnLayer) {
    map.removeLayer(drawnLayer)
    drawnLayer = null
  }

  if (props.drawnArea && props.mode === 'draw') {
    if (props.drawnArea.type === 'rectangle') {
      const bbox = props.drawnArea.bbox
      drawnLayer = L.rectangle([
        [bbox.south, bbox.west],
        [bbox.north, bbox.east]
      ], {
        color: '#3b82f6',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.15
      }).addTo(map)
    } else if (props.drawnArea.type === 'polygon') {
      // coordinates is number[][][] (array of rings), take the first ring
      const ring = (props.drawnArea.coordinates as number[][][])[0]
      const coords = ring.map(c => [c[1], c[0]] as L.LatLngExpression)
      drawnLayer = L.polygon(coords, {
        color: '#3b82f6',
        weight: 2,
        fillColor: '#3b82f6',
        fillOpacity: 0.15
      }).addTo(map)
    }

    // Fit to drawn area
    if (props.drawnArea.bbox) {
      const bbox = props.drawnArea.bbox
      const bounds = L.latLngBounds(
        [bbox.south, bbox.west],
        [bbox.north, bbox.east]
      )
      map.fitBounds(bounds, { padding: [50, 50] })
    }
  }
}

const updateMarkers = () => {
  if (!map || !markerClusterGroup) return

  // Clear all existing markers
  markerClusterGroup.clearLayers()
  markers.clear()

  if (!props.results || props.results.length === 0) return

  // Add new markers
  props.results.forEach(result => {
    const isHighlighted = result.id === props.highlightedResultId
    const marker = L.marker([result.lat, result.lng], {
      icon: createMarkerIcon(isHighlighted)
    })

    // Create popup content
    const popupContent = `
      <div class="p-2 min-w-48">
        <h3 class="font-bold text-sm">${result.name}</h3>
        <p class="text-xs text-gray-600 mt-1">${result.address}</p>
        ${result.rating ? `<p class="text-xs mt-1">⭐ ${result.rating} (${result.reviewCount || 0} 則評論)</p>` : ''}
        <a href="${result.googleMapsUrl}" target="_blank" class="text-xs text-blue-600 hover:underline mt-2 block">在 Google Maps 中開啟</a>
      </div>
    `
    marker.bindPopup(popupContent)

    marker.on('click', () => {
      emit('markerClick', result)
    })

    markers.set(result.id, marker)
    markerClusterGroup!.addLayer(marker)
  })

  // Fit map to show all markers if there are results
  if (props.results.length > 0) {
    const group = L.featureGroup(Array.from(markers.values()))
    map.fitBounds(group.getBounds(), { padding: [50, 50] })
  }
}

const updateHighlightedMarker = () => {
  // First, close all popups and update icons
  markers.forEach((marker, id) => {
    const isHighlighted = id === props.highlightedResultId
    marker.setIcon(createMarkerIcon(isHighlighted))
    if (!isHighlighted) {
      marker.closePopup()
    }
  })

  // Then open popup for highlighted marker
  if (props.highlightedResultId && map) {
    const highlightedMarker = markers.get(props.highlightedResultId)
    if (highlightedMarker) {
      highlightedMarker.openPopup()
      map.panTo(highlightedMarker.getLatLng())
    }
  }
}

// Watch mode changes
watch(() => props.mode, (newMode) => {
  if (!map) return

  if (newMode === 'draw') {
    // Show draw controls
    map.pm.addControls({
      position: 'topleft',
      drawCircle: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawMarker: false,
      drawText: false,
      editMode: false,
      dragMode: false,
      cutPolygon: false,
      rotateMode: false,
      removalMode: true
    })
    // Remove region polygon
    if (regionPolygon) {
      map.removeLayer(regionPolygon)
      regionPolygon = null
    }
    // Reset view to Taiwan
    map.setView(TAIWAN_CENTER, TAIWAN_ZOOM)
  } else {
    // Hide draw controls
    map.pm.removeControls()
    // Remove drawn layer
    if (drawnLayer) {
      map.removeLayer(drawnLayer)
      drawnLayer = null
    }
    // Show region polygon if available
    updateRegionPolygon()
  }
})

// Watch region boundary changes
watch(() => props.regionBoundary, updateRegionPolygon, { deep: true })

// Watch drawn area changes
watch(() => props.drawnArea, updateDrawnArea, { deep: true })

// Watch results changes
watch(() => props.results, updateMarkers, { deep: true })

// Watch highlighted marker changes
watch(() => props.highlightedResultId, updateHighlightedMarker)

onMounted(() => {
  nextTick(() => {
    initMap()
  })
})

onUnmounted(() => {
  if (map) {
    map.remove()
    map = null
  }
})
</script>

<template>
  <div ref="mapContainer" class="w-full h-full"></div>
</template>

