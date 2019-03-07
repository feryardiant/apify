/**
 * @class Resource
 */
class Resource {
  /**
   * @param {Array} model
   * @memberof Resource
   */
  constructor (model) {
    this.status = 200
    this.model = model.slice(0)
  }

  /**
   * @memberof Resource
   * @static
   * @param {Object} models
   * @param {RequestParser} params
   * @return {{result: {Object}, status: {Number}}}
   */
  static handle (models, params) {
    const resource = new Resource(models[params.resource])
    let data

    switch (params.type) {
      case 'index':
        data = resource.index(params.query)
        break
      case 'store':
        data = resource.store(params.body, params.query)
        break
      case 'edit':
        data = resource.edit(params.key, params.query)
        break
      case 'update':
        data = resource.update(params.key, params.body, params.query)
        break
      case 'delete':
        resource.delete(params.key)
        break

      default:
        throw ApifyError.invalidRequest('Unsupported request method')
        break
    }

    return {
      status: resource.status,
      result: { data }
    }
  }

  /**
   * @memberof Resource
   * @param {Object} [query = {}]
   * @return {Object}
   * @throws {ApifyError}
   */
  index (query = {}) {
    return this.model
  }

  /**
   * @memberof Resource
   * @param {Object} input
   * @param {Object} [query = {}]
   * @return {Object}
   * @throws {ApifyError}
   */
  store (input, query = {}) {
    const old = this.model.slice(0)
    let data = {}

    for (let field in input) {
      data[field] = input[field]
    }

    this.model.push(data)
    if (this.model.length > old.length) {
      this.status = 201
    }
    return data
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @param {Object} [query = {}]
   * @return {Object}
   * @throws {ApifyError}
   */
  edit (id, query = {}) {
    return this.find(id)
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @param {Object} input
   * @param {Object} [query = {}]
   * @return {Object}
   * @throws {ApifyError}
   */
  update (id, input, query = {}) {
    const data = this.find(id)

    let changed = false
    for (let field in Object.assign({}, data)) {
      if (!input[field] || data[field] === input[field]) continue

      changed = true
      data[field] = input[field]
    }

    if (!changed) {
      this.status = 304
    }

    return data
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @param {Object} query
   * @return {Object}
   * @throws {ApifyError}
   */
  delete (id, query = {}) {
    const old = this.model.slice(0)
    const data = this.model.filter(r => r.id !== id)

    this.status = data.length < old.length ? 204 : 304

    return null
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @return {Object}
   * @throws {ApifyError}
   * @access private
   */
  find (id) {
    const data = this.model.find(row => row.id == id)

    if (!data) {
      throw ApifyError.notFound()
    }

    return data
  }
}

/**
 * @class RequestParser
 * @property {Array} paths
 * @property {String} method
 * @property {any} body
 * @property {Object} query
 */
class RequestParser {
  /**
   * Creates an instance of RequestParser.
   *
   * @param {String} url
   * @param {String} method
   * @param {String} body
   * @memberof RequestParser
   */
  constructor (url, method, body) {
    const uri = require('url').parse(url, true)
    this.paths = uri.pathname.slice(1).split('/').filter(p => p)

    if (this.paths.length < 3) {
      throw ApifyError.invalidRequest(
        'Invalid parameters, url must contain `/:user/:repo/:table` parameter'
      )
    }

    this.method = method.toLowerCase()
    this.body = body
    this.query = uri.query
  }

  /**
   * Parse incoming request
   *
   * @static
   * @memberof RequestParser
   * @param {http.IncomingMessage} req
   * @return {RequestParser}
   */
  static async parse (req) {
    const chunks = []
    const type = req.headers['content-type']

    let body = await promisify(done => {
      req.on('error', (err) => {
        done(err)
      })

      req.on('data', (chunk) => {
        chunks.push(chunk)
      })

      req.on('end', () => {
        done(null, Buffer.concat(chunks).toString())
      })
    })

    if (type === 'application/x-www-form-urlencoded') {
      body = require('querystring').parse(body)
    } else if (type === 'application/json') {
      body = JSON.parse(body)
    } else {
      throw ApifyError.invalidRequest(
        'Unsupported request `Content-Type`'
      )
    }

    return new RequestParser(req.url, req.method, body)
  }

  /**
   * Get repo username
   *
   * @readonly
   * @memberof RequestParser
   * @return {String}
   */
  get user () {
    return this.paths[0]
  }

  /**
   * Get repo name
   *
   * @readonly
   * @memberof RequestParser
   * @return {String}
   */
  get repo () {
    return this.paths[1]
  }

  /**
   * Get resource name
   *
   * @readonly
   * @memberof RequestParser
   * @return {String}
   */
  get resource () {
    return this.paths[2]
  }

  /**
   * Get resource key
   *
   * @readonly
   * @memberof RequestParser
   * @return {Number|String|null}
   */
  get key () {
    const key = this.paths[3]

    if (key) {
      return /^(\d)+$/.test(key) ? parseInt(key) : key
    }

    return null
  }

  /**
   * Get request type
   *
   * @readonly
   * @memberof RequestParser
   * @return {String|null}
   */
  get type () {
    if (this.method === 'get' && this.key === null) {
      return 'index'
    } else if (this.method === 'post' && this.key === null) {
      return 'store'
    } else if (this.method === 'get' && typeof this.key === 'number') {
      return 'edit'
    } else if (this.method === 'put' && typeof this.key === 'number') {
      return 'update'
    } else if (this.method === 'delete' && typeof this.key === 'number') {
      return 'delete'
    } else {
      return null
    }
  }
}

/**
 * @class ApifyError
 * @extends {Error}
 * @property {Number} status
 */
class ApifyError extends Error {
  constructor (status, message) {
    super(message)
    this.status = status
  }

  /**
   * @static
   * @param {string} [message='Resource not found']
   * @return {ApifyError}
   * @memberof ApifyError
   */
  static notFound (message = 'Resource not found') {
    return new ApifyError(404, message)
  }

  /**
   * @static
   * @param {string} [message='Invalid parameters']
   * @return {ApifyError}
   * @memberof ApifyError
   */
  static invalidRequest (message = 'Invalid parameters') {
    return new ApifyError(400, message)
  }
}

/**
 * @param {Function} cb
 * @return {any}
 * @async
 */
function promisify (cb) {
  return new Promise((resolve, reject) => {
    cb((err, data) => {
      if (err) return reject(err)

      return resolve(data || true)
    })
  })
}

module.exports = {
  Resource,
  RequestParser,
  ApifyError
}
