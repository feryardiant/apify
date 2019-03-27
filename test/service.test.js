const test = require('tape')
const { start, request } = require('./service')

test('Invalid request', t => {
  start(test).then(baseURL => {
    return request.get('/', { baseURL })
  }).catch(({ response }) => {
    t.is(response.status, 400)
    t.is(response.data.message, 'Request path should contains /:user/repo/:table.')

    t.end()
  })
})

test('Method not alowed', t => {
  start(test).then(baseURL => {
    return request.head('/a/b/c', { baseURL })
  }).catch(({ response }) => {
    t.is(response.status, 405)

    t.end()
  })
})
