import express from 'express'
import * as authController from '../controllers/auth.controller.js'
import { validate } from '../middleware/validate.middleware.js'
import { authenticate } from '../middleware/authenticate.middleware.js'
import passport from 'passport'

const router = express.Router()

router.get('/me', authenticate, authController.getMe)

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: '/login',
  }),
  authController.googleCallback,
)

router.post('/logout', authenticate, authController.logout)
router.post('/logoutall', authenticate, authController.logoutFromAllDevices)

export default router
