/**
 * @class Resource
 */
class Resource {
  /**
   * @memberof Resource
   * @param {Array} model
   * @param {Object} model
   */
  constructor (model, schema = {}) {
    this.status = 200
    this.schema = Object.assign({}, schema)
    this.model = model.slice(0)
  }

  /**
   * @readonly
   * @memberof Resource
   * @return {Boolean}
   */
  get hasTimestamps () {
    return this.hasCreateTimestamp || this.hasUpdateTimestamp
  }

  /**
   * @readonly
   * @memberof Resource
   * @return {Boolean}
   */
  get hasUpdateTimestamp () {
    return this.schema.hasOwnProperty('updated_at')
  }

  /**
   * @readonly
   * @memberof Resource
   * @return {Boolean}
   */
  get hasCreateTimestamp () {
    return this.schema.hasOwnProperty('created_at')
  }

  /**
   * @readonly
   * @memberof Resource
   * @return {Boolean}
   */
  get isSoftDelete () {
    return this.schema.hasOwnProperty('deleted_at')
  }

  /**
   * Get model copy
   *
   * @readonly
   * @memberof Resource
   * @return {Array}
   */
  get copy () {
    return (this.model || []).slice(0)
  }

  /**
   * @readonly
   * @memberof Resource
   * @return {String}
   */
  get primaryKey () {
    let primary
    for (let field in this.schema) {
      if (this.schema[field].key === true) {
        primary = field
        break
      }
    }
    return primary
  }

  /**
   * @memberof Resource
   * @param {Object} [input = {}]
   * @return {Object}
   * @throws {ApifyError}
   */
  index ({ page = 1, perPage = 15, ...input } = {}) {
    let model = this.copy

    if (this.isSoftDelete) {
      model = model.filter(row => {
        if (input.deleted) {
          return row.deleted_at !== null
        } else {
          return row.deleted_at === null
        }
      })
    }

    model.sort(this.sortBy(
      input.sortBy || this.primaryKey,
      input.sortDirection || 'desc'
    ))

    if (page < 0 || perPage < 0) {
      return this.serialize(model, {
        page: 0,
        perPage: 0,
        total: model.length
      })
    }

    const start = perPage * (page - 1)
    const sliced = model.slice(start, (perPage * page))

    return this.serialize(sliced, { page, perPage, total: model.length })
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @param {Object} [input = {}]
   * @return {Object}
   * @throws {ApifyError}
   */
  show (id, input = {}) {
    const data = this.find(id)

    return this.serialize(data)
  }

  /**
   * @memberof Resource
   * @param {Object} input
   * @return {Object}
   * @throws {ApifyError}
   */
  store (input) {
    const old = this.copy
    let data = {}

    for (let field in this.schema) {
      data[field] = input[field]
    }
    data.id = old.length + 1

    this.model.push(data)
    if (this.model.length > old.length) {
      this.status = 201

      this.timestamp('created', data)
    }

    return this.serialize(data)
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @param {Object} input
   * @return {Object}
   * @throws {ApifyError}
   */
  update (id, input) {
    const data = this.find(id)

    let changed = false
    for (let field in this.schema) {
      if (!input[field] || data[field] == input[field]) continue

      changed = true
      data[field] = input[field]
    }

    if (changed) {
      this.timestamp('updated', data)
    } else {
      this.status = 304
    }

    return this.serialize(data)
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @return {Object}
   * @throws {ApifyError}
   */
  delete (id) {
    const data = this.find(id)
    const old = this.copy
    let deleted = false

    if (!this.timestamp('deteled', data)) {
      this.model = this.model.filter(r => r.id !== data.id)
      deleted = this.model.length < old.length
    }

    this.status = deleted ? 204 : 304

    return null
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @return {Object}
   * @throws {ApifyError}
   */
  find (id) {
    const data = this.copy.find(row => row.id == id)

    if (!data) {
      throw ApifyError.notFound()
    }

    return data
  }

  /**
   * @access private
   * @memberof Resource
   * @param {Object} data
   * @param {Object} [meta={}]
   * @return {{data: {Object}}}
   */
  serialize (data, meta = {}) {
    if (Array.isArray(data)) {
      if (meta.total === 0) {
        this.status = 404
      }
    }

    meta = Object.assign({}, meta, {
      primary: this.primaryKey,
      softDelete: this.isSoftDelete,
      timestamps: this.hasTimestamps,
      field: this.schema
    })

    return {
      data,
      meta
    }
  }

  /**
   * @access private
   * @memberof Resource
   * @param {Object} data
   * @param {string} field
   * @return {Boolean}
   */
  isValid (input, field) {
    const { type } = this.schema[field]

    if (input[field]) {
      if (type === 'date' && (Date.parse(input[field]) + 1) > 0) return true

      if (typeof input[field] === type) return true

      throw ApifyError.invalidRequest('Validation Error')
    }

    return true
  }

  /**
   * Update timestamp
   *
   * @memberof Resource
   * @param {String} event Timestamp event either: created, updated or deleted
   * @param {Object} [data={}] Data object
   * @return {Boolean}
   */
  timestamp(event, data = {}) {
    const stamp = new Date().toString()

    if (event === 'created' && this.hasCreateTimestamp) {
      data.created_at = stamp
      if (this.hasUpdateTimestamp) {
        data.updated_at = stamp
      }
      return true
    }

    if (event === 'updated' && this.hasUpdateTimestamp) {
      data.updated_at = stamp
      return true
    }

    if (event === 'deleted' && this.isSoftDelete) {
      const deleted = data.deleted_at !== null

      if (!deleted) {
        data.deleted_at = stamp
        return true
      }
    }

    return false
  }

  sortBy(field, order = 'desc') {
    const { type } = this.schema[field]
    const { compareAsc, compareDesc } = require('date-fns')
    const compare = order === 'asc' ? compareAsc : compareDesc

    return (a, b) => {
      if (type === 'date') {
        return compare(a[field], b[field])
      }

      if (type === 'text') {
        a = a[field].toUpperCase()
        b = b[field].toUpperCase()
        let c = 0
        if (a > b) {
          c = 1
        }
        if (a < b) {
          c = -1
        }
        return order === 'desc' ? (c * -1) : c
      }

      a = parseInt(a[field])
      b = parseInt(b[field])

      return order === 'desc' ? a - b : b - a
    }
  }
}

class Database {
  /**
   * @memberof Database
   * @param {String} user
   * @param {String} repo
   * @param {String} resource
   */
  constructor (user, repo, resource) {
    const { tmpdir } = require('os')
    const { resolve } = require('path')

    this.user = user
    this.repo = repo
    this.resource = resource
    this.rawData = {}
    this.cacheFile = resolve(tmpdir(), `apify-${user}-${repo}.json`)
  }

  /**
   * @readonly
   * @memberof Database
   * @return {Boolean}
   */
  get isSelf () {
    return this.user === 'feryardiant' && this.repo === 'apify'
  }

  /**
   * @readonly
   * @memberof Database
   * @return {{schemas: {Object}, rows: {Array}}}
   */
  get model () {
    if (!this.tables.includes(this.resource)) {
      throw ApifyError.notFound()
    }

    return {
      schemas: this.schemas[this.resource],
      rows: this.rows[this.resource]
    }
  }

  /**
   * @async
   * @memberof Database
   * @return {Object}
   * @throws {ApifyError}
   */
  async fetch () {
    const axios = require('axios')

    try {
      const { data } = await axios.get(`/${this.user}/${this.repo}/contents/db.json`, {
        baseURL: 'https://api.github.com/repos'
      })

      return Buffer.from(data.content, data.encoding).toString()
    } catch ({ response, message }) {
      if (response.status === 404) {
        throw ApifyError.notFound()
      }
      throw new ApifyError(response.status, message)
    }
  }

  async initialize (dryRun = this.isSelf, isDev = false) {
    if (dryRun) {
      this.rawData = require('./db.json')
    } else {
      const { existsSync, writeFileSync } = require('fs')

      if (existsSync(this.cacheFile)) {
        this.rawData = require(this.cacheFile)
      } else {
        this.rawData = await this.fetch()

        if (!isDev) {
          writeFileSync(this.cacheFile, this.rawData)
        }
      }
    }

    this.normalize()
  }

  normalize () {
    const schemas = {}
    const rows = {}
    const relations = {}
    let database = Object.assign({}, this.rawData)
    let tables = Object.keys(database)

    tables.forEach(table => {
      let attrs = Object.assign({}, database[table][0])

      schemas[table] = {}
      rows[table] = []

      Object.entries(attrs).forEach(([field, value]) => {
        let isArr = Array.isArray(value)

        if (/_id$/.test(field)) {
          field = field.replace(/_id$/, '')
          value = database[field].find(r => r.id === value) || {}
        }

        if (isArr || isObject(value)) {
          const parent = isArr ? table : field
          const child = isArr ? field : table
          const rel = `${parent}_id`

          if (!tables.includes(field)) {
            tables.push(field)
          }

          value = Object.assign({}, (isArr ? value[0] : value))
          value.id = value.id || 0

          if (isArr) {
            value[rel] = 0
          } else {
            schemas[table][rel] = 0
          }

          delete attrs[field]
          schemas[field] = value

          rows[table] = rows[table] || []
          rows[field] = rows[field] || []
          relations[table] = relations[table] || []
          relations[field] = relations[field] || []
          relations[parent].push({ child, rel })
          relations[child].push({ parent, rel })
          return
        }

        attrs[field] = value
      })

      schemas[table] = Object.assign({}, (schemas[table] || {}), attrs)
    })

    tables.forEach(table => {
      for (let [field, value] of Object.entries(schemas[table])) {
        if (field === 'id') {
          schemas[table][field] = { type: 'number', key: true }
        } else if (/_at$/.test(field)) {
          schemas[table][field] = { type: 'date', time: true }
        } else if (isNumbering(value)) {
          schemas[table][field] = { type: 'number' }
        } else {
          schemas[table][field] = { type: 'text' }
        }
      }

      const relation = relations[table].slice(0)

      for (let row of (database[table] || []).slice(0)) {
        let seed = {}

        for (let [field, value] of Object.entries(row)) {
          if (Array.isArray(value) && tables.includes(field)) {
            let { rel } = relation.find(r => r.child === field)
            value.forEach((val, i) => {
              val.id = rows[field].length + 1
              val[rel] = row.id
              rows[field].push(val)
            })
            continue
          }

          if (isObject(value) && tables.includes(field)) {
            let { rel } = relation.find(r => r.parent === field)
            let parent = rows[field].find(p => {
              for (let f in value) {
                if (p[f] !== value[f]) return false
              }
              return true
            })

            if (parent) {
              seed[rel] = parent.id
            } else {
              value.id = rows[field].length + 1
              seed[rel] = value.id
              rows[field].push(value)
            }
            continue
          }

          seed[field] = value
        }

        rows[table].push(seed)
      }
    })

    this.relations = relations
    this.schemas = schemas
    this.rows = rows
    this.tables = tables
  }
}

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
   * @param {String} url
   * @param {String} [method='GET']
   * @param {Object} [body={}]
   */
  constructor (url, method = 'GET', body = {}) {
    const uri = require('url').parse(url, true)
    this.paths = uri.pathname.slice(1).split('/').filter(p => p)

    if (this.paths.length < 3) {
      throw ApifyError.invalidRequest(
        'Invalid parameters, url must contain `/:user/:repo/:table` parameter'
      )
    }

    this.method = method.toLowerCase()
    this.rawInput = Object.assign({}, body, uri.query)
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
   * Parse incoming request
   *
   * @static
   * @memberof RequestParams
   * @param {http.IncomingMessage} req
   * @return {RequestParams}
   */
  static async parse (req) {
    const type = req.headers['content-type']

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

    if (body) {
      if (type === 'application/x-www-form-urlencoded') {
        body = require('querystring').parse(body)
      } else if (type !== 'application/json') {
        throw ApifyError.invalidRequest(
          'Unsupported request `Content-Type`'
        )
      }
    }

    return new RequestParams(req.url, req.method, body)
  }

  /**
   * Get repo username
   *
   * @readonly
   * @memberof RequestParams
   * @return {String}
   */
  get user () {
    return this.paths[0]
  }

  /**
   * Get repo name
   *
   * @readonly
   * @memberof RequestParams
   * @return {String}
   */
  get repo () {
    return this.paths[1]
  }

  /**
   * Get resource name
   *
   * @readonly
   * @memberof RequestParams
   * @return {String}
   */
  get resource () {
    return this.paths[2]
  }

  /**
   * Get resource key
   *
   * @readonly
   * @memberof RequestParams
   * @return {Number|String|null}
   */
  get key () {
    const key = this.paths[3]

    if (key) {
      return isNumbering(key) ? parseInt(key) : key
    }

    return null
  }

  /**
   * Get request type
   *
   * @readonly
   * @memberof RequestParams
   * @return {String|null}
   */
  get type () {
    if (this.is('get') && this.key === null) {
      return 'index'
    } else if (this.is('get') && this.key === 'create') {
      return 'create'
    } else if (this.is('post') && this.key === null) {
      return 'store'
    } else if (this.is('get') && typeof this.key === 'number') {
      return 'show'
    } else if (this.is('put') && typeof this.key === 'number') {
      return 'update'
    } else if (this.is('delete') && typeof this.key === 'number') {
      return 'delete'
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
 * @class ApifyError
 * @extends {Error}
 * @property {Number} status
 */
class ApifyError extends Error {
  /**
   * @param {Number} status
   * @param {String} message
   * @param {Array} [errors=[]]
   * @memberof ApifyError
   */
  constructor (status, message, errors) {
    super(message)
    this.status = status
    this.errors = errors
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
      return resolve(data)
    })
  })
}

/**
 * @param {any} value
 * @return {Boolean}
 */
function isObject (value) {
  return value !== null && value.constructor.name === 'Object'
}

function isNumbering (value) {
  return /^(\d)+$/.test(value)
}

module.exports = {
  ApifyError,
  Database,
  RequestParams,
  Resource
}
