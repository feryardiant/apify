/**
 * @async
 * @param {Function} cb
 * @return {any}
 */
exports.promisify = (cb) => {
  return new Promise((resolve, reject) => {
    cb((err, data) => {
      if (err) return reject(err)
      return resolve(data)
    })
  })
}

/**
 * Determine is value a plain object.
 *
 * @param {any} value
 * @return {Boolean}
 */
exports.isObject = (value) => {
  return value !== null && value.constructor.name === 'Object'
}

/**
 * Determine is value a number-ish.
 *
 * @param {String} value
 * @return {Boolean}
 */
exports.isNumber = (value) => {
  return typeof value === 'number' ||
    (typeof value === 'string' && /^-?(\d)+$/.test(value))
}
