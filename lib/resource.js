const { compareAsc, compareDesc } = require('date-fns')

const { notFound, invalidRequest } = require('./api-error')

/**
 * @class Resource
 * @property {Repository} repo
 */
class Resource {
  /**
   * @memberof Resource
   * @param {Repository} repo
   */
  constructor (repo) {
    this.status = 200
    this.repo = repo
  }

  /**
   * Model data array
   *
   * @readonly
   * @memberof Resource
   * @return {Array}
   */
  get model () {
    return (this.repo.data || [])
  }

  /**
   * @memberof Resource
   * @param {Object} [input = {}]
   * @return {Object}
   * @throws {Error}
   */
  index ({ page = 1, per_page = 15, sort = null, ...input } = {}) {
    let model = this.model
    const meta = {
      current_page: 0,
      per_page: 0,
      total: model.length,
    }

    if (this.repo.soft_deletes) {
      model = model.filter(row => {
        if (input.deleted) {
          return row.deleted_at !== null
        } else {
          return row.deleted_at === null
        }
      })
    }

    meta.sort = sort || { [this.repo.primary]: 'desc' }
    model.sort(orderBy.apply(this, [meta.sort]))

    if (page < 0 || per_page < 0) {
      return this.serialize(model, meta)
    }

    const start = per_page * (page - 1)
    const sliced = model.slice(start, (per_page * page))

    meta.current_page = page
    meta.per_page = per_page

    return this.serialize(sliced, meta)
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
    const old = this.model.slice(0)
    const data = {
      [this.repo.primary]: old.length + 1
    }

    for (let [field, attributes] of Object.entries(this.repo.attributes)) {
      if (field === this.repo.primary) continue

      data[field] = input[field] || null
    }

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
    for (let field in this.repo.attributes) {
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
    let deleted = this.timestamp('deteled', data)

    if (!deleted) {
      const model = this.model.filter(r => r.id !== data.id)
      deleted = model.length < old.length
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
      primary: this.repo.primary,
      soft_deletes: this.repo.soft_deletes,
      update_timestamp: this.repo.update_timestamp,
      create_timestamp: this.repo.create_timestamp,
      timestamps: this.repo.timestamps,
      attributes: this.repo.attributes
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
    const { type } = this.repo.attributes[field]

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

    if (event === 'created' && this.repo.create_timestamp) {
      data.created_at = stamp
      if (this.repo.update_timestamp) {
        data.updated_at = stamp
      }
      return true
    }

    if (event === 'updated' && this.repo.update_timestamp) {
      data.updated_at = stamp
      return true
    }

    if (event === 'deleted' && this.repo.soft_deletes) {
      const deleted = data.deleted_at !== null

      if (!deleted) {
        data.deleted_at = stamp
        return true
      }
    }

    return false
  }
}

function orderBy (ordering) {
  const fields = []
  const compareDate = order => order === 'asc' ? compareAsc : compareDesc
  const compareText = (order, a, b) => {
    a = a.toUpperCase()
    b = b.toUpperCase()
    if (a > b) {
      return order === 'desc' ? 1 : -1
    } else if (a < b) {
      return order === 'desc' ? -1 : 1
    }
    return 0
  }

  for (let field in ordering) {
    if (this.repo.attributes[field]) {
      let { type } = this.repo.attributes[field]
      fields.push({ field, type, dir: ordering[field] })
    }
  }

  const dateTypes = ['date', 'datetime', 'timestamp']
  const intTypes = ['number', 'int', 'integer', 'currency']

  return (a, b) => {
    let ordered = 0

    for (let { field, type, dir } of fields) {
      let order = 0
      let x = a[field]
      let y = b[field]
      if (dateTypes.includes(type)) {
        order = compareDate(dir)(x, y)
      } else if (intTypes.includes(type)) {
        order = dir === 'desc' ? x - y : y - x
      } else if (type === 'text') {
        order = compareText(dir, x, y)
      }
      ordered = !!ordered ? (ordered - order) : order
    }

    return ordered
  }
}

module.exports = Resource
