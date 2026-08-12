import redis from '../config/redis.js'
import AppError from '../errors/AppError.js'
import prisma from '../lib/prisma.js'
import { cartCache } from '../repositories/cartCache.repository.js'
import { cartDB } from '../repositories/cartDB.repository.js'
import * as cartService from '../services/cart.service.js'

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

jest.mock('../repositories/cartCache.repository', () => ({
  ...jest.createMockFromModule('../repositories/cartCache.repository'),
}))

jest.mock('../repositories/cartDB.repository', () => ({
  ...jest.createMockFromModule('../repositories/cartDB.repository'),
}))

const mockCartItem = {
  id: 'productId1',
  product: 'product',
}

const mockCartItems = [
  {
    id: 'productId1',
    product: 'product1',
  },
  {
    id: 'productId2',
    product: 'product2',
  },
]

const mockProductIds = ['productId1', 'productId2']

const mockUserId = 'userId123'
const mockProductId = 'product123'
const mockQuantity = 3

describe('getCartItemsByUserId', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('shoud return parsed data from redis cache if it exists', async () => {
    cartCache.getCartItems.mockResolvedValue(JSON.stringify(mockCartItems))

    const result = await cartService.getCartItemsByUserId(mockUserId)

    expect(result).toEqual(mockCartItems)
    expect(cartCache.getCartItems).toHaveBeenCalledWith(mockUserId)

    expect(cartCache.setCartItems).not.toHaveBeenCalled()
    expect(cartDB.findCartItems).not.toHaveBeenCalled()
  })

  test('should fetch cart items, cache them, and return them on cache miss', async () => {
    cartCache.getCartItems.mockResolvedValue(null)
    cartCache.setCartItems.mockResolvedValue(1)
    cartDB.findCartItems.mockResolvedValue(mockCartItems)

    const result = await cartService.getCartItemsByUserId(mockUserId)

    expect(result).toEqual(mockCartItems)
    expect(cartDB.findCartItems).toHaveBeenCalledWith(mockUserId)
    expect(cartCache.setCartItems).toHaveBeenCalledWith(mockUserId, mockCartItems)
  })
})

describe('addItemToCart', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should return a cart item and delete outdated cart item cache', async () => {
    cartDB.createOrUpdateCartItem.mockResolvedValue(mockCartItem)
    cartCache.deleteCartItems.mockResolvedValue(1)

    const result = await cartService.addItemToCart(mockUserId, mockProductId)

    expect(result).toEqual(mockCartItem)
    expect(cartCache.deleteCartItems).toHaveBeenCalledWith(mockUserId)
  })

  test('should throw an error for prisma p2002 error code', async () => {
    cartDB.createOrUpdateCartItem.mockRejectedValue(new AppError('Item already in your cart'))

    await expect(cartService.addItemToCart(mockUserId, mockProductId)).rejects.toThrow(
      new AppError('Item already in your cart'),
    )

    expect(cartCache.deleteCartItems).not.toHaveBeenCalled()
  })
})

describe('updateItemQuantity', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should update cart quantity, delete outdated cache, and return updated cart items', async () => {
    cartDB.updateQuantity.mockResolvedValue({ count: 1 })
    cartDB.findCartItems.mockResolvedValue(mockCartItems)
    cartCache.deleteCartItems.mockResolvedValue(1)

    const result = await cartService.updateItemQuantity(mockUserId, mockProductId, mockQuantity)

    expect(result).toEqual(mockCartItems)
    expect(cartCache.deleteCartItems).toHaveBeenCalledWith(mockUserId)
    expect(cartDB.findCartItems).toHaveBeenCalledWith(mockUserId)
    expect(cartDB.updateQuantity).toHaveBeenCalledWith(mockUserId, mockProductId, mockQuantity)
  })

  test('should delete the cart item if quantity is equal to 0', async () => {
    cartDB.deleteSingleCartItem.mockResolvedValue({ count: 1 })
    cartDB.findCartItems.mockResolvedValue(mockCartItems)
    cartCache.deleteCartItems.mockResolvedValue(1)

    const result = await cartService.updateItemQuantity(mockUserId, mockProductId, 0)

    expect(cartDB.deleteSingleCartItem).toHaveBeenCalledWith(mockUserId, mockProductId)
    expect(cartDB.findCartItems).toHaveBeenCalledWith(mockUserId)
    expect(cartCache.deleteCartItems).toHaveBeenCalledWith(mockUserId)
  })

  test('should throw a 404 error if the cart item trying to delete is not in cart', async () => {
    cartDB.deleteSingleCartItem.mockResolvedValue({ count: 0 })
    cartDB.findIfCartItemExists.mockResolvedValue(null)

    await expect(cartService.updateItemQuantity('wrongUserId', mockProductId, 0)).rejects.toThrow(
      new AppError('Item not found in your cart', 404),
    )

    expect(cartDB.findIfCartItemExists).toHaveBeenCalledWith('wrongUserId', mockProductId)
    expect(cartDB.deleteSingleCartItem).toHaveBeenCalledWith('wrongUserId', mockProductId)
    expect(cartCache.deleteCartItems).not.toHaveBeenCalled()
  })

  test('should throw a 400 error if quantity is below 0', async () => {
    await expect(cartService.updateItemQuantity(mockUserId, mockProductId, -1)).rejects.toThrow(
      new AppError('quantity can not be negative', 400),
    )
  })

  test('should throw a 404 error if cart item trying to update is not in cart', async () => {
    cartDB.updateQuantity.mockResolvedValue({ count: 0 })
    cartDB.findIfCartItemExists.mockResolvedValue(null)

    await expect(cartService.updateItemQuantity('wrongUserId', mockProductId, 1)).rejects.toThrow(
      new AppError('Item not found in cart', 404),
    )

    expect(cartDB.findIfCartItemExists).toHaveBeenCalledWith('wrongUserId', mockProductId)
    expect(cartDB.updateQuantity).toHaveBeenCalledWith('wrongUserId', mockProductId, 1)
    expect(cartCache.deleteCartItems).not.toHaveBeenCalled()
  })

  test('should throw a 400 error if cart item quantity exceeds the product stock', async () => {
    cartDB.updateQuantity.mockResolvedValue({ count: 0 })
    cartDB.findIfCartItemExists.mockResolvedValue(mockCartItem)

    await expect(cartService.updateItemQuantity(mockUserId, mockProductId, 100)).rejects.toThrow(
      new AppError('Item quantity exceeds available stock', 400), //NOTE: CREATE env FOR THE ERROR MESSAGES AND STATUS CODES
    )

    expect(cartDB.findIfCartItemExists).toHaveBeenCalledWith(mockUserId, mockProductId)
    expect(cartDB.updateQuantity).toHaveBeenCalledWith(mockUserId, mockProductId, 100)
    expect(cartCache.deleteCartItems).not.toHaveBeenCalled()
  })
})

describe('deleteCartItem', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should delete cart item, delete outdated cache, and return updated cart items', async () => {
    cartDB.deleteSingleCartItem.mockResolvedValue({ count: 1 })
    cartCache.deleteCartItems.mockResolvedValue(1)
    cartDB.findCartItems.mockResolvedValue(mockCartItems)

    const result = await cartService.deleteCartItem(mockUserId, mockProductId)

    expect(cartDB.deleteSingleCartItem).toHaveBeenCalledWith(mockUserId, mockProductId)
    expect(cartDB.findCartItems).toHaveBeenCalledWith(mockUserId)
    expect(cartCache.deleteCartItems).toHaveBeenCalledWith(mockUserId)
    expect(result).toEqual(mockCartItems)
  })

  test('should throw a 404 error if cart item trying to delete is not in cart', async () => {
    cartDB.deleteSingleCartItem.mockResolvedValue({ count: 0 })

    await expect(cartService.deleteCartItem('wrongUserId', mockProductId)).rejects.toThrow(
      new AppError('Item not found in your cart', 404),
    )
  })
})

describe('deleteManyCartItems', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('should delete all cart items with a matching id in productIds, delete outdated cache, and return updated cart items', async () => {
    cartDB.deleteBulkCartItems.mockResolvedValue(mockCartItems)
    cartCache.deleteCartItems.mockResolvedValue(mockUserId)

    const result = await cartService.deleteManyCartItems(mockUserId, mockProductIds)

    expect(cartDB.deleteBulkCartItems).toHaveBeenCalledWith(mockUserId, mockProductIds)
    expect(cartCache.deleteCartItems).toHaveBeenCalledWith(mockUserId)
    expect(result).toEqual(mockCartItems)
  })
})
