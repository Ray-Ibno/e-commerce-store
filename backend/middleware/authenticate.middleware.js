import { REDIS_AUTH_KEY } from '../constants/index.js'
import AppError from '../errors/AppError.js'
import jwt from 'jsonwebtoken'
import redis from '../config/redis.js'
import { bakeTokens } from '../utils/cookieHelper.js'
import { safeAwait } from '../helpers/await.helper.js'
import { generateTokens } from '../utils/generateTokens.js'

export const authenticate = async (req, res, next) => {
  const { accessToken, refreshToken } = req.cookies

  if (!accessToken) {
    throw new AppError('You are not authenticated. Please log in', 401)
  }

  try {
    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET)
    req.user = decoded
    return next()
  } catch (accessError) {
    if (accessError.name === 'TokenExpiredError' && refreshToken) {
      try {
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
        const sessionKey = `${REDIS_AUTH_KEY}:${decoded.sessionId}`

        const cachedToken = await safeAwait(redis.get(sessionKey))

        if (!cachedToken || cachedToken !== refreshToken) {
          await safeAwait(
            redis.del(sessionKey),
            `Cached session key deletion of ${sessionKey} failed: `,
          )

          throw new AppError('Invalid or reused session. Please log in again.', 401)
        }

        const { accessToken, refreshToken: newRefreshToken } = generateTokens(
          decoded.id,
          decoded.role,
          decoded.sessiontId,
        )

        await safeAwait(
          redis.set(sessionKey, newRefreshToken),
          `Cached key update failed for ${sessionKey}: `,
        )

        bakeTokens(accessToken, newRefreshToken, res)

        req.user = decoded
        next()
      } catch (refreshErr) {
        throw new AppError('Session invalid or expired', 401)
      }
    }

    throw new AppError('Invalid token', 401)
  }
}

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403)
    }
    next()
  }
