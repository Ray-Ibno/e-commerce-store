import AppError from '../errors/AppError.js'

export const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse({
    body: req.body,
    params: req.params,
  })

  if (!result.success) {
    const errorMessage = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join(' | ')

    throw new AppError(errorMessage, 400)
  }

  if (result.data.body) req.body = result.data.body
  if (result.data.params) req.params = result.data.params

  next()
}
