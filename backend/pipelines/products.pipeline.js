import prisma from '../lib/prisma.js'

export const getRecommendations = async (currentProductId, category) => {
  // 1. Fetch matching rows from the database
  const products = await prisma.product.findMany({
    where: {
      id: { not: currentProductId }, // Exclude current product
      OR: [
        { category: category }, // Condition 1
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

  // 2. Compute recommendation scores and sort in memory
  return products
    .map((product) => {
      let score = 0
      if (product.category === category) score += 10
      if (product.isFeatured) score += 5
      return { ...product, score }
    })
    .sort((a, b) => b.score - a.score) // Order by highest score first
    .slice(0, 6) // Take up to 6 items
}
