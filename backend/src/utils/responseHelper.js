/**
 * Standardized Success Response
 * @param {Object} res - Express Response object
 * @param {Number} statusCode - HTTP Status Code (200, 201, etc.)
 * @param {Object|Array} data - Optional data payload
 * @param {String} message - Optional success message
 */
export const sendSuccess = ({ res, statusCode, data = undefined, message = undefined }) => {
  return res.status(statusCode).json({
    status: 'success',
    message,
    results: Array.isArray(data) ? data.length : undefined, // Useful for lists
    data,
  })
}
