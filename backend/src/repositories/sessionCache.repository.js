import redis from '../config/redis.js'
import { SEVEN_DAYS } from '../constants/index.js'

export const sessionCache = {
  setSession(sessionKey, sessionPayload) {
    return redis.set(sessionKey, JSON.stringify(sessionPayload), 'EX', SEVEN_DAYS)
  },
  getKey(key) {
    return redis.get(key)
  },
  deleteKey(key) {
    return redis.del(key)
  },
}
