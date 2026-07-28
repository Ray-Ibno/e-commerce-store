const COOKIE_NAME = 'jwt'

const DEFAULT_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
}

/**
 * @param {string} accessToken - Access Token
 * @param {string} refreshToken - Refresh Token
 * @param {Object} res - Express response object
 */

export const bakeTokens = (accessToken, refreshToken, res) => {
  res.cookie('accessToken', accessToken, {
    ...DEFAULT_OPTIONS,
    maxAge: process.env.ACCESS_TOKEN_EXP,
  })

  res.cookie('refreshToken', refreshToken, {
    ...DEFAULT_OPTIONS,
    maxAge: process.env.REFRESH_TOKEN_EXP,
  })
}

export const clearAllSiteCookies = (res) => {
  // Instructs the browser to instantly destroy EVERY cookie on this domain
  res.set('Clear-Site-Data', '"cookies"')
}
