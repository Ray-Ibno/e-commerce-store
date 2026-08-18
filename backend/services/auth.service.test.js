import { REDIS_AUTH_KEY } from '../constants/index.js'
import AppError from '../errors/AppError.js'
import { sessionCache } from '../repositories/sessionCache.repository.js'
import { sessionDB } from '../repositories/sessionDB.repository.js'
import { userDB } from '../repositories/userDB.repository.js'
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

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

const mockUser = {
  userId: 'testId',
  role: 'testRole',
  sessionId: 'testSession',
  googleAccessToken: 'mockAccessToken',
  googleRefreshToken: 'mockRefreshToken',
}

const mockSessionPayload = {
  userId: mockUser.userId,
  role: mockUser.role,
  googleAccessToken: mockUser.googleAccessToken,
  googleRefreshToken: mockUser.googleRefreshToken,
}

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

  test('should cache the session', async () => {
    sessionCache.setSession.mockResolvedValue(1)
    const mockAccessExpiresAt = Date.now() + Number(process.env.ACCESS_TOKEN_EXP | '900000')

    const result = await authService.cacheSession(mockUser)

    expect(sessionCache.setSession).toHaveBeenCalledWith(
      `${REDIS_AUTH_KEY}:${mockUser.sessionId}`,
      { ...mockSessionPayload, accessExpiresAt: mockAccessExpiresAt },
    )

    expect(result).toEqual(1)
  })

  test('should return 0 if safeAwait catched an error from redis', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    sessionCache.setSession.mockRejectedValue(new Error('Redis is down'))

    const result = await authService.cacheSession(mockUser)

    expect(consoleSpy).toHaveBeenCalledWith('Cache synchronization failed: ', 'Redis is down')

    expect(result).toEqual(null)
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

  test('should delete redis session key', async () => {
    sessionCache.deleteKey.mockResolvedValue(1)

    await authService.singleLogOut(mockUser.sessionId)

    expect(sessionCache.deleteKey).toHaveBeenCalledWith(`${REDIS_AUTH_KEY}:${mockUser.sessionId}`)
  })

  test('should return 0 if safeAwait catched an error from redis', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    sessionCache.deleteKey.mockRejectedValue(new Error('Redis is down'))

    const result = await authService.singleLogOut(mockUser.sessionId)

    expect(consoleSpy).toHaveBeenCalledWith(
      `Cache miss: Session deletion failed for ${REDIS_AUTH_KEY}:${mockUser.sessionId}: `,
      'Redis is down',
    )
    expect(result).toEqual(null)
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
    sessionCache.deleteKey.mockResolvedValue(1)

    await authService.logOutAll(mockUserId)

    expect(sessionDB.findManyAndSelectIds).toHaveBeenCalledWith(mockUserId)

    expect(sessionCache.deleteKey).toHaveBeenCalledTimes(2)
    expect(sessionCache.deleteKey).toHaveBeenNthCalledWith(1, `${REDIS_AUTH_KEY}:session1`)
    expect(sessionCache.deleteKey).toHaveBeenNthCalledWith(2, `${REDIS_AUTH_KEY}:session2`)
  })

  test('should proceed with execution even when redis cache is down', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    sessionDB.findManyAndSelectIds.mockResolvedValue(mockActiveSessions)

    sessionCache.deleteKey.mockRejectedValue(new Error('Redis is down'))

    await authService.logOutAll(mockUserId)

    expect(consoleSpy).toHaveBeenCalledWith(
      `Cached keys deletion for user:${mockUserId} failed: `,
      'Redis is down',
    )

    expect(sessionDB.findManyAndSelectIds).toHaveBeenCalledWith(mockUserId)

    consoleSpy.mockRestore()
  })
})
