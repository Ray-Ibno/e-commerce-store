import Redis from 'ioredis'

const redis = new Redis(process.env.REDIS_URL)

redis.on('connect', () => console.log('✅ connected to redis'))
redis.on('error', (err) => console.error('❌ Redis Error: ', err))

export default redis
