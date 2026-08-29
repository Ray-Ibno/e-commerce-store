import AppError from '../errors/AppError'
import { orderDB } from '../repositories/orderDB.repository'
import redis from '../config/redis'
import prisma from '../lib/prisma'
import stripe from '../config/stripe'
import { createCheckOutSession, handleWebhookEvent } from './order.service'

jest.mock('../config/redis.js', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}))

jest.mock('../lib/prisma.js', () => ({
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('../config/stripe', () => ({
  checkout: {
    session: {
      create: jest.fn(),
    },
  },
  webhooks: {
    generateTestHeaderString: jest.fn(),
  },
}))

jest.mock('../repositories/orderDB.repository', () => ({
  ...jest.createMockFromModule('../repositories/orderDB.repository'),
}))

const mockUserId = 'user123'

const mockCartItems = [
  { id: 'cartItem1', quantity: 2, product: { id: 'prod1', price: 99.99 } },
  { id: 'cartItem2', quantity: 3, product: { id: 'prod2', price: 200.0 } },
]

const mockNewOrder = {
  id: 'newOrder123',
  totalAmount: 79998, // in decimal 799.98
}

const mockSession = { session: { url: 'mockurl.com' } }

describe('createCheckOutSession', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should create a session and return a redirect url', async () => {
    orderDB.findCartItems.mockResolvedValue(mockCartItems)
    orderDB.createOrder.mockResolvedValue(mockNewOrder)
    orderDB.createSession.mockResolvedValue(mockSession)

    const result = await createCheckOutSession(mockUserId)

    expect(result).toEqual(mockSession)
    expect(orderDB.findCartItems).toHaveBeenCalledWith(mockUserId)
    expect(orderDB.createOrder).toHaveBeenCalledWith(
      mockCartItems,
      mockNewOrder.totalAmount,
      mockUserId,
    )
    expect(orderDB.createSession).toHaveBeenCalledWith(mockUserId, mockCartItems, mockNewOrder.id)
  })

  test('should stop execution if cart is empty', async () => {
    orderDB.findCartItems.mockResolvedValue([])

    await expect(createCheckOutSession(mockUserId)).rejects.toThrow(
      new AppError('You have no items in your cart', 400),
    )

    expect(orderDB.createOrder).not.toHaveBeenCalled()
    expect(orderDB.createSession).not.toHaveBeenCalled()
  })

  test('should not create stripe session if order creation failed', async () => {
    orderDB.findCartItems.mockResolvedValue(mockCartItems)
    orderDB.createOrder.mockRejectedValue(
      new AppError('Failed to create your order. Please try again', 500),
    )

    await expect(createCheckOutSession(mockUserId)).rejects.toThrow(
      new AppError('Failed to create your order. Please try again', 500),
    )

    expect(orderDB.createSession).not.toHaveBeenCalled()
  })
})

describe('handleWebhookEvent', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockSessionEvent = {
    client_reference_id: mockUserId,
    customer_details: {
      email: 'email@email.com',
    },
    amount_total: mockNewOrder.totalAmount / 100,
    metadata: { orderId: mockNewOrder.id },
  }

  const mockPaymentIntent = {
    client_reference_id: mockUserId,
    metadata: { orderId: mockNewOrder.id },
  }

  let mockPayload = {
    id: 'evt_test_webhook',
    object: 'event',
    type: '',
    data: {
      object: mockSessionEvent,
    },
  }

  const mockRawBody = JSON.stringify(mockPayload, null, 2)
  const endpointSecret = 'whsec_test_secret'

  const mockSignature = stripe.webhooks.generateTestHeaderString({
    payload: mockRawBody,
    secret: endpointSecret,
  })

  const mockTotalAmount = mockNewOrder.totalAmount / 100

  test('should successfully update the database and return an custom success message', async () => {
    mockPayload.type = 'checkout.session.completed'
    orderDB.constructWebHookEvent.mockReturnValue(mockPayload)
    orderDB.fulfillPaidOrder.mockResolvedValue(1)

    const result = await handleWebhookEvent(mockRawBody, mockSignature)

    expect(orderDB.constructWebHookEvent).toHaveBeenCalledWith(mockRawBody, mockSignature)
    expect(orderDB.fulfillPaidOrder).toHaveBeenCalledWith(
      mockSessionEvent.metadata.orderId,
      mockUserId,
    )
    expect(result).toEqual(
      `💰 Payment of $${mockSessionEvent.amount_total / 100} succeeded for user: ${mockSessionEvent.customer_details.email}`,
    )
  })

  test('should not update product stock and delete cart items if order is cancelled', async () => {
    mockPayload.type = 'checkout.session.expired'
    orderDB.constructWebHookEvent.mockReturnValue(mockPayload)
    orderDB.updateStatus.mockResolvedValue(1)

    const result = await handleWebhookEvent(mockRawBody, mockSignature)

    expect(orderDB.fulfillPaidOrder).not.toHaveBeenCalled()
    expect(result).toEqual(
      `✅ Order ${mockSessionEvent.metadata.orderId} cancelled due to session expiration`,
    )
  })

  test('should not update product stock and delete cart items if order failed', async () => {
    mockPayload.type = 'payment_intent.payment_failed'
    orderDB.constructWebHookEvent.mockReturnValue(mockPayload)
    orderDB.updateStatus.mockResolvedValue(1)

    const result = await handleWebhookEvent(mockRawBody, mockSignature)

    expect(orderDB.fulfillPaidOrder).not.toHaveBeenCalled()
    expect(result).toEqual(`❌ Payment failed for order ${mockPaymentIntent.metadata.orderId}`)
  })
})
