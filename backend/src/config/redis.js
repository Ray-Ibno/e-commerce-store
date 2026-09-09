import Redis from 'ioredis'
import 'dotenv/config'

const redis = new Redis(
  `rediss://default:${process.env.REDIS_PASSWORD}@magical-arachnid-73383.upstash.io:6379`,
)

redis.on('connect', () => console.log('✅ connected to redis'))
redis.on('error', (err) => console.error('❌ Redis Error: ', err))

export default redis
