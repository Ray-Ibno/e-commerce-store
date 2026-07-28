import 'dotenv/config'
import express from 'express'
import authRoutes from './routes/auth.route.js'
import producRoutes from './routes/product.route.js'
import cartRoutes from './routes/cart.route.js'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import { globalErrorHandler } from './middleware/globalErrorHandler.middleware.js'
import passport from './config/passport.js'

const app = express()

app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }))
app.use(express.json())
app.use(cookieParser())
app.use(passport.initialize())

app.use('/api/auth', authRoutes)
app.use('/api/products', producRoutes)
app.use('/api/cart', cartRoutes)

app.use(globalErrorHandler)

export default app
