import redis from '../config/redis.js'

export const sessionCache = {
  setSession(sessionKey, refreshToken, ttl) {
    return redis.set(sessionKey, refreshToken, 'EX', ttl)
  },
  getKey(key) {
    return redis.get(key)
  },
  deleteKey(key) {
    return redis.del(key)
  },
}
