import express from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate } from '../middleware/authenticate.middleware.js'
import passport from 'passport'
import { oAuthLimiter, oAuthRedirectLimiter } from '../middleware/limiter.middleware.js'

const router = express.Router()

router.get('/me', authenticate, oAuthLimiter, authController.getMe)

router.get(
  '/google',
  oAuthRedirectLimiter,
  passport.authenticate('google', { scope: ['profile', 'email'], accessType: 'offline' }),
)

router.get(
  '/google/callback',
  oAuthRedirectLimiter,
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login',
  }),
  authController.googleCallback,
)

router.post('/logout', authenticate, oAuthLimiter, authController.logout)
router.post('/logoutall', authenticate, oAuthLimiter, authController.logoutFromAllDevices)

export default router
