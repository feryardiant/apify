const test = require('tape')
const { RequestParams, ApifyError } = require('../lib')

test('Request path', t => {
  try {
    new RequestParams('/', 'GET')
  } catch (err) {
    t.is(err.status, 400, 'Return 400 if no user, repo & table')
  }

  try {
    new RequestParams('/username', 'GET')
  } catch (err) {
    t.is(err.status, 400, 'Return 400 if no repo & table')
  }

  try {
    new RequestParams('/username/repository', 'GET')
  } catch (err) {
    t.is(err.status, 400, 'Return 400 if no table')
  }

  t.end()
})

test('Parsing request para', t => {
  const params = new RequestParams('/username/repository/table/1', 'GET')

  t.is(params.user, 'username', 'Should parse username')
  t.is(params.repo, 'repository', 'Should parse repository name')
  t.is(params.resource, 'table', 'Should parse table name')
  t.is(params.key, 1, 'Should return table key as number')
  t.is(params.method, 'get', 'Should change case method')

  t.end()
})
