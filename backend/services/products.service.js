import prisma from '../lib/prisma.js'
import redis from '../config/redis.js'
import * as constant from '../constants/index.js'
import AppError from '../errors/AppError.js'
import * as cloudinaryService from './cloudinary.service.js'
import { getRecommendations } from '../pipelines/products.pipeline.js'
import { getCacheKeys } from '../helpers/cacheKeys.helper.js'

const CACHE_TIME = 20 * 60 * 60

export const fetchAllProducts = async () => {
  const cached = await redis.get(constant.REDIS_ALL_PRODUCTS)
  if (cached) return JSON.parse(cached)

  const allProducts = await prisma.product.findMany()
  if (allProducts.length === 0) throw new AppError('No products found', 404)

  await redis.set(constant.REDIS_ALL_PRODUCTS, JSON.stringify(allProducts), 'EX', CACHE_TIME)

  return allProducts
}

export const fetchFeaturedProducts = async () => {
  const cached = await redis.get(constant.REDIS_FEATURED_PRODUCTS)
  if (cached) return JSON.parse(cached)

  const featuredProducts = await prisma.product.findMany({ where: { isFeatured: true } })
  if (featuredProducts.length === 0) throw new AppError('No featured products found', 404)

  await redis.set(
    constant.REDIS_FEATURED_PRODUCTS,
    JSON.stringify(featuredProducts),
    'EX',
    CACHE_TIME,
  )

  return featuredProducts
}

export const fetchByCategory = async (category) => {
  const cached = await redis.get(`${constant.REDIS_BYCATEGORY_PRODUCTS}:${category}`)
  if (cached) return JSON.parse(cached)

  const byCategory = await prisma.product.findMany({ where: { category } })
  if (!byCategory) throw new AppError('No category found', 404)

  await redis.set(
    `${constant.REDIS_BYCATEGORY_PRODUCTS}:${category}`,
    JSON.stringify(byCategory),
    'EX',
    CACHE_TIME,
  )

  return byCategory
}

export const fetchRecommendedProducts = async (currentProductId) => {
  const cached = await redis.get(`${constant.REDIS_RECOMMENDED_PRODUCTS}:${currentProductId}`)
  if (cached) return JSON.parse(cached)

  const currentProduct = await prisma.product.findUnique({ where: { id: currentProductId } })
  if (!currentProduct) throw new AppError('No product found', 404)

  const recommendations = await getRecommendations(currentProduct.id, currentProduct.category)

  await redis.set(
    `${constant.REDIS_RECOMMENDED_PRODUCTS}:${currentProductId}`,
    JSON.stringify(recommendations),
    'EX',
    CACHE_TIME,
  )

  return recommendations
}

export const fetchProduct = async (productId) => {
  const cached = await redis.get(`${constant.REDIS_PRODUCT}:${productId}`)
  if (cached) return JSON.parse(cached)

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) throw new AppError('No product found', 404)

  await redis.set(
    `${constant.REDIS_PRODUCT}:${productId}`,
    JSON.stringify(product),
    'EX',
    CACHE_TIME,
  )

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

    const newProduct = await prisma.product.create({ data: finalData })

    //remove outdated cache
    await redis.del(getCacheKeys(newProduct.category))

    return newProduct
  } catch (error) {
    if (cloudinaryResult?.public_id) {
      await cloudinaryService.deleteImage(cloudinaryResult.public_id)
    }
    throw error
  }
}

export const updateProductFeature = async (productId) => {
  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) throw new AppError('No product found', 404)

  const updatedProduct = await prisma.product.update({
    where: { id: productId, isFeatured: product.isFeatured },
    data: { isFeatured: !product.isFeatured },
  })

  //remove outdated cache
  await redis.del([
    ...getCacheKeys(updatedProduct.category),
    constant.REDIS_PRODUCT + `:${productId}`,
  ])

  return updatedProduct
}

export const updateProduct = async (productId, newData) => {
  const updatedProduct = await prisma.product.update({
    where: { id: productId },
    data: newData,
  })
  if (!updatedProduct) throw new AppError('No product found', 404)

  //remove outdated cache
  await redis.del(getCacheKeys(updatedProduct.category))

  return updatedProduct
}

export const deleteProduct = async (productId) => {
  const deletedProduct = await prisma.product.delete({ where: { id: productId } })
  if (!deletedProduct) throw new AppError('No product found', 404)
  if (deletedProduct.imageId) await cloudinaryService.deleteImage(deletedProduct.imageId)

  //remove outdated cache
  await redis.del(getCacheKeys(deletedProduct.category), constant.REDIS_PRODUCT + `:${productId}`)

  return true
}
