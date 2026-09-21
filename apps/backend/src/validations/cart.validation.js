import z from 'zod'

export const addCartItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product id is required').uuid(),
  }),
})

export const updateCartItemSchema = z.object({
  body: z.object({
    productId: z.string().min(1, 'Product id is required').uuid(),
    quantity: z.coerce.number().min(1, 'Item quantity is required'),
    clientUpdatedAt: z.string().min(1, 'Client update date is required'),
  }),
})

export const deleteCartItemSchema = z.object({
  params: z.object({
    productId: z.string().min(1, 'Missing required parameters').uuid(),
  }),
})

export const bulkDeleteCartItemsSchema = z.object({
  body: z.object({
    productIds: z.array(z.string().uuid()).min(1, 'Must select at least one product to delete'),
  }),
})
