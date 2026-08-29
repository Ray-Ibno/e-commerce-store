import AppError from '../errors/AppError.js'
import { orderDB } from '../repositories/orderDB.repository.js'

export const createCheckOutSession = async (userId) => {
  const cartItems = await orderDB.findCartItems(userId)

  if (cartItems.length === 0) throw new AppError('You have no items in your cart', 400)

  const calculatedAmount = cartItems.reduce(
    (accumulator, item) => accumulator + Math.round(item.product.price * 100) * item.quantity,
    0,
  )

  const newOrder = await orderDB.createOrder(cartItems, calculatedAmount, userId)
  return await orderDB.createSession(userId, cartItems, newOrder.id)
}

export const handleWebhookEvent = async (rawBody, signature) => {
  const event = orderDB.constructWebHookEvent(rawBody, signature)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object

      const orderId = session.metadata.orderId
      const userId = session.client_reference_id
      const userEmail = session.customer_details.email
      const totalAmount = session.amount_total / 100

      const wasUpdated = await orderDB.fulfillPaidOrder(orderId, userId)
      return `💰 Payment of $${totalAmount} succeeded for user: ${userEmail}`
    }

    case 'checkout.session.expired': {
      const session = event.data.object
      const orderId = session.metadata.orderId

      const wasUpdated = await orderDB.updateStatus(orderId, 'cancelled')
      return `✅ Order ${orderId} cancelled due to session expiration`
    }

    case 'payment_intent.payment_failed': {
      const paymentIntent = event.data.object
      const orderId = paymentIntent.metadata?.orderId

      const wasUpdated = await orderDB.updateStatus(orderId, 'failed')
      return `❌ Payment failed for order ${orderId}`
    }

    default:
      console.log(`ℹ️ Unhandled event type ${event.type}`)
  }
}
