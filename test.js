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
  try {
    const res = await axios.request(Object.assign({}, options, {
      baseURL,
      validateStatus(status) {
        return [200, 201, 204, 304, 404].includes(status)
      }
    }))

    return res
  } catch ({ response, message }) {
    const err = new Error(message)
    err.status = response.status
    err.data = response.data
    throw err
  }
}

test('should contains user, repo & table params', async (t) => {
  const { status, data } = await t.throwsAsync(async () => {
    await request({
      url: '/',
      method: 'GET'
    })
  }, Error)

  t.is(status, 400)
  t.is(data.message, 'Invalid parameters, url must contain `/:user/:repo/:table` parameter')
})

test('should returns 404 if repo doent exist', async (t) => {
  const { status, data } = await request({
    url: '/feryardiant/foobar/table',
    method: 'GET'
  })

  t.is(status, 404)
  t.is(data.message, 'Resource not found')
})

test('should returns 404 if db.sql doent exist', async (t) => {
  const { status, data } = await request({
    url: '/feryardiant/dotfiles/table',
    method: 'GET'
  })

  t.is(status, 404)
  t.is(data.message, 'Resource not found')
})

test('should returns 404 if table doent exist', async (t) => {
  const { status, data } = await request({
    url: `${url}/table`,
    method: 'GET'
  })

  t.is(status, 404)
  t.is(data.message, 'Resource not found')
})

test('should returns resource index', async (t) => {
  const { status, data } = await request({
    url: `${url}/albums`,
    method: 'GET'
  })

  t.is(status, 200)
  t.is(data.data.length, db.albums.length)
})
