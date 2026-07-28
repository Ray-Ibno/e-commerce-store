import jwt from 'jsonwebtoken'

export const generateTokens = (userId, role, sessionId) => {
  const accessToken = jwt.sign({ userId, role, sessionId }, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXP,
  })

  const refreshToken = jwt.sign({ userId, role, sessionId }, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXP,
  })

  return { accessToken, refreshToken }
}
