import prisma from '../lib/prisma.js'

export const sessionDB = {
  findById(sessionId) {
    return prisma.session.findUnique({ where: { id: sessionId } })
  },
  findManyAndSelectIds(userId) {
    return prisma.session.findMany({
      where: { userId },
      select: { id: true },
    })
  },
}
