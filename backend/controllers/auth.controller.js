import * as authService from '../services/auth.service.js'
import AppError from '../errors/AppError.js'
import { bakeTokens, clearAllSiteCookies } from '../utils/cookieHelper.js'
import { sendSuccess } from '../utils/responseHelper.js'

export const getMe = async (req, res) => {
  const profile = await authService.fetchProfile(req.user.userId)
  sendSuccess({ res, statusCode: 200, data: profile })
}

export const googleCallback = async (req, res) => {
  const { user } = req

  const { accessToken, refreshToken } = await authService.cacheSession(user)
  bakeTokens(accessToken, refreshToken, res)

  res.redirect(`${process.env.CLIENT_URL}/dashboard`)
}

export const logout = async (req, res) => {
  if (!req.cookies || !req.cookies.refreshToken) {
    throw new AppError('You are not authenticated. Please log in.', 401)
  }
  const { refreshToken } = req.cookies
  await authService.singleLogOut(refreshToken)
  clearAllSiteCookies(res)
  sendSuccess({ res, statusCode: 200, message: 'Logged out.' })
}

export const logoutFromAllDevices = async (req, res) => {
  await authService.logOutAll(req.user.userId)
  clearAllSiteCookies(res)
  sendSuccess({ res, statusCode: 200, message: 'Logged out from all devices.' })
}
