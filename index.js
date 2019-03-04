const { send, json } = require('micro')
const orm = require('orm')
const axios = require('axios')
const { openSync, closeSync } = require('fs')

const connections = {}
const caches = []
const migrations = {}

/**
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
module.exports = async (req, res) => {
  const paths = req.url.slice(1).split('/').filter(p => p)

  if (paths.length < 2) {
    return send(res, 400, {
      errors: 'Invalid parameters'
    })
  }

  const [user, repo, table, ...segments] = paths
  let db, status, data, input = {}

  try {
    db = await getDatabase(user, repo)
  } catch (err) {
    console.error(err)
    return send(res, err.response.status, {
      errors: err.message
    })
  }

  const conn = await connect(db.name)

  if (!migrations[db.name]) {
    migrations[db.name] = await migrate(conn, db.definition)
  }

  const models = migrations[db.name]

  if (!table || !models) {
    console.log(models)
    return []
  }

  status = 200
  const method = req.method.toLowerCase()
  if (['post', 'put'].includes(method)) {
    input = await getInput(req)
  }

  try {
    if (!models[table]) {
      status = 404
      throw new Error('Not found')
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
    console.err(err)
    data = null
  }

  return send(res, status, { data })
}

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
 * @param {String} database
 * @return {ORM}
 */
async function connect (database) {
  if (!connections[database]) {
    const { tmpdir } = require('os')
    const { join } = require('path')

    database = join(tmpdir(), database)
    closeSync(openSync(database, 'a+'))

    connections[database] = await promisify(done => {
      orm.connect({ pathname: database, protocol: 'sqlite'}, done)
    })
  }

  return connections[database]
}

/**
 * @param {String} user
 * @param {String} repo
 * @return {{user: {String}, repo: {String}, name: {String}, definition: {String}}}
 */
async function getDatabase(user, repo) {
  const cached = caches.find(c => {
    return c.user === user && c.repo === repo && !!c.definition
  })

  if (cached) return cached

  const result = { user, repo, name: `${user}-${repo}.db` }

  if (process.env.DRY) {
    result.definition = require('./db.json')

    return result
  }

  const { data: res, status } = await axios.get(`https://api.github.com/repos/${user}/${repo}/contents/db.json`)

  if (status === 200 && !!res.download_url) {
    const { data } = await axios.get(res.download_url)
    result.definition = data
    caches.push(result)
  }

  return result
}

async function migrate (db, data) {
  const models = {}
  const tables = Object.keys(data)

  for (const table of tables) {
    const obj = Array.isArray(data[table]) ? data[table][0] : data[table]
    const fields = {}

    for (const field of Object.keys(obj)) {
      fields[field] = getFieldAttr(field, obj[field])
    }

    fields.id = { type: 'serial', key: true }
    models[table] = db.define(table, fields)
  }

  try {
    await promisify(done => {
      db.sync(done)
    })

    await promisify(done => {
      db.drop(done)
    })

    for (const table of tables) {
      await promisify(done => {
        models[table].create(data[table], done)
      })
      console.info(table, 'created')
    }

    return models
  } catch (err) {
    console.error(err)
    return
  }
}

function getFieldAttr (field, value) {
  // if (field === 'id') {
  //     return { type: 'serial', key: true }
  // }

  const attrs = {
    type: 'text'
  }

  if (/^(\d)+$/.test(value)) {
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
