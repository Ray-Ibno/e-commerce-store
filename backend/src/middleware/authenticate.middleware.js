import { REDIS_AUTH_KEY } from '../constants/index.js'
import AppError from '../errors/AppError.js'
import redis from '../config/redis.js'
import { clearSessionCookie } from '../utils/cookieHelper.js'
import { safeAwait } from '../helpers/await.helper.js'
import axios from 'axios'

export const authenticate = async (req, res, next) => {
  const sessionId = req.cookies.sid

  if (!sessionId) {
    throw new AppError('You are not authenticated. Please log in', 401)
  }

  const sessionKey = `${REDIS_AUTH_KEY}:${sessionId}`
  const cachedSessionRaw = await safeAwait(redis.get(sessionKey))

  if (!cachedSessionRaw) {
    clearSessionCookie(res)
    throw new AppError('Invalid or reused session. Please log in again.', 401)
  }

  let sessionData = JSON.parse(cachedSessionRaw)

  if (Date.now() >= sessionData.accessExpiresAt) {
    try {
      console.log('Access token expired internally. Performing silent server-side refresh...')

      if (!sessionData.googleRefreshToken) {
        throw new AppError('No refresh token available for backround refresh', 401)
      }

      const response = await axios.post('https://oauth2.googleapis.com/token', {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        refreshToken: sessionData.googleRefreshToken,
        grant_type: 'refresh_token',
      })

      const data = response.data

      sessionData.googleAccessToken = data.access_token
      sessionData.accessExpiresAt = Date.now() + data.expires_in * 1000 - 60 * 1000

      await safeAwait(redis.set(sessionKey, JSON.stringify(sessionData), 'KEEPTTL'))
      console.log('Background token refresh successful')
    } catch (refreshErr) {
      console.error('BFF background token refresh failed:', refreshErr.message)
      await safeAwait(redis.del(sessionKey))
      clearSessionCookie(res)
      throw new AppError('Session invalid or expired', 401)
    }
  }

  req.user = {
    userId: sessionData.userId,
    role: sessionData.role,
    sessionId: sessionId,
  }

  delete req.headers['cookie']

  return next()
}

export const restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      throw new AppError('You do not have permission to perform this action.', 403)
    }
    next()
  }
