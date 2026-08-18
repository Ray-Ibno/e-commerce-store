const COOKIE_NAME = 'jwt'

const DEFAULT_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}

/**
 * @param {string} sessionId - Session Id
 * @param {Object} res - Express response object
 */

export const bakeSessionCookie = (sessionId, res) => {
  res.cookie('sid', sessionId, {
    ...DEFAULT_OPTIONS,
    maxAge: Number(process.env.REFRESH_TOKEN_EXP),
  })
}

export const clearSessionCookie = (res) => res.clearCookie('sid', DEFAULT_OPTIONS)
