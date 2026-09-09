import AppError from '../errors/AppError.js'
import {
  authLimiterInstance,
  catalogLimiterInstance,
  catalogManagementLimiterInstance,
  checkOutLimiterInstance,
  oAuthRedirectLimiterInstance,
} from '../utils/rateLimiters.js'

const createLimiterMiddleware = (limiterInstance) => {
  return async (req, res, next) => {
    if (req.user?.role === 'admin') return next()

    const isUserLoggedIn = !!req.user?.userId
    const key = isUserLoggedIn ? `user:${req.user.userId}` : `guest:${req.ip}`

    try {
      await limiterInstance.consume(key)
      next()
    } catch (rateLimiterErr) {
      const seconds = Math.round(rateLimiterErr.msBeforeNext / 1000) || 1

      res.set('Retry-After', String(seconds))
      res.set('X-RateLimit-Reset', String(new Date(Date.now() + rateLimiterErr.msBeforeNext)))

      const entityType = isUserLoggedIn ? 'account' : 'IP adress'

      throw new AppError(
        `Too many requests from this ${entityType}. Please try again after ${seconds} seconds.`,
        429,
      )
    }
  }
}

export const catalogLimiter = createLimiterMiddleware(catalogLimiterInstance)
export const catalogManagementLimiter = createLimiterMiddleware(catalogManagementLimiterInstance)
export const checkOutLimiter = createLimiterMiddleware(checkOutLimiterInstance)
export const oAuthLimiter = createLimiterMiddleware(authLimiterInstance)
export const oAuthRedirectLimiter = createLimiterMiddleware(oAuthRedirectLimiterInstance)
