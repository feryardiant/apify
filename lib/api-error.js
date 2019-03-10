/**
 * @class ApiError
 * @extends {Error}
 * @property {Number} status
 */
class ApiError extends Error {
  /**
   * @param {Number} status
   * @param {String} message
   * @param {Array} [errors=[]]
   * @memberof ApifyError
   */
  constructor(status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
  }
}

/**
 * @param {String} [message='Resource not found']
 * @return {ApiError}
 */
exports.notFound = (message = 'Resource not found') => {
  return new ApiError(404, message)
}

/**
 * @param {String} [message='Invalid parameters']
 * @param {Array} [errors]
 * @return {ApiError}
 */
exports.invalidRequest = (message = 'Invalid parameters', errors) => {
  return new ApiError(400, message, errors)
}

module.exports = ApiError
