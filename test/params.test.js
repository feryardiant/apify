const { URL } = require('url')
const test = require('tape')
const RequestParams = require('../lib/params')

const parseParam = (method, pathname) => {
  const url = new URL(pathname, 'http://localhost')
  return new RequestParams(url, method)
}

test('Parsing external repository', t => {
  const params = parseParam('GET', '/user/repo/table/1')

  t.is(params.username, 'user', 'Should parse username')
  t.is(params.repositry, 'repo', 'Should parse repository name')
  t.is(params.resource, 'table', 'Should parse table name')
  t.is(params.key, 1, 'Should return table key as number')
  t.is(params.method, 'get', 'Should change case method')
  t.notOk(params.internal, 'Should be external')

  t.end()
})

test('Parsing internal repository', t => {
  const params = parseParam('GET', '/api/table/1')

  t.is(params.username, 'username', 'Should parse username')
  t.is(params.repositry, 'repository', 'Should parse repository name')
  t.is(params.resource, 'table', 'Should parse table name')
  t.is(params.key, 1, 'Should return table key as number')
  t.is(params.method, 'get', 'Should change case method')
  t.ok(params.internal, 'Should be internal')

  t.end()
})

test('Parsing query string', t => {
  const params = parseParam('GET', '/api/table?foo=bar&baz=yes&bang=1')

  t.same(params.input, { foo: 'bar', baz: true, bang: 1 }, 'Should parse query string')

  t.end()
})

test('Params action', t => {
  t.is(parseParam('GET', '/api/table').action, 'index', 'Should returns index action')
  t.is(parseParam('POST', '/api/table').action, 'store', 'Should returns store action')
  t.is(parseParam('GET', '/api/table/create').action, 'create', 'Should returns create action')
  t.is(parseParam('GET', '/api/table/1').action, 'show', 'Should returns show action')
  t.is(parseParam('PUT', '/api/table/1').action, 'update', 'Should returns update action')
  t.is(parseParam('DELETE', '/api/table/1').action, 'destroy', 'Should returns destroy action')
  t.is(parseParam('DELETE', '/api/table').action, null, 'Should returns null action')
  t.is(parseParam('POST', '/api/table/1').action, null, 'Should returns null action')

  try {
    parseParam('GET', '/api/table').is()
  } catch (err) {
    t.is(err.message, 'RequestParams.is() Argument required')
  }

  t.end()
})
