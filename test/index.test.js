const test = require('tape')
const listen = require('test-listen')
const axios = require('axios')

const apify = require('../index')
const db = require('../db.json')
let service

async function startService() {
  service = require('micro')(apify)
  const url = await listen(service)
  return url
}

test.onFinish(() => {
  if (service) service.close()
})

const request = axios.create({
  validateStatus (status) {
    return [200, 201, 204, 304, 404].includes(status)
  }
})

test.skip('Invalid request', t => {
  startService().then(baseURL => {
    return request.get('/', { baseURL })
  }).catch(({ response }) => {
    t.is(response.status, 400)
    t.is(response.data.message, 'Request path should contains /:user/repo/:table.')
    t.end()
  })
})
