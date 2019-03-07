const { send, json } = require('micro')
const axios = require('axios')

const connections = {}
const caches = []
const migrations = {}
const dryrun = !!process.env.DRY

/**
 * @async
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
module.exports = async (req, res) => {
  const paths = req.url.slice(1).split('/').filter(p => p)

  if (paths.length < 3) {
    return send(res, 400, {
      errors: 'Invalid parameters, url must contain `/:user/:repo/:table` parameter'
    })
  }

  const [user, repo, table, ...segments] = paths

  try {
    const db = await getDatabase(user, repo)
    const models = migrations[db.name]

    let data, input = {}
    let status = 200
    const method = req.method.toLowerCase()

    if (['post', 'put'].includes(method)) {
      input = await getInput(req)
    }

    if (!db.tables.includes(table)) {
      throw ApifyError.notFound()
    }

    const model = db.seeds[table].slice(0)

    if (method === 'get' && segments.length === 0) {
      data = model
    } else if (method === 'post' && segments.length === 0) {
      data = model.push(input)
    } else if (method === 'get' && segments.length === 1) {
      data = model.find(row => row.id == segments[0])

      if (!data) {
        throw ApifyError.notFound()
      }
    } else if (method === 'put' && segments.length === 1) {
      data = model.find(row => row.id == segments[0])

      if (!data) {
        throw ApifyError.notFound()
      }

      let changed = false
      for (let field in data) {
        if (data[field] == input[field] || !input[field]) continue

        changed = true
        data[field] = input[field]
      }

      status = changed ? 200 : 304
    } else if (method === 'delete' && segments.length === 1) {
      data = model.find(row => row.id == segments[0])

      if (!data) {
        throw ApifyError.notFound()
      }

      const kept = model.slice(0).filter(row => row.id !== segments[0])
      status = 304
      if (kept.length < model.length) {
        status = 204
        data = undefined
      }
    } else {
      throw ApifyError.invalidRequest()
    }

    return send(res, status, { data })
  } catch (err) {
    return send(res, err.status, {
      errors: err.message,
    })
  }
}

/**
 * @async
 * @param {http.IncomingMessage} req
 * @return {Object}
 */
function getInput (req) {
  const chunks = []
  const type = req.headers['content-type']

  return promisify(done => {
    req.on('error', (err) => {
      done(err)
    })

    req.on('data', (chunk) => {
      chunks.push(chunk)
    })

    req.on('end', () => {
      let body = Buffer.concat(chunks).toString()

      if (type === 'application/x-www-form-urlencoded') {
        body = require('querystring').parse(body)
      }

      done(null, body)
    })
  })
}

/**
 * @async
 * @param {String} user
 * @param {String} repo
 * @return {{user: {String}, repo: {String}, name: {String}, definition: {String}}}
 */
async function getDatabase(user, repo) {
  const cached = caches.find(c => {
    return c.user === user && c.repo === repo && !!c.schemas
  })

  if (cached) return cached

  const result = { user, repo, name: `${user}-${repo}.db` }

  if (dryrun) {
    if (user !== 'feryardiant' && repo !== 'apify') {
      throw ApifyError.notFound()
    }

    result.database = require('./db.json')
  } else {
    const { existsSync, writeFileSync } = require('fs')
    result.cached = `./${user}-${repo}.json`

    if (existsSync(result.cached)) {
      result.database = require(result.cached)
    } else {
      try {
        const repoUrl = `https://api.github.com/repos/${user}/${repo}/contents/db.json`
        const { data: res, status } = await axios.get(repoUrl)

        result.database = Buffer.from(res.content, res.encoding).toString()

        writeFileSync(result.cached, result.database)
      } catch ({ response }) {
        if (response.status === 404) {
          throw ApifyError.notFound()
        }

        throw new ApifyError(response.status, response.message)
      }
    }
  }

  return normalizeResult(result)
}

function normalizeResult(result) {
  const schemas = {}
  const seeds = {}
  const relations = {}
  let database = Object.assign({}, result.database)
  let tables = Object.keys(database)

  tables.forEach(table => {
    let attrs = Array.isArray(database[table])
      ? database[table][0]
      : database[table]

    attrs = Object.assign({}, attrs)
    schemas[table] = {}
    seeds[table] = []

    Object.entries(attrs).forEach(([field, value]) => {
      let isArr = Array.isArray(value)

      if (/_id$/.test(field)) {
        field = field.replace(/_id$/, '')
        value = result.database[field].find(r => r.id === value) || {}
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

        seeds[parent] = seeds[parent] || []
        seeds[child] = seeds[child] || []
        relations[parent] = relations[parent] || []
        relations[child] = relations[child] || []
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
      } else if (/^(\d)+$/.test(value)) {
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
            val.id = seeds[field].length + 1
            val[rel] = row.id
            seeds[field].push(val)
          })
          continue
        }

        if (isObject(value) && tables.includes(field)) {
          let { rel } = relation.find(r => r.parent === field)
          let parent = seeds[field].find(p => {
            for (let f in value) {
              if (p[f] !== value[f]) return false
            }
            return true
          })

          if (parent) {
            seed[rel] = parent.id
          } else {
            value.id = seeds[field].length + 1
            seed[rel] = value.id
            seeds[field].push(value)
          }
          continue
        }

        seed[field] = value
      }

      seeds[table].push(seed)
    }
  })

  result.relations = relations
  result.schemas = schemas
  result.seeds = seeds
  result.tables = tables

  // caches.push(result)

  return result
}

function resolvePath (...paths) {
  const { openSync, closeSync } = require('fs')
  const { resolve } = require('path')

  const filepath = resolve(...paths)

  try {
    closeSync(openSync(filepath, 'a'))
  } catch (err) {
    console.error(err)
  }

  return filepath
}

function isObject (value) {
  return value !== null && value.constructor.name === 'Object'
}

function promisify (cb) {
  return new Promise((resolve, reject) => {
    cb((err, data) => {
      if (err) return reject(err)

      return resolve(data || true)
    })
  })
}

class ApifyError extends Error {
  constructor (status, message) {
    super(message)
    this.status = status
  }

  static notFound (message = 'Resource not found') {
    return new ApifyError(404, message)
  }

  static invalidRequest (message) {
    return new ApifyError(400, message)
  }
}
