import AppError from '../errors/AppError.js'
import * as cloudinaryService from './cloudinary.service.js'
import { getRecommendations } from '../pipelines/products.pipeline.js'
import { productDB } from '../repositories/productDB.repository.js'
import { productCache } from '../repositories/productCache.repository.js'
import { safeAwait } from '../helpers/await.helper.js'

export const fetchAllProducts = async () => {
  const cached = await safeAwait(productCache.getAllCached())
  if (cached) return JSON.parse(cached)

  const allProducts = await productDB.findMany()
  if (allProducts.length === 0) throw new AppError('No products found', 404)

  await safeAwait(productCache.cacheAllProducts(allProducts))

  return allProducts
}

export const fetchFeaturedProducts = async () => {
  const cached = await safeAwait(productCache.getFeaturedCached())
  if (cached) return JSON.parse(cached)

  const featuredProducts = await productDB.findAllFeatured()
  if (featuredProducts.length === 0) throw new AppError('No featured products found', 404)

  await safeAwait(productCache.cacheFeatured(featuredProducts))

  return featuredProducts
}

export const fetchByCategory = async (category) => {
  const cached = await productCache.getByCategoryCached(category)
  if (cached) return JSON.parse(cached)

  const byCategory = await productDB.findByCategory(category)
  if (!byCategory) throw new AppError('No category found', 404)

  await safeAwait(productCache.cacheByCategory(category, byCategory))

  return byCategory
}

export const fetchRecommendedProducts = async (currentProductId) => {
  const cached = await productCache.getRecommendedCached(currentProductId)
  if (cached) return JSON.parse(cached)

  const currentProduct = await productDB.findById(currentProductId)
  if (!currentProduct) throw new AppError('No product found', 404)

  const recommendations = await getRecommendations(currentProduct.id, currentProduct.category)

  await safeAwait(productCache.cacheRecommended(currentProductId, recommendations))

  return recommendations
}

export const fetchProduct = async (productId) => {
  const cached = await productCache.getCachedById(productId)
  if (cached) return JSON.parse(cached)

  const product = await productDB.findById(productId)
  if (!product) throw new AppError('No product found', 404)

  await safeAwait(productCache.cacheProduct(productId, product))

  return product
}

export const postProduct = async (productData, fileBuffer) => {
  let cloudinaryResult

  try {
    cloudinaryResult = await cloudinaryService.uploadImage(fileBuffer)

    const finalData = {
      ...productData,
      image: cloudinaryResult.secure_url,
      imageId: cloudinaryResult.public_id,
    }

    const newProduct = await productDB.createProduct(finalData)

    await safeAwait(
      productCache.clearAllCached(newProduct.category),
      'failed to clear all cached products',
    )

    return newProduct
  } catch (error) {
    if (cloudinaryResult?.public_id) {
      await cloudinaryService.deleteImage(cloudinaryResult.public_id)
    }
    throw error
  }
}

export const updateProductFeature = async (productId) => {
  const product = await productDB.findById(productId)
  if (!product) throw new AppError('No product found', 404)

  const updatedProduct = await productDB.updateProductFeature(productId, product.isFeatured)

  await productCache.clearAllCached(updatedProduct.category, productId)

  return updatedProduct
}

export const updateProduct = async (productId, newData) => {
  const updatedProduct = await productDB.updateProductData(productId, newData)
  if (!updatedProduct) throw new AppError('No product found', 404)

  await productCache.clearAllCached(updatedProduct.category)

  return updatedProduct
}

export const deleteProduct = async (productId) => {
  const deletedProduct = await productDB.deleteProduct(productId)
  if (!deletedProduct) throw new AppError('No product found', 404)
  if (deletedProduct.imageId) await cloudinaryService.deleteImage(deletedProduct.imageId)

  await productCache.clearAllCached(deletedProduct.category, productId)

  return true
}
