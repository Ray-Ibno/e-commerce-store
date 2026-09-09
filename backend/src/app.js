import 'dotenv/config'
import express from 'express'
import authRoutes from './routes/auth.route.js'
import producRoutes from './routes/product.route.js'
import cartRoutes from './routes/cart.route.js'
import orderRoutes from './routes/order.route.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { globalErrorHandler } from './middleware/globalErrorHandler.middleware.js'
import passport from './config/passport.js'
import { handleWebHook } from './controllers/order.controller.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(cookieParser())
app.use(passport.initialize())

app.post(
  '/api/checkout/stripe-webhook',
  express.json({
    verify: (req, res, buf, encoding) => {
      if (buf && buf.length) {
        req.rawBody = buf
      }
    },
  }),
  handleWebHook,
)

app.use(express.json())

app.use('/api/auth', authRoutes)
app.use('/api/products', producRoutes)
app.use('/api/cart', cartRoutes)
app.use('/api/checkout', orderRoutes)

app.use(globalErrorHandler)

export default app
