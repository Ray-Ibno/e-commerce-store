import { neonConfig } from '@neondatabase/serverless'
import { PrismaNeon } from '@prisma/adapter-neon'
import { PrismaClient } from '@prisma/client'
import ws from 'ws'
import AppError from '../errors/AppError.js'

neonConfig.webSocketConstructor = ws

const connectionString = process.env.DATABASE_URL

if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new AppError('❌ CRITICAL: DATABASE_URL environment variable is missing or undefined!', 500)
}

const adapter = new PrismaNeon({ connectionString: connectionString || '' })

const prisma = new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
