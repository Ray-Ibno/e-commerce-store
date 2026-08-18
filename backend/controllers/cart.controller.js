import AppError from '../errors/AppError.js'
import prisma from '../lib/prisma.js'
import * as cartService from '../services/cart.service.js'
import { sendSuccess } from '../utils/responseHelper.js'

export const getCartItems = async (req, res) => {
  const cartItems = await cartService.getCartItemsByUserId(req.user.userId)
  sendSuccess({ res, statusCode: 200, data: cartItems })
}

export const addToCart = async (req, res) => {
  const { productId } = req.body
  const addedItem = await cartService.addItemToCart(req.user.userId, productId)
  sendSuccess({ res, statusCode: 201, data: addedItem, message: 'Item added to cart' })
}

export const updateQuantity = async (req, res) => {
  const { productId, quantity, clientUpdatedAt } = req.body
  const updatedItem = await cartService.updateItemQuantity(
    req.user.userId,
    productId,
    quantity,
    clientUpdatedAt,
  )
  updatedItem.message
    ? sendSuccess({ res, statusCode: 200, data: updatedItem.data, message: updatedItem.message })
    : sendSuccess({ res, statusCode: 200, data: updatedItem.data })
}

export const removeItemFromCart = async (req, res) => {
  const freshCart = await cartService.deleteCartItem(req.user.userId, req.params.productId)
  sendSuccess({ res, statusCode: 200, data: freshCart })
}

export const bulkRemoveItemsFromCart = async (req, res) => {
  const freshCart = await cartService.deleteManyCartItems(req.user.userId, req.body.productIds)
  sendSuccess({ res, statusCode: 200, data: freshCart })
}
