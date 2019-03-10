const { isObject, isNumber } = require('./util')

/**
 * @param {String} resource
 * @param {String} [primary='id']
 * @return {{data: {Array}, resource: {String}, primary: {String}, attributes: {Object}, relations: {Array}}}
 */
function initResource (resource, primary = 'id') {
  return {
    data: [],
    resource,
    primary,
    attributes: {},
    relations: [],
  }
}

/**
 * @param {Object} fields
 * @return {Object}
 */
function defineAttribute (fields) {
  const attributes = {}

  for (let [key, value] of Object.entries(fields)) {
    const attribute = {
      key,
      label: capitalize(key),
      sortable: true,
      visible: true
    }

    if (key === 'id') {
      attribute.type = 'number'
      attribute.primary = true
    } else if (/_at$/.test(key)) {
      attribute.type = 'timestamp'
      if (key !== 'updated_at') {
        attribute.visible = false
      }
    } else if (isNumber(value)) {
      attribute.type = 'number'
    } else if (typeof value === 'boolean') {
      attribute.type = 'boolean'
      attribute.sortable = false
    } else {
      attribute.type = 'text'
    }

    attributes[key] = attribute
  }

  return attributes
}

/**
 * @param {String} words
 * @return {String}
 */
function capitalize (words) {
  if (words === 'id') return 'ID'

  return words.toLowerCase()
    .replace(/_(id|at)$/, '')
    .replace(/(_|\-)/g, ' ')
    .replace(/[^\s]*/g, word => {
      return word.replace(/./, ch => ch.toUpperCase())
    })
}
/**
 * @param {Object} words
 * @return {initResource[]}
 */
exports.normalize = (rawData) => {
  const resources = {}
  let database = Object.assign({}, rawData)

  Object.keys(database).forEach(table => {
    let attributes = Object.assign({}, database[table][0])

    resources[table] = initResource(table)

    Object.entries(attributes).forEach(([field, value]) => {
      let isArray = Array.isArray(value)

      if (/_id$/.test(field)) {
        field = field.replace(/_id$/, '')
        value = database[field].find(r => r.id === value) || {}
      }

      if (isArray || isObject(value)) {
        const parent = isArray ? table : field
        const child = isArray ? field : table
        const related = `${parent}_id`

        value = Object.assign({}, (isArray ? value[0] : value))
        value.id = value.id || 0

        resources[field] = resources[field] || initResource(field)
        resources[field].attributes = value
        resources[child].attributes[related] = 0

        resources[field].attributes = defineAttribute(resources[field].attributes)
        resources[parent].relations.push({ child, related })
        resources[child].relations.push({ parent, related })

        delete attributes[field]

        return
      }

      attributes[field] = value
    })

    attributes = Object.assign({}, (resources[table].attributes || {}), attributes)
    resources[table].attributes = defineAttribute(attributes)
  })

  Object.values(resources).forEach(({ resource, data, relations, ...res }) => {
    resources[resource].update_timestamp = res.attributes.hasOwnProperty('updated_at')
    resources[resource].create_timestamp = res.attributes.hasOwnProperty('created_at')
    resources[resource].soft_deletes = res.attributes.hasOwnProperty('deleted_at')
    resources[resource].timestamps = resources[resource].update_timestamp && resources[resource].create_timestamp

    for (let row of (database[resource] || []).slice(0)) {
      let seed = {}

      for (let [key, value] of Object.entries(row)) {
        if (Array.isArray(value) && resources.hasOwnProperty(key)) {
          let { related } = relations.find(rel => rel.child === key)
          value.forEach(val => {
            val.id = resources[key].data.length + 1
            val[related] = row.id
            resources[key].data.push(val)
          })
          continue
        }

        if (isObject(value) && resources.hasOwnProperty(key)) {
          let { related } = relations.find(rel => rel.parent === key)
          let exists = resources[key].data.find(parent => {
            for (let field in value) {
              if (parent[field] !== value[field]) return false
            }
            return true
          })

          if (exists) {
            seed[related] = exists.id
          } else {
            value.id = value.id || (resources[key].data.length + 1)
            seed[related] = value.id
            resources[key].data.push(value)
          }
          continue
        }

        seed[key] = value
      }

      data.push(seed)
    }
  })

  return resources
}
