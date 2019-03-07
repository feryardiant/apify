const { send } = require('micro')
const axios = require('axios')

const { Resource, RequestParser, ApifyError } = require('./lib')
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
  try {
    const params = await RequestParser.parse(req)
    const db = await getDatabase(params.user, params.repo)

    if (!db.tables.includes(params.resource)) {
      throw ApifyError.notFound()
    }
    const { result, status } = Resource.handle(db.seeds, params)

    return send(res, status, result)
  } catch (err) {
    return send(res, err.status, {
      errors: err.message,
    })
  }
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

        seeds[table] = seeds[table] || []
        seeds[field] = seeds[field] || []
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

/**
 * @param {any} value
 * @return {Boolean}
 */
function isObject (value) {
  return value !== null && value.constructor.name === 'Object'
}
