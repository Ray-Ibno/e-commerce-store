import * as productConstant from '../constants/index.js'

export const getCacheKeys = (category) => {
  return [
    productConstant.REDIS_ALL_PRODUCTS,
    productConstant.REDIS_FEATURED_PRODUCTS,
    productConstant.REDIS_BYCATEGORY_PRODUCTS + `:${category}`,
    productConstant.REDIS_RECOMMENDED_PRODUCTS,
  ]
}
