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
import { catalogLimiter, catalogManagementLimiter } from '../middleware/limiter.middleware.js'

const router = express.Router()

router.get('/', authenticate, catalogLimiter, productController.getAllProducts)
router.get('/featured', authenticate, catalogLimiter, productController.getFeaturedProducts)
router.get(
  '/category/:category',
  authenticate,
  catalogLimiter,
  validate(productCategoryParamsSchema),
  productController.getProductByCategory,
)
router.get(
  '/recommended/:productId',
  authenticate,
  catalogLimiter,
  validate(productIdParamsSchema),
  productController.getRecommendedProducts,
)
router.get(
  '/:productId',
  authenticate,
  catalogLimiter,
  validate(productIdParamsSchema),
  productController.getProduct,
)

router.post(
  '/add',
  authenticate,
  restrictTo('admin'),
  catalogManagementLimiter,
  upload.single('image'),
  validate(addProductSchema),
  productController.addProduct,
)

router.patch(
  '/:productId',
  authenticate,
  restrictTo('admin'),
  catalogManagementLimiter,
  validate(productIdParamsSchema),
  productController.toggleProductFeature,
)
router.put(
  '/:productId',
  authenticate,
  restrictTo('admin'),
  catalogManagementLimiter,
  validate(productIdParamsSchema),
  productController.updateProduct,
)

router.delete(
  '/:productId',
  authenticate,
  restrictTo('admin'),
  catalogManagementLimiter,
  validate(productIdParamsSchema),
  productController.deleteProduct,
)

export default router
