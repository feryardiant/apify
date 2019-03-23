const axios = require('axios')
const { existsSync, writeFileSync, readFileSync } = require('fs')
const { tmpdir } = require('os')
const { resolve } = require('path')

const ApiError = require('./lib/api-error')
const Resource = require('./lib/resource')
const { parseParam, normalize } = require('./lib')
const dryRun = process.env.DRY && process.env.DRY == '1'
const isDev = process.env.NODE_ENV === 'development'

/**
 * @async
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers['origin'] || '*')
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Authorization, Access-Control-Allow-Origin')
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Accept-Charset', 'utf-8')
  res.setHeader('Vary', 'Origin')

  if (req.method === 'OPTIONS') {
    // res.setHeader('Accept', 'application/json, application/x-www-form-urlencoded')
    res.setHeader('Access-Control-Max-Age', '86400')
    res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, OPTIONS, DELETE')
    res.setHeader('Allow', 'POST, GET, PUT, OPTIONS, DELETE')
  }

  try {
    let result, db = {}
    const param = await parseParam(req)
    const cache = `${param.username}-${param.repositry}.apify.json`
    const cachePath = resolve(tmpdir(), cache)

    if (!param.internal && param.paths.length < 3) {
      throw ApiError.invalidRequest(
        'Request path should contains /:user/repo/:table.'
      )
    }

    if (existsSync(cachePath)) {
      const cached = readFileSync(cachePath)
      db.normalized = JSON.parse(cached)
    } else {
        if (dryRun || param.internal) {
          db.rawData = require('./db.json')
        } else {
          if (param.paths.length < 3) {
            throw ApiError.invalidRequest()
          }
          db.rawData = await fetch(param.username, param.repositry)
        }
        db.normalized = normalize(db.rawData)

        writeFileSync(cachePath, JSON.stringify(db.normalized, null, 2))
    }

    if (!db.normalized || !db.normalized[param.resource]) {
      throw ApiError.notFound()
    }

    const resource = new Resource(db.normalized[param.resource])

    switch (param.action) {
      case 'index':
        result = resource.index(param.input)
        break
      case 'store':
        result = resource.store(param.input)
        break
      case 'show':
        result = resource.show(param.key, param.input)
        break
      case 'update':
        result = resource.update(param.key, param.input)
        break
      case 'destroy':
        result = resource.destroy(param.key)
        break

      default:
        throw ApiError.invalidRequest('Unsupported request method')
        break
    }

    res.statusCode = resource.status

    return result
  } catch (err) {
    res.statusCode = err.status || 500

    return {
      message: err.message,
      errors: err.errors,
      trace: isDev ? err.stack.split('\n').map(l => l.trim()) : undefined
    }
  }
}

/**
 * @async
 * @memberof Repository
 * @param {String} user
 * @param {String} repo
 * @return {Object}
 * @throws {Error}
 */
async function fetch (user, repo) {
  const { data } = await axios.get(`/${user}/${repo}/contents/db.json`, {
    baseURL: 'https://api.github.com/repos'
  })

  return Buffer.from(data.content, data.encoding).toString()
}
