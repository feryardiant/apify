const { URL } = require('url')
const qs = require('qs')

const RequestParams = require('./params')
const Repository = require('./repository')
const { invalidRequest } = require('./api-error')
const { isObject, isNumber, capitalize, promisify } = require('./util')

/**
 * Parse incoming request
 *
 * @param {IncomingMessage} req
 * @return {RequestParams}
 */
exports.parseParam = async (req) => {
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
    const type = req.headers['content-type'].split(';').shift()
    const types = [
      'application/x-www-form-urlencoded',
      'application/json'
    ]

    if (type && !types.includes(type)) {
      throw invalidRequest(`Invalid Request: 'Content-Type: ${type}' is not supported`)
    }

    if (type === 'application/x-www-form-urlencoded') {
      body = qs.parse(body)
    } else {
      body = JSON.parse(body)
    }
  }

  const url = new URL(req.url, 'http://example.com')
  const method = req.method === 'OPTIONS'
    ? req.headers['access-control-request-method']
    : req.method

  return new RequestParams(url, method, body)
}


/**
 * @param {Object} words
 * @return {Object.<string, Repository>}
 */
exports.normalize = (rawData) => {
  const repo = {}
  let database = Object.assign({}, rawData)

  Object.keys(database).forEach(table => {
    let attributes = Object.assign({}, database[table][0])

    repo[table] = initRepository(table)

    Object.entries(attributes).forEach(([field, value]) => {
      let isArray = Array.isArray(value)

      if (/_id$/.test(field)) {
        field = field.replace(/_id$/, '')
        value = database[field].find(r => r.id === value) || {}
      }

      if (isArray || isObject(value)) {
        const parent = isArray ? table : field
        const child = isArray ? field : table
        const related = `${parent}_id`

        value = Object.assign({}, (isArray ? value[0] : value))
        value.id = value.id || 0

        repo[field] = repo[field] || initRepository(field)
        repo[field].attributes = value
        repo[child].attributes[related] = 0

        repo[field].attributes = defineAttribute(repo[field].attributes)
        repo[parent].relations.push({ child, related })
        repo[child].relations.push({ parent, related })

        delete attributes[field]

        return
      }

      attributes[field] = value
    })

    attributes = Object.assign({}, (repo[table].attributes || {}), attributes)
    repo[table].attributes = defineAttribute(attributes)
  })

  Object.values(repo).forEach(({ table, data, relations, ...res }) => {
    repo[table].update_timestamp = res.attributes.hasOwnProperty('updated_at')
    repo[table].create_timestamp = res.attributes.hasOwnProperty('created_at')
    repo[table].soft_deletes = res.attributes.hasOwnProperty('deleted_at')
    repo[table].timestamps = repo[table].update_timestamp && repo[table].create_timestamp

    for (let row of (database[table] || []).slice(0)) {
      let seed = {}

      for (let [key, value] of Object.entries(row)) {
        if (Array.isArray(value) && repo.hasOwnProperty(key)) {
          let { related } = relations.find(rel => rel.child === key)
          value.forEach(val => {
            val.id = repo[key].data.length + 1
            val[related] = row.id
            repo[key].data.push(val)
          })
          continue
        }

        if (isObject(value) && repo.hasOwnProperty(key)) {
          let { related } = relations.find(rel => rel.parent === key)
          let exists = repo[key].data.find(parent => {
            for (let field in value) {
              if (parent[field] !== value[field]) return false
            }
            return true
          })

          if (exists) {
            seed[related] = exists.id
          } else {
            value.id = value.id || (repo[key].data.length + 1)
            seed[related] = value.id
            repo[key].data.push(value)
          }
          continue
        }

        seed[key] = value
      }

      data.push(seed)
    }
  })

  return repo
}


/**
 * @param {String} table
 * @param {String} [primary='id']
 * @return {Repository}
 */
function initRepository (table, primary = 'id') {
  return new Repository({
    data: [],
    table,
    primary,
    attributes: {},
    relations: [],
  })
}

/**
 * @param {Object} fields
 * @return {Object.<String, RepositoryAttribute>}
 */
function defineAttribute (fields) {
  const attributes = {}
  const imageKeys = ['thumbnail', 'image', 'avatar']

  for (let [key, value] of Object.entries(fields)) {
    const attribute = {
      key,
      label: capitalize(key),
      sortable: true,
      visible: true
    }

    if (key === 'id') {
      attribute.type = 'number'
      attribute.primary = true
    } else if (/_at$/.test(key)) {
      attribute.type = 'timestamp'
      if (key !== 'updated_at') {
        attribute.visible = false
      }
    } else if (isNumber(value)) {
      attribute.type = key === 'price' ? 'currency' : 'number'
    } else if (typeof value === 'boolean') {
      attribute.type = 'boolean'
      attribute.sortable = false
    } else if (imageKeys.includes(key)) {
      attribute.type = 'image'
      attribute.sortable = false
    } else {
      if (['contents', 'slug'].includes(key)) {
        attribute.visible = false
      }
      attribute.type = 'text'
    }

    attributes[key] = attribute
  }

  return attributes
}
