import AppError from '../errors/AppError.js'
import * as productService from '../services/products.service.js'
import { sendSuccess } from '../utils/responseHelper.js'

export const getAllProducts = async (req, res) => {
  const products = await productService.fetchAllProducts()
  sendSuccess({ res, statusCode: 200, data: products })
}

export const getFeaturedProducts = async (req, res) => {
  const featuredProducts = await productService.fetchFeaturedProducts()
  sendSuccess({ res, statusCode: 200, data: featuredProducts })
}

export const setProductToFeatured = async (req, res) => {
  const updatedProduct = await productService.updateProductFeature(req.params.productId)
  sendSuccess({ res, statusCode: 200, data: updatedProduct })
}

export const getProductByCategory = async (req, res) => {
  const byCategory = await productService.fetchByCategory(req.params.category)
  sendSuccess({ res, statusCode: 200, data: byCategory })
}

export const getRecommendedProducts = async (req, res) => {
  const recommendations = await productService.fetchRecommendedProducts(req.params.productId)
  sendSuccess({ res, statusCode: 200, data: recommendations })
}

export const addProduct = async (req, res) => {
  const newProduct = await productService.postProduct(req.body, req.file.buffer)
  sendSuccess({ res, statusCode: 201, data: newProduct })
}

export const getProduct = async (req, res) => {
  const product = await productService.fetchProduct(req.params.productId)
  sendSuccess({ res, statusCode: 200, data: product })
}

export const toggleProductFeature = async (req, res) => {
  const updatedProductFeature = await productService.updateProductFeature(req.params.productId)
  sendSuccess({ res, statusCode: 200, data: updatedProductFeature })
}

export const updateProduct = async (req, res) => {
  const updatedProduct = await productService.updateProduct(req.params.productId, req.body)
  sendSuccess({ res, statusCode: 200, data: updateProduct })
}

export const deleteProduct = async (req, res) => {
  await productService.deleteProduct(req.params.productId)
  sendSuccess({ res, statusCode: 200, message: 'Product successfully deleted' })
}
