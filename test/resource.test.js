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
  const resource = new Resource(model)

  const input = { name: 'Foo Bar' }
  const { data } = resource.store(input)

  t.same(data, { id: 4, name: input.name }, 'Should generate new ID')
  t.is(resource.status, 201, 'Should return 201 status')
  t.is(resource.index().data.length, 4, 'Should has additional data')
  t.end()
})

test('Show single data', t => {
  const resource = new Resource(model)

  t.same(resource.show(1).data, {
    id: 1,
    name: 'John Doe'
  }, 'Should returns exact data')

  try {
    resource.show(4)
  } catch (err) {
    t.is(err.status, 404, 'Should throws 404 for non-existing data')
  }

  t.end()
})

test('Update existing data data', t => {
  const resource = new Resource(model)

  const input = { name: 'Foo Bar' }
  const { data: updated } = resource.update(2, input)

  t.same(updated, { id: 2, name: input.name }, 'Should be updated')
  t.is(resource.status, 200, 'Should return 200 status')
  t.is(resource.index().data.length, 3, 'Should has no additional data')

  const { data: kept } = resource.update(2, input)

  t.same(kept, { id: 2, name: input.name }, 'Should not be updated if equivalent')
  t.is(resource.status, 304, 'Should return 304 status')

  try {
    resource.update(5, input)
  } catch (err) {
    t.is(err.status, 404, 'Should throw 404 if updating non-existing data')
  }

  t.end()
})

test('Delete data', t => {
  const resource = new Resource(model)

  resource.delete(3)

  t.is(resource.status, 204, 'Should returns 204 if success')
  t.is(resource.index().data.length, 2, 'Should have less data')

  try {
    resource.delete(3)
  } catch (err) {
    t.is(err.status, 404, 'Should throw 404 if deleteing non-existing data')
  }

  t.end()
})

test('Soft-Delete data', t => {
  const resource = new Resource([
    { id: 1, name: 'John Doe', deleted_at: null },
    { id: 2, name: 'Jane Doe', deleted_at: null },
    { id: 3, name: 'Sally Doe', deleted_at: null }
  ], {
    id: { type: 'number', key: true },
    name: { type: 'text' },
    deleted_at: { type: 'date' }
  })

  resource.delete(3)

  t.is(resource.status, 204, 'Should returns 204 if success')
  t.is(resource.index().meta.total, 2, 'Should have less data')
  // t.is(resource.index({ deleted: true }).meta.total, 1, 'Should have deleted data')

  t.end()
})
