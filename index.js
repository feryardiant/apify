const { createServer } = require('http')
const orm = require('orm')
const os = require('os')
const path = require('path')
const axios = require('axios')

const connections = {}
const cache = []
let models
const port = process.env.PORT || 3000

const server = createServer(async (req, res) => {

  if (req.url !== '/favicon.ico') {
    const result = await fetchData(req.method, req.url)

    res.writeHead(200, {
      'Content-Type': 'application/json; charset=utf-8'
    })

    res.write(
      JSON.stringify(result)
    )
  }

  res.end()
})

server.on('error', (err) => {
  console.error(err.message)
})

server.listen(port, () => {
  console.info('Listening port:', server.address().port)
})

async function fetchData (method, url) {
  const result = {}

  try {
    const repo = await parseRepo(url)

    if (!models) {
      models = await createModels(repo)
    }

    const [table, id, relation] = repo.paths

    if (!table) {
      result.data = repo.data
      return result
    }

    result.data = await promisify(done => {
      if (id) {
        models[table].get(id, done)
      } else {
        models[table].find(done)
      }
    })

    return result
  } catch (err) {
    console.error(err)
    result.error = err.message
  }

  return result
}

async function createModels (repo) {
  const { openSync, closeSync } = require('fs')
  let handle

  try {
    handle = openSync(repo.db, 'a+')

    closeSync(handle)

    const db = await connect(repo.db)

    return defineModels(db, repo.data)
  } catch (err) {
    throw err
  }
}

function connect (database) {
  if (connections[database]) {
    return Promise.resolve(connections[database])
  }

  const pathname = path.join(__dirname, database)

  return new Promise((resolve, reject) => {
    orm.connect({ pathname, protocol: 'sqlite' }, (err, db) => {
      if (err) {
        return reject(err)
      }

      connections[database] = db

      return resolve(db)
    })
  })
}

async function defineModels (db, data) {
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

  await promisify(done => {
    db.drop(done)
  })


  await promisify(done => {
    db.sync(done)
  })

  await Promise.all(tables.map(table => {
    return promisify(done => {
      models[table].create(data[table], done)
    })
  }))

  return models
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

async function parseRepo (url) {
  if (url === '/') return {}

  const { parse } = require('url')
  url = parse(url, true)
  const [user, repo, ...paths] = url.pathname.slice(1).split('/')
  const cached = cache.find(c => c.user === user && c.repo === repo)

  if (cached) {
    return cached
  }

  const result = { user, repo, paths, query: url.query, db: `${user}-${repo}.db` }

  if (!user && !repo) {
    return result
  }

  if (process.env.DRYRUN) {
    result.data = {
      posts: [
        { title: 'Foo bar' },
        { title: 'Foo bar' },
      ],
      comments: [
        { post_id: 1, content: 'Lorem Ipsum' },
        { post_id: 1, content: 'Lorem Ipsum' },
        { post_id: 1, content: 'Lorem Ipsum' },
        { post_id: 2, content: 'Lorem Ipsum' },
        { post_id: 2, content: 'Lorem Ipsum' },
        { post_id: 2, content: 'Lorem Ipsum' }
      ]
    }
    return result
  }

  try {
    const { data: res, status } = await axios.get(`https://api.github.com/repos/${user}/${repo}/contents/db.json`)

    if (status === 200 && !!res.download_url) {
      const { data } = await axios.get(res.download_url)
      result.data = data

      cache.push(result)
    }

    return result
  } catch (err) {
    throw err
  }
}

function promisify (cb) {
  return new Promise((resolve, reject) => {
    cb((err, data) => {
      if (err) return reject(err)

      return resolve(data || true)
    })
  })
}
