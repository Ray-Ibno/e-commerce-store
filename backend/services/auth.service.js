import AppError from '../errors/AppError.js'
import jwt from 'jsonwebtoken'
import { REDIS_AUTH_KEY } from '../constants/index.js'
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
  const accessExpiresAt = Date.now() + Number(process.env.ACCESS_TOKEN_EXP | '900000')

  const sessionPayload = {
    userId: user.userId,
    role: user.role,
    googleAccessToken: user.googleAccessToken,
    googleRefreshToken: user.googleRefreshToken,
    accessExpiresAt,
  }

  return await safeAwait(sessionCache.setSession(sessionKey, sessionPayload))
}

export const singleLogOut = async (sessionId) => {
  const sessionKey = `${REDIS_AUTH_KEY}:${sessionId}`

  return await safeAwait(
    sessionCache.deleteKey(sessionKey),
    `Cache miss: Session deletion failed for ${sessionKey}: `,
  )
}

export const logOutAll = async (userId) => {
  const activeSessions = await sessionDB.findManyAndSelectIds(userId)

  return await safeAwait(
    Promise.all(
      activeSessions.map((session) => sessionCache.deleteKey(`${REDIS_AUTH_KEY}:${session.id}`)),
    ),
    `Cached keys deletion for user:${userId} failed: `,
  )
}
