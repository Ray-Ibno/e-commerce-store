import * as authService from '../services/auth.service.js'
import AppError from '../errors/AppError.js'
import { bakeSessionCookie, clearSessionCookie } from '../utils/cookieHelper.js'
import { sendSuccess } from '../utils/responseHelper.js'

export const getMe = async (req, res) => {
  const profile = await authService.fetchProfile(req.user.userId)
  sendSuccess({ res, statusCode: 200, data: profile })
}

export const googleCallback = async (req, res) => {
  const { user } = req

  await authService.cacheSession(user)
  bakeSessionCookie(user.sessionId, res)

  res.redirect(`${process.env.CLIENT_URL}/dashboard`)
}

export const logout = async (req, res) => {
  const { user } = req
  await authService.singleLogOut(user.sessionId)
  clearSessionCookie(res)
  sendSuccess({ res, statusCode: 200, message: 'Logged out.' })
}

export const logoutFromAllDevices = async (req, res) => {
  await authService.logOutAll(req.user.userId)
  clearSessionCookie(res)
  sendSuccess({ res, statusCode: 200, message: 'Logged out from all devices.' })
}
