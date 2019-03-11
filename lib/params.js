const { isNumber } = require('./util')
const qs = require('qs')

/**
 * @class RequestParams
 * @property {Array} paths
 * @property {String} method
 * @property {Object} input
 */
class RequestParams {
  /**
   * Creates an instance of RequestParams.
   *
   * @memberof RequestParams
   * @param {URL} url
   * @param {String} method
   * @param {Object} [body={}]
   */
  constructor (url, method, body = {}) {
    if (!(url instanceof URL)) {
      throw new TypeError('first parameter should be instance of `URL` class.')
    }

    this.paths = url.pathname.slice(1).split('/').filter(p => p)
    this.method = method.toLowerCase()
    this.rawInput = Object.assign({}, body, qs.parse(url.search, {
      allowDots: true,
      ignoreQueryPrefix: true
    }))
  }

  /**
   * Normalized query string or request body
   *
   * @readonly
   * @memberof RequestParams
   * @return {Object}
   */
  get input () {
    const input = {}

    if (this.rawInput.hasOwnProperty('sort')) {
      input.sort = parseSort(this.rawInput.sort)
      delete this.rawInput.sort
    }

    for (let [attr, value] of Object.entries(this.rawInput)) {
      if (isNumber(value)) {
        input[attr] = parseInt(value)
      } else if (typeof value === 'string') {
        if (['true', 'false', 'yes', 'no', 'y', 'n', 't', 'f'].includes(value.toLowerCase())) {
          input[attr] = ['true', 'yes', 'y', 't'].includes(value.toLowerCase())
        } else {
          input[attr] = value
        }
      } else {
        input[attr] = value
      }
    }

    return input
  }

  /**
   * Determine is running on it's own db.json
   *
   * @readonly
   * @memberof RequestParams
   * @return {Boolean}
   */
  get internal () {
    return ['api', '~'].includes(this.paths[0])
  }

  /**
   * Get repo username
   *
   * @readonly
   * @memberof RequestParams
   * @return {String}
   */
  get username () {
    return this.internal ? 'username' : this.paths[0]
  }

  /**
   * Get repo name
   *
   * @readonly
   * @memberof RequestParams
   * @return {String}
   */
  get repositry () {
    return this.internal ? 'repository' : this.paths[1]
  }

  /**
   * Get table/resource name
   *
   * @readonly
   * @memberof RequestParams
   * @return {String}
   */
  get resource () {
    return this.paths[(this.internal ? 1 : 2)]
  }

  /**
   * Get resource key
   *
   * @readonly
   * @memberof RequestParams
   * @return {?(Number|String)}
   */
  get key () {
    const key = this.paths[(this.internal ? 2 : 3)]

    if (key) {
      return isNumber(key) ? parseInt(key) : key
    }

    return null
  }

  /**
   * Get request type
   *
   * Naming based on laravel resource controller routes name, except for 'edit' action.
   * @link https: //laravel.com/docs/5.8/controllers#resource-controllers
   *
   * @readonly
   * @memberof RequestParams
   * @return {String|null}
   */
  get action () {
    if (this.is('get', 'head') && this.key === null) {
      return 'index'
    } else if (this.is('get', 'head') && this.key === 'create') {
      return 'create'
    } else if (this.is('post') && this.key === null) {
      return 'store'
    } else if (this.is('get', 'head') && typeof this.key === 'number') {
      return 'show'
    } else if (this.is('put') && typeof this.key === 'number') {
      return 'update'
    } else if (this.is('delete') && typeof this.key === 'number') {
      return 'destroy'
    } else {
      return null
    }
  }

  /**
   * Determine method
   *
   * @memberof RequestParams
   * @param {...String} method
   * @return {Boolean}
   * @throws {TypeError}
   */
  is (...methods) {
    if (methods.length === 0) {
      throw new TypeError('RequestParams.is() Argument required')
    }

    return methods.includes(this.method)
  }
}

function parseSort (ordering) {
  const sort = {}
  if (Array.isArray(ordering)) {
    ordering.forEach(field => {
      sort[field] = 'desc'
    })
  } else if (typeof ordering === 'string') {
    ordering.split(',').filter(s => s).forEach(field => {
      sort[field] = 'desc'
    })
  } else {
    for (let field in ordering) {
      field = isNumber(field) ? ordering[field] : field
      sort[field] = ['asc', 'desc'].includes(ordering[field]) ? ordering[field] : 'desc'
    }
  }

  return sort
}

module.exports = RequestParams
