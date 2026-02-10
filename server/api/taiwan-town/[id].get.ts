import { getTownById, getTownBbox, normalizeTownToMultiPolygon, getUpdatedCountyName } from '../../utils/taiwan-geo'

export default defineEventHandler((event) => {
  const townId = getRouterParam(event, 'id')

  if (!townId) {
    throw createError({
      statusCode: 400,
      message: 'Missing town ID'
    })
  }

  const town = getTownById(townId)

  if (!town) {
    throw createError({
      statusCode: 404,
      message: `Town not found: ${townId}`
    })
  }

  const bbox = getTownBbox(townId)
  const multiPolygon = normalizeTownToMultiPolygon(town.geometry)

  return {
    id: town.properties.town_id,
    name: town.properties.town,
    countyId: town.properties.county_id,
    countyName: getUpdatedCountyName(town.properties.county),
    area: town.properties.area,
    bbox,
    geometry: {
      type: 'MultiPolygon' as const,
      coordinates: multiPolygon
    }
  }
})
