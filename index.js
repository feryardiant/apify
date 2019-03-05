const { send, json } = require('micro')
const axios = require('axios')
const { openSync, closeSync } = require('fs')

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
  let db, status, data, input = {}

  try {
    db = await getDatabase(user, repo)
  } catch (err) {
    const status = err.response && err.response.status
    return send(res, status || 500, {
      errors: status === 404
        ? 'Repository doen\'t exists or doesn\'t have db.json file'
        : err.message
    })
  }

  try {
    const conn = await connect(db.name)

    if (!migrations[db.name]) {
      migrations[db.name] = await migrate(conn, db)
    }
  } catch (err) {
    console.error(err)
    return send(res, 500, {
      errors: err.message,
      // schemas: db.schemas,
      // seeds: db.seeds,
    })
  }

  const models = migrations[db.name]

  status = 200
  const method = req.method.toLowerCase()
  if (['post', 'put'].includes(method)) {
    input = await getInput(req)
  }

  try {
    if (!models[table]) {
      status = 404
      throw new Error('No resource found')
    }

    data = await promisify(done => {
      if (method === 'get' && segments.length === 0) {
        models[table].find(done)
      } else if (method === 'post' && segments.length === 0) {
        models[table].create(input, done)
      } else if (method === 'get' && segments.length === 1) {
        models[table].get(segments[0], done)
      } else if (method === 'put' && segments.length === 1) {
        models[table].get(segments[0], (err, model) => {
          if (err) return done(err)

          for (let field of Object.keys(input)) {
            if (model[field] === input[field] || !input[field]) continue

            model[field] = input[field]
          }

          model.save(done)
        })
      } else if (method === 'delete' && segments.length === 1) {
        models[table].get(segments[0], (err, model) => {
          if (err) return done(err)

          model.remove(done)
        })
      } else {
        done(new Error('Unsupported method'))
      }
    })
  } catch (err) {
    console.error(err, models)
    status = err.code === 'SQLITE_ERROR' ? 500 : status
    return send(res, status, {
      errors: err.message,
      tables: db.tables,
      schemas: db.schemas,
      seeds: db.seeds,
    })
  }

  return send(res, status, { data })
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
 * @param {String} database
 * @return {ORM}
 */
async function connect (database) {
  if (!connections[database]) {
    const { tmpdir } = require('os')
    const { join } = require('path')
    const orm = require('orm')

    database = join(tmpdir(), database)
    closeSync(openSync(database, 'a+'))

    connections[database] = await promisify(done => {
      orm.connect({ pathname: database, protocol: 'sqlite'}, done)
    })
  }

  return connections[database]
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
    result.database = require('./db.json')
  } else {
    const repoUrl = `https://api.github.com/repos/${user}/${repo}/contents/db.json`
    const { data: res, status } = await axios.get(repoUrl)

    if (status === 200 && !!res.content) {
      result.database = Buffer.from(res.content, res.encoding).toString()
    }
  }

  return normalizeResult(result)
}

function normalizeResult(result) {
  const schemas = {}
  const seeds = {}
  const relation = {}
  const clones = Object.create(result.database)
  const tables = Object.keys(clones)

  for (let table of tables) {
    const fields = Array.isArray(clones[table])
      ? clones[table][0]
      : clones[table]

    if (!fields.hasOwnProperty('id')) {
      fields.id = 0
    }
    schemas[table] = {}

    for (let field of Object.keys(fields)) {
      const value = fields[field]
      const isArray = Array.isArray(value)

      if (isArray || isObject(value)) {
        const parent = isArray ? table : field
        const child = isArray ? field : table
        const rel = `${parent}_id`

        if (!tables.includes(child)) {
          tables.push(child)
        }
        if (!clones.hasOwnProperty(child)) {
          clones[child] = []
        }
        if (!relation.hasOwnProperty(parent)) {
          relation[parent] = []
        }

        if (isArray) {
          value[0][rel] = 0
          clones[child].push(value[0])
        } else {
          // value[rel] = 0
          // schemas[parent] = value
          clones[child][0][rel] = 0
        }

        relation[parent].push({ child, rel })

        continue
      }

      // if (/_id$/.test(field)) {
      //   let related = field.replace(/_id$/, '')
      //   if (!relation.hasOwnProperty(related)) {
      //     relation[related] = []
      //   }
      //   relation[related].push(table)
      // }

      schemas[table][field] = getFieldAttr(field, value)
    }
  }

  for (let table of tables) {
    seeds[table] = []
    // seeds[table] = clones[table].map(values => {
    //   for (let { child, rel } of (relation[table] || [])) {
    //     // const parent =
    //     if (clones[child]) {
    //       clones[child] = clones[child].length > 1 ? clones[child] : []
    //       if (Array.isArray(values[child])) {
    //         values[child].map((val, i) => {
    //           val.id = clones[child].length + i + 1
    //           val[rel] = values.id
    //           return val
    //         })
    //         clones[child].push(...values[child])
    //       } else {
    //         values[rel] = values[child].id
    //         clones[child].push(values[child])
    //       }
    //       delete values[child]
    //     }
    //   }

    //   return values
    // })
  }

  result.schemas = schemas
  result.seeds = seeds
  result.tables = tables

  caches.push(result)

  return result
}

function isObject (value) {
  return value !== null && value.constructor.name === 'Object'
}

async function migrate (db, { tables = [], schemas = {}, seeds = {} } = {}) {
  const models = {}

  for (const table of tables) {
    const model = db.define(table, schemas[table])
    const exists = await model.existsAsync()

    await model.syncPromise()

    if (exists && seeds[table].length > 0) {
      model.createAsync(seeds[table])
      console.info(table, 'created')
    }

    models[table] = model
  }

  return models
}

function getFieldAttr (field, value) {
  const attrs = {
    type: 'text'
  }

  if (field === 'id') {
    attrs.type = 'number'
    attrs.primary = true
  } else if (/_at$/.test(field)) {
    attrs.type = 'date'
    if (parseInt(Date.parse(value).toString().slice(8)) > 0) {
      attrs.time = true
    }
  } else if (/^(\d)+$/.test(value)) {
    attrs.type = 'integer'
  }

  return attrs
}

function promisify (cb) {
  return new Promise((resolve, reject) => {
    cb((err, data) => {
      if (err) return reject(err)

      return resolve(data || true)
    })
  })
}
