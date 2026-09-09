/**
 *
 * @param Promise
 * @param {String} (optional) Error message
 * @returns
 */

export const safeAwait = (promise, customErrorMessage = 'Cache synchronization failed: ') =>
  promise.catch((err) => {
    console.error(customErrorMessage, err.message)
    return null
  })
