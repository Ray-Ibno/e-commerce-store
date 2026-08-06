import prisma from '../lib/prisma.js'

const checkDatabaseConnection = async () => {
  try {
    // Executes a simple, low-cost raw SQL query to test connectivity
    await prisma.$queryRaw`SELECT 1`
    console.log('✅ Neon database is connected and responding!')
  } catch (error) {
    console.error('❌ Failed to connect to Neon database:')
    console.error(error)
    process.exit(1) // Optional: shuts down the server if DB is unreachable
  }
}

export default checkDatabaseConnection
