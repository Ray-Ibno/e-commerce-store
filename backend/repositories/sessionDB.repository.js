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
  invalidateSession(sessionId) {
    return prisma.session.deleteMany({ where: { id: sessionId } })
  },
  invalidateUserSessions(userId) {
    return prisma.session.deleteMany({ where: { userId } })
  },
}
