import { z } from 'zod'

export const addProductSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(1, 'Product name is required')
      .max(10, 'Product name can not exceed 10 characters')
      .regex(/[a-zA-Z0-9 ]/, 'Product name can only contain letters and numbers'),
    description: z.string().min(1, 'Description is required'),
    price: z.coerce.number().min(1, 'Product price is required'),
    category: z.string().min(1, 'Product category is required'),
    stock: z.coerce.number().min(1, 'Product stock is required'),
  }),
})

export const productIdParamsSchema = z.object({
  params: z.object({ productId: z.string().min(1, 'Missing required parameters').uuid() }),
})

export const productCategoryParamsSchema = z.object({
  params: z.object({ category: z.string().min(1, 'Missing required parameters') }),
})
