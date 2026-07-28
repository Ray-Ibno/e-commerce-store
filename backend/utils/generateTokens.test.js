import { generateTokens } from './generateTokens'
import jwt from 'jsonwebtoken'

jest.mock('jsonwebtoken', () => ({
  jwt: {
    sign: jest.fn(),
  },
}))

jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(),
}))

describe('generateTokens', () => {
  let originalEnv

  beforeEach(() => {
    jest.clearAllMocks()
  })

  beforeAll(() => {
    originalEnv = { ...process.env }
    process.env.REFRESH_TOKEN_SECRET = 'secret'
    process.env.ACCESS_TOKEN_SECRET = 'accessSecret'
    process.env.ACCESS_TOKEN_EXP = '900000'
    process.env.REFRESH_TOKEN_EXP = '604800000'
  })

  afterAll(() => {
    process.env = originalEnv
  })

  const mockUser = {
    userId: 'user123',
    role: 'role123',
    sessionId: 'session123',
  }

  const mockRefreshToken = 'refreshToken123'
  const mockAccessToken = 'accessToken123'

  test('should return accessToken and refreshToken', () => {
    jwt.sign.mockReturnValueOnce(mockAccessToken).mockReturnValueOnce(mockRefreshToken)

    const tokens = generateTokens(mockUser.userId, mockUser.role, mockUser.sessionId)

    expect(jwt.sign).toHaveBeenCalledTimes(2)
    expect(jwt.sign).toHaveBeenNthCalledWith(1, mockUser, 'accessSecret', { expiresIn: '900000' })
    expect(jwt.sign).toHaveBeenNthCalledWith(2, mockUser, 'secret', {
      expiresIn: '604800000',
    })

    expect(tokens).toEqual({ accessToken: mockAccessToken, refreshToken: mockRefreshToken })
  })
})
