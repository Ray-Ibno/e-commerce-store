import { clearSessionCookie } from '../utils/cookieHelper.js'

export const globalErrorHandler = (err, req, res, next) => {
  console.error(`ERROR 💥:`, err.stack)

  if (err.code === 'P2025') {
    const resource = req.resourceName || 'Record'
    return res.status(404).json({
      success: false,
      message: `${resource} no longer exists.`,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    })
  }

  const isOperational = err.isOperational || false
  const statusCode = isOperational ? err.statusCode || 400 : 500
  const clientMessage = isOperational ? err.message : 'Internal Server Error'
  const sessionCompromised = 'Invalid or reused session. Please log in again.'

  if (statusCode === 401 && err.message.includes(sessionCompromised)) {
    clearSessionCookie(res)
  }

  res.status(statusCode).json({
    success: false,
    message: clientMessage,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  })
}
