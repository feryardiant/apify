const test = require('ava')
const micro = require('micro')
const listen = require('test-listen')
const axios = require('axios')

const apify = require('./index')
const db = require('./db.json')
const url = '/feryardiant/apify'
let service, baseURL

process.env.NODE_ENV = 'test'

test.before(async () => {
  service = micro(apify)
  baseURL = await listen(service)
})

test.after(() => {
  service.close()
})

/**
 * @param {AxiosRequestConfig} options
 * @returns
 */
async function request (options) {
  return axios.request(Object.assign({}, options, {
    baseURL,
    validateStatus (status) {
      return (status >= 200 && status < 300) || status === 404
    }
  }))
}

test('should contains user, repo & table params', async (t) => {
  const { response } = await t.throwsAsync(async () => {
    await request({
      url: '/',
      method: 'GET'
    })
  }, Error)

  t.is(response.status, 400)
  t.deepEqual(response.data, {
    errors: 'Invalid parameters, url must contain `/:user/:repo/:table` parameter'
  })
})

test('should returns 404 if repo doent exist', async (t) => {
  const { status, data } = await request({
    url: '/feryardiant/foobar/table',
    method: 'GET'
  })

  t.is(status, 404)
  t.deepEqual(data, {
    errors: 'Resource not found'
  })
})

test('should returns 404 if db.sql doent exist', async (t) => {
  const { status, data } = await request({
    url: '/feryardiant/dotfiles/table',
    method: 'GET'
  })

  t.is(status, 404)
  t.deepEqual(data, {
    errors: 'Resource not found'
  })
})

test('should returns 404 if table doent exist', async (t) => {
  const { status, data } = await request({
    url: `${url}/table`,
    method: 'GET'
  })

  t.is(status, 404)
  t.deepEqual(data, {
    errors: 'Resource not found'
  })
})

test('should returns resource index', async (t) => {
  const { status, data } = await request({
    url: `${url}/albums`,
    method: 'GET'
  })

  t.is(status, 200)
  t.is(data.data.length, db.albums.length)
})
