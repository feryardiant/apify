const test = require('tape')
const Resource = require('../lib/resource')

const model = require('./normalized')

test('Show all data', t => {
  const data = model.albums.data.slice(0)
  const resource = new Resource(model.albums)

  t.same(resource.index().data, data, 'Should list all data')
  t.end()
})

test('Create new data', t => {
  const resource = new Resource(model.albums)

  const input = { users_id: 1, name: 'Foo Bar Baz' }
  const { data } = resource.store(input)

  t.same(data, { id: 3, users_id: 1, name: input.name }, 'Should generate new ID')
  t.is(resource.status, 201, 'Should return 201 status')
  t.is(resource.index().data.length, 3, 'Should has additional data')
  t.end()
})

test('Show single data', t => {
  const resource = new Resource(model.albums)

  t.same(resource.show(1).data, {
    id: 1,
    users_id: 1,
    name: 'Foo Bar'
  }, 'Should returns exact data')

  try {
    resource.show(4)
  } catch (err) {
    t.is(err.status, 404, 'Should throws 404 for non-existing data')
  }

  t.end()
})

test('Update existing data data', t => {
  const resource = new Resource(model.albums)

  const input = { users_id: 1, name: 'Foo Bar' }
  const { data: updated } = resource.update(2, input)

  t.same(updated, { id: 2, users_id: 1, name: input.name }, 'Should be updated')
  t.is(resource.status, 200, 'Should return 200 status')
  t.is(resource.index().data.length, 3, 'Should has no additional data')

  const { data: kept } = resource.update(2, input)

  t.same(kept, { id: 2, users_id: 1, name: input.name }, 'Should not be updated if equivalent')
  t.is(resource.status, 304, 'Should return 304 status')

  try {
    resource.update(5, input)
  } catch (err) {
    t.is(err.status, 404, 'Should throw 404 if updating non-existing data')
  }

  t.end()
})

test('Delete data', t => {
  const resource = new Resource(model.albums)

  resource.destroy(3)

  t.is(resource.status, 204, 'Should returns 204 if success')
  t.is(resource.index().data.length, 3, 'Should not delete actual data')

  try {
    resource.destroy(3)
  } catch (err) {
    t.is(err.status, 404, 'Should throw 404 if deleteing non-existing data')
  }

  t.end()
})
