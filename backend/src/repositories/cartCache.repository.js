import redis from '../config/redis.js'

const CACHE_TIME = 20 * 60

export const cartCache = {
  getCartItems(userId) {
    return redis.get(`cart_items:${userId}`)
  },
  setCartItems(userId, cartItems) {
    return redis.set(`cart_items:${userId}`, JSON.stringify(cartItems), 'EX', CACHE_TIME)
  },
  deleteCartItems(userId) {
    return redis.del(`cart_items:${userId}`)
  },
}
