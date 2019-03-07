const { Database, Resource, RequestParams, ApifyError } = require('./lib')
const dryRun = !!process.env.DRY
const isDev = process.env.NODE_ENV === 'development'

/**
 * @async
 * @param {http.IncomingMessage} req
 * @param {http.ServerResponse} res
 */
module.exports = async (req, res) => {
  try {
    const params = await RequestParams.parse(req)
    const db = new Database(params.user, params.repo, params.resource)

    await db.initialize(dryRun, isDev)

    let result
    const resource = new Resource(db.model.rows, db.model.schemas)

    switch (params.type) {
      case 'index':
        result = resource.index(params.input)
        break
      case 'store':
        result = resource.store(params.input)
        break
      case 'find':
        result = resource.find(params.key, params.input)
        break
      case 'update':
        result = resource.update(params.key, params.input)
        break
      case 'delete':
        resource.delete(params.key)
        break

      default:
        throw ApifyError.invalidRequest('Unsupported request method')
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
