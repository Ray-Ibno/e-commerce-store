import * as productService from './products.service.js'
import { getRecommendations } from '../pipelines/products.pipeline.js'
import redis from '../config/redis.js'
import prisma from '../lib/prisma.js'
import * as constants from '../constants/index.js'
import AppError from '../errors/AppError.js'
import { deleteImage, uploadImage } from './cloudinary.service.js'

jest.mock('../config/redis.js', () => ({
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
}))

jest.mock('../lib/prisma.js', () => ({
  product: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}))

jest.mock('./cloudinary.service.js', () => ({
  uploadImage: jest.fn(),
  deleteImage: jest.fn(),
}))

jest.mock('../pipelines/products.pipeline.js', () => ({
  getRecommendations: jest.fn(),
}))

describe('fetchAllProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockAllProducts = [{ id: 'prod-456', name: 'Recommended item' }]

  test('should return parsed data from redis cache if it exists', async () => {
    redis.get.mockResolvedValue(JSON.stringify(mockAllProducts))

    const result = await productService.fetchAllProducts()

    expect(redis.get).toHaveBeenCalledWith(`${constants.REDIS_ALL_PRODUCTS}`)
    expect(result).toEqual(mockAllProducts)

    expect(prisma.product.findMany).not.toHaveBeenCalled()
  })

  test('should throw a 404 error if the product does not exist in the database', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue([])

    await expect(productService.fetchAllProducts).rejects.toThrow(
      new AppError('No products found', 404),
    )

    expect(redis.set).not.toHaveBeenCalled()
  })

  test('should fetch all products, cache them, and return them on cache miss', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue(mockAllProducts)

    const result = await productService.fetchAllProducts()

    expect(redis.set).toHaveBeenCalledWith(
      `${constants.REDIS_ALL_PRODUCTS}`,
      JSON.stringify(mockAllProducts),
      'EX',
      expect.any(Number),
    )

    expect(result).toEqual(mockAllProducts)
  })
})

describe('fetchFeaturedProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockFeaturedProducts = [{ id: 'prod_123', isFeatured: true }]

  test('should return parced data from redis cache if it exists', async () => {
    redis.get.mockResolvedValue(JSON.stringify(mockFeaturedProducts))

    const result = await productService.fetchFeaturedProducts()

    expect(redis.get).toHaveBeenCalledWith(constants.REDIS_FEATURED_PRODUCTS)
    expect(result).toEqual(mockFeaturedProducts)

    expect(prisma.product.findMany).not.toHaveBeenCalled()
  })

  test('should throw a 404 error if there is no featured products in the database', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue([])

    await expect(productService.fetchFeaturedProducts).rejects.toThrow(
      new AppError('No featured products found', 404),
    )

    expect(redis.set).not.toHaveBeenCalled()
  })

  test('should fetch featured products, cache them, and return them on cache miss', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue(mockFeaturedProducts)

    const result = await productService.fetchFeaturedProducts()

    expect(redis.set).toHaveBeenCalledWith(
      `${constants.REDIS_FEATURED_PRODUCTS}`,
      JSON.stringify(mockFeaturedProducts),
      'EX',
      expect.any(Number),
    )

    expect(result).toEqual(mockFeaturedProducts)
  })
})

describe('fetchByCategory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProductCategory = 'Food'
  const mockProductsByCategory = [{ id: 'prod_123', category: 'Food' }]

  test('shoud return parsed data from redis cache if it exists', async () => {
    redis.get.mockResolvedValue(JSON.stringify(mockProductsByCategory))

    const result = await productService.fetchByCategory(mockProductCategory)

    expect(redis.get).toHaveBeenCalledWith(
      `${constants.REDIS_BYCATEGORY_PRODUCTS}:${mockProductCategory}`,
    )
    expect(prisma.product.findMany).not.toHaveBeenCalled()

    expect(result).toEqual(mockProductsByCategory)
  })

  test('should throw a 404 error if the category do not exist in the database', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue(null)

    await expect(productService.fetchByCategory(mockProductCategory)).rejects.toThrow(
      new AppError('No category found', 404),
    )

    expect(redis.set).not.toHaveBeenCalled()
  })

  test('should fetch products by category, cache them, and return them on cache miss', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findMany.mockResolvedValue(mockProductsByCategory)

    const result = await productService.fetchByCategory(mockProductCategory)

    expect(redis.set).toHaveBeenCalledWith(
      `${constants.REDIS_BYCATEGORY_PRODUCTS}:${mockProductCategory}`,
      JSON.stringify(mockProductsByCategory),
      'EX',
      expect.any(Number),
    )

    expect(result).toEqual(mockProductsByCategory)
  })
})

describe('fetchRecommendedProducts', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProductId = 'prod-123'
  const mockProduct = { id: 'prod-123', category: 'Food' }
  const mockRecommendations = [{ id: 'prod-456', name: 'Recommended item' }]

  test('should return parsed data from redis cache if it exists', async () => {
    redis.get.mockResolvedValue(JSON.stringify(mockRecommendations))

    const result = await productService.fetchRecommendedProducts(mockProductId)

    expect(redis.get).toHaveBeenCalledWith(
      `${constants.REDIS_RECOMMENDED_PRODUCTS}:${mockProductId}`,
    )
    expect(result).toEqual(mockRecommendations)

    expect(prisma.product.findUnique).not.toHaveBeenCalled()
  })

  test('should throw a 404 error if thers is no recommended products in the database', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findUnique.mockResolvedValue(null)

    await expect(productService.fetchRecommendedProducts(mockProductId)).rejects.toThrow(
      new AppError('No product found', 404),
    )

    expect(getRecommendations).not.toHaveBeenCalled()
    expect(redis.set).not.toHaveBeenCalled()
  })

  test('should run getRecommendations, cache them, and return them on cache miss', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findUnique.mockResolvedValue(mockProduct)
    getRecommendations.mockResolvedValue(mockRecommendations)

    const result = await productService.fetchRecommendedProducts(mockProductId)

    expect(prisma.product.findUnique).toHaveBeenCalledWith({ where: { id: mockProductId } })
    expect(getRecommendations).toHaveBeenCalledWith(mockProduct.id, mockProduct.category)

    expect(redis.set).toHaveBeenCalledWith(
      `${constants.REDIS_RECOMMENDED_PRODUCTS}:${mockProductId}`,
      JSON.stringify(mockRecommendations),
      'EX',
      expect.any(Number),
    )

    expect(result).toEqual(mockRecommendations)
  })
})

describe('fetchProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProductId = 'prod_123'
  const mockProduct = { id: 'prod_123', name: 'prod_123' }

  test('should return parsed data from redis cache if it exists', async () => {
    redis.get.mockResolvedValue(JSON.stringify(mockProduct))

    const result = await productService.fetchProduct(mockProductId)

    expect(redis.get).toHaveBeenCalledWith(`${constants.REDIS_PRODUCT}:${mockProductId}`)
    expect(result).toEqual(mockProduct)

    expect(prisma.product.findUnique).not.toHaveBeenCalled()
  })

  test('should throw a 404 error if no product exist in the database', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findUnique.mockResolvedValue(null)

    await expect(productService.fetchProduct(mockProductId)).rejects.toThrow(
      new AppError('No product found', 404),
    )

    expect(redis.set).not.toHaveBeenCalled()
  })

  test('should fetch product, cache data, and return it on cache miss', async () => {
    redis.get.mockResolvedValue(null)
    prisma.product.findUnique.mockResolvedValue(mockProduct)

    const result = await productService.fetchProduct(mockProductId)

    expect(redis.set).toHaveBeenCalledWith(
      `${constants.REDIS_PRODUCT}:${mockProductId}`,
      JSON.stringify(mockProduct),
      'EX',
      expect.any(Number),
    )

    expect(result).toEqual(mockProduct)
  })
})

describe('postProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProductData = { name: 'Gaming Mouse', price: 50, category: 'Electronics' }
  const mockBuffer = Buffer.from('fake-image-bytes')

  const mockCloudinaryResponse = {
    secure_url: 'https://cloudinary.com',
    public_id: 'cloudinary-id-123',
  }

  const mockCreatedProduct = {
    id: 'prod-999',
    ...mockProductData,
    image: 'https://cloudinary.com',
    imageId: 'cloudinary-id-123',
  }

  test('should upload image to cloudinary, save product to database, and invalidate all cache', async () => {
    uploadImage.mockResolvedValue(mockCloudinaryResponse)
    prisma.product.create.mockResolvedValue(mockCreatedProduct)
    redis.del.mockResolvedValue(1)

    const result = await productService.postProduct(mockProductData, mockBuffer)

    expect(uploadImage).toHaveBeenCalledWith(mockBuffer)
    expect(prisma.product.create).toHaveBeenCalledWith({
      data: {
        name: 'Gaming Mouse',
        price: 50,
        category: 'Electronics',
        image: 'https://cloudinary.com',
        imageId: 'cloudinary-id-123',
      },
    })

    expect(redis.del).toHaveBeenCalled()
    expect(result).toEqual(mockCreatedProduct)
  })

  test('should delete image from cloudinary if database creation crashes', async () => {
    prisma.product.create.mockRejectedValue(new Error('Database Connection Timeout'))
    uploadImage.mockResolvedValue(mockCloudinaryResponse)

    await expect(productService.postProduct(mockProductData, mockBuffer)).rejects.toThrow(
      'Database Connection Timeout',
    )

    expect(deleteImage).toHaveBeenCalledWith('cloudinary-id-123')
    expect(redis.del).not.toHaveBeenCalled()
  })

  test('should try to delete image if the cloudinary upload itself fails first', async () => {
    uploadImage.mockRejectedValue(new Error('Cloudinary Upload Failed'))

    await expect(productService.postProduct(mockProductData, mockBuffer)).rejects.toThrow(
      'Cloudinary Upload Failed',
    )

    expect(deleteImage).not.toHaveBeenCalled()
    expect(prisma.product.create).not.toHaveBeenCalled()
  })
})

describe('updateProductFeature', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProduct = { id: 'prod-123', name: 'prod-123', category: 'Food', isFeatured: false }

  const mockUpdatedProduct = {
    ...mockProduct,
    isFeatured: true,
  }

  test('should fetch the product from the database, update the feature, and invalidate all cache', async () => {
    prisma.product.findUnique.mockResolvedValue(mockProduct)
    prisma.product.update.mockResolvedValue(mockUpdatedProduct)
    redis.del.mockResolvedValue(1)

    const result = await productService.updateProductFeature('prod-123')

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-123', isFeatured: false },
      data: { isFeatured: true },
    })

    expect(redis.del).toHaveBeenCalled()
    expect(result).toEqual(mockUpdatedProduct)
  })

  test('should return a 404 error if no product found in the database and not invalidate the cache', async () => {
    prisma.product.findUnique.mockResolvedValue(null)

    await expect(productService.updateProductFeature('prod-123')).rejects.toThrow(
      new AppError('No product found', 404),
    )

    expect(prisma.product.update).not.toHaveBeenCalled()
    expect(redis.del).not.toHaveBeenCalled()
  })
})

describe('updateProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockProduct = {
    id: 'prod-id-123',
    name: 'prod-456',
    description: 'prod desc',
    price: 15,
    category: 'Clothes',
  }

  const mockNewProductData = {
    name: 'prod-456',
    description: 'prod desc',
    price: 15,
    category: 'Clothes',
  }

  test('should return updated product and delete cache', async () => {
    prisma.product.update.mockResolvedValue(mockNewProductData)
    redis.del.mockResolvedValue(1)

    const result = await productService.updateProduct('prod-id-123', mockNewProductData)

    expect(prisma.product.update).toHaveBeenCalledWith({
      where: { id: 'prod-id-123' },
      data: mockNewProductData,
    })
    expect(result).toEqual(mockNewProductData)
    expect(redis.del).toHaveBeenCalled()
  })

  test('should throw a 404 error if no product found and not delete the cache', async () => {
    prisma.product.update.mockResolvedValue(null)

    await expect(productService.updateProduct('prod-id-123', mockNewProductData)).rejects.toThrow(
      new AppError('No product found', 404),
    )

    expect(redis.del).not.toHaveBeenCalled()
  })
})

describe('deleteProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  const mockDeletedProduct = {
    id: 'prod-id-123',
    name: 'prod-name-123',
    description: 'prod desc',
    price: 15,
    image: 'prod-img',
    imageId: 'prod-img-id',
    category: 'prod-category',
    isFeatured: false,
  }

  const mockCloudinaryResponse = {
    secure_url: 'https://cloudinary.com',
    public_id: 'cloudinary-id-123',
  }

  test('should delete product and cloudinary image if it exists in the database', async () => {
    prisma.product.delete.mockResolvedValue(mockDeletedProduct)
    redis.del.mockResolvedValue(1)
    deleteImage.mockResolvedValue(mockCloudinaryResponse)

    const result = await productService.deleteProduct('prod-id-123')

    expect(prisma.product.delete).toHaveBeenCalledWith({ where: { id: 'prod-id-123' } })
    expect(redis.del).toHaveBeenCalled()
    expect(deleteImage).toHaveBeenCalledWith('prod-img-id')
    expect(result).toEqual(true)
  })

  test('should throw 404 error if product do not exist in the database', async () => {
    prisma.product.delete.mockResolvedValue(null)

    await expect(productService.deleteProduct('prod-id-123')).rejects.toThrow(
      new AppError('No product found', 404),
    )

    expect(deleteImage).not.toHaveBeenCalledWith('prod-id-123')
    expect(redis.del).not.toHaveBeenCalled()
  })
})
