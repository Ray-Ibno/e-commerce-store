import { authenticate } from './authenticate.middleware'
import redis from '../config/redis'
import axios from 'axios'
import AppError from '../errors/AppError'
import { clearSessionCookie } from '../utils/cookieHelper'

jest.mock('axios')

jest.mock('../utils/cookieHelper', () => ({
  clearSessionCookie: jest.fn(),
}))

jest.mock('../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}))

jest.mock('../helpers/await.helper', () => ({
  safeAwait: jest.fn((promise) => promise.catch(() => null)),
}))

describe('authenticate', () => {
  let req, res, next

  beforeEach(() => {
    req = {
      cookies: {},
      headers: { cookie: 'sid=123' },
    }
    res = {}
    next = jest.fn()
    jest.clearAllMocks()
    jest.spyOn(Date, 'now').mockReturnValue(1000000)
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('throws 401 if no session id cookie exists', async () => {
    req.cookies = {}
    await expect(authenticate(req, res, next)).rejects.toThrow('You are not authenticated')
  })

  test('calls next() and sets req.user when valid active session exists', async () => {
    req.cookies.sid = '123'
    const sessionData = { userId: 'u1', role: 'admin', accessExpiresAt: Date.now() + 100000 }
    redis.get.mockResolvedValue(JSON.stringify(sessionData))

    await authenticate(req, res, next)

    expect(req.user).toEqual({ userId: 'u1', role: 'admin', sessionId: '123' })
    expect(next).toHaveBeenCalled()
  })

  test('should successfully authenticate if session is valid and not expired', async () => {
    req.cookies.sid = 'valid-sid'
    const sessionData = {
      userId: 'user-123',
      role: 'admin',
      accessExpiresAt: 2000000, // In the future
    }
    redis.get.mockResolvedValue(JSON.stringify(sessionData))

    await authenticate(req, res, next)

    expect(req.user).toEqual({
      userId: 'user-123',
      role: 'admin',
      sessionId: 'valid-sid',
    })
    expect(req.headers['cookie']).toBeUndefined()
    expect(next).toHaveBeenCalled()
  })

  test('performs silent token refresh when access token is expired', async () => {
    req.cookies.sid = '123'
    const expiredSession = {
      userId: 'u1',
      role: 'user',
      accessExpiresAt: Date.now() - 1000,
      googleRefreshToken: 'refresh-token-123',
    }
    redis.get.mockResolvedValue(JSON.stringify(expiredSession))
    redis.set.mockResolvedValue('OK')
    axios.post.mockResolvedValue({
      data: { access_token: 'new-access-token', expires_in: 3600 },
    })

    await authenticate(req, res, next)

    expect(axios.post).toHaveBeenCalled()
    expect(redis.set).toHaveBeenCalled()
    expect(next).toHaveBeenCalled()
  })

  test('should throw 401 AppError during refresh if no googleRefreshToken is present', async () => {
    req.cookies.sid = 'valid-sid'
    const sessionData = {
      accessExpiresAt: 500000,
      googleRefreshToken: null,
    }
    redis.get.mockResolvedValue(JSON.stringify(sessionData))
    redis.del.mockResolvedValue(1) // Mock safeAwait cleanup wrapper

    await expect(authenticate(req, res, next)).rejects.toThrow(
      new AppError('Session invalid or expired', 401),
    )
    expect(redis.del).toHaveBeenCalled()
    expect(clearSessionCookie).toHaveBeenCalledWith(res)
  })

  test('should handle Google OAuth failure, delete session from redis, clear cookie, and throw 401', async () => {
    req.cookies.sid = 'valid-sid'
    const sessionData = {
      accessExpiresAt: 500000,
      googleRefreshToken: 'refresh-token-xyz',
    }
    redis.get.mockResolvedValue(JSON.stringify(sessionData))
    axios.post.mockRejectedValue(new Error('Google API Error'))
    redis.del.mockResolvedValue(1)

    await expect(authenticate(req, res, next)).rejects.toThrow(
      new AppError('Session invalid or expired', 401),
    )
    expect(redis.del).toHaveBeenCalled()
    expect(clearSessionCookie).toHaveBeenCalledWith(res)
  })
})
