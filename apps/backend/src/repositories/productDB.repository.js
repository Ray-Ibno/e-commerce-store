import prisma from '../lib/prisma.js'

export const productDB = {
  findById(id) {
    return prisma.product.findUnique({ where: { id } })
  },
  findMany() {
    return prisma.product.findMany()
  },
  findAllFeatured() {
    return prisma.product.findMany({ where: { isFeatured: true } })
  },
  findByCategory(category) {
    return prisma.product.findMany({ where: { category } })
  },
  createProduct(data) {
    return prisma.product.create({ data })
  },
  updateProductFeature(id, isFeatured) {
    return prisma.product.update({
      where: { id, isFeatured },
      data: { isFeatured: !isFeatured },
    })
  },
  updateProductData(id, newData) {
    return prisma.product.update({
      where: { id },
      data: newData,
    })
  },
  deleteProduct(id) {
    return prisma.product.delete({ where: { id } })
  },
  findRecommendations(currentProductId, category) {
    return prisma.product.findMany({
      where: {
        id: { not: currentProductId }, // Exclude current product
        OR: [
          { category }, // Condition 1
          { isFeatured: true }, // Condition 2
        ],
      },
      select: {
        id: true,
        title: true,
        price: true,
        category: true,
        isFeatured: true,
      },
    })
  },
}
