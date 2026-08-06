import express from 'express'
import * as productController from '../controllers/product.controller.js'

import { validate } from '../middleware/validate.middleware.js'
import {
  addProductSchema,
  productCategoryParamsSchema,
  productIdParamsSchema,
} from '../validations/product.validation.js'
import upload from '../middleware/multer.js'
import { authenticate, restrictTo } from '../middleware/authenticate.middleware.js'

const router = express.Router()

router.get('/', authenticate, productController.getAllProducts)
router.get('/featured', authenticate, productController.getFeaturedProducts)
router.get(
  '/category/:category',
  authenticate,
  validate(productCategoryParamsSchema),
  productController.getProductByCategory,
)
router.get(
  '/recommended/:productId',
  authenticate,
  validate(productIdParamsSchema),
  productController.getRecommendedProducts,
)
router.get(
  '/:productId',
  authenticate,
  validate(productIdParamsSchema),
  productController.getProduct,
)

router.post(
  '/add',
  authenticate,
  restrictTo('admin'),
  upload.single('image'),
  validate(addProductSchema),
  productController.addProduct,
)

router.patch(
  '/:productId',
  authenticate,
  restrictTo('admin'),
  validate(productIdParamsSchema),
  productController.toggleProductFeature,
)
router.put(
  '/:productId',
  authenticate,
  restrictTo('admin'),
  validate(productIdParamsSchema),
  productController.updateProduct,
)

router.delete(
  '/:productId',
  authenticate,
  restrictTo('admin'),
  validate(productIdParamsSchema),
  productController.deleteProduct,
)

export default router
