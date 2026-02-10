import { getTownsByCountyId } from '../../utils/taiwan-geo'

export default defineEventHandler((event) => {
  const countyId = getRouterParam(event, 'countyId')

  if (!countyId) {
    throw createError({
      statusCode: 400,
      message: 'Missing county ID'
    })
  }

  const towns = getTownsByCountyId(countyId)

  return towns
})
