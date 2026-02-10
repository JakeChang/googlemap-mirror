import 'leaflet'

declare module 'leaflet' {
  interface Map {
    pm: PM.PMMap
  }

  namespace PM {
    interface PMMap {
      addControls(options?: PMControlOptions): void
      removeControls(): void
      enableDraw(shape: string, options?: any): void
      disableDraw(): void
    }

    interface PMControlOptions {
      position?: 'topleft' | 'topright' | 'bottomleft' | 'bottomright'
      drawCircle?: boolean
      drawCircleMarker?: boolean
      drawPolyline?: boolean
      drawRectangle?: boolean
      drawPolygon?: boolean
      drawMarker?: boolean
      drawText?: boolean
      editMode?: boolean
      dragMode?: boolean
      cutPolygon?: boolean
      rotateMode?: boolean
      removalMode?: boolean
    }
  }

  interface MarkerClusterGroupOptions {
    maxClusterRadius?: number
    spiderfyOnMaxZoom?: boolean
    showCoverageOnHover?: boolean
    zoomToBoundsOnClick?: boolean
    disableClusteringAtZoom?: number
  }

  interface MarkerClusterGroup extends FeatureGroup {
    clearLayers(): this
    addLayer(layer: Layer): this
    removeLayer(layer: Layer): this
  }

  function markerClusterGroup(options?: MarkerClusterGroupOptions): MarkerClusterGroup
}

declare module '@geoman-io/leaflet-geoman-free' {}
declare module 'leaflet.markercluster' {}
