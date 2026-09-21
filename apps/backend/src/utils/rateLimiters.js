import { RateLimiterRedis } from 'rate-limiter-flexible'
import redis from '../config/redis.js'

export const catalogLimiterInstance = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit_catalog',
  points: 100,
  duration: 60,
  blockDuration: 300,
})

export const catalogManagementLimiterInstance = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit_catalog_management',
  points: 5,
  duration: 300,
  blockDuration: 900,
})

export const authLimiterInstance = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit_oauth',
  points: 5,
  duration: 300,
  blockDuration: 900,
})

export const oAuthRedirectLimiterInstance = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit_oauth_redirect',
  points: 20,
  duration: 300,
  blockDuration: 300,
})

export const checkOutLimiterInstance = new RateLimiterRedis({
  storeClient: redis,
  keyPrefix: 'ratelimit_checkout',
  points: 3,
  duration: 60,
  blockDuration: 600,
})
