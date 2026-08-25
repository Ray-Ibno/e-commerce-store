import express from 'express'
import { checkout } from '../controllers/order.controller.js'
import { authenticate } from '../middleware/authenticate.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import { checkOutLimiter } from '../middleware/limiter.middleware.js'

const router = express.Router()

router.post('/payment', authenticate, checkOutLimiter, checkout)

export default router
