import AppError from '../errors/AppError.js'
import jwt from 'jsonwebtoken'
import { REDIS_AUTH_KEY, SEVEN_DAYS } from '../constants/index.js'
import { generateTokens } from '../utils/generateTokens.js'
import { userDB } from '../repositories/userDB.repository.js'
import { sessionDB } from '../repositories/sessionDB.repository.js'
import { sessionCache } from '../repositories/sessionCache.repository.js'
import { safeAwait } from '../helpers/await.helper.js'

export const fetchProfile = async (userId) => {
  const user = await userDB.findById(userId)
  if (!user) throw new AppError('No user found', 404)

  return user
}

export const cacheSession = async (user) => {
  const sessionKey = `${REDIS_AUTH_KEY}:${user.sessionId}`

  const { accessToken, refreshToken } = generateTokens(user.userId, user.role, user.sessionId)
  await safeAwait(sessionCache.setSession(sessionKey, refreshToken, SEVEN_DAYS))

  return { accessToken, refreshToken }
}

export const singleLogOut = async (refreshToken) => {
  const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET)
  const sessionKey = `${REDIS_AUTH_KEY}:${decoded.sessionId}`

  await safeAwait(
    sessionCache.deleteKey(sessionKey),
    `Cache miss: Session deletion failed for ${sessionKey}: `,
  )

  return await sessionDB.invalidateSession(decoded.sessionId)
}

export const logOutAll = async (userId) => {
  const activeSessions = await sessionDB.findManyAndSelectIds(userId)

  await sessionDB.invalidateUserSessions(userId)

  return await safeAwait(
    Promise.all(
      activeSessions.map((session) => sessionCache.deleteKey(`${REDIS_AUTH_KEY}:${session.id}`)),
    ),
    `Cached keys deletion for user:${userId} failed: `,
  )
}
