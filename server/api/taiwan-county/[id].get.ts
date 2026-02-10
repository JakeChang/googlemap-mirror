import { getCountyById, getCountyBbox, normalizeToMultiPolygon, getUpdatedCountyName } from '../../utils/taiwan-geo'

export default defineEventHandler((event) => {
  const countyId = getRouterParam(event, 'id')

  if (!countyId) {
    throw createError({
      statusCode: 400,
      message: 'Missing county ID'
    })
  }

  const county = getCountyById(countyId)

  if (!county) {
    throw createError({
      statusCode: 404,
      message: `County not found: ${countyId}`
    })
  }

  const bbox = getCountyBbox(countyId)
  const multiPolygon = normalizeToMultiPolygon(county.geometry)

  return {
    id: county.properties.county_id,
    name: getUpdatedCountyName(county.properties.county),
    area: county.properties.area,
    bbox,
    geometry: {
      type: 'MultiPolygon' as const,
      coordinates: multiPolygon
    }
  }
})
