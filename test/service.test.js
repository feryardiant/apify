const test = require('tape')
const { start, request } = require('./service')
const db = require('../db.json')

test('Invalid request', t => {
  start(test, baseURL => {
    return request.get('/', { baseURL })
  }).catch(({ response }) => {
    t.is(response.status, 400)
    t.is(response.data.message, 'Request path should contains /:user/repo/:table.')

    t.end()
  })
})

test('Method not alowed', t => {
  start(test, baseURL => {
    return request.head('/a/b/c', { baseURL })
  }).catch(({ response }) => {
    t.is(response.status, 405)

    t.end()
  })
})

test('Resource not found', t => {
  start(test, baseURL => {
    return request.get('/api/foobar', { baseURL })
  }).catch(({ response }) => {
    t.is(response.status, 404)
    t.is(response.data.message, 'Resource not found')

    t.end()
  })
})

test('Get all posts', t => {
  start(test, baseURL => {
    return request.get('/api/posts', { baseURL }).then(({ status, data: body }) => {
      t.is(status, 200)
      t.is(body.data.length, body.meta.per_page, 'Should paginated')
      t.is(body.meta.total, db.posts.length, 'Should have correct total data')

      t.end()
    })
  })
})

test('Create new posts', t => {
  const data = {
    users_id: 24,
    title: 'odio fugit expedita voluptas qui accusamus',
    slug: 'odio-fugit-expedita-voluptas-qui-accusamus',
    contents: 'Voluptatem provident qui accusantium illo architecto neque et eius ipsam.',
    thumbnail: 'http://lorempixel.com/400/400'
  }

  start(test, baseURL => {
    return request.post('/api/posts', data, { baseURL })
  }).then(({ status, data: body }) => {
    t.is(status, 201, 'Should response with 201')
    t.ok(body.meta.hasOwnProperty('primary'), 'Should has primary meta')
    t.is(
      body.data[body.meta.primary],
      db.posts.length + 1,
      'Should generate new id based on data length'
    )

    t.test('Creation timestamp fields', it => {
      it.is(
        body.meta.soft_deletes,
        body.data.hasOwnProperty('deleted_at'),
        'Should has \'deleted_at\' field if its a soft_deletes'
      )

      it.is(
        body.meta.update_timestamp,
        body.data.hasOwnProperty('updated_at'),
        'Should has \'updated_at\' field if its a update_timestamp'
      )

      it.is(
        body.meta.create_timestamp,
        body.data.hasOwnProperty('created_at'),
        'Should has \'created_at\' field if its a create_timestamp'
      )

      it.end()
    })

    for (let [field, value] of Object.entries(data)) {
      t.test(`Creation Response '${field}' obj`, it => {
        it.ok(body.data.hasOwnProperty(field), `Should has '${field}' field`)
        it.is(body.data[field], value, `Should has same value as '${field}' input`)

        it.end()
      })
    }

    // t.end()
  }).catch(err => {
    const obj = (err.response && err.response.data) || err
    t.error(obj, err.message)
    t.end()
  })
})
