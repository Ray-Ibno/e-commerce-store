import { clearAllSiteCookies } from '../utils/cookieHelper.js'

export const globalErrorHandler = (err, req, res, next) => {
  console.error(`ERROR 💥:`, err.stack)

  const statusCode = err.statusCode || 500

  const sessionCompromised = 'Invalid or reused session. Please log in again.'

  if (statusCode === 401 && err.message.includes(sessionCompromised)) {
    clearAllSiteCookies(res)
  }

  res.status(statusCode).json({
    success: false,
    message: err.message || 'Internal Server Error',
    // stack only in dev
    stack: process.env.NODE_ENV === 'development' ? err.stack : {},
  })

  next()
}
