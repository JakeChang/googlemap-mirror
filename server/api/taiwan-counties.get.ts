import { getTaiwanCountiesList } from '../utils/taiwan-geo'

export default defineEventHandler(() => {
  return getTaiwanCountiesList()
})
