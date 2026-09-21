import express from 'express'
import * as cartController from '../controllers/cart.controller.js'
import { authenticate } from '../middleware/authenticate.middleware.js'
import { validate } from '../middleware/validate.middleware.js'
import {
  addCartItemSchema,
  bulkDeleteCartItemsSchema,
  deleteCartItemSchema,
  updateCartItemSchema,
} from '../validations/cart.validation.js'

const router = express.Router()

router.get('/', authenticate, cartController.getCartItems)

router.post('/add', authenticate, validate(addCartItemSchema), cartController.addToCart)
router.post(
  '/deletemany',
  authenticate,
  validate(bulkDeleteCartItemsSchema),
  cartController.bulkRemoveItemsFromCart,
)
router.patch('/', authenticate, validate(updateCartItemSchema), cartController.updateQuantity)
router.delete(
  '/:productId',
  authenticate,
  validate(deleteCartItemSchema),
  cartController.removeItemFromCart,
)

export default router
