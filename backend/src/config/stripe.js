import Stripe from 'stripe'
import AppError from '../errors/AppError.js'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new AppError('STRIPE_SECRET_KEY missing.', 403)
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2026-05-27.dahlia',
})

export default stripe
