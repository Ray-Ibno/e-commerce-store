import { createCheckOutSession, handleWebhookEvent } from '../services/order.service.js'
import { sendSuccess } from '../utils/responseHelper.js'

export const checkout = async (req, res) => {
  const { user } = req
  const session = await createCheckOutSession(user.userId)
  sendSuccess({ res, statusCode: 200, data: { url: session.url } })
}

export const handleWebHook = async (req, res) => {
  const signature = req.headers['stripe-signature']
  const eventResponse = await handleWebhookEvent(req.rawBody, signature)
  sendSuccess({ res, statusCode: 200, message: eventResponse })
}
