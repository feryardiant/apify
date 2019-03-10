const axios = require('axios')

const { notFound, invalidRequest } = require('./lib/api-error')
const { parseParam, normalize, Resource } = require('./lib')
const dryRun = !!process.env.DRY
const isDev = process.env.NODE_ENV === 'development'

/**
 * @async
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, PUT, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With')
  res.setHeader('Allow', 'POST, GET, PUT, DELETE')

  if (req.method === 'OPTIONS') {
    return { status: 'OK' }
  }

  try {
    let rawData
    const param = await parseParam(req)
    const cache = `${param.username}-${param.repositry}.apify.json`

    if (param.internal) {
      rawData = require('./db.json')
    } else {
      if (param.paths.length < 3) {
        throw invalidRequest()
      }
      rawData = await fetch(param.username, param.repositry)
    }

    const normalized = normalize(rawData)

    if (!normalized[param.resource]) {
      throw notFound()
    }

    let result
    console.info(normalized[param.resource])
    const resource = new Resource(normalized[param.resource])

    switch (params.type) {
      case 'index':
        result = resource.index(params.input)
        break
      case 'store':
        result = resource.store(params.input)
        break
      case 'show':
        result = resource.show(params.key, params.input)
        break
      case 'update':
        result = resource.update(params.key, params.input)
        break
      case 'destroy':
        result = resource.destroy(params.key)
        break

      default:
        throw invalidRequest('Unsupported request method')
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
