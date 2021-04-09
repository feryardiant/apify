const test = require('tape')
const { isObject, isNumber, promisify } = require('../lib/util')

test('util.isObject', t => {
  t.ok(isObject({ foo: 'bar' }), 'Should be OK with plain object')
  t.notOk(isObject(null), 'Shouldn\'t be OK with null')
  t.notOk(isObject(() => { }), 'Shouldn\'t be OK with function')

  t.end()
})

test('util.isNumber', t => {
  t.ok(isNumber('123'), 'Should be OK with string of number')
  t.ok(isNumber('-1'), 'Should be OK with string of negative number')
  t.notOk(isNumber('1.2'), 'Shouldn\'t be OK with decimal number')
  t.notOk(isNumber('1qa'), 'Shouldn\'t be OK with alpha-num')

  t.end()
})

test('util.prmisify', async t => {
  await promisify(done => {
    done(new Error('Some Error'))
  }).catch(err => {
    t.strictEquals(err.message, 'Some Error')
  })

  await promisify(done => {
    done(null, 'Some Data')
  }).then(result => {
    t.strictEquals(result, 'Some Data')
  })

  t.end()
})
