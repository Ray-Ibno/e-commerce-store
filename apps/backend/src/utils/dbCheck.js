import prisma from '../lib/prisma.js'

const checkDatabaseConnection = async (retries = 5, delay = 2000) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // Executes a simple, low-cost raw SQL query to test connectivity
      await prisma.$queryRaw`SELECT 1`
      console.log('✅ Neon database is connected and responding!')
      return
    } catch (error) {
      console.log(`⚠️ Database not ready yet (Attempt ${attempt + 1}/${retries}). Retrying...`)
      if (attempt === retries - 1) {
        console.error('❌ Failed to connect to Neon database:')
        console.error(error)
        process.exit(1) // Optional: shuts down the server if DB is unreachable
      }
      await new Promise((res) => setTimeout(res, delay))
    }
  }
}

export default checkDatabaseConnection
