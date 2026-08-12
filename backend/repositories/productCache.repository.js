import redis from '../config/redis.js'
import * as constant from '../constants/index.js'
import { getCacheKeys } from '../helpers/cacheKeys.helper.js'

const CACHE_TIME = 20 * 60

export const productCache = {
  getCachedById(productId) {
    return redis.get(`${constant.REDIS_PRODUCT}:${productId}`)
  },
  cacheProduct(productId, product) {
    return redis.set(
      `${constant.REDIS_PRODUCT}:${productId}`,
      JSON.stringify(product),
      'EX',
      CACHE_TIME,
    )
  },
  getAllCached() {
    return redis.get(constant.REDIS_ALL_PRODUCTS)
  },
  cacheAllProducts(products) {
    return redis.set(constant.REDIS_ALL_PRODUCTS, JSON.stringify(products), 'EX', CACHE_TIME)
  },
  getFeaturedCached() {
    return redis.get(constant.REDIS_FEATURED_PRODUCTS)
  },
  cacheFeatured(featuredProducts) {
    return redis.set(
      constant.REDIS_FEATURED_PRODUCTS,
      JSON.stringify(featuredProducts),
      'EX',
      CACHE_TIME,
    )
  },
  getByCategoryCached(category) {
    return redis.get(`${constant.REDIS_BYCATEGORY_PRODUCTS}:${category}`)
  },
  cacheByCategory(category, byCategory) {
    return redis.set(
      `${constant.REDIS_BYCATEGORY_PRODUCTS}:${category}`,
      JSON.stringify(byCategory),
      'EX',
      CACHE_TIME,
    )
  },
  getRecommendedCached(currentProductId) {
    return redis.get(`${constant.REDIS_RECOMMENDED_PRODUCTS}:${currentProductId}`)
  },
  cacheRecommended(currentProductId, recommendations) {
    return redis.set(
      `${constant.REDIS_RECOMMENDED_PRODUCTS}:${currentProductId}`,
      JSON.stringify(recommendations),
      'EX',
      CACHE_TIME,
    )
  },
  clearAllCached(category, productId = null) {
    return productId
      ? redis.del([...getCacheKeys(category), constant.REDIS_PRODUCT + `:${productId}`])
      : redis.del(getCacheKeys(category))
  },
}
