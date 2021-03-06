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

  static methodNotAllowed () {
    return new ApiError(405, 'Method not allowed')
  }

  /**
   * @param {String} [message='Resource not found']
   * @return {ApiError}
   */
  static notFound (message = 'Resource not found') {
    return new ApiError(404, message)
  }

  /**
   * @param {String} [message='Invalid parameters']
   * @param {Array} [errors]
   * @return {ApiError}
   */
  static invalidRequest (message = 'Invalid parameters', errors) {
    return new ApiError(400, message, errors)
  }
}

module.exports = ApiError
