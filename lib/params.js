const { isNumbering } = require('./util')
const { invalidRequest } = require('./api-error')
const { URL } = require('url')
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

    for (let [attr, value] of Object.entries(this.rawInput)) {
      if (['true', 'false', 'yes', 'no', 'y', 'n', 't', 'f'].includes(value.toLowerCase())) {
        input[attr] = ['true', 'yes', 'y', 't'].includes(value.toLowerCase())
      } else if (isNumbering(value)) {
        input[attr] = parseInt(value)
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
   * @return {Number|String|null}
   */
  get key () {
    const key = this.paths[(this.internal ? 2 : 3)]

    if (key) {
      return isNumbering(key) ? parseInt(key) : key
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
  get type () {
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
   * @param {String} method
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

/**
 * Parse incoming request
 *
 * @param {IncomingMessage} req
 * @return {RequestParams}
 */
exports.params = async (req) => {
  const type = req.headers['content-type']
  const types = [
    'application/x-www-form-urlencoded',
    'application/json'
  ]

  if (!types.includes(type)) {
    throw invalidRequest('Unsupported `Content-Type`')
  }

  let body = await promisify(done => {
    const chunks = []

    function onError (err) {
      done(err)
    }

    function onData (chunk) {
      chunks.push(chunk)
    }

    function onEnd () {
      const body = Buffer.concat(chunks).toString('utf-8')

      done(null, body)
    }

    function onClose () {
      req.off('error', onError)
      req.off('data', onData)
      req.off('end', onEnd)
      req.off('close', onClose)
    }

    req.on('error', onError)
    req.on('data', onData)
    req.on('end', onEnd)
    req.on('close', onClose)
  })

  if (body && type === 'application/x-www-form-urlencoded') {
    body = qs.parse(body)
  }

  const url = new URL(req.url)
  return new RequestParams(url, req.method, body)
}

module.exports = RequestParams
