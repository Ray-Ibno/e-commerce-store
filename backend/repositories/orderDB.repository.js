import stripe from '../config/stripe.js'
import AppError from '../errors/AppError.js'
import { safeAwait } from '../helpers/await.helper.js'
import prisma from '../lib/prisma.js'

export const orderDB = {
  async createSession(userId, cartItems, orderId) {
    const line_items = cartItems.map((item) => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: item.product.name,
          images: [item.product.image],
        },
        unit_amount: item.product.price * 100, //converts to cents
      },
      quantity: item.quantity,
    }))

    return await stripe.checkout.sessions.create(
      {
        payment_method_types: ['card'],
        line_items,
        mode: 'payment',
        client_reference_id: userId,
        success_url: 'http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}',
        cancel_url: 'http://localhost:5173/cart',
        metadata: {
          orderId,
        },
        payment_intent_data: {
          metadata: {
            orderId,
          },
        },
      },
      { idempotencyKey: `checkout-${orderId}-${Date.now()}` },
    )
  },
  createOrder(cartItems, calculatedAmount) {
    return prisma.order.create({
      data: {
        totalAmount: calculatedAmount,
        orderItems: {
          create: cartItems.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
            priceAtPurchase: item.product.price,
          })),
        },
      },
    })
  },
  findCartItems(userId) {
    return prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    })
  },
  constructWebHookEvent: (rawBody, signature) => {
    try {
      return stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET)
    } catch (err) {
      console.error(`❌ Webhook Signature Verification Failed:`, err.message)
      throw new AppError(`Webhook Error: ${err.message}`, 400)
    }
  },
  fulfillPaidOrder(orderId, userId) {
    return prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      })

      if (existingOrder && existingOrder.status === 'paid') return false

      await tx.order.update({
        where: { id: orderId },
        data: { status: 'paid' },
      })

      for (const item of existingOrder.orderItems) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.quantity } },
        })
      }

      await tx.cartItem.deleteMany({
        where: { userId },
      })

      await safeAwait(redis.del(`cart_items:${userId}`))

      console.log('✅ Database updated successfully.')
      return true
    })
  },
  updateStatus(orderId, status) {
    return prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { orderItems: true },
      })

      if (existingOrder && existingOrder.status === 'paid') {
        throw new AppError(`❌ Order with id of ${orderId} is already paid`)
      }

      await tx.order.update({
        where: { id: orderId },
        data: { status },
      })
      console.log('✅ Database updated successfully.')
      return true
    })
  },
}
