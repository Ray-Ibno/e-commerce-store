import AppError from '../errors/AppError.js'
import { cartDB } from '../repositories/cartDB.repository.js'
import { safeAwait } from '../helpers/await.helper.js'
import { cartCache } from '../repositories/cartCache.repository.js'

export const getCartItemsByUserId = async (userId) => {
  const cached = await safeAwait(cartCache.getCartItems(userId))
  if (cached) return JSON.parse(cached)
  const cartItems = await cartDB.findCartItems(userId)

  await safeAwait(cartCache.setCartItems(userId, cartItems))

  return cartItems
}

export const addItemToCart = async (userId, productId) => {
  const cartItem = await cartDB.createOrUpdateCartItem(userId, productId)
  await safeAwait(cartCache.deleteCartItems(userId), 'Failed to delete cart item cache: ')
  return cartItem
}

export const updateItemQuantity = async (userId, productId, quantity, clientUpdatedAt) => {
  if (quantity < 0) throw new AppError('quantity can not be negative', 400)

  if (quantity === 0) {
    const deleteResult = await cartDB.deleteSingleCartItem(userId, productId)
    if (deleteResult.count === 0) {
      const itemExists = await cartDB.findIfCartItemExists(userId, productId)
      if (!itemExists) throw new AppError('Item not found in your cart', 404)
    }

    await safeAwait(cartCache.deleteCartItems(userId), 'Failed to delete cart item cache: ')
    return await cartDB.findCartItems(userId)
  }

  const updateResult = await cartDB.updateQuantity(userId, productId, quantity, clientUpdatedAt)

  if (updateResult.count === 0) {
    const itemExists = await cartDB.findIfCartItemExists(userId, productId)
    if (!itemExists) throw new AppError('Item not found in cart', 404)

    if (new Date(itemExists.updatedAt).getTime() !== new Date(clientUpdatedAt).getTime()) {
      throw new AppError('Your cart is out of sync. Please refresh.', 409) // 409 Conflict
    }

    throw new AppError('Item quantity exceeds available stock', 400)
  }

  await safeAwait(cartCache.deleteCartItems(userId), 'Failed to delete cart item cache: ')
  return await cartDB.findCartItems(userId)
}

export const deleteCartItem = async (userId, productId) => {
  const deleteResult = await cartDB.deleteSingleCartItem(userId, productId)
  if (deleteResult.count === 0) throw new AppError('Item not found in your cart', 404)

  await safeAwait(cartCache.deleteCartItems(userId), 'Failed to delete cart item cache: ')
  return await cartDB.findCartItems(userId)
}

export const deleteManyCartItems = async (userId, productIds) => {
  await cartDB.deleteBulkCartItems(userId, productIds)

  await safeAwait(cartCache.deleteCartItems(userId), 'Failed to delete cart item cache: ')
  return await cartDB.findCartItems(userId)
}
