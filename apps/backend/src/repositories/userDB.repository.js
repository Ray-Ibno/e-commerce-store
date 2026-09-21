import prisma from '../lib/prisma.js'

export const userDB = {
  findById(userId) {
    return prisma.user.findUnique({ where: { id: userId } })
  },
}
