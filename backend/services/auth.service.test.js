import { REDIS_AUTH_KEY, SEVEN_DAYS } from '../constants/index.js'
import AppError from '../errors/AppError.js'
import { sessionCache } from '../repositories/sessionCache.repository.js'
import { sessionDB } from '../repositories/sessionDB.repository.js'
import { userDB } from '../repositories/userDB.repository.js'
import { generateTokens } from '../utils/generateTokens.js'
import jwt, { verify } from 'jsonwebtoken'
import * as authService from './auth.service.js'

jest.mock('../config/redis.js', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}))

jest.mock('../lib/prisma.js', () => ({
  findUnique: jest.fn(),
  findMany: jest.fn(),
  deleteMany: jest.fn(),
}))

jest.mock('../repositories/userDB.repository.js', () => ({
  ...jest.createMockFromModule('../repositories/userDB.repository.js'),
}))

jest.mock('../repositories/sessionDB.repository.js', () => ({
  ...jest.createMockFromModule('../repositories/sessionDB.repository.js'),
}))

jest.mock('../repositories/sessionCache.repository.js', () => ({
  sessionCache: {
    setSession: jest.fn(),
    deleteKey: jest.fn(),
  },
}))

jest.mock('../utils/generateTokens.js', () => ({
  generateTokens: jest.fn(),
}))

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

describe('fetchProfile', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    id: 'testId',
    username: 'testUser',
    role: 'testRole',
  }

  test('should return return current user details', async () => {
    userDB.findById.mockResolvedValue(mockUser)

    const result = await authService.fetchProfile('testId')

    expect(userDB.findById).toHaveBeenCalledWith('testId')
    expect(result).toEqual(mockUser)
  })

  test('should throw and error if no user found', async () => {
    userDB.findById.mockResolvedValue(null)

    await expect(authService.fetchProfile('wrongTestId')).rejects.toThrow(
      new AppError('No user found', 404),
    )
  })
})

describe('cacheSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUser = {
    userId: 'testId',
    role: 'testRole',
    sessionId: 'testSession',
  }

  const mockTokens = {
    accessToken: 'accessToken',
    refreshToken: 'refreshToken',
  }

  test('should cache the session and return accessToken and RefeshToken', async () => {
    sessionCache.setSession.mockResolvedValue(1)
    generateTokens.mockReturnValue(mockTokens)

    const result = await authService.cacheSession(mockUser)

    expect(sessionCache.setSession).toHaveBeenCalledWith(
      `${REDIS_AUTH_KEY}:${mockUser.sessionId}`,
      mockTokens.refreshToken,
      SEVEN_DAYS,
    )

    expect(generateTokens).toHaveBeenCalledWith(mockUser.userId, mockUser.role, mockUser.sessionId)
    expect(result).toEqual(mockTokens)
  })

  test('should still generate token even when redis cache is down', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    sessionCache.setSession.mockRejectedValue(new Error('Redis is down'))
    generateTokens.mockReturnValue(mockTokens)

    const result = await authService.cacheSession(mockUser)

    expect(consoleSpy).toHaveBeenCalledWith('Cache synchronization failed: ', 'Redis is down')

    expect(generateTokens).toHaveBeenCalledWith(mockUser.userId, mockUser.role, mockUser.sessionId)
    expect(result).toEqual(mockTokens)
  })
})

describe('singleLogOut', () => {
  let originalEnv

  beforeAll(() => {
    originalEnv = { ...process.env }
    process.env.REFRESH_TOKEN_SECRET = 'secret'
  })

  beforeEach(() => {
    jest.resetAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  const mockDecoded = {
    userId: 'testId',
    role: 'testRole',
    sessionId: 'testSession',
  }

  const mockRefreshToken = 'refreshToken123'

  test('should delete redis session key and databese session', async () => {
    jwt.verify.mockReturnValue(mockDecoded)
    sessionCache.deleteKey.mockResolvedValue(1)
    sessionDB.invalidateSession.mockResolvedValue(1)

    await authService.singleLogOut(mockRefreshToken)

    expect(jwt.verify).toHaveBeenCalledWith(mockRefreshToken, 'secret')
    expect(sessionCache.deleteKey).toHaveBeenCalledWith(
      `${REDIS_AUTH_KEY}:${mockDecoded.sessionId}`,
    )
    expect(sessionDB.invalidateSession).toHaveBeenCalledWith(mockDecoded.sessionId)
  })

  test('should throw an error if token is not verified', async () => {
    jwt.verify.mockImplementation(() => {
      throw new Error('Token verification error')
    })

    await expect(authService.singleLogOut(mockRefreshToken)).rejects.toThrow(
      'Token verification error',
    )

    expect(sessionCache.deleteKey).not.toHaveBeenCalled()
    expect(sessionDB.invalidateSession).not.toHaveBeenCalled()
  })
})

describe('logOutAll', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockUserId = 'test123'
  const mockActiveSessions = [{ id: 'session1' }, { id: 'session2' }]

  test('should delete users database and cache sessions', async () => {
    sessionDB.findManyAndSelectIds.mockResolvedValue(mockActiveSessions)
    sessionDB.invalidateUserSessions.mockResolvedValue({ count: 2 })
    sessionCache.deleteKey.mockResolvedValue(1)

    await authService.logOutAll(mockUserId)

    expect(sessionDB.findManyAndSelectIds).toHaveBeenCalledWith(mockUserId)
    expect(sessionDB.invalidateUserSessions).toHaveBeenCalledWith(mockUserId)

    expect(sessionCache.deleteKey).toHaveBeenCalledTimes(2)
    expect(sessionCache.deleteKey).toHaveBeenNthCalledWith(1, `${REDIS_AUTH_KEY}:session1`)
    expect(sessionCache.deleteKey).toHaveBeenNthCalledWith(2, `${REDIS_AUTH_KEY}:session2`)
  })

  test('should proceed with execution even when redis cache is down', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})

    sessionDB.findManyAndSelectIds.mockResolvedValue(mockActiveSessions)
    sessionDB.invalidateUserSessions.mockResolvedValue({ count: 2 })
    sessionCache.deleteKey.mockRejectedValue(new Error('Redis is down'))

    await authService.logOutAll(mockUserId)

    expect(consoleSpy).toHaveBeenCalledWith(
      `Cached keys deletion for user:${mockUserId} failed: `,
      'Redis is down',
    )

    expect(sessionDB.findManyAndSelectIds).toHaveBeenCalledWith(mockUserId)
    expect(sessionDB.invalidateUserSessions).toHaveBeenCalledWith(mockUserId)

    consoleSpy.mockRestore()
  })
})
