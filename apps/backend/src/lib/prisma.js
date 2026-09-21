import { PrismaPg } from '@prisma/adapter-pg'
import pkg from '../generated/client/index.js'
import pg from 'pg'
import AppError from '../errors/AppError.js'

const { PrismaClient } = pkg

const connectionString = process.env.DATABASE_URL

if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new AppError('❌ CRITICAL: DATABASE_URL environment variable is missing or undefined!', 500)
}

const pool = new pg.Pool({ connectionString })
const adapter = new PrismaPg(pool)

const prisma = new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalThis.prisma = prisma
}

export default prisma
