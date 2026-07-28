import jwt from 'jsonwebtoken'
import { authenticate } from './authenticate.middleware'
import redis from '../config/redis'

jest.mock('jsonwebtoken', () => ({
  verify: jest.fn(),
}))

jest.mock('../config/redis', () => ({
  set: jest.fn(),
  get: jest.fn(),
  del: jest.fn(),
}))

describe('authenticate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockCookies = {
    accessToken: 'fakeAccessToken',
    refreshToken: 'fakeRefreshToken',
  }

  const mockPayload = {
    userId: 'test123',
    role: 'testRole',
    sessionId: 'testSessionId',
  }

  test('should pass payload to req.user if token is valid', async () => {
    const req = { cookies: mockCookies, user: null }
    const res = {}
    const next = jest.fn()

    jwt.verify.mockReturnValue(mockPayload)

    authenticate(req, res, next)

    expect(jwt.verify).toHaveBeenCalled()
    expect(req.user).toEqual(mockPayload)
    expect(next).toHaveBeenCalled()
  })
})
