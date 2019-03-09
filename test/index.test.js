const test = require('tape')
const listen = require('test-listen')
const axios = require('axios')

const apify = require('../index')
const db = require('../db.json')
const url = '/feryardiant/apify'
let service, baseURL

function startService() {
  service = require('micro')(apify)

  return listen(service)
}

test.onFinish(() => {
  service.close()
})

const request = axios.create({
  baseURL,
  validateStatus (status) {
    return [200, 201, 204, 304, 404].includes(status)
  }
})

test('Invalid request', t => {
  startService().then(baseURL => {
    return request.get('/', { baseURL })
  }).catch(err => {
    t.is(err.response.status, 400)
    t.end()
  })
})
