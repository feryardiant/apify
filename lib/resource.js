const { notFound, invalidRequest } = require('./api-error')

/**
 * @class Resource
 */
class Resource {
  /**
   * @memberof Resource
   * @param {Object} resource
   * @param {Array} resource.data
   * @param {String} resource.primary
   * @param {Object} resource.attributes
   * @param {Array} resource.relations
   */
  constructor (resource) {
    this.status = 200
    console.log('Log', resource)
    this.resource = Object.assign({}, resource)
  }

  /**
   * Model data array
   *
   * @readonly
   * @memberof Resource
   * @return {Array}
   */
  get model () {
    return (this.resource.data || []).slice(0)
  }

  /**
   * @memberof Resource
   * @param {Object} [input = {}]
   * @return {Object}
   * @throws {Error}
   */
  index ({ page = 1, per_page = 15, ...input } = {}) {
    let model = this.model

    if (this.resource.soft_deletes) {
      model = model.filter(row => {
        if (input.deleted) {
          return row.deleted_at !== null
        } else {
          return row.deleted_at === null
        }
      })
    }

    model.sort(this.sortBy(
      input.sortBy || this.resource.primary,
      input.sortDirection || 'desc'
    ))

    if (page < 0 || perPage < 0) {
      return this.serialize(model, {
        current_page: 0,
        per_page: 0,
        total: model.length
      })
    }

    const start = perPage * (page - 1)
    const sliced = model.slice(start, (perPage * page))

    return this.serialize(sliced, {
      current_page: page,
      per_page,
      total: model.length
    })
  }

  /**
   * @memberof Resource
   * @param {Number} id
   * @param {Object} [input = {}]
   * @return {Object}
   * @throws {Error}
   */
  show (id, input = {}) {
    const data = this.find(id)

    return this.serialize(data)
  }

  /**
   * @memberof Resource
   * @param {Object} input
   * @return {Object}
   * @throws {Error}
   */
  store (input) {
    const old = this.model
    let data = {}

    for (let field in this.resource.attributes) {
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
   * @throws {Error}
   */
  update (id, input) {
    const data = this.find(id)

    let changed = false
    for (let field in this.resource.attributes) {
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
   * @throws {Error}
   */
  destroy (id) {
    const data = this.find(id)
    const old = this.model
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
   * @throws {Error}
   */
  find (id) {
    const data = this.model.find(row => row.id == id)

    if (!data) {
      throw notFound()
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
    if (Array.isArray(data) && meta.total === 0) {
      this.status = 404
    }

    meta = Object.assign({}, meta, {
      primary: this.resource.primary,
      soft_deletes: this.resource.soft_deletes,
      update_timestamp: this.resource.update_timestamp,
      create_timestamp: this.resource.create_timestamp,
      timestamps: this.resource.timestamps,
      attributes: this.resource.attributes
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
    const { type } = this.resource.attributes[field]

    if (input[field]) {
      if (type === 'date' && (Date.parse(input[field]) + 1) > 0) return true

      if (typeof input[field] === type) return true

      throw invalidRequest('Validation Error')
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
  timestamp (event, data = {}) {
    const stamp = new Date().toString()

    if (event === 'created' && this.resource.create_timestamp) {
      data.created_at = stamp
      if (this.hasUpdateTimestamp) {
        data.updated_at = stamp
      }
      return true
    }

    if (event === 'updated' && this.resource.update_timestamp) {
      data.updated_at = stamp
      return true
    }

    if (event === 'deleted' && this.resource.soft_deletes) {
      const deleted = data.deleted_at !== null

      if (!deleted) {
        data.deleted_at = stamp
        return true
      }
    }

    return false
  }

  sortBy (field, order = 'desc') {
    const { type } = this.resource.attributes[field]
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

module.exports = Resource
