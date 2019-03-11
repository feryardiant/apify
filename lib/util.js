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

/**
 * @param {String} words
 * @return {String}
 */
exports.capitalize = (words) => {
  if (words === 'id') return 'ID'

  return words.toLowerCase()
    .replace(/_(id|at)$/, '')
    .replace(/(_|\-)/g, ' ')
    .replace(/[^\s]*/g, word => {
      return word.replace(/./, ch => ch.toUpperCase())
    })
}
