const { URL } = require('url')
const test = require('tape')
const RequestParams = require('../lib/params')

const baseUrl = 'http://localhost'

test('Parsing external repository', t => {
  const url = new URL('/username/repository/table/1', baseUrl)
  const params = new RequestParams(url, 'GET')

  t.is(params.username, 'username', 'Should parse username')
  t.is(params.repositry, 'repository', 'Should parse repository name')
  t.is(params.resource, 'table', 'Should parse table name')
  t.is(params.key, 1, 'Should return table key as number')
  t.is(params.method, 'get', 'Should change case method')
  t.notOk(params.internal, 'Should be external')

  t.end()
})

test('Parsing internal repository', t => {
  const url = new URL('/api/table/1', baseUrl)
  const params = new RequestParams(url, 'GET')

  t.is(params.username, 'username', 'Should parse username')
  t.is(params.repositry, 'repository', 'Should parse repository name')
  t.is(params.resource, 'table', 'Should parse table name')
  t.is(params.key, 1, 'Should return table key as number')
  t.is(params.method, 'get', 'Should change case method')
  t.ok(params.internal, 'Should be internal')

  t.end()
})

test('Parsing query string', t => {
  const url = new URL('/api/table?foo=bar&baz=yes&bang=1', baseUrl)
  const params = new RequestParams(url, 'GET')

  t.same(params.input, { foo: 'bar', baz: true, bang: 1 }, 'Should parse query string')

  t.end()
})
