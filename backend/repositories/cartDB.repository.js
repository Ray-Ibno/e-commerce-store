import { Prisma } from '@prisma/client'
import AppError from '../errors/AppError.js'
import prisma from '../lib/prisma.js'

export const cartDB = {
  findCartItems(userId) {
    return prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    })
  },
  async createOrUpdateCartItem(userId, productId) {
    try {
      return await prisma.cartItem.upsert({
        where: {
          userId_productId: { userId, productId },
        },
        update: {
          quantity: { increment: 1 },
        },
        create: {
          userId,
          productId,
          quantity: 1,
        },
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') throw new AppError('Item already in your cart', 400)
        if (error.code === 'P2003') throw new AppError('Item no longer exist', 404)
      }

      throw error
    }
  },
  findIfCartItemExists(userId, productId) {
    return prisma.cartItem.findUnique({
      where: { userId_productId: { userId, productId } },
    })
  },
  updateQuantity(userId, productId, quantity, clientUpdatedAt) {
    return prisma.cartItem.updateMany({
      where: {
        userId,
        productId,
        updatedAt: new Date(clientUpdatedAt),
        product: {
          stock: { gte: quantity },
        },
      },
      data: { quantity, updatedAt: new Date() },
    })
  },
  deleteSingleCartItem(userId, productId) {
    return prisma.cartItem.deleteMany({ where: { userId, productId } })
  },
  deleteBulkCartItems(userId, productIds) {
    return prisma.cartItem.deleteMany({
      where: { userId, productId: { in: productIds } },
    })
  },
}
